from django.db import models
from rides.models import Ride

class Trip(models.Model):
    STATUS_CHOICES = [
        ('Scheduled', 'Scheduled'),
        ('Ongoing', 'Ongoing'),
        ('Completed', 'Completed'),
        ('Cancelled', 'Cancelled'),
    ]

    ride = models.OneToOneField(
        Ride,
        on_delete=models.CASCADE,
        related_name='trip'
    )
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='Scheduled')
    start_time = models.DateTimeField(null=True, blank=True)
    end_time = models.DateTimeField(null=True, blank=True)
    
    # Real-time tracking coordinates
    current_lat = models.FloatField(null=True, blank=True)
    current_lng = models.FloatField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Trip for Ride {self.ride.id} - Status: {self.status}"
