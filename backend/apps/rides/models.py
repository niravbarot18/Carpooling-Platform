from django.db import models
from django.conf import settings

class Ride(models.Model):
    STATUS_CHOICES = (
        ('pending', 'Pending'),
        ('active', 'Active'),
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled'),
    )
    driver = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='offered_rides'
    )
    vehicle = models.ForeignKey(
        'vehicles.Vehicle',
        on_delete=models.CASCADE,
        related_name='rides'
    )
    pickup_location = models.CharField(max_length=255)
    pickup_latitude = models.DecimalField(max_digits=9, decimal_places=6)
    pickup_longitude = models.DecimalField(max_digits=9, decimal_places=6)
    destination_location = models.CharField(max_length=255)
    destination_latitude = models.DecimalField(max_digits=9, decimal_places=6)
    destination_longitude = models.DecimalField(max_digits=9, decimal_places=6)
    travel_date = models.DateField()
    travel_time = models.TimeField()
    available_seats = models.PositiveIntegerField()
    fare_per_seat = models.DecimalField(max_digits=10, decimal_places=2)
    route_preview = models.JSONField(null=True, blank=True, help_text="Stores route coordinates list or GeoJSON")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    recurring = models.BooleanField(default=False)
    recurring_pattern = models.CharField(max_length=50, blank=True, null=True, help_text="e.g. Daily, Weekly")
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Ride from {self.pickup_location} to {self.destination_location} by {self.driver.username}"
