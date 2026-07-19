from rest_framework import serializers
from apps.bookings.models import Booking
from apps.users.serializers import UserSerializer
from apps.rides.serializers import RideSerializer

class BookingSerializer(serializers.ModelSerializer):
    passenger_details = UserSerializer(source='passenger', read_only=True)
    ride_details = RideSerializer(source='ride', read_only=True)
    payment_status = serializers.SerializerMethodField()

    class Meta:
        model = Booking
        fields = [
            'id', 'ride', 'passenger', 'seats_booked', 'pickup_location',
            'destination_location', 'status', 'created_at',
            'passenger_details', 'ride_details', 'payment_status'
        ]
        read_only_fields = ['passenger']

    def get_payment_status(self, obj):
        payment = obj.payments.first()
        return payment.payment_status if payment else 'no_payment'

    def create(self, validated_data):
        validated_data['passenger'] = self.context['request'].user
        ride = validated_data['ride']
        seats = validated_data['seats_booked']

        if ride.driver == self.context['request'].user:
            raise serializers.ValidationError("You cannot book your own offered ride.")

        if ride.available_seats < seats:
            raise serializers.ValidationError(f"Only {ride.available_seats} seats are available.")

        booking = super().create(validated_data)

        # Notify driver of new booking request
        from apps.notifications.models import Notification
        Notification.objects.create(
            recipient=ride.driver,
            title="New Ride Request!",
            message=f"Passenger {booking.passenger.username} has requested {booking.seats_booked} seat(s) on your ride from {ride.pickup_location} to {ride.destination_location}.",
            notification_type="booking_request"
        )

        return booking
