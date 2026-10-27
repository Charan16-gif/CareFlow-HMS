import os
from django.conf import settings
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from drf_spectacular.utils import extend_schema, OpenApiResponse, OpenApiTypes

from .serializers import (
    RegisterSerializer,
    VerifyOTPSerializer,
    ResendOTPSerializer,
    TestEmailSerializer,
    UserProfileSerializer,
    ChangePasswordSerializer,
    PasswordResetRequestSerializer,
    PasswordResetConfirmSerializer,
    CareFlowTokenObtainPairSerializer,
)
from .emails import send_otp_email
from .models import EmailOTPVerification


class RegisterView(APIView):
    permission_classes = [AllowAny]

    @extend_schema(
        summary="Register user & send OTP",
        description="Creates an unverified patient account and sends a real 6-digit OTP to their email address.",
        request=RegisterSerializer,
        responses={
            201: OpenApiResponse(description="User created and OTP dispatched"),
            400: OpenApiResponse(description="Validation error"),
        },
    )
    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        result = serializer.save()
        response_data = {
            "success": True,
            "message": "Account registered. Verification code has been sent to your email.",
            "email": result["email"],
            "email_sent": result["email_sent"],
            "email_status": result["email_message"],
        }
        if not result["email_sent"] and result.get("email_error"):
            response_data["email_warning"] = result["email_error"]

        return Response(response_data, status=status.HTTP_201_CREATED)


class VerifyOTPView(APIView):
    permission_classes = [AllowAny]

    @extend_schema(
        summary="Verify email OTP",
        description="Verifies the 6-digit OTP code, marks email verified, activates user, and returns JWT tokens.",
        request=VerifyOTPSerializer,
        responses={
            200: OpenApiResponse(description="OTP verified successfully, JWT tokens issued"),
            400: OpenApiResponse(description="Invalid or expired OTP"),
        },
    )
    def post(self, request):
        serializer = VerifyOTPSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        result = serializer.save()
        return Response({
            "success": True,
            "message": "Email verified successfully! You are now authenticated.",
            "user": result["user"],
            "tokens": result["tokens"],
        }, status=status.HTTP_200_OK)


class ResendOTPView(APIView):
    permission_classes = [AllowAny]

    @extend_schema(
        summary="Resend verification OTP",
        description="Sends a fresh 6-digit OTP code to the specified email address with a 45-second rate limiter.",
        request=ResendOTPSerializer,
        responses={
            200: OpenApiResponse(description="New OTP generated and sent"),
            400: OpenApiResponse(description="Rate limited or validation error"),
        },
    )
    def post(self, request):
        serializer = ResendOTPSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        result = serializer.save()
        response_data = {
            "success": True,
            "message": f"A new verification code has been dispatched to {result['email']}.",
            "email": result["email"],
            "email_sent": result["email_sent"],
            "email_status": result["email_message"],
        }
        if not result["email_sent"] and result.get("email_error"):
            response_data["email_warning"] = result["email_error"]

        return Response(response_data, status=status.HTTP_200_OK)


class EmailConfigStatusView(APIView):
    """
    Returns email service setup status without exposing credentials.
    Useful for diagnostic health checks in development.
    """
    permission_classes = [AllowAny]

    @extend_schema(
        summary="Check SMTP email service configuration",
        description="Verifies whether real SMTP credentials are set in the backend environment.",
        responses={200: OpenApiTypes.OBJECT},
    )
    def get(self, request):
        host_user = getattr(settings, "EMAIL_HOST_USER", "")
        host = getattr(settings, "EMAIL_HOST", "")
        has_password = bool(getattr(settings, "EMAIL_HOST_PASSWORD", ""))
        is_configured = bool(host_user and has_password)

        masked_user = ""
        if host_user and "@" in host_user:
            name, domain = host_user.split("@", 1)
            masked_name = name[:2] + ("*" * max(1, len(name) - 2))
            masked_user = f"{masked_name}@{domain}"

        return Response({
            "is_configured": is_configured,
            "smtp_host": host,
            "smtp_port": getattr(settings, "EMAIL_PORT", 587),
            "sender_account": masked_user if masked_user else "(Not configured)",
            "use_tls": getattr(settings, "EMAIL_USE_TLS", True),
        })


