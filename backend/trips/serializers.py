from rest_framework import serializers
from .models import Trip
from rides.serializers import RideSerializer

class TripSerializer(serializers.ModelSerializer):
    ride_details = RideSerializer(source='ride', read_only=True)

    class Meta:
        model = Trip
        fields = ('id', 'ride', 'ride_details', 'status', 'start_time', 'end_time', 'current_lat', 'current_lng')
        read_only_fields = ('start_time', 'end_time', 'ride', 'ride_details')
