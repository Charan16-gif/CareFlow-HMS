from django.urls import path
from .views import (
    RegisterView,
    RealtimeEmailValidationView,
    VerifyOTPView,
    ResendOTPView,
    EmailCorrectionView,
    EmailDeliveryStatusView,
    EmailBounceWebhookView,
    EmailConfigStatusView,
    TestEmailView,
    UserProfileView,
    ChangePasswordView,
    PasswordResetRequestView,
    PasswordResetConfirmView,
)

urlpatterns = [
    path("validate-email/", RealtimeEmailValidationView.as_view(), name="auth-validate-email"),
    path("register/", RegisterView.as_view(), name="auth-register"),
    path("verify-otp/", VerifyOTPView.as_view(), name="auth-verify-otp"),
    path("resend-otp/", ResendOTPView.as_view(), name="auth-resend-otp"),
    path("otp/correct-email/", EmailCorrectionView.as_view(), name="auth-correct-email"),
    path("otp/status/", EmailDeliveryStatusView.as_view(), name="auth-otp-status"),
    path("email/webhook/bounce/", EmailBounceWebhookView.as_view(), name="auth-email-bounce-webhook"),
    path("email-status/", EmailConfigStatusView.as_view(), name="auth-email-status"),
    path("test-email/", TestEmailView.as_view(), name="auth-test-email"),
    path("profile/", UserProfileView.as_view(), name="auth-profile"),
    path("change-password/", ChangePasswordView.as_view(), name="auth-change-password"),
    path("password-reset/", PasswordResetRequestView.as_view(), name="auth-password-reset-request"),
    path("password-reset/confirm/", PasswordResetConfirmView.as_view(), name="auth-password-reset-confirm"),
]

