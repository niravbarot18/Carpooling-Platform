from django.db import models
from django.conf import settings
from django.db.models.signals import post_save
from django.dispatch import receiver
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync

class Notification(models.Model):
    recipient = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='notifications'
    )
    title = models.CharField(max_length=150)
    message = models.TextField()
    notification_type = models.CharField(max_length=50, help_text="e.g. booking_request, booking_approved, ride_started, wallet_recharged")
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Notification '{self.title}' for {self.recipient.username}"


@receiver(post_save, sender=Notification)
def broadcast_notification(sender, instance, created, **kwargs):
    if created:
        channel_layer = get_channel_layer()
        if channel_layer:
            async_to_sync(channel_layer.group_send)(
                f"user_{instance.recipient.id}",
                {
                    "type": "notification_send",
                    "notification": {
                        "id": instance.id,
                        "title": instance.title,
                        "message": instance.message,
                        "notification_type": instance.notification_type,
                        "is_read": instance.is_read,
                        "created_at": instance.created_at.isoformat()
                    }
                }
            )
