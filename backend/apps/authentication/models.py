from django.db import models
from django.utils import timezone
from datetime import timedelta

class EmailOTP(models.Model):
    email = models.EmailField(unique=True)
    otp_hash = models.CharField(max_length=128)
    first_name = models.CharField(max_length=150, blank=True)
    last_name = models.CharField(max_length=150, blank=True)
    password_hash = models.CharField(max_length=128, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    is_verified = models.BooleanField(default=False)
    resend_count = models.IntegerField(default=0)
    last_resend_at = models.DateTimeField(null=True, blank=True)

    def is_expired(self):
        return timezone.now() > self.expires_at

    def __str__(self):
        return f"{self.email} - OTP (Expired: {self.is_expired()})"


class PasswordResetToken(models.Model):
    email = models.EmailField()
    token_hash = models.CharField(max_length=128)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    is_used = models.BooleanField(default=False)

    def is_expired(self):
        return timezone.now() > self.expires_at

    def __str__(self):
        return f"{self.email} - Reset Token (Expired: {self.is_expired()})"
