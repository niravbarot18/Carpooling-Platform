from rest_framework import viewsets
from rest_framework.permissions import AllowAny
from apps.organizations.models import Organization
from apps.users.serializers import OrganizationSerializer

class OrganizationViewSet(viewsets.ModelViewSet):
    permission_classes = [AllowAny]
    serializer_class = OrganizationSerializer
    queryset = Organization.objects.all().order_by('name')
