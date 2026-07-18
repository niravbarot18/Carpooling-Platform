from rest_framework import viewsets, permissions, status
from rest_framework.response import Response
from rest_framework.decorators import action
from django.db import transaction

from .models import Wallet, Transaction
from .serializers import WalletSerializer
from notifications.models import Notification

class WalletViewSet(viewsets.ViewSet):
    permission_classes = [permissions.IsAuthenticated]

    def get_wallet(self):
        wallet, _ = Wallet.objects.get_or_create(user=self.request.user)
        return wallet

    def list(self, request):
        wallet = self.get_wallet()
        serializer = WalletSerializer(wallet)
        return Response(serializer.data)

    @action(detail=False, methods=['post'])
    def deposit(self, request):
        amount_str = request.data.get('amount')
        if not amount_str:
            return Response({"error": "Amount is required."}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            amount = float(amount_str)
            if amount <= 0:
                return Response({"error": "Amount must be positive."}, status=status.HTTP_400_BAD_REQUEST)
        except ValueError:
            return Response({"error": "Invalid amount format."}, status=status.HTTP_400_BAD_REQUEST)

        wallet = self.get_wallet()
        
        with transaction.atomic():
            from decimal import Decimal
            wallet.balance += Decimal(str(amount))
            wallet.save()
            
            Transaction.objects.create(
                wallet=wallet,
                amount=Decimal(str(amount)),
                transaction_type='Credit',
                reference="Simulated deposit of funds"
            )
            
            Notification.objects.create(
                user=request.user,
                title="Wallet Deposited",
                message=f"₹{amount:.2f} has been added to your wallet.",
                notification_type='WalletCredit'
            )

        serializer = WalletSerializer(wallet)
        return Response(serializer.data)
