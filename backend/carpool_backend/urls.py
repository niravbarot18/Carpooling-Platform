"""
URL configuration for carpool_backend project.
"""
from django.contrib import admin
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView

from users.views import CustomTokenObtainPairView, RegisterView, UserProfileView
from vehicles.views import VehicleViewSet
from rides.views import RideViewSet
from bookings.views import BookingViewSet
from wallet.views import WalletViewSet
from notifications.views import NotificationViewSet
from trips.views import TripViewSet
from analytics.views import AnalyticsDashboardView

# Create router and register viewsets
router = DefaultRouter()
router.register(r'vehicles', VehicleViewSet, basename='vehicle')
router.register(r'rides', RideViewSet, basename='ride')
router.register(r'bookings', BookingViewSet, basename='booking')
router.register(r'wallet', WalletViewSet, basename='wallet')
router.register(r'notifications', NotificationViewSet, basename='notification')
router.register(r'trips', TripViewSet, basename='trip')

# Define api/v1 patterns
api_v1_patterns = [
    # Auth endpoints
    path('auth/register/', RegisterView.as_view(), name='register'),
    path('auth/login/', CustomTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('auth/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('auth/profile/', UserProfileView.as_view(), name='profile'),
    
    # Analytics endpoint
    path('analytics/dashboard/', AnalyticsDashboardView.as_view(), name='analytics_dashboard'),
    
    # Viewsets URL inclusions
    path('', include(router.urls)),
]

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/v1/', include(api_v1_patterns)),
]
