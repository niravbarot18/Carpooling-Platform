from rest_framework import serializers
from apps.bookings.models import Booking
from apps.users.serializers import UserSerializer
from apps.rides.serializers import RideSerializer

class BookingSerializer(serializers.ModelSerializer):
    passenger_details = UserSerializer(source='passenger', read_only=True)
    ride_details = RideSerializer(source='ride', read_only=True)

    class Meta:
        model = Booking
        fields = '__all__'
        read_only_fields = ['passenger']

    def create(self, validated_data):
        validated_data['passenger'] = self.context['request'].user
        ride = validated_data['ride']
        seats = validated_data['seats_booked']

        if ride.driver == self.context['request'].user:
            raise serializers.ValidationError("You cannot book your own offered ride.")

        if ride.available_seats < seats:
            raise serializers.ValidationError(f"Only {ride.available_seats} seats are available.")

        return super().create(validated_data)
