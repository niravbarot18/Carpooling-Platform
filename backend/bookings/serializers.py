from rest_framework import serializers
from .models import Booking
from rides.serializers import RideSerializer
from users.serializers import UserSerializer

class BookingSerializer(serializers.ModelSerializer):
    passenger = UserSerializer(read_only=True)
    ride_details = RideSerializer(source='ride', read_only=True)

    class Meta:
        model = Booking
        fields = (
            'id', 'ride', 'ride_details', 'passenger',
            'seats_booked', 'status', 'paid',
            'match_score', 'created_at', 'updated_at'
        )
        read_only_fields = ('status', 'paid', 'match_score', 'passenger', 'created_at', 'updated_at')
