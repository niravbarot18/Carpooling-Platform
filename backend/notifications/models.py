from django.db import models
from django.conf import settings

class Notification(models.Model):
    TYPE_CHOICES = [
        ('BookingRequest', 'Booking Request'),
        ('BookingApproval', 'Booking Approved'),
        ('BookingRejection', 'Booking Rejected'),
        ('BookingCancellation', 'Booking Cancelled'),
        ('RideStarted', 'Ride Started'),
        ('RideCompleted', 'Ride Completed'),
        ('WalletCredit', 'Wallet Credited'),
        ('WalletDebit', 'Wallet Debited'),
    ]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='notifications'
    )
    title = models.CharField(max_length=150)
    message = models.TextField()
    notification_type = models.CharField(max_length=30, choices=TYPE_CHOICES)
    is_read = models.BooleanField(default=False)
    related_id = models.CharField(max_length=50, blank=True, null=True)  # ID of related entity, e.g. Ride ID or Booking ID

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def save(self, *args, **kwargs):
        is_new = self.pk is None
        super().save(*args, **kwargs)
        if is_new:
            try:
                from channels.layers import get_channel_layer
                from asgiref.sync import async_to_sync
                channel_layer = get_channel_layer()
                if channel_layer:
                    async_to_sync(channel_layer.group_send)(
                        f"user_{self.user.id}",
                        {
                            "type": "send_notification",
                            "notification": {
                                "id": self.id,
                                "title": self.title,
                                "message": self.message,
                                "notification_type": self.notification_type,
                                "is_read": self.is_read,
                                "related_id": self.related_id,
                                "created_at": self.created_at.isoformat() if self.created_at else None
                            }
                        }
                    )
            except Exception:
                pass

    def __str__(self):
        return f"Notification for {self.user.email} - {self.title} (Read: {self.is_read})"
