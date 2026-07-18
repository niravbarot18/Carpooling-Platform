from django.db import models

class Payment(models.Model):
    METHOD_CHOICES = (
        ('wallet', 'Wallet'),
        ('card', 'Card'),
        ('upi', 'UPI'),
        ('cash', 'Cash'),
    )
    STATUS_CHOICES = (
        ('pending', 'Pending'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
        ('refunded', 'Refunded'),
    )
    booking = models.ForeignKey(
        'bookings.Booking',
        on_delete=models.CASCADE,
        related_name='payments'
    )
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    payment_method = models.CharField(max_length=20, choices=METHOD_CHOICES, default='wallet')
    payment_status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    
    # Razorpay payment gateways fields
    razorpay_order_id = models.CharField(max_length=100, blank=True)
    razorpay_payment_id = models.CharField(max_length=100, blank=True)
    razorpay_signature = models.CharField(max_length=200, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Payment of {self.amount} for Booking {self.booking.id} - Status: {self.payment_status}"
