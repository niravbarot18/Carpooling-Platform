import secrets
import logging
from datetime import timedelta
from django.utils import timezone
from django.contrib.auth import get_user_model
from django.contrib.auth.hashers import make_password, check_password
from django.db import transaction
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from rest_framework_simplejwt.tokens import RefreshToken

from apps.authentication.models import EmailOTP, PasswordResetToken
from apps.authentication.serializers import (
    SignupSerializer, VerifyOTPSerializer, ResendOTPSerializer,
    ForgotPasswordSerializer, ResetPasswordSerializer
)
from utils.email_service import send_otp_email, send_password_reset_email

User = get_user_model()
logger = logging.getLogger(__name__)

def generate_secure_otp():
    """Generates a secure 6-digit numeric OTP code."""
    return "".join(secrets.choice("0123456789") for _ in range(6))

class SignupView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = SignupSerializer(data=request.data)
        if not serializer.is_valid():
            return Response({
                "success": False,
                "message": "Validation failed.",
                "errors": serializer.errors
            }, status=status.HTTP_400_BAD_REQUEST)

        email = serializer.validated_data['email']
        name = serializer.validated_data['name']
        password = serializer.validated_data['password']

        # Parse name
        parts = name.strip().split()
        first_name = parts[0] if parts else ""
        last_name = " ".join(parts[1:]) if len(parts) > 1 else ""

        # Generate secure OTP
        otp_code = generate_secure_otp()
        otp_hash = make_password(otp_code)
        password_hash = make_password(password)

        expires_at = timezone.now() + timedelta(minutes=10)

        try:
            with transaction.atomic():
                # Overwrite or update existing OTP attempt for this email
                otp_record, created = EmailOTP.objects.update_or_create(
                    email=email,
                    defaults={
                        "otp_hash": otp_hash,
                        "first_name": first_name,
                        "last_name": last_name,
                        "password_hash": password_hash,
                        "expires_at": expires_at,
                        "is_verified": False
                    }
                )

            # Send OTP email
            email_sent = send_otp_email(email, otp_code)
            if not email_sent:
                logger.error(f"Failed to send OTP verification email to {email}.")
                return Response({
                    "success": False,
                    "message": "Failed to send verification email. Please try again.",
                    "errors": {"email": ["SMTP dispatch failed."]}
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

            return Response({
                "success": True,
                "message": "OTP verification code sent to your email.",
                "data": {"email": email}
            }, status=status.HTTP_200_OK)

        except Exception as e:
            logger.error(f"Signup process failed for {email}: {e}", exc_info=True)
            return Response({
                "success": False,
                "message": "An error occurred during signup.",
                "errors": {"non_field_errors": [str(e)]}
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class VerifyOTPView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = VerifyOTPSerializer(data=request.data)
        if not serializer.is_valid():
            return Response({
                "success": False,
                "message": "Validation failed.",
                "errors": serializer.errors
            }, status=status.HTTP_400_BAD_REQUEST)

        email = serializer.validated_data['email']
        otp = serializer.validated_data['otp']

        try:
            otp_record = EmailOTP.objects.get(email=email)
        except EmailOTP.DoesNotExist:
            return Response({
                "success": False,
                "message": "No verification process pending for this email.",
                "errors": {"email": ["No registration details found."]}
            }, status=status.HTTP_404_NOT_FOUND)

        if otp_record.is_verified:
            return Response({
                "success": False,
                "message": "This OTP has already been verified.",
                "errors": {"otp": ["OTP already verified."]}
            }, status=status.HTTP_400_BAD_REQUEST)

        if otp_record.is_expired():
            return Response({
                "success": False,
                "message": "This verification code has expired.",
                "errors": {"otp": ["Verification code expired."]}
            }, status=status.HTTP_400_BAD_REQUEST)

        # Check hash matching
        if not check_password(otp, otp_record.otp_hash):
            return Response({
                "success": False,
                "message": "Invalid verification code.",
                "errors": {"otp": ["Incorrect code."]}
            }, status=status.HTTP_400_BAD_REQUEST)

        try:
            with transaction.atomic():
                # Double-check email is not registered in user model during wait time
                if User.objects.filter(email=email).exists():
                    return Response({
                        "success": False,
                        "message": "This email has already been registered.",
                        "errors": {"email": ["User already exists."]}
                    }, status=status.HTTP_400_BAD_REQUEST)

                # Create user
                user = User(
                    username=email,
                    email=email,
                    first_name=otp_record.first_name,
                    last_name=otp_record.last_name,
                    password=otp_record.password_hash,
                    is_active=True,
                    is_verified=True
                )
                user.save()

                # Clean up / delete verification record
                otp_record.delete()

                # Generate simple JWT tokens
                refresh = RefreshToken.for_user(user)

                return Response({
                    "success": True,
                    "message": "Email verified and account created successfully.",
                    "data": {
                        "refresh": str(refresh),
                        "access": str(refresh.access_token),
                        "user": {
                            "id": user.id,
                            "email": user.email,
                            "username": user.username,
                            "first_name": user.first_name,
                            "last_name": user.last_name,
                        }
                    }
                }, status=status.HTTP_201_CREATED)

        except Exception as e:
            logger.error(f"OTP verification failed for {email}: {e}", exc_info=True)
            return Response({
                "success": False,
                "message": "Account creation failed.",
                "errors": {"non_field_errors": [str(e)]}
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class ResendOTPView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = ResendOTPSerializer(data=request.data)
        if not serializer.is_valid():
            return Response({
                "success": False,
                "message": "Validation failed.",
                "errors": serializer.errors
            }, status=status.HTTP_400_BAD_REQUEST)

        email = serializer.validated_data['email']

        try:
            otp_record = EmailOTP.objects.get(email=email)
        except EmailOTP.DoesNotExist:
            return Response({
                "success": False,
                "message": "No signup process found for this email.",
                "errors": {"email": ["No registration details found."]}
            }, status=status.HTTP_404_NOT_FOUND)

        now = timezone.now()

        # Rate Limiting: max 3 requests within 15 minutes
        if otp_record.last_resend_at:
            time_since_last = now - otp_record.last_resend_at
            if time_since_last < timedelta(minutes=15):
                if otp_record.resend_count >= 3:
                    return Response({
                        "success": False,
                        "message": "Too many resend attempts. Please wait 15 minutes.",
                        "errors": {"email": ["Rate limit exceeded. Please wait."]}
                    }, status=status.HTTP_429_TOO_MANY_REQUESTS)
            else:
                # Reset rate limiter count after 15 minutes window passes
                otp_record.resend_count = 0

        # Generate new OTP
        new_otp = generate_secure_otp()
        new_hash = make_password(new_otp)

        otp_record.otp_hash = new_hash
        otp_record.expires_at = now + timedelta(minutes=10)
        otp_record.resend_count += 1
        otp_record.last_resend_at = now
        otp_record.save()

        # Send email
        email_sent = send_otp_email(email, new_otp)
        if not email_sent:
            return Response({
                "success": False,
                "message": "Failed to resend email.",
                "errors": {"email": ["SMTP dispatch failed."]}
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        return Response({
            "success": True,
            "message": "A new verification code has been dispatched to your email.",
            "data": {"email": email}
        }, status=status.HTTP_200_OK)


class ForgotPasswordView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = ForgotPasswordSerializer(data=request.data)
        if not serializer.is_valid():
            return Response({
                "success": False,
                "message": "Validation failed.",
                "errors": serializer.errors
            }, status=status.HTTP_400_BAD_REQUEST)

        email = serializer.validated_data['email']

        # Check if user exists
        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            # Return success to prevent email enumeration attacks
            return Response({
                "success": True,
                "message": "If this email is registered, a password reset link has been sent.",
                "data": {}
            }, status=status.HTTP_200_OK)

        # Generate secure urlsafe token
        token = secrets.token_urlsafe(32)
        token_hash = make_password(token)
        expires_at = timezone.now() + timedelta(minutes=15)

        # Save to database
        PasswordResetToken.objects.create(
            email=email,
            token_hash=token_hash,
            expires_at=expires_at
        )

        # Construct link (e.g. pointing to frontend)
        reset_link = f"http://localhost:5173/reset-password?token={token}&email={email}"

        # Dispatch reset email
        email_sent = send_password_reset_email(email, reset_link)
        if not email_sent:
            return Response({
                "success": False,
                "message": "Failed to send password reset email.",
                "errors": {"email": ["SMTP dispatch failed."]}
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        return Response({
            "success": True,
            "message": "If this email is registered, a password reset link has been sent.",
            "data": {}
        }, status=status.HTTP_200_OK)


class ResetPasswordView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = ResetPasswordSerializer(data=request.data)
        if not serializer.is_valid():
            return Response({
                "success": False,
                "message": "Validation failed.",
                "errors": serializer.errors
            }, status=status.HTTP_400_BAD_REQUEST)

        email = serializer.validated_data['email']
        token = serializer.validated_data['token']
        new_password = serializer.validated_data['new_password']

        # Find matching reset tokens for email
        tokens = PasswordResetToken.objects.filter(email=email, is_used=False).order_by('-created_at')
        
        valid_token_obj = None
        for tok in tokens:
            if not tok.is_expired() and check_password(token, tok.token_hash):
                valid_token_obj = tok
                break

        if not valid_token_obj:
            return Response({
                "success": False,
                "message": "Invalid, expired, or already used password reset link.",
                "errors": {"token": ["Token verification failed."]}
            }, status=status.HTTP_400_BAD_REQUEST)

        try:
            with transaction.atomic():
                user = User.objects.get(email=email)
                user.set_password(new_password)
                user.save()

                # Mark token as used
                valid_token_obj.is_used = True
                valid_token_obj.save()

            return Response({
                "success": True,
                "message": "Your password has been successfully updated.",
                "data": {}
            }, status=status.HTTP_200_OK)

        except Exception as e:
            logger.error(f"Password reset failed for {email}: {e}", exc_info=True)
            return Response({
                "success": False,
                "message": "Failed to update password.",
                "errors": {"non_field_errors": [str(e)]}
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
