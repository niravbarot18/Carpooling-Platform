from django.db import models
from django.contrib.auth.models import AbstractUser

class User(AbstractUser):
    ROLE_CHOICES = (
        ('admin', 'Company Admin'),
        ('employee', 'Employee'),
    )
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='employee')
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
