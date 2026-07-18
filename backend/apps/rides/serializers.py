from rest_framework import serializers
from apps.rides.models import Ride
from apps.users.serializers import UserSerializer
from apps.vehicles.serializers import VehicleSerializer
from apps.vehicles.models import Vehicle

class RideSerializer(serializers.ModelSerializer):
    driver_details = UserSerializer(source='driver', read_only=True)
    vehicle_details = VehicleSerializer(source='vehicle', read_only=True)
    vehicle = serializers.PrimaryKeyRelatedField(queryset=Vehicle.objects.all(), required=True)
    pickup_latitude = serializers.FloatField()
    pickup_longitude = serializers.FloatField()
    destination_latitude = serializers.FloatField()
    destination_longitude = serializers.FloatField()

    class Meta:
        model = Ride
        fields = '__all__'
        read_only_fields = ['driver']

    def create(self, validated_data):
        validated_data['driver'] = self.context['request'].user
        # Verify vehicle belongs to the driver
        vehicle = validated_data['vehicle']
        if vehicle.owner != self.context['request'].user:
            raise serializers.ValidationError("You can only offer a ride in your own vehicle.")
        return super().create(validated_data)