class TestEmailView(APIView):
    """
    Diagnostic endpoint to send a test verification email and verify SMTP connectivity.
    """
    permission_classes = [AllowAny]

    @extend_schema(
        summary="Send test verification email",
        description="Tests real SMTP sending to verify email delivery from backend.",
        request=TestEmailSerializer,
        responses={200: OpenApiTypes.OBJECT, 400: OpenApiTypes.OBJECT, 502: OpenApiTypes.OBJECT},
    )
    def post(self, request):
        serializer = TestEmailSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        recipient = serializer.validated_data["recipient_email"]
        test_code = EmailOTPVerification.generate_otp_code()

        result = send_otp_email(
            email=recipient,
            otp_code=test_code,
            user_name="CareFlow Test Recipient",
            purpose="registration"
        )

        if result["success"]:
            return Response({
                "success": True,
                "message": f"Test verification email successfully dispatched to {recipient}.",
            }, status=status.HTTP_200_OK)
        else:
            return Response({
                "success": False,
                "message": result["message"],
                "error": result.get("error"),
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class UserProfileView(APIView):
    """
    CareFlow HMS Authenticated User Profile.
    Returns or updates administrator/staff personal details without allowing role escalation.
    """
    permission_classes = [IsAuthenticated]

    @extend_schema(
        summary="Get authenticated user profile",
        description="Returns username, email, full name, role, and phone number for current user.",
        responses={200: UserProfileSerializer},
    )
    def get(self, request):
        serializer = UserProfileSerializer(request.user)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @extend_schema(
        summary="Update authenticated user profile",
        description="Updates first name, last name, email, and phone number for current user.",
        request=UserProfileSerializer,
        responses={200: UserProfileSerializer, 400: OpenApiTypes.OBJECT},
    )
    def patch(self, request):
        serializer = UserProfileSerializer(request.user, data=request.data, partial=True)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        serializer.save()
        return Response(serializer.data, status=status.HTTP_200_OK)


class ChangePasswordView(APIView):
    """
    CareFlow HMS Password Change Endpoint.
    Validates current password and updates to new password.
    """
    permission_classes = [IsAuthenticated]

    @extend_schema(
        summary="Change user password",
        description="Changes password for current user after verifying their current password.",
        request=ChangePasswordSerializer,
        responses={200: OpenApiTypes.OBJECT, 400: OpenApiTypes.OBJECT},
    )
    def post(self, request):
        serializer = ChangePasswordSerializer(data=request.data, context={"request": request})
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        serializer.save()
        return Response({
            "success": True,
            "message": "Password changed successfully."
        }, status=status.HTTP_200_OK)


class PasswordResetRequestView(APIView):
    """
    CareFlow HMS Password Reset Request.
    Generates a secure password reset link and dispatches it to the user's registered email address.
    """
    permission_classes = [AllowAny]

    @extend_schema(
        summary="Request password reset link",
        description="Generates a 24-hour reset token and emails a direct link to the user's registered email.",
        request=PasswordResetRequestSerializer,
        responses={200: OpenApiTypes.OBJECT, 400: OpenApiTypes.OBJECT},
    )
    def post(self, request):
        serializer = PasswordResetRequestSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        # Detect frontend origin from request or fallback to http://localhost:3000
        origin = request.headers.get("Origin") or request.headers.get("Referer") or "http://localhost:3000"
        if "://" in origin:
            # Keep protocol + host + port
            parts = origin.split("/")
            origin = f"{parts[0]}//{parts[2]}"

        result = serializer.save(frontend_base_url=origin)
        return Response({
            "success": True,
            "message": f"Password reset instructions have been sent to {result['email']}.",
            "email": result["email"],
            "email_sent": result["email_sent"],
            # Provide reset_url for local development convenience
            "reset_url": result["reset_url"] if settings.DEBUG else None,
        }, status=status.HTTP_200_OK)


class PasswordResetConfirmView(APIView):
    """
    CareFlow HMS Password Reset Confirmation.
    Validates token from the reset link and sets a new password.
    """
    permission_classes = [AllowAny]

    @extend_schema(
        summary="Confirm password reset",
        description="Validates the token from the email link and resets the account password.",
        request=PasswordResetConfirmSerializer,
        responses={200: OpenApiTypes.OBJECT, 400: OpenApiTypes.OBJECT},
    )
    def post(self, request):
        serializer = PasswordResetConfirmSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        user = serializer.save()
        return Response({
            "success": True,
            "message": "Your password has been reset successfully. You may now sign in with your new credentials.",
            "username": user.username,
        }, status=status.HTTP_200_OK)


class CareFlowTokenObtainPairView(APIView):
    """
    CareFlow HMS Authoritative Authentication Endpoint.
    Validates user credentials and role, returning specific error categories and JWT tokens.
    """
    permission_classes = [AllowAny]

    @extend_schema(
        summary="CareFlow Authenticate & Obtain JWT Token Pair",
        description="Authenticates patient, doctor, receptionist, lab staff, pharmacist, or admin with authoritative role verification.",
        request=CareFlowTokenObtainPairSerializer,
        responses={200: OpenApiTypes.OBJECT, 400: OpenApiTypes.OBJECT, 401: OpenApiTypes.OBJECT},
    )
    def post(self, request, *args, **kwargs):
        serializer = CareFlowTokenObtainPairSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        return Response(serializer.validated_data, status=status.HTTP_200_OK)



