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

from .emails import send_brevo_email, send_otp_email, send_password_reset_link_email
from .models import EmailOTPVerification, UserProfile, UserRole
from patients.models import Patient


class MockBrevoHttpResponse:
    """Simulates an HTTP response from the Brevo Transactional Email API."""
    def __init__(self, body_dict=None, status_code=201):
        self.body_dict = body_dict or {"messageId": "<20261110.brevo_test_msg_9999@smtp-relay.brevo.com>"}
        self.status_code = status_code

    def read(self):
        return json.dumps(self.body_dict).encode("utf-8")

    def getcode(self):
        return self.status_code

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        pass


@override_settings(
    BREVO_API_KEY="xkeysib-test-dummy-api-key-12345",
    BREVO_SENDER_EMAIL="notifications@careflow.com",
    BREVO_SENDER_NAME="CareFlow HMS",
    BREVO_API_URL="https://api.brevo.com/v3/smtp/email"
)
class BrevoConfigurationAndServiceTests(TestCase):
    """
    Unit tests for Brevo Transactional Email API service:
    - Configuration reading
    - Payload serialization
    - Success and error handling
    - Network timeout and connection failures
    """

    @patch("urllib.request.urlopen")
    def test_send_brevo_email_success(self, mock_urlopen):
        mock_urlopen.return_value = MockBrevoHttpResponse(
            {"messageId": "<brevo-msg-success-001@smtp-relay.brevo.com>"},
            status_code=201
        )

        result = send_brevo_email(
            to="patient@example.com",
            subject="CareFlow Email Verification",
            html="<p>Your code is 123456</p>",
            text="Your code is 123456",
        )

        self.assertTrue(result["success"])
        self.assertEqual(result["status"], "ACCEPTED")
        self.assertEqual(result["id"], "<brevo-msg-success-001@smtp-relay.brevo.com>")
        self.assertIsNone(result["error"])
        self.assertFalse(result["is_recipient_error"])

        # Verify exact request parameters sent to Brevo API
        mock_urlopen.assert_called_once()
        req_arg = mock_urlopen.call_args[0][0]
        self.assertEqual(req_arg.full_url, "https://api.brevo.com/v3/smtp/email")
        self.assertEqual(req_arg.get_header("Api-key"), "xkeysib-test-dummy-api-key-12345")
        self.assertEqual(req_arg.get_header("Content-type"), "application/json")

        # Verify Brevo request payload structure
        sent_body = json.loads(req_arg.data.decode("utf-8"))
        self.assertEqual(sent_body["sender"]["name"], "CareFlow HMS")
        self.assertEqual(sent_body["sender"]["email"], "notifications@careflow.com")
        self.assertEqual(sent_body["to"], [{"email": "patient@example.com"}])
        self.assertEqual(sent_body["subject"], "CareFlow Email Verification")
        self.assertEqual(sent_body["htmlContent"], "<p>Your code is 123456</p>")
        self.assertEqual(sent_body["textContent"], "Your code is 123456")

    def test_send_brevo_email_missing_api_key(self):
        with override_settings(BREVO_API_KEY="", RESEND_API_KEY=""):
            result = send_brevo_email(
                to="patient@example.com",
                subject="Test Subject",
                html="<p>Test</p>",
            )
            self.assertFalse(result["success"])
            self.assertEqual(result["status"], "FAILED")
            self.assertIn("not configured", result["error"])

    def test_send_brevo_email_missing_sender_email(self):
        with override_settings(BREVO_SENDER_EMAIL="", DEFAULT_FROM_EMAIL=""):
            result = send_brevo_email(
                to="patient@example.com",
                subject="Test Subject",
                html="<p>Test</p>",
            )
            self.assertFalse(result["success"])
            self.assertEqual(result["status"], "FAILED")
            self.assertIn("sender email is not configured", result["error"])

    def test_send_brevo_email_missing_recipient(self):
        result = send_brevo_email(
            to="",
            subject="Test",
            html="<p>Test</p>",
        )
        self.assertFalse(result["success"])
        self.assertEqual(result["status"], "FAILED")
        self.assertTrue(result["is_recipient_error"])

    @patch("urllib.request.urlopen")
    def test_send_brevo_email_http_401_authentication_error(self, mock_urlopen):
        err_body = json.dumps({
            "code": "unauthorized",
            "message": "Key not found"
        }).encode("utf-8")
        mock_urlopen.side_effect = urllib.error.HTTPError(
            url="https://api.brevo.com/v3/smtp/email",
            code=401,
            msg="Unauthorized",
            hdrs={},
            fp=io.BytesIO(err_body)
        )

        result = send_brevo_email(
            to="patient@example.com",
            subject="Verification",
            html="<p>OTP</p>",
        )

        self.assertFalse(result["success"])
        self.assertEqual(result["status"], "FAILED")
        self.assertFalse(result["is_recipient_error"])
        self.assertIn("authentication failed", result["message"].lower())
        # Ensure API key is NEVER exposed in result
        self.assertNotIn("xkeysib-test-dummy-api-key-12345", str(result))

    @patch("urllib.request.urlopen")
    def test_send_brevo_email_http_429_rate_limit(self, mock_urlopen):
        err_body = json.dumps({
            "code": "too_many_requests",
            "message": "Rate limit exceeded"
        }).encode("utf-8")
        mock_urlopen.side_effect = urllib.error.HTTPError(
            url="https://api.brevo.com/v3/smtp/email",
            code=429,
            msg="Too Many Requests",
            hdrs={},
            fp=io.BytesIO(err_body)
        )

        result = send_brevo_email(
            to="patient@example.com",
            subject="Verification",
            html="<p>OTP</p>",
        )

        self.assertFalse(result["success"])
        self.assertEqual(result["status"], "FAILED")
        self.assertIn("limit reached", result["message"].lower())

    @patch("urllib.request.urlopen")
    def test_send_brevo_email_connection_network_error(self, mock_urlopen):
        mock_urlopen.side_effect = urllib.error.URLError(reason="Network unreachable")

        result = send_brevo_email(
            to="patient@example.com",
            subject="Test",
            html="<p>Test</p>",
        )

        self.assertFalse(result["success"])
        self.assertEqual(result["status"], "FAILED")
        self.assertIn("Network unreachable", result["error"])

    @patch("urllib.request.urlopen")
    def test_send_brevo_email_with_attachments(self, mock_urlopen):
        mock_urlopen.return_value = MockBrevoHttpResponse(status_code=201)

        result = send_brevo_email(
            to="patient@example.com",
            subject="Diagnostic Report",
            html="<p>See attached</p>",
            attachments=[{"name": "report.pdf", "content": b"%PDF-1.4 test report data"}]
        )

        self.assertTrue(result["success"])
        req_arg = mock_urlopen.call_args[0][0]
        sent_body = json.loads(req_arg.data.decode("utf-8"))
        self.assertIn("attachment", sent_body)
        self.assertEqual(sent_body["attachment"][0]["name"], "report.pdf")
        self.assertTrue(len(sent_body["attachment"][0]["content"]) > 0)


