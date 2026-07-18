from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Sum, Count
from apps.rides.models import Ride
from apps.bookings.models import Booking
from apps.vehicles.models import Vehicle
from django.contrib.auth import get_user_model

User = get_user_model()

class ReportsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        
        # If user is a Company Admin, return organization-wide metrics
        if user.role == 'admin':
            employees = User.objects.filter(role='user')
            employee_ids = employees.values_list('id', flat=True)

            total_employees = employees.count()
            total_vehicles = Vehicle.objects.filter(owner__in=employees).count()
            
            # Sum up stats across all users
            total_co2 = employees.aggregate(Sum('co2_saved'))['co2_saved__sum'] or 0.0
            total_money = employees.aggregate(Sum('money_saved'))['money_saved__sum'] or 0.0
            total_dist = employees.aggregate(Sum('total_distance'))['total_distance__sum'] or 0.0

            # Count of rides offered by users
            total_rides_offered = Ride.objects.filter(driver__in=employees).count()
            total_rides_completed = Ride.objects.filter(driver__in=employees, status='completed').count()

            return Response({
                "scope": "organization",
                "organization_name": "System-wide",
                "metrics": {
                    "total_employees": total_employees,
                    "total_vehicles": total_vehicles,
                    "total_trips": total_rides_completed,
                    "total_distance": round(float(total_dist), 2),
                    "co2_saved": round(float(total_co2), 2),
                    "money_saved": round(float(total_money), 2),
                    "rides_offered": total_rides_offered
                }
            })
        
        # Else, return personal commuter metrics for employees
        else:
            driver_rides = Ride.objects.filter(driver=user)
            passenger_bookings = Booking.objects.filter(passenger=user, status='approved')

            total_trips_driver = driver_rides.filter(status='completed').count()
            total_trips_passenger = passenger_bookings.filter(ride__status='completed').count()
            
            # Estimate fuel saved: assuming average mileage of 15 km/l
            # Fuel saved in liters = total_distance / 15
            distance = float(user.total_distance)
            fuel_saved = round(distance / 15.0, 2) if distance > 0 else 0.0

            return Response({
                "scope": "personal",
                "metrics": {
                    "total_trips": total_trips_driver + total_trips_passenger,
                    "total_trips_driver": total_trips_driver,
                    "total_trips_passenger": total_trips_passenger,
                    "total_distance": round(float(user.total_distance), 2),
                    "co2_saved": round(float(user.co2_saved), 2),
                    "money_saved": round(float(user.money_saved), 2),
                    "fuel_saved_liters": fuel_saved
                }
            })
        
