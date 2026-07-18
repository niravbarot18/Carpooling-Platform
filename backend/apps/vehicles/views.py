from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from apps.vehicles.models import Vehicle
from apps.vehicles.serializers import VehicleSerializer

class VehicleViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = VehicleSerializer

    def get_queryset(self):
        # Admin can view all vehicles, employees can only manage their own
        if self.request.user.role == 'admin':
            return Vehicle.objects.all()
        return Vehicle.objects.filter(owner=self.request.user)
