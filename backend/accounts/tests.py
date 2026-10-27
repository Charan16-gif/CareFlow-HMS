from datetime import timedelta
from django.utils import timezone
from django.test import TestCase
from django.contrib.auth.models import User
from rest_framework.test import APIClient
from rest_framework import status
from unittest.mock import patch
from .models import EmailOTPVerification, UserProfile, UserRole


class EmailOTPAuthenticationTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.valid_payload = {
            "first_name": "Eleanor",
            "last_name": "Vance",
            "email": "eleanor.vance@example.com",
            "phone": "+1 555-0199",
            "password": "Password@123",
            "confirm_password": "Password@123",
        }

    @patch("accounts.serializers.send_otp_email")
    def test_registration_creates_inactive_user_and_hashed_otp(self, mock_send_email):
        mock_send_email.return_value = {
            "success": True,
            "message": "Verification code sent",
            "error": None,
        }

        response = self.client.post("/api/auth/register/", self.valid_payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(response.data["success"])
        self.assertEqual(response.data["email"], "eleanor.vance@example.com")
        # Ensure raw OTP is NEVER returned in response
        self.assertNotIn("otp_code", response.data)
        self.assertNotIn("code", response.data)

        # Verify user created in inactive state
        user = User.objects.get(email="eleanor.vance@example.com")
        self.assertFalse(user.is_active)
        self.assertEqual(user.profile.phone_number, "+1 555-0199")
        self.assertFalse(user.profile.is_email_verified)

        # Verify OTP record: must be cryptographically hashed
        otp_record = EmailOTPVerification.objects.filter(email="eleanor.vance@example.com").first()
        self.assertIsNotNone(otp_record)
        self.assertFalse(otp_record.is_verified)
        self.assertNotEqual(len(otp_record.otp_code), 6)
        self.assertTrue(otp_record.otp_code.startswith("pbkdf2_sha256$"))

        # Verify email was called with the unhashed 6-digit code
        mock_send_email.assert_called_once()
        plain_code = mock_send_email.call_args[1]["otp_code"]
        self.assertEqual(len(plain_code), 6)
        self.assertTrue(otp_record.check_otp(plain_code))

    @patch("accounts.serializers.send_otp_email")
    def test_verify_otp_activates_user_and_issues_jwt(self, mock_send_email):
        mock_send_email.return_value = {"success": True, "message": "Sent", "error": None}
        self.client.post("/api/auth/register/", self.valid_payload, format="json")
        plain_code = mock_send_email.call_args[1]["otp_code"]

        # Verify with incorrect OTP first
        bad_res = self.client.post("/api/auth/verify-otp/", {
            "email": "eleanor.vance@example.com",
            "otp_code": "000000",
        }, format="json")
        self.assertEqual(bad_res.status_code, status.HTTP_400_BAD_REQUEST)

        # Verify with correct plain OTP against hashed record
        good_res = self.client.post("/api/auth/verify-otp/", {
            "email": "eleanor.vance@example.com",
            "otp_code": plain_code,
        }, format="json")
        self.assertEqual(good_res.status_code, status.HTTP_200_OK)
        self.assertTrue(good_res.data["success"])
        self.assertIn("tokens", good_res.data)
        self.assertIn("access", good_res.data["tokens"])

        # User must now be active and verified
        user = User.objects.get(email="eleanor.vance@example.com")
        self.assertTrue(user.is_active)
        self.assertTrue(user.profile.is_email_verified)

    @patch("accounts.serializers.send_otp_email")
    def test_otp_single_use_prevents_replay(self, mock_send_email):
        mock_send_email.return_value = {"success": True, "message": "Sent", "error": None}
        self.client.post("/api/auth/register/", self.valid_payload, format="json")
        plain_code = mock_send_email.call_args[1]["otp_code"]

        # First verification succeeds
        first_res = self.client.post("/api/auth/verify-otp/", {
            "email": "eleanor.vance@example.com",
            "otp_code": plain_code,
        }, format="json")
        self.assertEqual(first_res.status_code, status.HTTP_200_OK)

        # Replay attempt fails
        replay_res = self.client.post("/api/auth/verify-otp/", {
            "email": "eleanor.vance@example.com",
            "otp_code": plain_code,
        }, format="json")
        self.assertEqual(replay_res.status_code, status.HTTP_400_BAD_REQUEST)

    @patch("accounts.serializers.send_otp_email")
    def test_otp_expiry_blocks_verification(self, mock_send_email):
        mock_send_email.return_value = {"success": True, "message": "Sent", "error": None}
        self.client.post("/api/auth/register/", self.valid_payload, format="json")
        plain_code = mock_send_email.call_args[1]["otp_code"]

        otp_record = EmailOTPVerification.objects.get(email="eleanor.vance@example.com")
        otp_record.expires_at = timezone.now() - timedelta(minutes=1)
        otp_record.save(update_fields=["expires_at"])

        res = self.client.post("/api/auth/verify-otp/", {
            "email": "eleanor.vance@example.com",
            "otp_code": plain_code,
        }, format="json")
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("expired", str(res.data).lower())

    @patch("accounts.serializers.send_otp_email")
    def test_otp_max_attempts_lockout(self, mock_send_email):
        mock_send_email.return_value = {"success": True, "message": "Sent", "error": None}
        self.client.post("/api/auth/register/", self.valid_payload, format="json")
        plain_code = mock_send_email.call_args[1]["otp_code"]

        for _ in range(5):
            self.client.post("/api/auth/verify-otp/", {
                "email": "eleanor.vance@example.com",
                "otp_code": "999999",
            }, format="json")

        # Now even with the correct code, lockout is enforced
        locked_res = self.client.post("/api/auth/verify-otp/", {
            "email": "eleanor.vance@example.com",
            "otp_code": plain_code,
        }, format="json")
        self.assertEqual(locked_res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("failed attempts", str(locked_res.data).lower())

    @patch("accounts.serializers.send_otp_email")
    def test_resend_otp_invalidates_old_and_issues_new_hashed_otp(self, mock_send_email):
        mock_send_email.return_value = {"success": True, "message": "Sent", "error": None}
        self.client.post("/api/auth/register/", self.valid_payload, format="json")
        old_code = mock_send_email.call_args[1]["otp_code"]

        # Age the previous OTP by 60 seconds to bypass the 45s resend throttle safely
        otp_rec = EmailOTPVerification.objects.get(email="eleanor.vance@example.com")
        otp_rec.created_at = timezone.now() - timedelta(seconds=60)
        otp_rec.save(update_fields=["created_at"])

        # Resend OTP
        resend_res = self.client.post("/api/auth/resend-otp/", {
            "email": "eleanor.vance@example.com",
            "purpose": "registration"
        }, format="json")
        self.assertEqual(resend_res.status_code, status.HTTP_200_OK)
        new_code = mock_send_email.call_args[1]["otp_code"]
        self.assertNotEqual(old_code, new_code)

        # Old code now fails
        old_attempt = self.client.post("/api/auth/verify-otp/", {
            "email": "eleanor.vance@example.com",
            "otp_code": old_code,
        }, format="json")
        self.assertEqual(old_attempt.status_code, status.HTTP_400_BAD_REQUEST)

        # New code succeeds
        new_attempt = self.client.post("/api/auth/verify-otp/", {
            "email": "eleanor.vance@example.com",
            "otp_code": new_code,
        }, format="json")
        self.assertEqual(new_attempt.status_code, status.HTTP_200_OK)

    @patch("accounts.views.send_otp_email")
    def test_test_email_endpoint_does_not_leak_otp(self, mock_send):
        mock_send.return_value = {"success": True, "message": "Email sent", "error": None}
        res = self.client.post("/api/auth/test-email/", {
            "recipient_email": "test@careflow.com"
        }, format="json")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertNotIn("test_otp", res.data)
        self.assertNotIn("otp_code", res.data)

    def test_single_admin_constraint_enforced(self):
        admin_u1 = User.objects.create_user(username="admin1", email="admin1@careflow.com", password="Password@123")
        profile1, _ = UserProfile.objects.get_or_create(user=admin_u1)
        profile1.role = UserRole.ADMIN
        profile1.save()

        admin_u2 = User.objects.create_user(username="admin2", email="admin2@careflow.com", password="Password@123")
        profile2, _ = UserProfile.objects.get_or_create(user=admin_u2)
        profile2.role = UserRole.ADMIN

        from django.core.exceptions import ValidationError
        with self.assertRaises(ValidationError):
            profile2.save()

    def test_authenticated_profile_view_and_update(self):
        user = User.objects.create_user(
            username="admin_profile_test",
            email="admin_profile@careflow.com",
            password="Password@123",
            first_name="Admin",
            last_name="User"
        )
        profile, _ = UserProfile.objects.get_or_create(user=user)
        profile.role = UserRole.ADMIN
        profile.phone_number = "555-0100"
        profile.save()
        user.refresh_from_db()

        self.client.force_authenticate(user=user)
        # GET profile
        get_res = self.client.get("/api/auth/profile/")
        self.assertEqual(get_res.status_code, status.HTTP_200_OK)
        self.assertEqual(get_res.data["username"], "admin_profile_test")
        self.assertEqual(get_res.data["role"], UserRole.ADMIN)
        self.assertEqual(get_res.data["phone_number"], "555-0100")

        # PATCH profile
        patch_res = self.client.patch("/api/auth/profile/", {
            "first_name": "UpdatedAdmin",
            "phone_number": "555-0999"
        }, format="json")
        self.assertEqual(patch_res.status_code, status.HTTP_200_OK)
        self.assertEqual(patch_res.data["first_name"], "UpdatedAdmin")
        self.assertEqual(patch_res.data["phone_number"], "555-0999")

    def test_change_password_endpoint(self):
        user = User.objects.create_user(
            username="pwd_test_user",
            email="pwd_test@careflow.com",
            password="OldPassword@123"
        )
        self.client.force_authenticate(user=user)

        # Incorrect current password fails
        bad_res = self.client.post("/api/auth/change-password/", {
            "current_password": "WrongPassword@123",
            "new_password": "NewPassword@123",
            "confirm_password": "NewPassword@123"
        }, format="json")
        self.assertEqual(bad_res.status_code, status.HTTP_400_BAD_REQUEST)

        # Valid password change succeeds
        good_res = self.client.post("/api/auth/change-password/", {
            "current_password": "OldPassword@123",
            "new_password": "NewPassword@123",
            "confirm_password": "NewPassword@123"
        }, format="json")
        self.assertEqual(good_res.status_code, status.HTTP_200_OK)
        self.assertTrue(good_res.data["success"])
        user.refresh_from_db()
        self.assertTrue(user.check_password("NewPassword@123"))

