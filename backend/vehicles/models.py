from django.db import models
from django.conf import settings

class Vehicle(models.Model):
    FUEL_CHOICES = [
        ('Petrol', 'Petrol'),
        ('Diesel', 'Diesel'),
        ('EV', 'Electric Vehicle'),
        ('Hybrid', 'Hybrid'),
    ]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='vehicles'
    )
    name = models.CharField(max_length=100)  # e.g., Tesla Model 3, Honda Civic
    registration_number = models.CharField(max_length=50, unique=True)  # e.g., MH12AB1234
    capacity = models.IntegerField(default=4)  # total seat capacity including driver
    fuel_type = models.CharField(max_length=20, choices=FUEL_CHOICES, default='Petrol')
    is_default = models.BooleanField(default=False)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):
        # If this vehicle is set as default, unset other vehicles for this user
        if self.is_default:
            Vehicle.objects.filter(user=self.user, is_default=True).exclude(pk=self.pk).update(is_default=False)
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.name} - {self.registration_number} ({self.user.email})"
