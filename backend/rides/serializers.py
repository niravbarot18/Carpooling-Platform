from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import Ride
from vehicles.models import Vehicle
from vehicles.serializers import VehicleSerializer
from users.serializers import UserSerializer

User = get_user_model()

class RideSerializer(serializers.ModelSerializer):
    driver = UserSerializer(read_only=True)
    vehicle = VehicleSerializer(read_only=True)
    vehicle_id = serializers.PrimaryKeyRelatedField(
        queryset=Vehicle.objects.all(),
        source='vehicle',
        write_only=True
    )
    match_details = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Ride
        fields = (
            'id', 'driver', 'vehicle', 'vehicle_id',
            'start_address', 'start_lat', 'start_lng',
            'end_address', 'end_lat', 'end_lng', 'route_polyline',
            'departure_time', 'total_seats', 'available_seats',
            'price_per_seat', 'status', 'estimated_distance',
            'estimated_duration', 'estimated_co2_saved',
            'estimated_fuel_saved', 'created_at', 'match_details'
        )
        read_only_fields = ('available_seats', 'created_at', 'driver', 'vehicle')

    def get_match_details(self, obj):
        # This will be injected dynamically inside the view if search parameters are present
        request = self.context.get('request')
        if not request:
            return None
            
        # Get query parameters from the request
        try:
            p_lat = float(request.query_params.get('start_lat', ''))
            p_lng = float(request.query_params.get('start_lng', ''))
            p_end_lat = float(request.query_params.get('end_lat', ''))
            p_end_lng = float(request.query_params.get('end_lng', ''))
            p_time = request.query_params.get('departure_time', '')
            
            from .matching_engine import calculate_match_score
            return calculate_match_score(p_lat, p_lng, p_end_lat, p_end_lng, p_time, obj)
        except (ValueError, TypeError):
            # No search parameters or invalid format, return default match score (100% or empty)
            return None

    def create(self, validated_data):
        # Auto-compute environmental savings if not provided
        # Formula: 1 km of carpooling saves roughly 0.12 kg of CO2 and 0.08 liters of fuel per passenger
        distance = validated_data.get('estimated_distance', 10.0)
        seats = validated_data.get('total_seats', 4)
        
        if not validated_data.get('estimated_co2_saved'):
            validated_data['estimated_co2_saved'] = round(distance * 0.12 * (seats - 1), 2)
        if not validated_data.get('estimated_fuel_saved'):
            validated_data['estimated_fuel_saved'] = round(distance * 0.08 * (seats - 1), 2)
            
        validated_data['available_seats'] = seats
        return super().create(validated_data)
