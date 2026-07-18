from rest_framework import viewsets, permissions, status
from rest_framework.response import Response
from rest_framework.decorators import action
from django.db import transaction
from django.shortcuts import get_object_or_404
from django.utils import timezone

from .models import Booking
from .serializers import BookingSerializer
from rides.models import Ride
from rides.matching_engine import calculate_match_score
from wallet.models import Wallet, Transaction
from notifications.models import Notification

class BookingViewSet(viewsets.ModelViewSet):
    serializer_class = BookingSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        # Passengers see their own bookings
        # Drivers see bookings for their rides
        user = self.request.user
        return Booking.objects.select_related('ride', 'passenger').filter(
            models.Q(passenger=user) | models.Q(ride__driver=user)
        )

    def create(self, request, *args, **kwargs):
        ride_id = request.data.get('ride')
        seats_booked = int(request.data.get('seats_booked', 1))
        
        ride = get_object_or_404(Ride, id=ride_id)
        
        if ride.driver == request.user:
            return Response({"error": "You cannot book your own ride."}, status=status.HTTP_400_BAD_REQUEST)
            
        if ride.available_seats < seats_booked:
            return Response({"error": "Not enough available seats."}, status=status.HTTP_400_BAD_REQUEST)
            
        if Booking.objects.filter(ride=ride, passenger=request.user).exclude(status='Cancelled').exists():
            return Response({"error": "You already have an active booking request for this ride."}, status=status.HTTP_400_BAD_REQUEST)

        # Calculate match score at the time of booking
        match = calculate_match_score(
            ride.start_lat, ride.start_lng, 
            ride.end_lat, ride.end_lng, 
            timezone.now(), ride
        )

        with transaction.atomic():
            booking = Booking.objects.create(
                ride=ride,
                passenger=request.user,
                seats_booked=seats_booked,
                status='Pending',
                match_score=match['score']
            )
            
            # Send notification to driver
            Notification.objects.create(
                user=ride.driver,
                title="New Ride Request",
                message=f"{request.user.first_name or request.user.email} requested {seats_booked} seats for your ride.",
                notification_type='BookingRequest',
                related_id=str(booking.id)
            )

        serializer = self.get_serializer(booking)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        booking = self.get_object()
        ride = booking.ride
        
        if ride.driver != request.user:
            return Response({"error": "Only the driver can approve bookings."}, status=status.HTTP_403_FORBIDDEN)
            
        if booking.status != 'Pending':
            return Response({"error": f"Cannot approve booking in status {booking.status}"}, status=status.HTTP_400_BAD_REQUEST)
            
        if ride.available_seats < booking.seats_booked:
            return Response({"error": "No seats available to approve this booking."}, status=status.HTTP_400_BAD_REQUEST)

        fare = ride.price_per_seat * booking.seats_booked

        with transaction.atomic():
            # Check passenger wallet
            passenger_wallet, _ = Wallet.objects.get_or_create(user=booking.passenger)
            if passenger_wallet.balance < fare:
                return Response({"error": "Passenger has insufficient wallet balance."}, status=status.HTTP_400_BAD_REQUEST)
            
            # Update seat counts
            ride.available_seats -= booking.seats_booked
            ride.save()
            
            # Deduct passenger
            passenger_wallet.balance -= fare
            passenger_wallet.save()
            Transaction.objects.create(
                wallet=passenger_wallet,
                amount=fare,
                transaction_type='Debit',
                reference=f"Payment for Ride {ride.id} booking"
            )
            
            # Credit driver
            driver_wallet, _ = Wallet.objects.get_or_create(user=ride.driver)
            driver_wallet.balance += fare
            driver_wallet.save()
            Transaction.objects.create(
                wallet=driver_wallet,
                amount=fare,
                transaction_type='Credit',
                reference=f"Earnings from Ride {ride.id} booking"
            )
            
            # Save booking status
            booking.status = 'Approved'
            booking.paid = True
            booking.save()
            
            # Send Notification to passenger
            Notification.objects.create(
                user=booking.passenger,
                title="Ride Request Approved",
                message=f"Your ride request to {ride.end_address} has been approved by the driver.",
                notification_type='BookingApproval',
                related_id=str(ride.id)
            )

        return Response({"status": "Booking approved and payment processed successfully."})

    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        booking = self.get_object()
        ride = booking.ride
        
        if ride.driver != request.user:
            return Response({"error": "Only the driver can reject bookings."}, status=status.HTTP_403_FORBIDDEN)
            
        if booking.status != 'Pending':
            return Response({"error": f"Cannot reject booking in status {booking.status}"}, status=status.HTTP_400_BAD_REQUEST)

        with transaction.atomic():
            booking.status = 'Rejected'
            booking.save()
            
            Notification.objects.create(
                user=booking.passenger,
                title="Ride Request Rejected",
                message=f"Your ride request to {ride.end_address} was declined by the driver.",
                notification_type='BookingRejection',
                related_id=str(ride.id)
            )

        return Response({"status": "Booking request rejected."})

    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        booking = self.get_object()
        ride = booking.ride
        
        # Booking can be cancelled by the passenger, or by the driver (indirectly through cancelling ride)
        if booking.passenger != request.user and ride.driver != request.user:
            return Response({"error": "You do not have permission to cancel this booking."}, status=status.HTTP_403_FORBIDDEN)
            
        if booking.status in ['Cancelled', 'Rejected']:
            return Response({"error": "Booking is already inactive."}, status=status.HTTP_400_BAD_REQUEST)

        fare = ride.price_per_seat * booking.seats_booked

        with transaction.atomic():
            # If booking was approved and paid, process refund
            if booking.status == 'Approved' and booking.paid:
                # Refund passenger
                passenger_wallet, _ = Wallet.objects.get_or_create(user=booking.passenger)
                passenger_wallet.balance += fare
                passenger_wallet.save()
                Transaction.objects.create(
                    wallet=passenger_wallet,
                    amount=fare,
                    transaction_type='Credit',
                    reference=f"Refund for cancelled Ride {ride.id} booking"
                )
                
                # Debit driver
                driver_wallet, _ = Wallet.objects.get_or_create(user=ride.driver)
                driver_wallet.balance -= fare
                driver_wallet.save()
                Transaction.objects.create(
                    wallet=driver_wallet,
                    amount=fare,
                    transaction_type='Debit',
                    reference=f"Debit refund for cancelled Ride {ride.id} booking"
                )
                
                # Restore seats
                ride.available_seats += booking.seats_booked
                ride.save()
                
            booking.status = 'Cancelled'
            booking.save()
            
            # Notify driver if passenger cancelled, or vice versa
            if request.user == booking.passenger:
                Notification.objects.create(
                    user=ride.driver,
                    title="Booking Cancelled",
                    message=f"Passenger {booking.passenger.first_name or booking.passenger.email} cancelled their booking.",
                    notification_type='BookingCancellation',
                    related_id=str(booking.id)
                )
            else:
                Notification.objects.create(
                    user=booking.passenger,
                    title="Booking Cancelled",
                    message="Your booking was cancelled.",
                    notification_type='BookingCancellation',
                    related_id=str(booking.id)
                )

        return Response({"status": "Booking cancelled successfully."})
