from rest_framework import serializers
from apps.wallet.models import Wallet, WalletTransaction
from apps.users.serializers import UserSerializer

class WalletTransactionSerializer(serializers.ModelSerializer):
    class Meta:
        model = WalletTransaction
        fields = '__all__'


class WalletSerializer(serializers.ModelSerializer):
    user_details = UserSerializer(source='user', read_only=True)
    transactions = WalletTransactionSerializer(many=True, read_only=True)

    class Meta:
        model = Wallet
        fields = ['id', 'user', 'user_details', 'balance', 'transactions']
        read_only_fields = ['balance']
