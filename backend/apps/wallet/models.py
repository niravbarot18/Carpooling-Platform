from django.db import models
from django.conf import settings

class Wallet(models.Model):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='wallet'
    )
    balance = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)

    def __str__(self):
        return f"{self.user.username}'s Wallet - Balance: {self.balance}"


class WalletTransaction(models.Model):
    TYPE_CHOICES = (
        ('recharge', 'Recharge'),
        ('ride_payment', 'Ride Payment'),
        ('ride_earning', 'Ride Earning'),
        ('refund', 'Refund'),
    )
    wallet = models.ForeignKey(
        Wallet,
        on_delete=models.CASCADE,
        related_name='transactions'
    )
    amount = models.DecimalField(max_digits=10, decimal_places=2, help_text="Positive for credits, negative for debits")
    transaction_type = models.CharField(max_length=20, choices=TYPE_CHOICES)
    reference_id = models.CharField(max_length=100, blank=True, help_text="e.g. Razorpay payment ID or Booking ID")
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Tx: {self.transaction_type} of {self.amount} for {self.wallet.user.username}"


from django.db.models.signals import post_save
from django.dispatch import receiver
from django.contrib.auth import get_user_model

User = get_user_model()

@receiver(post_save, sender=User)
def create_user_wallet(sender, instance, created, **kwargs):
    if created:
        Wallet.objects.get_or_create(user=instance, defaults={'balance': 0.00})

