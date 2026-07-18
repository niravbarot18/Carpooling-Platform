from rest_framework import viewsets, permissions, status
from rest_framework.response import Response
from rest_framework.decorators import action
from django.utils import timezone
from django.db import transaction
from django.db.models import Q
from decimal import Decimal

from .models import Trip
from .serializers import TripSerializer
from rides.models import Ride
from bookings.models import Booking
from notifications.models import Notification
from wallet.models import Wallet, Transaction

class TripViewSet(viewsets.ModelViewSet):
    serializer_class = TripSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        # Users see trips they are driver or passenger of
        user = self.request.user
        return Trip.objects.filter(
            Q(ride__driver=user) | Q(ride__bookings__passenger=user)
        ).distinct()

    @action(detail=True, methods=['post'])
    def start_trip(self, request, pk=None):
        trip = self.get_object()
        ride = trip.ride
        
        if ride.driver != request.user:
            return Response({"error": "Only the driver can start the ride."}, status=status.HTTP_403_FORBIDDEN)
            
        if trip.status != 'Scheduled':
            return Response({"error": f"Cannot start trip in status {trip.status}"}, status=status.HTTP_400_BAD_REQUEST)

        with transaction.atomic():
            trip.status = 'Ongoing'
            trip.start_time = timezone.now()
            trip.save()
            
            # Notify all approved passengers
            bookings = Booking.objects.filter(ride=ride, status='Approved')
            for booking in bookings:
                Notification.objects.create(
                    user=booking.passenger,
                    title="Ride Started",
                    message=f"Your ride with {request.user.first_name or request.user.email} has started. You can track the location live.",
                    notification_type='RideStarted',
                    related_id=str(trip.id)
                )

        serializer = self.get_serializer(trip)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def end_trip(self, request, pk=None):
        trip = self.get_object()
        ride = trip.ride
        
        if ride.driver != request.user:
            return Response({"error": "Only the driver can complete the ride."}, status=status.HTTP_403_FORBIDDEN)
            
        if trip.status != 'Ongoing':
            return Response({"error": f"Cannot complete a trip in status {trip.status}"}, status=status.HTTP_400_BAD_REQUEST)

        with transaction.atomic():
            trip.status = 'Completed'
            trip.end_time = timezone.now()
            trip.save()
            
            ride.status = 'Completed'
            ride.save()
            
            # Calculate passenger metrics and credit savings
            bookings = Booking.objects.filter(ride=ride, status='Approved')
            passenger_count = bookings.count()
            
            # Driver CO2 and fuel metrics are calculated based on carrying passengers
            # Formula: 1 km of carpooling saves roughly 0.12 kg of CO2 and 0.08 liters of fuel per passenger
            distance = ride.estimated_distance or 10.0
            total_co2 = round(distance * 0.12 * passenger_count, 2)
            total_fuel = round(distance * 0.08 * passenger_count, 2)
            
            # Update Driver stats
            driver = ride.driver
            driver.total_co2_saved += total_co2
            driver.total_fuel_saved += total_fuel
            # Driver saves money on shared fuel costs
            driver.total_money_saved += float(ride.price_per_seat * passenger_count)
            driver.save()
            
            # Credit Driver a bonus carbon credit of ₹50
            driver_wallet, _ = Wallet.objects.get_or_create(user=driver)
            driver_wallet.balance += Decimal('50.00')
            driver_wallet.save()
            Transaction.objects.create(
                wallet=driver_wallet,
                amount=Decimal('50.00'),
                transaction_type='Credit',
                reference=f"Carbon credit bonus for completed Ride #{ride.id}"
            )
            Notification.objects.create(
                user=driver,
                title="Ride Completed!",
                message=f"You saved {total_co2} kg of CO2. Earned ₹50 Carbon Credit bonus!",
                notification_type='WalletCredit'
            )

            # Update Passenger stats and notify
            for booking in bookings:
                passenger = booking.passenger
                passenger_co2 = round(distance * 0.12, 2)
                passenger_fuel = round(distance * 0.08, 2)
                
                passenger.total_co2_saved += passenger_co2
                passenger.total_fuel_saved += passenger_fuel
                # Passenger saves money relative to hailing a single taxi (approx. 2.5x savings)
                passenger.total_money_saved += float(ride.price_per_seat * Decimal('1.5'))
                passenger.save()
                
                Notification.objects.create(
                    user=passenger,
                    title="Ride Completed",
                    message=f"You arrived at your destination! You saved {passenger_co2} kg of CO2 on this commute.",
                    notification_type='RideCompleted',
                    related_id=str(trip.id)
                )

        serializer = self.get_serializer(trip)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def update_location(self, request, pk=None):
        trip = self.get_object()
        
        if trip.ride.driver != request.user:
            return Response({"error": "Only the driver can update location coordinates."}, status=status.HTTP_403_FORBIDDEN)
            
        lat = request.data.get('lat')
        lng = request.data.get('lng')
        
        if lat is None or lng is None:
            return Response({"error": "Latitude and longitude required."}, status=status.HTTP_400_BAD_REQUEST)
            
        trip.current_lat = float(lat)
        trip.current_lng = float(lng)
        trip.save()
        
        # In a real environment, we'd also push this coordinates update to Channels group,
        # which we'll configure in our WebSocket consumers!
        
        return Response({"status": "Location coordinates updated."})
