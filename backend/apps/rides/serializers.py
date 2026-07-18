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
        driver = self.context['request'].user
        validated_data['driver'] = driver
        
        # Verify vehicle belongs to the driver
        vehicle = validated_data['vehicle']
        if vehicle.owner != driver:
            raise serializers.ValidationError("You can only offer a ride in your own vehicle.")

        # Enforce administrative system configuration parameters
        from apps.organizations.models import SystemConfiguration
        config_obj, _ = SystemConfiguration.objects.get_or_create(id=1)

        # 1. Driver verification constraint check
        if config_obj.require_license_for_driver and not driver.is_verified:
            raise serializers.ValidationError("Your driver profile is not verified by admin. Please contact support to upload your driving license.")

        # 2. Capacity seat limit check
        seats = validated_data.get('available_seats', 0)
        if seats > config_obj.max_seats_limit:
            raise serializers.ValidationError(f"Cannot offer a ride with {seats} seats. The corporate maximum limit is {config_obj.max_seats_limit} seats.")

        return super().create(validated_data)
