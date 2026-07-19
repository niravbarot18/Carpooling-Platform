from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)

# Views and ViewSets imports
from apps.users.views import (
    RegisterView, ProfileView, SavedPlaceViewSet, 
    CustomTokenObtainPairView, GoogleLoginView, 
    SupportTicketView, AdminEmployeeViewSet
)
from apps.authentication.views import (
    SignupView, VerifyOTPView, ResendOTPView,
    ForgotPasswordView as AuthForgotPasswordView,
    ResetPasswordView as AuthResetPasswordView
)
from apps.organizations.views import (
    OrganizationViewSet, SystemConfigurationView
)
from apps.vehicles.views import VehicleViewSet
from apps.rides.views import RideViewSet
from apps.bookings.views import BookingViewSet
from apps.trips.views import TripViewSet, RatingViewSet
from apps.wallet.views import WalletViewSet
from apps.payments.views import PaymentViewSet
from apps.chat.views import MessageViewSet
from apps.notifications.views import NotificationViewSet
from apps.reports.views import ReportsView
from apps.analytics.views import AnalyticsView

router = DefaultRouter()
router.register(r"saved-places", SavedPlaceViewSet, basename="saved-place")
router.register(r"vehicles", VehicleViewSet, basename="vehicle")
router.register(r"rides", RideViewSet, basename="ride")
router.register(r"book", BookingViewSet, basename="booking")  # maps to /api/book/
router.register(r"trips", TripViewSet, basename="trip")
router.register(r"ratings", RatingViewSet, basename="rating")
router.register(r"wallet", WalletViewSet, basename="wallet")
router.register(r"payment", PaymentViewSet, basename="payment")  # maps to /api/payment/
router.register(r"messages", MessageViewSet, basename="message")
router.register(r"notifications", NotificationViewSet, basename="notification")
router.register(r"organizations", OrganizationViewSet, basename="organization")
router.register(r"admin/employees", AdminEmployeeViewSet, basename="admin-employee")

urlpatterns = [
    path("admin/", admin.site.urls),
    
    # REST API endpoints
    path("api/", include(router.urls)),
    
    # Token Authentication endpoints
    path("api/register/", RegisterView.as_view(), name="api_register"),
    path("api/verify-otp/", VerifyOTPView.as_view(), name="api_verify_otp"),
    path("api/resend-otp/", ResendOTPView.as_view(), name="api_resend_otp"),
    path("api/login/", CustomTokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("api/logout/", TokenRefreshView.as_view(), name="token_refresh"),  # Standard SimpleJWT refresh endpoint for clean logout handling
    path("api/profile/", ProfileView.as_view(), name="api_profile"),
    path("api/google-login/", GoogleLoginView.as_view(), name="api_google_login"),
    path("api/forgot-password/", AuthForgotPasswordView.as_view(), name="api_forgot_password"),
    path("api/reset-password/", AuthResetPasswordView.as_view(), name="api_reset_password"),
    path("api/support/", SupportTicketView.as_view(), name="api_support"),
    path("api/system-config/", SystemConfigurationView.as_view(), name="system_config"),
    
    # Reports & Analytics endpoints
    path("api/reports/", ReportsView.as_view(), name="api_reports"),
    path("api/analytics/", AnalyticsView.as_view(), name="api_analytics"),
]

# Serve media and static files in development mode
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