@override_settings(
    BREVO_API_KEY="xkeysib-test-dummy-api-key-12345",
    BREVO_SENDER_EMAIL="notifications@careflow.com",
    BREVO_SENDER_NAME="CareFlow HMS"
)
class CareFlowRegistrationAndBrevoIntegrationTests(TestCase):
    """
    End-to-end tests for CareFlow registration, OTP generation/verification,
    safe retries, and authentication with mocked Brevo Transactional Email API.
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
    def test_successful_registration_with_brevo(self, mock_urlopen):
        mock_urlopen.return_value = MockBrevoHttpResponse({"messageId": "<brevo-otp-001>"})

        response = self.client.post("/api/auth/register/", self.register_payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(response.data["success"])
        self.assertTrue(response.data["email_sent"])
        self.assertEqual(response.data["delivery_status"], "ACCEPTED")

        # Confirm user created but inactive until OTP is verified
        user = User.objects.get(email="alex.fleming@example.com")
        self.assertFalse(user.is_active)
        self.assertFalse(user.profile.is_email_verified)

        # Confirm OTP was created with hashed storage
        otp_records = EmailOTPVerification.objects.filter(email=user.email, purpose="registration")
        self.assertEqual(otp_records.count(), 1)
        otp = otp_records.first()
        self.assertFalse(otp.is_verified)
        self.assertEqual(otp.delivery_status, "ACCEPTED")
        self.assertIsNotNone(otp.sent_at)
        # Raw plain code must NOT be stored in DB (hashed length > 20)
        self.assertNotEqual(len(otp.otp_code), 6)
        self.assertTrue(len(otp.otp_code) > 20)

    @patch("urllib.request.urlopen")
    def test_registration_brevo_failure_leaves_user_unverified(self, mock_urlopen):
        err_body = json.dumps({
            "code": "invalid_parameter",
            "message": "Sender email is not authorized"
        }).encode("utf-8")
        mock_urlopen.side_effect = urllib.error.HTTPError(
            url="https://api.resend.com/emails",
            code=400,
            msg="Bad Request",
            hdrs={},
            fp=io.BytesIO(err_body)
        )

        response = self.client.post("/api/auth/register/", self.register_payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

        # User is preserved as inactive for safe retry
        user = User.objects.filter(email="alex.fleming@example.com").first()
        self.assertIsNotNone(user)
        self.assertFalse(user.is_active)

        # Patient profile is NOT created
        self.assertFalse(Patient.objects.filter(email="alex.fleming@example.com").exists())

    @patch("urllib.request.urlopen")
    def test_registration_retry_after_brevo_failure(self, mock_urlopen):
        # Step 1: Initial attempt fails
        err_body = json.dumps({"code": "too_many_requests", "message": "Rate limit"}).encode("utf-8")
        mock_urlopen.side_effect = urllib.error.HTTPError(
            url="https://api.brevo.com/v3/smtp/email",
            code=429,
            msg="Too Many Requests",
            hdrs={},
            fp=io.BytesIO(err_body)
        )

        resp1 = self.client.post("/api/auth/register/", self.register_payload, format="json")
        self.assertEqual(resp1.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(User.objects.filter(email="alex.fleming@example.com").count(), 1)

        # Step 2: Retry succeeds
        mock_urlopen.side_effect = None
        mock_urlopen.return_value = MockBrevoHttpResponse({"messageId": "<brevo-retry-002>"})

        retry_payload = dict(self.register_payload)
        retry_payload["phone"] = "+1 555-8888"

        resp2 = self.client.post("/api/auth/register/", retry_payload, format="json")
        self.assertEqual(resp2.status_code, status.HTTP_201_CREATED)

        # Exactly ONE user record exists (no duplicate accounts created)
        self.assertEqual(User.objects.filter(email="alex.fleming@example.com").count(), 1)
        user = User.objects.get(email="alex.fleming@example.com")
        self.assertFalse(user.is_active)
        self.assertEqual(user.profile.phone_number, "+1 555-8888")

    @patch("urllib.request.urlopen")
    def test_otp_verification_activates_user_and_creates_patient(self, mock_urlopen):
        mock_urlopen.return_value = MockBrevoHttpResponse({"messageId": "<brevo-msg-003>"})

        # Register user
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

        # Verify OTP
        verify_resp = self.client.post("/api/auth/verify-otp/", {
            "email": user.email,
            "otp_code": plain_code,
            "purpose": "registration",
        }, format="json")

        self.assertEqual(verify_resp.status_code, status.HTTP_200_OK)
        self.assertTrue(verify_resp.data["success"])
        self.assertIn("tokens", verify_resp.data)

        # Confirm user is activated
        user.refresh_from_db()
        self.assertTrue(user.is_active)
        self.assertTrue(user.profile.is_email_verified)

        # Confirm patient record created
        patient = Patient.objects.filter(user=user).first()
        self.assertIsNotNone(patient)
        self.assertEqual(patient.blood_group, "O+")

    def test_email_config_status_endpoint(self):
        resp = self.client.get("/api/auth/email-status/")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertTrue(resp.data["is_configured"])
        self.assertEqual(resp.data["provider"], "Brevo Transactional Email API")
        self.assertEqual(resp.data["sender_email"], "notifications@careflow.com")
        self.assertEqual(resp.data["sender_name"], "CareFlow HMS")
        self.assertIn("api.brevo.com", resp.data["api_host"])

    def test_login_functionality_unaffected(self):
        user = User.objects.create_user(
            username="active_brevo_patient",
            email="patient.brevo@example.com",
            password="Password@123",
            is_active=True
        )
        profile = user.profile
        profile.role = UserRole.PATIENT
        profile.is_email_verified = True
        profile.save()

        resp = self.client.post("/api/auth/token/", {
            "username": "patient.brevo@example.com",
            "password": "Password@123",
            "role": "PATIENT",
        }, format="json")

        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertIn("access", resp.data)
        self.assertIn("refresh", resp.data)
