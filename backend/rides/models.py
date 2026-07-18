from django.db import models
from django.conf import settings
from vehicles.models import Vehicle

class Ride(models.Model):
    STATUS_CHOICES = [
        ('Draft', 'Draft'),
        ('Published', 'Published'),
        ('Cancelled', 'Cancelled'),
        ('Completed', 'Completed'),
    ]

    driver = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='rides_offered'
    )
    vehicle = models.ForeignKey(
        Vehicle,
        on_delete=models.SET_NULL,
        null=True,
        related_name='rides'
    )
    start_address = models.CharField(max_length=255)
    start_lat = models.FloatField()
    start_lng = models.FloatField()
    end_address = models.CharField(max_length=255)
    end_lat = models.FloatField()
    end_lng = models.FloatField()
    
    # Text field containing JSON coordinates or encoded polyline representation of the route
    route_polyline = models.TextField(blank=True, null=True) 
    
    departure_time = models.DateTimeField()
    total_seats = models.IntegerField(default=4)  # available for passengers
    available_seats = models.IntegerField(default=4)
    price_per_seat = models.DecimalField(max_digits=10, decimal_places=2, default=0.0)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='Published')
    
    estimated_distance = models.FloatField(default=0.0)  # in km
    estimated_duration = models.FloatField(default=0.0)  # in minutes
    estimated_co2_saved = models.FloatField(default=0.0)  # in kg
    estimated_fuel_saved = models.FloatField(default=0.0) # in liters
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Ride from {self.start_address} to {self.end_address} by {self.driver.email}"
