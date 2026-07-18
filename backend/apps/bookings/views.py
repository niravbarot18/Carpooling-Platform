from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db import transaction
from django.db.models import Q
from apps.bookings.models import Booking
from apps.bookings.serializers import BookingSerializer
from apps.wallet.models import Wallet, WalletTransaction
from apps.payments.models import Payment
from apps.notifications.models import Notification

class BookingViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = BookingSerializer

    def get_queryset(self):
        user = self.request.user
        role_type = self.request.query_params.get('role_type') # 'driver' or 'passenger'
        
        if role_type == 'driver':
            return Booking.objects.filter(ride__driver=user).order_by('-created_at')
        elif role_type == 'passenger':
            return Booking.objects.filter(passenger=user).order_by('-created_at')
        
        return Booking.objects.filter(Q(passenger=user) | Q(ride__driver=user)).order_by('-created_at')

    @action(detail=True, methods=['post'], url_path='approve')
    def approve(self, request, pk=None):
        booking = self.get_object()
        ride = booking.ride

        if ride.driver != request.user:
            return Response({"error": "Only the driver can approve this booking."}, status=status.HTTP_403_FORBIDDEN)

        if booking.status != 'pending':
            return Response({"error": f"Booking is already {booking.status}."}, status=status.HTTP_400_BAD_REQUEST)

        if ride.available_seats < booking.seats_booked:
            return Response({"error": "Not enough available seats in the ride."}, status=status.HTTP_400_BAD_REQUEST)

        # Core payment check: Passenger must have enough wallet balance
        total_fare = booking.seats_booked * ride.fare_per_seat
        passenger_wallet, _ = Wallet.objects.get_or_create(user=booking.passenger)
        
        if passenger_wallet.balance < total_fare:
            return Response({"error": "Passenger has insufficient wallet balance. Request them to recharge."}, status=status.HTTP_400_BAD_REQUEST)

        with transaction.atomic():
            # 1. Deduct seats
            ride.available_seats -= booking.seats_booked
            ride.save()

            # 2. Update booking status
            booking.status = 'approved'
            booking.save()

            # 3. Deduct fare from passenger's wallet
            passenger_wallet.balance -= total_fare
            passenger_wallet.save()

            # 4. Create wallet transaction log
            WalletTransaction.objects.create(
                wallet=passenger_wallet,
                amount=-total_fare,
                transaction_type='ride_payment',
                reference_id=f"BOOK-{booking.id}"
            )

            # 5. Create Payment record
            Payment.objects.create(
                booking=booking,
                amount=total_fare,
                payment_method='wallet',
                payment_status='completed'
            )

            # 6. Notify passenger
            Notification.objects.create(
                recipient=booking.passenger,
                title="Booking Approved!",
                message=f"Your booking for the ride from {ride.pickup_location} to {ride.destination_location} has been approved. Fare of {total_fare} has been deducted from your wallet.",
                notification_type="booking_approved"
            )

        return Response({
            "message": "Booking approved and payment completed successfully.",
            "booking": BookingSerializer(booking).data
        })

    @action(detail=True, methods=['post'], url_path='reject')
    def reject(self, request, pk=None):
        booking = self.get_object()
        ride = booking.ride

        if ride.driver != request.user:
            return Response({"error": "Only the driver can reject this booking."}, status=status.HTTP_403_FORBIDDEN)

        if booking.status != 'pending':
            return Response({"error": f"Booking is already {booking.status}."}, status=status.HTTP_400_BAD_REQUEST)

        booking.status = 'rejected'
        booking.save()

        # Notify passenger
        Notification.objects.create(
            recipient=booking.passenger,
            title="Booking Rejected",
            message=f"Your booking request for the ride from {ride.pickup_location} to {ride.destination_location} was rejected by the driver.",
            notification_type="booking_rejected"
        )

        return Response({
            "message": "Booking rejected successfully.",
            "booking": BookingSerializer(booking).data
        })

    @action(detail=True, methods=['post'], url_path='cancel')
    def cancel(self, request, pk=None):
        booking = self.get_object()
        user = request.user

        if booking.passenger != user and booking.ride.driver != user:
            return Response({"error": "You do not have permission to cancel this booking."}, status=status.HTTP_403_FORBIDDEN)

        if booking.status in ['cancelled', 'rejected']:
            return Response({"error": "Booking is already cancelled or rejected."}, status=status.HTTP_400_BAD_REQUEST)

        with transaction.atomic():
            # If it was already approved, refund the passenger and restore seats
            if booking.status == 'approved':
                ride = booking.ride
                ride.available_seats += booking.seats_booked
                ride.save()

                total_fare = booking.seats_booked * ride.fare_per_seat
                passenger_wallet = Wallet.objects.get(user=booking.passenger)
                passenger_wallet.balance += total_fare
                passenger_wallet.save()

                WalletTransaction.objects.create(
                    wallet=passenger_wallet,
                    amount=total_fare,
                    transaction_type='refund',
                    reference_id=f"REFUND-{booking.id}"
                )

                # Update payment status
                payment = Payment.objects.filter(booking=booking, payment_status='completed').first()
                if payment:
                    payment.payment_status = 'refunded'
                    payment.save()

            booking.status = 'cancelled'
            booking.save()

            # Notify the other party
            notify_to = booking.ride.driver if user == booking.passenger else booking.passenger
            notify_title = "Ride Booking Cancelled"
            notify_msg = f"Booking for ride from {booking.ride.pickup_location} was cancelled by {user.username}."
            
            Notification.objects.create(
                recipient=notify_to,
                title=notify_title,
                message=notify_msg,
                notification_type="booking_cancelled"
            )

        return Response({
            "message": "Booking cancelled and refunded successfully.",
            "booking": BookingSerializer(booking).data
        })
