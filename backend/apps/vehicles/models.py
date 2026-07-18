from django.db import models
from django.conf import settings

class Vehicle(models.Model):
    FUEL_CHOICES = (
        ('petrol', 'Petrol'),
        ('diesel', 'Diesel'),
        ('cng', 'CNG'),
        ('electric', 'Electric'),
    )
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='vehicles'
    )
    name = models.CharField(max_length=100, help_text="e.g. Honda City, Tesla Model 3")
    registration_number = models.CharField(max_length=50, unique=True)
    fuel_type = models.CharField(max_length=20, choices=FUEL_CHOICES, default='petrol')
    color = models.CharField(max_length=50)
    mileage = models.DecimalField(max_digits=5, decimal_places=2, help_text="km per liter or km per kWh")
    seat_capacity = models.PositiveIntegerField(default=4)
    vehicle_image = models.ImageField(upload_to='vehicles/', null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.name} ({self.registration_number})"
