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

            # 3. Create Payment record with status 'pending' (no wallet debit yet)
            Payment.objects.create(
                booking=booking,
                amount=total_fare,
                payment_method='wallet',
                payment_status='pending'
            )

            # 4. Notify passenger
            Notification.objects.create(
                recipient=booking.passenger,
                title="Booking Approved!",
                message=f"Your booking for the ride from {ride.pickup_location} to {ride.destination_location} has been approved. A pending payment of {total_fare} has been authorized and will be charged upon completion.",
                notification_type="booking_approved"
            )

        return Response({
            "message": "Booking approved. Payment is pending ride completion.",
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
            # If it was already approved, handle refund (if paid) and restore seats
            if booking.status == 'approved':
                ride = booking.ride
                ride.available_seats += booking.seats_booked
                ride.save()

                total_fare = booking.seats_booked * ride.fare_per_seat
                payment = Payment.objects.filter(booking=booking).first()
                
                if payment:
                    if payment.payment_status == 'completed':
                        passenger_wallet = Wallet.objects.get(user=booking.passenger)
                        passenger_wallet.balance += total_fare
                        passenger_wallet.save()

                        WalletTransaction.objects.create(
                            wallet=passenger_wallet,
                            amount=total_fare,
                            transaction_type='refund',
                            reference_id=f"REFUND-{booking.id}"
                        )
                        payment.payment_status = 'refunded'
                    else:
                        # For pending, simply cancel/fail the payment
                        payment.payment_status = 'failed'
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

    @action(detail=True, methods=['post'], url_path='pay')
    def pay(self, request, pk=None):
        booking = self.get_object()
        ride = booking.ride

        if booking.passenger != request.user:
            return Response({"error": "Only the passenger of this booking can make payment."}, status=status.HTTP_403_FORBIDDEN)

        if booking.status != 'approved':
            return Response({"error": "Payments can only be made for approved bookings."}, status=status.HTTP_400_BAD_REQUEST)

        # Retrieve associated payment record
        payment = Payment.objects.filter(booking=booking).first()
        if not payment:
            return Response({"error": "No payment record found for this booking."}, status=status.HTTP_404_NOT_FOUND)

        if payment.payment_status == 'completed':
            return Response({"error": "Payment has already been completed."}, status=status.HTTP_400_BAD_REQUEST)

        if payment.payment_status != 'pending':
            return Response({"error": f"Cannot complete payment with current status: {payment.payment_status}."}, status=status.HTTP_400_BAD_REQUEST)

        # Process wallet payment transfer
        total_fare = payment.amount
        passenger_wallet, _ = Wallet.objects.get_or_create(user=booking.passenger)

        if passenger_wallet.balance < total_fare:
            return Response({"error": "Insufficient wallet balance. Please recharge your wallet first."}, status=status.HTTP_400_BAD_REQUEST)

        with transaction.atomic():
            # 1. Deduct from passenger wallet
            passenger_wallet.balance -= total_fare
            passenger_wallet.save()

            # 2. Log passenger Wallet Transaction
            WalletTransaction.objects.create(
                wallet=passenger_wallet,
                amount=-total_fare,
                transaction_type='ride_payment',
                reference_id=f"BOOK-{booking.id}"
            )

            # 3. Credit to driver wallet
            driver_wallet, _ = Wallet.objects.get_or_create(user=ride.driver)
            driver_wallet.balance += total_fare
            driver_wallet.save()

            # 4. Log driver Wallet Transaction
            WalletTransaction.objects.create(
                wallet=driver_wallet,
                amount=total_fare,
                transaction_type='ride_earning',
                reference_id=f"TRIP-EARN-{booking.id}"
            )

            # 5. Set payment status as completed
            payment.payment_status = 'completed'
            payment.save()

            # 6. Notify driver of earnings
            Notification.objects.create(
                recipient=ride.driver,
                title="Early Ride Payment Received!",
                message=f"Passenger {booking.passenger.username} paid ₹{total_fare} early for the ride from {ride.pickup_location}.",
                notification_type="payment_received"
            )

        return Response({
            "message": "Payment completed successfully.",
            "booking": BookingSerializer(booking).data
        })
