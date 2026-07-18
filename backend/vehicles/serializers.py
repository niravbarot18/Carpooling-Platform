from rest_framework import serializers
from .models import Vehicle

class VehicleSerializer(serializers.ModelSerializer):
    user = serializers.ReadOnlyField(source='user.email')

    class Meta:
        model = Vehicle
        fields = ('id', 'user', 'name', 'registration_number', 'capacity', 'fuel_type', 'is_default', 'created_at')
        read_only_fields = ('created_at',)
