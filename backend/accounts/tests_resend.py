import io
import json
import urllib.error
from datetime import timedelta
from unittest.mock import patch, MagicMock

from django.conf import settings
from django.contrib.auth.models import User
from django.test import TestCase, override_settings
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient

from .emails import send_resend_email, send_otp_email, send_password_reset_link_email
from .models import EmailOTPVerification, UserProfile, UserRole
from patients.models import Patient


class MockHttpResponse:
    def __init__(self, body_dict=None, status_code=200):
        self.body_dict = body_dict or {"id": "resend_test_msg_9999"}
        self.status_code = status_code

    def read(self):
        return json.dumps(self.body_dict).encode("utf-8")

    def getcode(self):
        return self.status_code

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        pass


@override_settings(RESEND_API_KEY="re_test_dummy_key_12345")
class ResendEmailServiceTests(TestCase):
    """
    Tests low-level send_resend_email unit behavior with mocked HTTP layer.
    """

    @patch("urllib.request.urlopen")
    def test_send_resend_email_success(self, mock_urlopen):
        mock_urlopen.return_value = MockHttpResponse({"id": "resend_abc_123"}, status_code=200)

        result = send_resend_email(
            to="patient@example.com",
            subject="Test Subject",
            html="<p>Test</p>",
            text="Test",
        )

        self.assertTrue(result["success"])
        self.assertEqual(result["status"], "ACCEPTED")
        self.assertEqual(result["id"], "resend_abc_123")
        self.assertIsNone(result["error"])
        mock_urlopen.assert_called_once()

    def test_send_resend_email_missing_api_key(self):
        with override_settings(RESEND_API_KEY=""):
            result = send_resend_email(
                to="patient@example.com",
                subject="Test Subject",
                html="<p>Test</p>",
            )
            self.assertFalse(result["success"])
            self.assertEqual(result["status"], "FAILED")
            self.assertIn("not configured", result["error"])

    def test_send_resend_email_missing_recipient(self):
        result = send_resend_email(
            to="",
            subject="Test",
            html="<p>Test</p>",
        )
        self.assertFalse(result["success"])
        self.assertTrue(result["is_recipient_error"])

    @patch("urllib.request.urlopen")
    def test_send_resend_email_http_422_validation_error(self, mock_urlopen):
        err_body = json.dumps({
            "statusCode": 422,
            "message": "You can only send testing emails to your own email address.",
            "name": "validation_error"
        }).encode("utf-8")
        mock_urlopen.side_effect = urllib.error.HTTPError(
            url="https://api.resend.com/emails",
            code=422,
            msg="Unprocessable Entity",
            hdrs={},
            fp=io.BytesIO(err_body)
        )

        result = send_resend_email(
            to="unverified@example.com",
            subject="Verification",
            html="<p>OTP</p>",
        )

        self.assertFalse(result["success"])
        self.assertEqual(result["status"], "FAILED")
        self.assertTrue(result["is_recipient_error"])
        self.assertIn("You can only send testing emails", result["message"])

    @patch("urllib.request.urlopen")
    def test_send_resend_email_connection_url_error(self, mock_urlopen):
        mock_urlopen.side_effect = urllib.error.URLError(reason="Network unreachable")

        result = send_resend_email(
            to="patient@example.com",
            subject="Test",
            html="<p>Test</p>",
        )

        self.assertFalse(result["success"])
        self.assertEqual(result["status"], "FAILED")
        self.assertIn("Network unreachable", result["error"])


