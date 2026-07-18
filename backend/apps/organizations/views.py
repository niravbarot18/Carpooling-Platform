from rest_framework import viewsets, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from apps.organizations.models import Organization, SystemConfiguration
from apps.users.serializers import OrganizationSerializer

class OrganizationViewSet(viewsets.ModelViewSet):
    permission_classes = [AllowAny]
    serializer_class = OrganizationSerializer
    queryset = Organization.objects.all().order_by('name')

class SystemConfigurationView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        config_obj, _ = SystemConfiguration.objects.get_or_create(id=1)
        return Response({
            "fuel_price": float(config_obj.fuel_price),
            "default_fuel_efficiency": float(config_obj.default_fuel_efficiency),
            "co2_factor": float(config_obj.co2_factor),
            "max_seats_limit": config_obj.max_seats_limit,
            "require_license_for_driver": config_obj.require_license_for_driver
        })

    def put(self, request):
        if request.user.role != 'admin':
            return Response({"error": "Only admins can modify system configurations."}, status=status.HTTP_403_FORBIDDEN)
            
        config_obj, _ = SystemConfiguration.objects.get_or_create(id=1)
        
        fuel_price = request.data.get('fuel_price')
        default_fuel_efficiency = request.data.get('default_fuel_efficiency')
        co2_factor = request.data.get('co2_factor')
        max_seats_limit = request.data.get('max_seats_limit')
        require_license_for_driver = request.data.get('require_license_for_driver')

        if fuel_price is not None:
            config_obj.fuel_price = fuel_price
        if default_fuel_efficiency is not None:
            config_obj.default_fuel_efficiency = default_fuel_efficiency
        if co2_factor is not None:
            config_obj.co2_factor = co2_factor
        if max_seats_limit is not None:
            config_obj.max_seats_limit = max_seats_limit
        if require_license_for_driver is not None:
            config_obj.require_license_for_driver = require_license_for_driver

        config_obj.save()
        return Response({
            "message": "Configuration updated successfully.",
            "fuel_price": float(config_obj.fuel_price),
            "default_fuel_efficiency": float(config_obj.default_fuel_efficiency),
            "co2_factor": float(config_obj.co2_factor),
            "max_seats_limit": config_obj.max_seats_limit,
            "require_license_for_driver": config_obj.require_license_for_driver
        })
