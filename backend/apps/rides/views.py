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

        if not driver_id and self.request.user.is_authenticated:
            queryset = queryset.exclude(driver=self.request.user)

        if pickup:
            queryset = queryset.filter(pickup_location__icontains=pickup)
        if destination:
            queryset = queryset.filter(destination_location__icontains=destination)
        if date:
            from django.db.models import Q
            from datetime import datetime
            try:
                search_date = datetime.strptime(date, '%Y-%m-%d').date()
                search_weekday = search_date.weekday()  # 0 is Monday, 6 is Sunday
                
                # Django week_day lookup: 1 is Sunday, 2 is Monday, ..., 7 is Saturday
                # Python weekday() + 1 matches django? No, in Python 0 is Monday, 6 is Sunday.
                # Django weekday mapping: strftime('%w') returns '0' (Sunday) to '6' (Saturday).
                # So we can calculate Django's week_day value as:
                django_week_day = int(search_date.strftime('%w')) + 1
                
                q_standard = Q(recurring=False, travel_date=search_date)
                q_daily = Q(recurring=True, travel_date__lte=search_date, recurring_pattern='daily')
                q_weekly = Q(recurring=True, travel_date__lte=search_date, recurring_pattern='weekly', travel_date__week_day=django_week_day)
                
                if search_weekday <= 4:
                    q_weekdays = Q(recurring=True, travel_date__lte=search_date, recurring_pattern='weekdays')
                else:
                    q_weekdays = Q(id__in=[])  # Empty Q
                
                queryset = queryset.filter(q_standard | q_daily | q_weekly | q_weekdays)
            except ValueError:
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
