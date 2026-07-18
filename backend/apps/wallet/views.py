from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db import transaction
import uuid
from apps.wallet.models import Wallet, WalletTransaction
from apps.wallet.serializers import WalletSerializer, WalletTransactionSerializer

class WalletViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = WalletSerializer

    def get_queryset(self):
        return Wallet.objects.filter(user=self.request.user)

    def list(self, request, *args, **kwargs):
        # Always return the current user's wallet (singleton per user)
        wallet, _ = Wallet.objects.get_or_create(user=request.user)
        serializer = self.get_serializer(wallet)
        return Response(serializer.data)

    @action(detail=False, methods=['post'], url_path='recharge')
    def recharge(self, request):
        amount = request.data.get('amount')
        razorpay_payment_id = request.data.get('razorpay_payment_id', f"pay_{uuid.uuid4().hex[:12]}")

        if not amount:
            return Response({"error": "Please provide an amount to recharge."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            amount_dec = float(amount)
            if amount_dec <= 0:
                raise ValueError()
        except ValueError:
            return Response({"error": "Please provide a valid positive amount."}, status=status.HTTP_400_BAD_REQUEST)

        wallet, _ = Wallet.objects.get_or_create(user=request.user)

        with transaction.atomic():
            wallet.balance += type(wallet.balance)(amount_dec)
            wallet.save()

            tx = WalletTransaction.objects.create(
                wallet=wallet,
                amount=amount_dec,
                transaction_type='recharge',
                reference_id=razorpay_payment_id
            )

        return Response({
            "message": f"Successfully recharged wallet with {amount_dec}.",
            "balance": wallet.balance,
            "transaction": WalletTransactionSerializer(tx).data
        })
