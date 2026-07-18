from rest_framework import serializers
from .models import Wallet, Transaction

class TransactionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Transaction
        fields = ('id', 'amount', 'transaction_type', 'reference', 'created_at')


class WalletSerializer(serializers.ModelSerializer):
    transactions = TransactionSerializer(many=True, read_only=True)
    user = serializers.ReadOnlyField(source='user.email')

    class Meta:
        model = Wallet
        fields = ('id', 'user', 'balance', 'transactions', 'created_at', 'updated_at')
        read_only_fields = ('balance', 'created_at', 'updated_at')
