from django.urls import path
from apps.authentication.views import (
    SignupView, VerifyOTPView, ResendOTPView,
    ForgotPasswordView, ResetPasswordView
)

app_name = 'authentication'

urlpatterns = [
    path('register/', SignupView.as_index() if hasattr(SignupView, 'as_index') else SignupView.as_view(), name='register'),
    path('verify-otp/', VerifyOTPView.as_view(), name='verify_otp'),
    path('resend-otp/', ResendOTPView.as_view(), name='resend_otp'),
    path('forgot-password/', ForgotPasswordView.as_view(), name='forgot_password'),
    path('reset-password/', ResetPasswordView.as_view(), name='reset_password'),
]
