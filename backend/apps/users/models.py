from django.db import models
from django.contrib.auth.models import AbstractUser

class User(AbstractUser):
    ROLE_CHOICES = (
        ('admin', 'Admin'),
        ('user', 'User'),
    )
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='user')
    phone_number = models.CharField(max_length=15, blank=True)
    organization = models.ForeignKey(
        'organizations.Organization',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='employees'
    )
    emergency_contact_name = models.CharField(max_length=100, blank=True)
    emergency_contact_phone = models.CharField(max_length=15, blank=True)
    profile_picture = models.ImageField(upload_to='profiles/', null=True, blank=True)
    is_verified = models.BooleanField(default=False)
    
    # Corporate coordinates
    reporting_manager = models.CharField(max_length=100, blank=True, default="Raj Patel")
    department = models.CharField(max_length=100, blank=True, default="Engineering")
    office_seat_desk = models.CharField(max_length=100, blank=True, default="Gandhinagar HQ")
    
    # Personal dashboard metrics
    co2_saved = models.DecimalField(max_digits=10, decimal_places=2, default=0.00, help_text="In kg")
    money_saved = models.DecimalField(max_digits=10, decimal_places=2, default=0.00, help_text="In local currency")
    total_distance = models.DecimalField(max_digits=10, decimal_places=2, default=0.00, help_text="In km")

    def __str__(self):
        return f"{self.username} ({self.get_role_display()})"


class SavedPlace(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='saved_places')
    name = models.CharField(max_length=100, help_text="e.g. Home, Work, HQ")
    address = models.CharField(max_length=255)
    latitude = models.DecimalField(max_digits=9, decimal_places=6)
    longitude = models.DecimalField(max_digits=9, decimal_places=6)

    def __str__(self):
        return f"{self.user.username} - {self.name}: {self.address}"


class OTPCode(models.Model):
    phone_number = models.CharField(max_length=20, default="")
    email = models.EmailField(default="")
    code = models.CharField(max_length=6)
    created_at = models.DateTimeField(auto_now_add=True)
    is_used = models.BooleanField(default=False)

    def is_valid(self):
        from django.utils import timezone
        from datetime import timedelta
        # Valid for 10 minutes, and not used yet
        return not self.is_used and (timezone.now() - self.created_at) < timedelta(minutes=10)

    def __str__(self):
        return f"{self.phone_number} - {self.code} ({'Used' if self.is_used else 'Active'})"
