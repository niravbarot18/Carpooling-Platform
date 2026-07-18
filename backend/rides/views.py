from rest_framework import viewsets, permissions, status
from rest_framework.response import Response
from rest_framework.decorators import action
from django.utils import timezone
from .models import Ride
from .serializers import RideSerializer
from .matching_engine import calculate_match_score
from trips.models import Trip

class RideViewSet(viewsets.ModelViewSet):
    serializer_class = RideSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        # By default, list active/published rides that are not expired
        # Drivers can see their own draft/published rides as well
        queryset = Ride.objects.select_related('driver', 'vehicle').filter(
            departure_time__gte=timezone.now()
        )
        
        # Check query parameters
        my_rides = self.request.query_params.get('my_rides', 'false')
        if my_rides.lower() == 'true':
            return queryset.filter(driver=self.request.user)
            
        status_param = self.request.query_params.get('status', 'Published')
        return queryset.filter(status=status_param).exclude(driver=self.request.user)

    def perform_create(self, serializer):
        # Save ride with requesting user as the driver
        ride = serializer.save(driver=self.request.user)
        # Create a matching Trip entry in Scheduled status
        Trip.objects.get_or_create(ride=ride, status='Scheduled')

    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        queryset = self.filter_queryset(queryset)

        # Retrieve search parameters
        start_lat = request.query_params.get('start_lat')
        start_lng = request.query_params.get('start_lng')
        end_lat = request.query_params.get('end_lat')
        end_lng = request.query_params.get('end_lng')
        departure_time = request.query_params.get('departure_time')

        if start_lat and start_lng and end_lat and end_lng:
            try:
                s_lat = float(start_lat)
                s_lng = float(start_lng)
                e_lat = float(end_lat)
                e_lng = float(end_lng)
                
                scored_rides = []
                for ride in queryset:
                    match = calculate_match_score(s_lat, s_lng, e_lat, e_lng, departure_time, ride)
                    # We store the match score temporarily on the model instance
                    ride.temp_score = match['score']
                    scored_rides.append(ride)
                
                # Sort by score in descending order
                scored_rides.sort(key=lambda x: x.temp_score, reverse=True)
                
                page = self.paginate_queryset(scored_rides)
                if page is not None:
                    serializer = self.get_serializer(page, many=True)
                    return self.get_paginated_response(serializer.data)
                
                serializer = self.get_serializer(scored_rides, many=True)
                return Response(serializer.data)
            except (ValueError, TypeError):
                pass
                
        return super().list(request, *args, **kwargs)

    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        ride = self.get_object()
        if ride.driver != request.user:
            return Response({"error": "Only the driver can cancel this ride."}, status=status.HTTP_403_FORBIDDEN)
            
        ride.status = 'Cancelled'
        ride.save()
        
        # Update associated Trip
        try:
            ride.trip.status = 'Cancelled'
            ride.trip.save()
        except Trip.DoesNotExist:
            pass
            
        # Notify booked passengers
        from bookings.models import Booking
        from notifications.models import Notification
        
        bookings = Booking.objects.filter(ride=ride, status='Approved')
        for booking in bookings:
            booking.status = 'Cancelled'
            booking.save()
            Notification.objects.create(
                user=booking.passenger,
                title="Ride Cancelled",
                message=f"The ride offered by {request.user.first_name or request.user.email} has been cancelled.",
                notification_type='BookingCancellation',
                related_id=str(ride.id)
            )
            
        return Response({"status": "Ride cancelled successfully"})
