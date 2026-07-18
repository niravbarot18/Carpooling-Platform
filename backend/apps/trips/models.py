from django.db import models
from django.conf import settings

class Trip(models.Model):
    STATUS_CHOICES = (
        ('booked', 'Ride Booked'),
        ('started', 'Ride Started'),
        ('in_progress', 'Ride In Progress'),
        ('completed', 'Ride Completed'),
        ('cancelled', 'Ride Cancelled')
    )
    ride = models.OneToOneField(
        'rides.Ride',
        on_delete=models.CASCADE,
        related_name='trip'
    )
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='booked')
    driver_lat = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    driver_lng = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    started_at = models.DateTimeField(null=True, blank=True)
    ended_at = models.DateTimeField(null=True, blank=True)
    distance_covered = models.DecimalField(max_digits=10, decimal_places=2, default=0.00, help_text="In km")
    eta_minutes = models.IntegerField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Trip for {self.ride} - Status: {self.get_status_display()}"


class Rating(models.Model):
    booking = models.ForeignKey(
        'bookings.Booking',
        on_delete=models.CASCADE,
        related_name='ratings'
    )
    rater = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='given_ratings'
    )
    ratee = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='received_ratings'
    )
    rating = models.IntegerField(help_text="1 to 5 stars")
    review_text = models.TextField(blank=True)
    role_rated = models.CharField(max_length=20, choices=(('driver', 'Driver'), ('passenger', 'Passenger')))
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Rating {self.rating} from {self.rater.username} to {self.ratee.username}"


from django.db.models.signals import post_save
from django.dispatch import receiver
from apps.rides.models import Ride

@receiver(post_save, sender=Ride)
def create_ride_trip(sender, instance, created, **kwargs):
    if created:
        Trip.objects.get_or_create(ride=instance, defaults={'status': 'booked'})

