from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from apps.payments.models import Payment
from apps.payments.serializers import PaymentSerializer

class PaymentViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = PaymentSerializer
    queryset = Payment.objects.all().order_by('-created_at')

    def get_queryset(self):
        # Users can view their own payments
        user = self.request.user
        return Payment.objects.filter(booking__passenger=user).order_by('-created_at')
