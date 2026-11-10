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
    RealtimeEmailValidationSerializer,
    EmailCorrectionSerializer,
    EmailDeliveryStatusSerializer,
    EmailBounceWebhookSerializer,
    TestEmailSerializer,
    UserProfileSerializer,
    ChangePasswordSerializer,
    PasswordResetRequestSerializer,
    PasswordResetConfirmSerializer,
    CareFlowTokenObtainPairSerializer,
)
from .email_validation import (
    MSG_EMAIL_ACCEPTED_BY_SMTP,
    MSG_SMTP_IMMEDIATE_REJECTION,
    MSG_INVALID_EMAIL_FORMAT,
    MSG_OTP_RESENT,
    MSG_OTP_VERIFIED,
    MSG_DELIVERY_BOUNCE,
    verify_email_comprehensive,
)
from .emails import send_otp_email
from .models import EmailOTPVerification


class RealtimeEmailValidationView(APIView):
    """
    CareFlow HMS Real-Time Email Address Validation Endpoint.
    Validates email format, domain existence, DNS MX routing, disposable burner domains,
    common domain typos, and third-party mailbox deliverability before registration.
    """
    permission_classes = [AllowAny]

    @extend_schema(
        summary="Real-time email address validation",
        description=(
            "Validates email syntax, domain existence, DNS MX records, disposable services, "
            "domain typos, and third-party mailbox deliverability before registration."
        ),
        request=RealtimeEmailValidationSerializer,
        responses={200: OpenApiTypes.OBJECT},
    )
    def post(self, request):
        serializer = RealtimeEmailValidationSerializer(data=request.data)
        if not serializer.is_valid():
            return Response({
                "email": request.data.get("email", ""),
                "status": "INVALID_FORMAT",
                "is_valid": False,
                "message": MSG_INVALID_EMAIL_FORMAT,
                "suggested_email": None,
                "allow_continue": False,
                "details": {"syntax": False},
            }, status=status.HTTP_200_OK)

        email = serializer.validated_data["email"]
        check_mailbox = serializer.validated_data.get("check_mailbox", True)

        result = verify_email_comprehensive(email, check_mailbox=check_mailbox)
        return Response(result, status=status.HTTP_200_OK)


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
            "message": MSG_EMAIL_ACCEPTED_BY_SMTP if result["email_sent"] else result["email_message"],
            "email": result["email"],
            "email_sent": result["email_sent"],
            "delivery_status": result.get("email_status", "PENDING"),
            "email_message": result["email_message"],
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
            "message": MSG_OTP_VERIFIED,
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
            "message": MSG_OTP_RESENT if result["email_sent"] else result["email_message"],
            "email": result["email"],
            "email_sent": result["email_sent"],
            "delivery_status": result.get("email_status", "PENDING"),
            "email_status": result["email_message"],
        }
        if not result["email_sent"] and result.get("email_error"):
            response_data["email_warning"] = result["email_error"]

        return Response(response_data, status=status.HTTP_200_OK)


class EmailCorrectionView(APIView):
    permission_classes = [AllowAny]

    @extend_schema(
        summary="Correct email address and resend OTP",
        description="Allows an unverified user to correct a mistyped email address, invalidates old OTPs, and sends a new OTP.",
        request=EmailCorrectionSerializer,
        responses={
            200: OpenApiResponse(description="Email updated and new OTP dispatched"),
            400: OpenApiResponse(description="Validation error"),
        },
    )
    def post(self, request):
        serializer = EmailCorrectionSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        result = serializer.save()
        return Response({
            "success": True,
            "message": result["message"],
            "old_email": result["old_email"],
            "email": result["new_email"],
            "email_sent": result["email_sent"],
            "delivery_status": result["email_status"],
        }, status=status.HTTP_200_OK)


