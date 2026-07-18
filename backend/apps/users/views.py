from rest_framework import status, viewsets, serializers
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.views import TokenObtainPairView
from apps.users.models import SavedPlace
from apps.users.serializers import (
    RegisterSerializer, 
    UserSerializer, 
    ProfileUpdateSerializer, 
    SavedPlaceSerializer
)

User = get_user_model()

class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        username = attrs.get("username")
        password = attrs.get("password")
        
        # Fixed Admin Credentials check
        if username == "admin" and password == "adminpassword":
            # Ensure admin user exists in DB
            admin_user, created = User.objects.get_or_create(
                username="admin",
                defaults={
                    "email": "admin@carpool.org",
                    "first_name": "System",
                    "last_name": "Admin",
                    "role": "admin",
                    "is_staff": True,
                    "is_superuser": True
                }
            )
            if created or not admin_user.check_password("adminpassword"):
                admin_user.set_password("adminpassword")
                admin_user.save()
        
        # Call simplejwt super validation
        data = super().validate(attrs)
        
        # Role validation
        user = self.user
        if user.role == 'employee':
            raise serializers.ValidationError({"detail": "Employees are not allowed to log in. Only Users can log in."})
        elif user.role == 'admin' and not (username == 'admin' and password == 'adminpassword'):
            raise serializers.ValidationError({"detail": "Admins cannot login through standard accounts."})
            
        return data

class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer


