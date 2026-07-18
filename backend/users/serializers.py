from rest_framework import serializers
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from wallet.models import Wallet

User = get_user_model()

class UserSerializer(serializers.ModelSerializer):
    wallet_balance = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = (
            'id', 'username', 'email', 'first_name', 'last_name',
            'phone', 'department', 'employee_id', 'avatar_url',
            'average_rating', 'total_co2_saved', 'total_fuel_saved',
            'total_money_saved', 'wallet_balance'
        )
        read_only_fields = ('average_rating', 'total_co2_saved', 'total_fuel_saved', 'total_money_saved', 'wallet_balance')

    def get_wallet_balance(self, obj):
        try:
            return obj.wallet.balance
        except Wallet.DoesNotExist:
            return 0.00


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        # Authenticate using standard credentials (email as username field in our model)
        data = super().validate(attrs)
        
        # Serialize the user profile
        user_serializer = UserSerializer(self.user)
        data['user'] = user_serializer.data
        return data


class UserRegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = ('email', 'username', 'password', 'first_name', 'last_name', 'phone', 'department', 'employee_id')

    def create(self, validated_data):
        user = User.objects.create_user(
            email=validated_data['email'],
            username=validated_data['username'],
            password=validated_data['password'],
            first_name=validated_data.get('first_name', ''),
            last_name=validated_data.get('last_name', ''),
            phone=validated_data.get('phone', ''),
            department=validated_data.get('department', 'Engineering'),
            employee_id=validated_data.get('employee_id', ''),
        )
        # Create a wallet for the user automatically with a sign-up bonus of ₹1000!
        Wallet.objects.create(user=user, balance=1000.00)
        return user