@override_settings(RESEND_API_KEY="re_test_dummy_key_12345")
class CareFlowRegistrationAndResendIntegrationTests(TestCase):
    """
    End-to-end tests for CareFlow registration, OTP verification, retry flow,
    and authentication with mocked Resend API integration.
    """

    def setUp(self):
        self.client = APIClient()
        self.register_payload = {
            "first_name": "Alexander",
            "last_name": "Fleming",
            "username": "alex_fleming",
            "email": "alex.fleming@example.com",
            "phone": "+1 555-0144",
            "date_of_birth": "1990-05-15",
            "gender": "MALE",
            "blood_group": "O+",
            "password": "SecurePassword@123",
            "confirm_password": "SecurePassword@123",
        }

    @patch("urllib.request.urlopen")
    def test_successful_registration_with_resend(self, mock_urlopen):
        mock_urlopen.return_value = MockHttpResponse({"id": "resend_msg_001"})

        response = self.client.post("/api/auth/register/", self.register_payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(response.data["success"])
        self.assertTrue(response.data["email_sent"])
        self.assertEqual(response.data["email"], "alex.fleming@example.com")

        # Verify user created but inactive
        user = User.objects.get(email="alex.fleming@example.com")
        self.assertFalse(user.is_active)

        # Verify OTP record created with delivery_status ACCEPTED
        otp_record = EmailOTPVerification.objects.filter(email="alex.fleming@example.com").first()
        self.assertIsNotNone(otp_record)
        self.assertEqual(otp_record.delivery_status, "ACCEPTED")
        self.assertIsNotNone(otp_record.otp_code)

        # Ensure plain OTP code is never exposed in response
        self.assertNotIn("otp_code", response.data)
        self.assertNotIn("plain_code", response.data)

    @patch("urllib.request.urlopen")
    def test_registration_fails_cleanly_when_resend_rejects(self, mock_urlopen):
        err_body = json.dumps({
            "statusCode": 401,
            "message": "API key is invalid",
            "name": "authentication_error"
        }).encode("utf-8")
        mock_urlopen.side_effect = urllib.error.HTTPError(
            url="https://api.resend.com/emails",
            code=401,
            msg="Unauthorized",
            hdrs={},
            fp=io.BytesIO(err_body)
        )

        response = self.client.post("/api/auth/register/", self.register_payload, format="json")

        # Must return HTTP 400, NOT HTTP 201
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("email", response.data)

        # User is kept unverified (is_active=False)
        user = User.objects.filter(email="alex.fleming@example.com").first()
        self.assertIsNotNone(user)
        self.assertFalse(user.is_active)

        # OTP delivery_status is recorded as FAILED
        otp_record = EmailOTPVerification.objects.filter(email="alex.fleming@example.com").first()
        self.assertIsNotNone(otp_record)
        self.assertEqual(otp_record.delivery_status, "FAILED")

    @patch("urllib.request.urlopen")
    def test_retry_registration_for_unverified_account_without_duplicates(self, mock_urlopen):
        # Step 1: First attempt fails due to Resend error
        err_body = json.dumps({"statusCode": 422, "message": "Testing restriction", "name": "validation_error"}).encode("utf-8")
        mock_urlopen.side_effect = urllib.error.HTTPError(
            url="https://api.resend.com/emails",
            code=422,
            msg="Unprocessable Entity",
            hdrs={},
            fp=io.BytesIO(err_body)
        )

        resp1 = self.client.post("/api/auth/register/", self.register_payload, format="json")
        self.assertEqual(resp1.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(User.objects.filter(email="alex.fleming@example.com").count(), 1)

        # Step 2: User retries registration after configuration fixed
        mock_urlopen.side_effect = None
        mock_urlopen.return_value = MockHttpResponse({"id": "resend_retry_success"})

        # Update payload details slightly (e.g. phone)
        retry_payload = dict(self.register_payload)
        retry_payload["phone"] = "+1 555-9999"

        resp2 = self.client.post("/api/auth/register/", retry_payload, format="json")
        self.assertEqual(resp2.status_code, status.HTTP_201_CREATED)

        # Verify still exactly ONE User record (no duplicates created)
        self.assertEqual(User.objects.filter(email="alex.fleming@example.com").count(), 1)
        user = User.objects.get(email="alex.fleming@example.com")
        self.assertFalse(user.is_active)

        # Profile phone updated
        profile = UserProfile.objects.get(user=user)
        self.assertEqual(profile.phone_number, "+1 555-9999")

    @patch("urllib.request.urlopen")
    def test_otp_verification_activates_user_and_creates_patient(self, mock_urlopen):
        mock_urlopen.return_value = MockHttpResponse({"id": "resend_msg_002"})

        # Register
        self.client.post("/api/auth/register/", self.register_payload, format="json")
        user = User.objects.get(email="alex.fleming@example.com")

        # Create known OTP
        otp_rec, plain_code = EmailOTPVerification.create_otp_for_email(
            email=user.email,
            user=user,
            purpose="registration",
            validity_minutes=10,
            registration_data={
                "first_name": "Alexander",
                "last_name": "Fleming",
                "phone": "+1 555-0144",
                "date_of_birth": "1990-05-15",
                "gender": "MALE",
                "blood_group": "O+",
            }
        )

        # Verify with correct code
        verify_resp = self.client.post("/api/auth/verify-otp/", {
            "email": user.email,
            "otp_code": plain_code,
            "purpose": "registration",
        }, format="json")

        self.assertEqual(verify_resp.status_code, status.HTTP_200_OK)
        self.assertTrue(verify_resp.data["success"])
        self.assertIn("tokens", verify_resp.data)
        self.assertIn("access", verify_resp.data["tokens"])

        # Check user is activated
        user.refresh_from_db()
        self.assertTrue(user.is_active)

        # Check profile is verified
        profile = UserProfile.objects.get(user=user)
        self.assertTrue(profile.is_email_verified)

        # Check patient record was created
        patient = Patient.objects.filter(user=user).first()
        self.assertIsNotNone(patient)
        self.assertEqual(patient.blood_group, "O+")

    def test_otp_verification_incorrect_code_fails(self):
        user = User.objects.create_user(
            username="test_incorrect",
            email="incorrect@example.com",
            password="Password@123",
            is_active=False
        )
        EmailOTPVerification.create_otp_for_email(
            email=user.email,
            user=user,
            purpose="registration",
            validity_minutes=10
        )

        resp = self.client.post("/api/auth/verify-otp/", {
            "email": user.email,
            "otp_code": "000000",
            "purpose": "registration",
        }, format="json")

        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        user.refresh_from_db()
        self.assertFalse(user.is_active)

    def test_otp_verification_expired_code_fails(self):
        user = User.objects.create_user(
            username="test_expired",
            email="expired@example.com",
            password="Password@123",
            is_active=False
        )
        otp_rec, plain_code = EmailOTPVerification.create_otp_for_email(
            email=user.email,
            user=user,
            purpose="registration",
            validity_minutes=10
        )
        # Force expiration
        otp_rec.expires_at = timezone.now() - timedelta(minutes=5)
        otp_rec.save()

        resp = self.client.post("/api/auth/verify-otp/", {
            "email": user.email,
            "otp_code": plain_code,
            "purpose": "registration",
        }, format="json")

        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        user.refresh_from_db()
        self.assertFalse(user.is_active)

    def test_register_duplicate_active_email_fails(self):
        # Create an already active user
        User.objects.create_user(
            username="active_user",
            email="active@example.com",
            password="Password@123",
            is_active=True
        )

        payload = dict(self.register_payload)
        payload["email"] = "active@example.com"
        payload["username"] = "new_username"

        resp = self.client.post("/api/auth/register/", payload, format="json")
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("already registered", str(resp.data.get("email", "")))

    @patch("urllib.request.urlopen")
    def test_resend_otp_endpoint_success(self, mock_urlopen):
        mock_urlopen.return_value = MockHttpResponse({"id": "resend_otp_new"})

        user = User.objects.create_user(
            username="unverified_resend",
            email="resend@example.com",
            password="Password@123",
            is_active=False
        )

        resp = self.client.post("/api/auth/resend-otp/", {
            "email": user.email,
            "purpose": "registration",
        }, format="json")

        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertTrue(resp.data["success"])
        self.assertTrue(resp.data["email_sent"])

    def test_email_config_status_endpoint(self):
        resp = self.client.get("/api/auth/email-status/")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertTrue(resp.data["is_configured"])
        self.assertEqual(resp.data["provider"], "Resend Email API")
        self.assertEqual(resp.data["sender_account"], getattr(settings, "DEFAULT_FROM_EMAIL", ""))
        self.assertEqual(resp.data["reply_to"], getattr(settings, "RESEND_REPLY_TO", ""))

    def test_login_functionality_unaffected(self):
        # Create verified, active user
        user = User.objects.create_user(
            username="active_patient",
            email="patient.active@example.com",
            password="Password@123",
            is_active=True
        )
        profile = user.profile
        profile.role = UserRole.PATIENT
        profile.is_email_verified = True
        profile.save()

        resp = self.client.post("/api/auth/token/", {
            "username": "patient.active@example.com",
            "password": "Password@123",
            "role": "PATIENT",
        }, format="json")

        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertIn("access", resp.data)
        self.assertIn("refresh", resp.data)
