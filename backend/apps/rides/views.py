from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from apps.rides.models import Ride
from apps.rides.serializers import RideSerializer

class RideViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = RideSerializer

    def get_queryset(self):
        queryset = Ride.objects.all().order_by('-travel_date', '-travel_time')
        
        # Ride search parameters
        pickup = self.request.query_params.get('pickup')
        destination = self.request.query_params.get('destination')
        date = self.request.query_params.get('date')
        seats = self.request.query_params.get('seats')
        driver_id = self.request.query_params.get('driver_id')
        status = self.request.query_params.get('status')

        if pickup:
            queryset = queryset.filter(pickup_location__icontains=pickup)
        if destination:
            queryset = queryset.filter(destination_location__icontains=destination)
        if date:
            queryset = queryset.filter(travel_date=date)
        if seats:
            try:
                queryset = queryset.filter(available_seats__gte=int(seats))
            except ValueError:
                pass
        if driver_id:
            queryset = queryset.filter(driver_id=driver_id)
        if status:
            queryset = queryset.filter(status=status)

        return queryset
