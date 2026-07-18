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

    @action(detail=False, methods=['post'], url_path='create-razorpay-order')
    def create_razorpay_order(self, request):
        amount = request.data.get('amount')
        if not amount:
            return Response({"error": "Please provide a recharge amount."}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            amount_dec = float(amount)
            if amount_dec <= 0:
                raise ValueError()
        except ValueError:
            return Response({"error": "Please provide a valid positive amount."}, status=status.HTTP_400_BAD_REQUEST)

        from django.conf import settings
        key_id = getattr(settings, 'RAZORPAY_KEY_ID', '')
        key_secret = getattr(settings, 'RAZORPAY_KEY_SECRET', '')

        # Fallback if Razorpay credentials are not provided
        if not key_id or not key_secret:
            order_id = f"order_mock_{uuid.uuid4().hex[:12]}"
            return Response({
                "order_id": order_id,
                "amount": amount_dec,
                "currency": "INR",
                "key_id": "mock_key_id",
                "is_mock": True
            })

        import razorpay
        try:
            client = razorpay.Client(auth=(key_id, key_secret))
            order_data = {
                'amount': int(amount_dec * 100),  # In paise
                'currency': 'INR',
                'payment_capture': 1
            }
            order = client.order.create(data=order_data)
            return Response({
                "order_id": order['id'],
                "amount": amount_dec,
                "currency": "INR",
                "key_id": key_id,
                "is_mock": False
            })
        except Exception as e:
            return Response({"error": f"Failed to initialize Razorpay checkout: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['post'], url_path='verify-recharge')
    def verify_recharge(self, request):
        amount = request.data.get('amount')
        is_mock = request.data.get('is_mock', False)
        razorpay_payment_id = request.data.get('razorpay_payment_id')
        razorpay_order_id = request.data.get('razorpay_order_id')
        razorpay_signature = request.data.get('razorpay_signature')

        if not amount or not razorpay_payment_id:
            return Response({"error": "Missing required transaction information."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            amount_dec = float(amount)
        except ValueError:
            return Response({"error": "Invalid amount payload."}, status=status.HTTP_400_BAD_REQUEST)

        from django.conf import settings
        key_id = getattr(settings, 'RAZORPAY_KEY_ID', '')
        key_secret = getattr(settings, 'RAZORPAY_KEY_SECRET', '')

        # Only check signatures if keys are configured and it's not a sandbox/mock transaction
        if key_id and key_secret and not is_mock:
            import razorpay
            try:
                client = razorpay.Client(auth=(key_id, key_secret))
                client.utility.verify_payment_signature({
                    'razorpay_order_id': razorpay_order_id,
                    'razorpay_payment_id': razorpay_payment_id,
                    'razorpay_signature': razorpay_signature
                })
            except Exception as e:
                return Response({"error": "Razorpay payment verification failed."}, status=status.HTTP_400_BAD_REQUEST)

        # Successful payment, apply recharge in atomic transaction
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
            "message": "Recharge processed successfully.",
            "balance": wallet.balance,
            "transaction": WalletTransactionSerializer(tx).data
        })
