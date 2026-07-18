from django.db import models
from django.conf import settings
from rides.models import Ride

class Booking(models.Model):
    STATUS_CHOICES = [
        ('Pending', 'Pending'),
        ('Approved', 'Approved'),
        ('Rejected', 'Rejected'),
        ('Cancelled', 'Cancelled'),
    ]

    ride = models.ForeignKey(
        Ride,
        on_delete=models.CASCADE,
        related_name='bookings'
    )
    passenger = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='bookings'
    )
    seats_booked = models.IntegerField(default=1)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='Pending')
    paid = models.BooleanField(default=False)
    match_score = models.FloatField(default=0.0)  # Calculated match % at time of booking

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('ride', 'passenger')  # A passenger can book a ride only once

    def __str__(self):
        return f"Booking of {self.seats_booked} seats on {self.ride.id} by {self.passenger.email}"
