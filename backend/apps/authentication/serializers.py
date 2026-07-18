from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.core.validators import validate_email
from django.core.exceptions import ValidationError

User = get_user_model()

class SignupSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=255, required=True)
    email = serializers.EmailField(required=True)
    password = serializers.CharField(min_length=8, write_only=True, required=True)

    def validate_email(self, value):
        value = value.lower().strip()
        try:
            validate_email(value)
        except ValidationError:
            raise serializers.ValidationError("Invalid email address format.")
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("Email already registered.")
        return value


class VerifyOTPSerializer(serializers.Serializer):
    email = serializers.EmailField(required=True)
    otp = serializers.CharField(max_length=6, min_length=6, required=True)

    def validate_email(self, value):
        return value.lower().strip()


class ResendOTPSerializer(serializers.Serializer):
    email = serializers.EmailField(required=True)

    def validate_email(self, value):
        return value.lower().strip()


class ForgotPasswordSerializer(serializers.Serializer):
    email = serializers.EmailField(required=True)

    def validate_email(self, value):
        return value.lower().strip()


class ResetPasswordSerializer(serializers.Serializer):
    email = serializers.EmailField(required=True)
    token = serializers.CharField(required=True)
    new_password = serializers.CharField(min_length=8, write_only=True, required=True)

    def validate_email(self, value):
        return value.lower().strip()
