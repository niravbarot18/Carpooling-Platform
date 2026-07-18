from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone
from django.db import transaction
from django.db.models import Q
from apps.trips.models import Trip, Rating
from apps.trips.serializers import TripSerializer, RatingSerializer
from apps.rides.models import Ride
from apps.bookings.models import Booking
from apps.wallet.models import Wallet, WalletTransaction
from apps.notifications.models import Notification

class TripViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = TripSerializer

    def get_queryset(self):
        # Allow users to view trips they are driving or passenger on
        user = self.request.user
        return Trip.objects.filter(
            Q(ride__driver=user) | Q(ride__bookings__passenger=user)
        ).distinct().order_by('-created_at')


    @action(detail=True, methods=['post'], url_path='start')
    def start_trip(self, request, pk=None):
        trip = self.get_object()
        ride = trip.ride

        if ride.driver != request.user:
            return Response({"error": "Only the driver can start the trip."}, status=status.HTTP_403_FORBIDDEN)

        if trip.status != 'booked':
            return Response({"error": f"Cannot start trip from status: {trip.status}"}, status=status.HTTP_400_BAD_REQUEST)

        with transaction.atomic():
            trip.status = 'started'
            trip.started_at = timezone.now()
            trip.save()

            ride.status = 'active'
            ride.save()

            # Notify all booking passengers
            bookings = Booking.objects.filter(ride=ride, status='approved')
            for b in bookings:
                Notification.objects.create(
                    recipient=b.passenger,
                    title="Trip Started!",
                    message=f"Your ride from {ride.pickup_location} with driver {ride.driver.username} has started.",
                    notification_type="ride_started"
                )

        return Response({
            "message": "Trip started successfully.",
            "trip": TripSerializer(trip).data
        })

    @action(detail=True, methods=['post'], url_path='end')
    def end_trip(self, request, pk=None):
        trip = self.get_object()
        ride = trip.ride

        if ride.driver != request.user:
            return Response({"error": "Only the driver can end the trip."}, status=status.HTTP_403_FORBIDDEN)

        if trip.status not in ['started', 'in_progress']:
            return Response({"error": f"Cannot end trip from status: {trip.status}"}, status=status.HTTP_400_BAD_REQUEST)

        from decimal import Decimal
        with transaction.atomic():
            trip.status = 'completed'
            trip.ended_at = timezone.now()
            # Calculate distance (fallback to 12.5 km if not set)
            distance = trip.distance_covered if trip.distance_covered > 0 else Decimal('12.5')
            trip.distance_covered = distance
            trip.save()

            ride.status = 'completed'
            ride.save()

            # 1. Driver gets credited with earnings from all approved bookings
            bookings = Booking.objects.filter(ride=ride, status='approved')
            total_driver_earnings = Decimal('0.00')
            
            for b in bookings:
                fare = Decimal(str(b.seats_booked)) * Decimal(str(ride.fare_per_seat))
                payment = Payment.objects.filter(booking=b).first()

                if payment and payment.payment_status == 'pending':
                    total_driver_earnings += fare

                    # Deduct fare from passenger's wallet
                    passenger_wallet, _ = Wallet.objects.get_or_create(user=b.passenger)
                    passenger_wallet.balance -= fare
                    passenger_wallet.save()

                    # Create passenger wallet transaction log
                    WalletTransaction.objects.create(
                        wallet=passenger_wallet,
                        amount=-fare,
                        transaction_type='ride_payment',
                        reference_id=f"BOOK-{b.id}"
                    )

                    # Transition Payment record from pending to completed
                    payment.payment_status = 'completed'
                    payment.save()
                else:
                    # Passenger paid early, skip charging/crediting
                    pass

                # Increment passenger statistics
                passenger = b.passenger
                passenger.total_distance += Decimal(str(distance))
                # CO2 saved math: ~0.15kg saved per km by pooling
                passenger.co2_saved += Decimal(str(distance)) * Decimal(str(b.seats_booked)) * Decimal('0.15')
                # Money saved math: taking private taxi is ~2.5x more expensive
                passenger.money_saved += fare * Decimal('1.5')
                passenger.save()

                # Notify passenger
                Notification.objects.create(
                    recipient=passenger,
                    title="Trip Completed & Wallet Charged!",
                    message=f"Your ride from {ride.pickup_location} has completed. Fare of {fare} has been charged to your wallet.",
                    notification_type="ride_completed"
                )

            # Credit driver wallet
            if total_driver_earnings > 0:
                driver_wallet, _ = Wallet.objects.get_or_create(user=ride.driver)
                driver_wallet.balance += total_driver_earnings
                driver_wallet.save()

                WalletTransaction.objects.create(
                    wallet=driver_wallet,
                    amount=total_driver_earnings,
                    transaction_type='ride_earning',
                    reference_id=f"TRIP-{trip.id}"
                )

            # Increment driver statistics
            driver = ride.driver
            driver.total_distance += Decimal(str(distance))
            driver.co2_saved += Decimal(str(distance)) * Decimal('0.15') * Decimal(str(len(bookings)))
            driver.money_saved += total_driver_earnings # Driver earns money they otherwise wouldn't have
            driver.save()

        return Response({
            "message": "Trip ended and earnings distributed successfully.",
            "trip": TripSerializer(trip).data
        })

    @action(detail=True, methods=['post'], url_path='update-location')
    def update_location(self, request, pk=None):
        trip = self.get_object()
        if trip.ride.driver != request.user:
            return Response({"error": "Only the driver can update GPS coordinates."}, status=status.HTTP_403_FORBIDDEN)

        lat = request.data.get('latitude')
        lng = request.data.get('longitude')
        eta = request.data.get('eta_minutes')
        distance = request.data.get('distance_covered')

        if lat is not None:
            trip.driver_lat = lat
        if lng is not None:
            trip.driver_lng = lng
        if eta is not None:
            trip.eta_minutes = eta
        if distance is not None:
            trip.distance_covered = distance
        
        # Transition status to in_progress if it was started
        if trip.status == 'started':
            trip.status = 'in_progress'

        trip.save()
        return Response({
            "message": "Location updated successfully.",
            "trip": TripSerializer(trip).data
        })


class RatingViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = RatingSerializer
    queryset = Rating.objects.all()

    def get_queryset(self):
        # Ratings involving the user
        user = self.request.user
        return Rating.objects.filter(Q(rater=user) | Q(ratee=user))