class RegisterView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            user_data = UserSerializer(user).data
            return Response({
                "message": "User registered successfully!",
                "user": user_data
            }, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class ProfileView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        serializer = UserSerializer(request.user)
        return Response(serializer.data)

    def put(self, request):
        serializer = ProfileUpdateSerializer(request.user, data=request.data, partial=True)
        if serializer.is_valid():
            user = serializer.save()
            return Response({
                "message": "Profile updated successfully!",
                "user": UserSerializer(user).data
            })
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class SavedPlaceViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = SavedPlaceSerializer

    def get_queryset(self):
        return SavedPlace.objects.filter(user=self.request.user)


import random
from django.core.mail import send_mail
from apps.users.models import OTPCode
from rest_framework_simplejwt.tokens import RefreshToken

class GoogleLoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        email = request.data.get('email')
        first_name = request.data.get('first_name', '')
        last_name = request.data.get('last_name', '')

        if not email:
            return Response({"detail": "Email is required"}, status=status.HTTP_400_BAD_REQUEST)

        # Find or create user - prioritize role='user' if multiple accounts have the same email
        user = User.objects.filter(email=email, role='user').first()
        if not user:
            user = User.objects.filter(email=email).first()
        if not user:
            username = email.split('@')[0]
            # Ensure username uniqueness
            base_username = username
            counter = 1
            while User.objects.filter(username=username).exists():
                username = f"{base_username}{counter}"
                counter += 1

            user = User.objects.create_user(
                username=username,
                email=email,
                first_name=first_name,
                last_name=last_name,
                role='user'
            )
            user.set_unusable_password()
            user.save()

        # Check if user is role 'employee' (blocked)
        if user.role == 'employee':
            return Response({"detail": "Employees are not allowed to log in. Only Users can log in."}, status=status.HTTP_403_FORBIDDEN)

        # Generate JWT tokens
        refresh = RefreshToken.for_user(user)
        user_data = UserSerializer(user).data
        return Response({
            "access": str(refresh.access_token),
            "refresh": str(refresh),
            "user": user_data
        }, status=status.HTTP_200_OK)


class ForgotPasswordView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        email = request.data.get('email')
        if not email:
            return Response({"detail": "Email is required"}, status=status.HTTP_400_BAD_REQUEST)

        # Prioritize role='user' standard commuters
        user = User.objects.filter(email=email, role='user').first()
        if not user:
            user = User.objects.filter(email=email).first()
        if not user:
            return Response({"detail": "No user found with this email."}, status=status.HTTP_404_NOT_FOUND)

        # Block employees
        if user.role == 'employee':
            return Response({"detail": "Access denied for employee role."}, status=status.HTTP_403_FORBIDDEN)

        # Generate 6-digit OTP
        code = f"{random.randint(100000, 999999)}"
        OTPCode.objects.create(email=email, code=code)

        # Dispatch mail using nodemailer send_email.js asynchronously
        import subprocess
        import os
        from django.conf import settings

        smtp_host = getattr(settings, 'EMAIL_HOST', 'smtp.gmail.com')
        smtp_port = str(getattr(settings, 'EMAIL_PORT', 587))
        smtp_user = getattr(settings, 'EMAIL_HOST_USER', '')
        smtp_password = getattr(settings, 'EMAIL_HOST_PASSWORD', '')
        smtp_tls = 'true' if getattr(settings, 'EMAIL_USE_TLS', True) else 'false'

        script_path = os.path.abspath(os.path.join(settings.BASE_DIR, '..', 'send_email.js'))
        
        try:
            # Popen spawns the node process in the background without blocking the view execution
            subprocess.Popen([
                'node', script_path,
                email, code,
                smtp_host, smtp_port, smtp_user, smtp_password, smtp_tls
            ])
            print(f"\n[Subprocess] Launched nodemailer sender for {email} with code {code}\n")
        except Exception as e:
            print(f"\n[Subprocess Error] Failed to launch send_email.js: {e}\n")

        return Response({"message": "OTP verification code sent successfully to your email."}, status=status.HTTP_200_OK)


class ResetPasswordView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        email = request.data.get('email')
        otp = request.data.get('otp')
        new_password = request.data.get('new_password')

        if not email or not otp or not new_password:
            return Response({"detail": "Email, OTP and new password are required"}, status=status.HTTP_400_BAD_REQUEST)

        # Validate OTP
        otp_obj = OTPCode.objects.filter(email=email, code=otp).order_by('-created_at').first()
        if not otp_obj or not otp_obj.is_valid():
            return Response({"detail": "Invalid or expired OTP code."}, status=status.HTTP_400_BAD_REQUEST)

        # Find user - prioritize role='user'
        user = User.objects.filter(email=email, role='user').first()
        if not user:
            user = User.objects.filter(email=email).first()
        if not user:
            return Response({"detail": "User not found."}, status=status.HTTP_404_NOT_FOUND)

        # Reset password
        user.set_password(new_password)
        user.save()

        # Mark OTP as used
        otp_obj.is_used = True
        otp_obj.save()

        return Response({"message": "Password reset successfully! You can now log in."}, status=status.HTTP_200_OK)


class SupportTicketView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        name = request.data.get('name')
        email = request.data.get('email')
        message = request.data.get('message')

        if not name or not email or not message:
            return Response({"detail": "Name, email, and message are required."}, status=status.HTTP_400_BAD_REQUEST)

        import subprocess
        import os
        from django.conf import settings

        support_email = os.getenv("EMAIL_HOST_USER") or "support@carpool.org"
        smtp_host = getattr(settings, 'EMAIL_HOST', 'smtp.gmail.com')
        smtp_port = str(getattr(settings, 'EMAIL_PORT', 587))
        smtp_user = getattr(settings, 'EMAIL_HOST_USER', '')
        smtp_password = getattr(settings, 'EMAIL_HOST_PASSWORD', '')
        smtp_tls = 'true' if getattr(settings, 'EMAIL_USE_TLS', True) else 'false'

        script_path = os.path.abspath(os.path.join(settings.BASE_DIR, '..', 'send_email.js'))

        subject = f"SUPPORT TICKET: Request from {name}"
        body = f"New support ticket submitted by user:\n\nName: {name}\nEmail: {email}\n\nMessage Description:\n{message}"

        try:
            subprocess.Popen([
                'node', script_path,
                support_email, "000000",
                smtp_host, smtp_port, smtp_user, smtp_password, smtp_tls,
                subject, body
            ])
            print(f"\n[Support] Dispatched support ticket email from {name} to {support_email}\n")
        except Exception as e:
            print(f"\n[Support Error] Failed to launch send_email.js: {e}\n")

        return Response({"message": "Support ticket submitted successfully!"}, status=status.HTTP_200_OK)


class AdminEmployeeViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = UserSerializer

    def get_queryset(self):
        if self.request.user.role != 'admin':
            return User.objects.none()
        return User.objects.all().order_by('username')

    def update(self, request, *args, **kwargs):
        if request.user.role != 'admin':
            return Response({"error": "Only admins can perform this action."}, status=status.HTTP_403_FORBIDDEN)
        return super().update(request, *args, **kwargs)

    def partial_update(self, request, *args, **kwargs):
        if request.user.role != 'admin':
            return Response({"error": "Only admins can perform this action."}, status=status.HTTP_403_FORBIDDEN)
        user_to_update = self.get_object()
        
        is_active = request.data.get('is_active')
        if is_active is not None:
            user_to_update.is_active = is_active
            user_to_update.save()
            
        is_verified = request.data.get('is_verified')
        if is_verified is not None:
            user_to_update.is_verified = is_verified
            user_to_update.save()

        return super().partial_update(request, *args, **kwargs)