class EmailDeliveryStatusView(APIView):
    permission_classes = [AllowAny]

    @extend_schema(
        summary="Check email delivery and OTP verification status",
        description="Queries the latest delivery status (PENDING, ACCEPTED, DELIVERED, FAILED, VERIFIED) for an email address.",
        responses={200: OpenApiTypes.OBJECT},
    )
    def get(self, request):
        email = request.query_params.get("email", "").strip().lower()
        purpose = request.query_params.get("purpose", "registration")
        if not email:
            return Response({"error": "Email parameter is required."}, status=status.HTTP_400_BAD_REQUEST)

        otp_rec = EmailOTPVerification.objects.filter(
            email__iexact=email,
            purpose=purpose
        ).order_by("-created_at").first()

        if not otp_rec:
            return Response({
                "email": email,
                "delivery_status": "PENDING",
                "is_verified": False,
                "message": "No verification record found."
            }, status=status.HTTP_200_OK)

        status_msg = {
            "ACCEPTED": MSG_EMAIL_ACCEPTED_BY_SMTP,
            "DELIVERED": "Email delivered successfully.",
            "FAILED": MSG_DELIVERY_BOUNCE if ("bounce" in (otp_rec.delivery_error or "").lower()) else (otp_rec.delivery_error or MSG_SMTP_IMMEDIATE_REJECTION),
            "VERIFIED": MSG_OTP_VERIFIED,
            "PENDING": "Email dispatch pending.",
        }.get(otp_rec.delivery_status, "Status pending.")

        return Response({
            "email": email,
            "delivery_status": otp_rec.delivery_status,
            "is_verified": otp_rec.is_verified,
            "is_expired": otp_rec.is_expired,
            "delivery_error": otp_rec.delivery_error,
            "message": status_msg,
            "created_at": otp_rec.created_at,
            "sent_at": otp_rec.sent_at,
            "verified_at": otp_rec.verified_at,
        }, status=status.HTTP_200_OK)


class EmailBounceWebhookView(APIView):
    """
    Receives incoming bounce notifications from email providers or test simulators.
    Updates the delivery status of matching unverified OTP records to FAILED.
    """
    permission_classes = [AllowAny]

    @extend_schema(
        summary="Email bounce webhook handler",
        description="Processes bounce webhook events and updates email delivery status to FAILED.",
        request=EmailBounceWebhookSerializer,
        responses={200: OpenApiTypes.OBJECT},
    )
    def post(self, request):
        serializer = EmailBounceWebhookSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        email = serializer.validated_data["email"].strip().lower()
        bounce_type = serializer.validated_data.get("bounce_type", "permanent")
        reason = serializer.validated_data.get("reason", "Undeliverable mailbox")

        # Mark latest unverified OTP verification as FAILED
        updated_count = EmailOTPVerification.objects.filter(
            email__iexact=email,
            is_verified=False
        ).update(
            delivery_status="FAILED",
            delivery_error=f"Bounce ({bounce_type}): {reason}"
        )

        return Response({
            "success": True,
            "email": email,
            "delivery_status": "FAILED",
            "message": MSG_DELIVERY_BOUNCE,
            "updated_records": updated_count,
        }, status=status.HTTP_200_OK)


class EmailConfigStatusView(APIView):
    """
    Returns email service setup status without exposing credentials.
    Useful for diagnostic health checks in development and production.
    """
    permission_classes = [AllowAny]

    @extend_schema(
        summary="Check email service configuration",
        description="Verifies whether Brevo API credentials are set in the backend environment.",
        responses={200: OpenApiTypes.OBJECT},
    )
    def get(self, request):
        brevo_key = getattr(settings, "BREVO_API_KEY", "").strip()
        resend_key = getattr(settings, "RESEND_API_KEY", "").strip()
        effective_key = brevo_key or resend_key

        brevo_sender = getattr(settings, "BREVO_SENDER_EMAIL", "").strip()
        brevo_name = getattr(settings, "BREVO_SENDER_NAME", "CareFlow HMS").strip()
        default_from = getattr(settings, "DEFAULT_FROM_EMAIL", "").strip()
        sender_account = f"{brevo_name} <{brevo_sender}>" if brevo_sender else default_from

        reply_to = (
            getattr(settings, "BREVO_REPLY_TO_EMAIL", "").strip()
            or getattr(settings, "RESEND_REPLY_TO", "").strip()
            or brevo_sender
            or "charanadabala16@gmail.com"
        )
        is_configured = bool(effective_key and (brevo_sender or default_from))
        provider_name = "Brevo Transactional Email API" if brevo_key or not resend_key else "Resend Email API"

        return Response({
            "is_configured": is_configured,
            "provider": provider_name,
            "sender_account": sender_account,
            "sender_email": brevo_sender,
            "sender_name": brevo_name,
            "reply_to": reply_to,
            "api_configured": bool(effective_key),
            "api_host": "api.brevo.com (HTTPS Port 443)",
            "smtp_host": "api.brevo.com (HTTPS Port 443)",
            "use_tls": True,
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



