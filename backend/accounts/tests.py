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
        User.objects.filter(is_superuser=True).delete()
        UserProfile.objects.filter(role=UserRole.ADMIN).delete()
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
        User.objects.filter(is_superuser=True).delete()
        UserProfile.objects.filter(role=UserRole.ADMIN).delete()
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
        User.objects.filter(is_superuser=True).delete()
        UserProfile.objects.filter(role=UserRole.ADMIN).delete()
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

    def test_health_check_endpoint_returns_database_status(self):
        res = self.client.get("/api/health/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data["status"], "healthy")
        self.assertEqual(res.data["database"], "connected")
        self.assertEqual(res.data["version"], "1.0.0")

    def test_database_backup_permissions_restricted_to_admin(self):
        from .models import DatabaseBackupRecord

        # 1. Anonymous user blocked
        anon_client = APIClient()
        res = anon_client.get("/api/admin/backups/")
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)

        # 2. Patient user blocked
        patient_user = User.objects.create_user(
            username="patient_backup_tester",
            email="patient_backup@careflow.com",
            password="Password@123"
        )
        patient_client = APIClient()
        patient_client.force_authenticate(user=patient_user)
        res = patient_client.get("/api/admin/backups/")
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

        # 3. Admin user allowed
        User.objects.filter(is_superuser=True).delete()
        UserProfile.objects.filter(role=UserRole.ADMIN).delete()
        admin_user = User.objects.create_superuser(
            username="admin_backup_tester",
            email="admin_backup@careflow.com",
            password="AdminPassword@123"
        )
        admin_client = APIClient()
        admin_client.force_authenticate(user=admin_user)
        res = admin_client.get("/api/admin/backups/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)

    def test_token_blacklist_endpoint(self):
        from rest_framework_simplejwt.tokens import RefreshToken
        user = User.objects.create_user(
            username="blacklist_tester",
            email="blacklist@careflow.com",
            password="Password@123"
        )
        refresh = RefreshToken.for_user(user)

        res = self.client.post("/api/auth/token/blacklist/", {
            "refresh": str(refresh)
        }, format="json")
        self.assertEqual(res.status_code, status.HTTP_200_OK)

        # Attempting to refresh using blacklisted token fails with 401
        refresh_res = self.client.post("/api/auth/token/refresh/", {
            "refresh": str(refresh)
        }, format="json")
        self.assertEqual(refresh_res.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_real_email_validation_and_disposable_rejection(self):
        # 1. Invalid email formats (including user prompt examples)
        invalid_emails = [
            "charan",
            "charan@",
            "@gmail.com",
            "charan@gmail",
            "charan gmail.com",
            "plainaddress",
            "@missingusername.com",
            "username@.com",
            "username@domain..com",
            "username@-domain.com",
        ]
        for bad_email in invalid_emails:
            payload = dict(self.valid_payload, email=bad_email)
            res = self.client.post("/api/auth/register/", payload, format="json")
            self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
            self.assertIn("Please enter a valid email address.", str(res.data))

        # 2. Disposable email services
        disposable_emails = [
            "testuser@mailinator.com",
            "testuser@tempmail.com",
            "testuser@10minutemail.com",
            "testuser@guerrillamail.com",
            "testuser@yopmail.com",
        ]
        for disp_email in disposable_emails:
            payload = dict(self.valid_payload, email=disp_email)
            res = self.client.post("/api/auth/register/", payload, format="json")
            self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
            self.assertIn("Temporary email addresses are not allowed.", str(res.data))

        # 3. Already registered active user
        User.objects.create_user(
            username="existing_active_user",
            email="existing_registered@example.com",
            password="Password@123",
            is_active=True
        )
        payload = dict(self.valid_payload, email="existing_registered@example.com")
        res = self.client.post("/api/auth/register/", payload, format="json")
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("This email address is already registered. Please use another email.", str(res.data))

    @patch("accounts.serializers.send_otp_email")
    def test_otp_verification_standard_error_messages(self, mock_send_email):
        mock_send_email.return_value = {"success": True, "message": "Sent", "error": None}
        self.client.post("/api/auth/register/", self.valid_payload, format="json")

        # 1. Invalid OTP code message
        res_invalid = self.client.post("/api/auth/verify-otp/", {
            "email": "eleanor.vance@example.com",
            "otp_code": "999999",
        }, format="json")
        self.assertEqual(res_invalid.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("Incorrect OTP. Please try again.", str(res_invalid.data))

        # 2. Expired OTP message
        otp_rec = EmailOTPVerification.objects.filter(email="eleanor.vance@example.com").first()
        otp_rec.expires_at = timezone.now() - timedelta(minutes=1)
        otp_rec.save(update_fields=["expires_at"])

        res_expired = self.client.post("/api/auth/verify-otp/", {
            "email": "eleanor.vance@example.com",
            "otp_code": "999999",
        }, format="json")
        self.assertEqual(res_expired.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("OTP expired. Please request a new OTP.", str(res_expired.data))

    @patch("accounts.serializers.send_otp_email")
    def test_resend_otp_cooldown_and_success_message(self, mock_send_email):
        mock_send_email.return_value = {"success": True, "message": "Sent", "error": None}
        self.client.post("/api/auth/register/", self.valid_payload, format="json")

        # Immediately resending triggers cooldown
        res_cooldown = self.client.post("/api/auth/resend-otp/", {
            "email": "eleanor.vance@example.com",
        }, format="json")
        self.assertEqual(res_cooldown.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("Please wait", str(res_cooldown.data))

        # Fast forward past cooldown
        EmailOTPVerification.objects.filter(email="eleanor.vance@example.com").update(
            created_at=timezone.now() - timedelta(seconds=60)
        )

        res_ok = self.client.post("/api/auth/resend-otp/", {
            "email": "eleanor.vance@example.com",
        }, format="json")
        self.assertEqual(res_ok.status_code, status.HTTP_200_OK)
        self.assertEqual(res_ok.data["message"], "A new OTP sending request has been processed.")

    @patch("accounts.serializers.send_otp_email")
    def test_email_correction_workflow(self, mock_send_email):
        mock_send_email.return_value = {"success": True, "message": "Sent", "error": None}
        self.client.post("/api/auth/register/", self.valid_payload, format="json")

        # Attempt to correct to invalid syntax
        res_bad = self.client.post("/api/auth/otp/correct-email/", {
            "old_email": "eleanor.vance@example.com",
            "new_email": "invalid-syntax-email",
        }, format="json")
        self.assertEqual(res_bad.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("Please enter a valid email address.", str(res_bad.data))

        # Valid correction
        res_good = self.client.post("/api/auth/otp/correct-email/", {
            "old_email": "eleanor.vance@example.com",
            "new_email": "eleanor.corrected@example.com",
        }, format="json")
        self.assertEqual(res_good.status_code, status.HTTP_200_OK)
        self.assertTrue(res_good.data["success"])
        self.assertEqual(res_good.data["email"], "eleanor.corrected@example.com")

        # Verify old record is deleted/invalid and user's email was updated
        user = User.objects.get(email="eleanor.corrected@example.com")
        self.assertEqual(user.email, "eleanor.corrected@example.com")
        self.assertEqual(user.username, "eleanor.corrected@example.com")
        self.assertFalse(EmailOTPVerification.objects.filter(email="eleanor.vance@example.com", is_verified=False, delivery_status="ACCEPTED").exists())
        self.assertTrue(EmailOTPVerification.objects.filter(email="eleanor.corrected@example.com").exists())

    def test_email_delivery_status_and_bounce_webhook(self):
        # Create unverified user and OTP verification record
        EmailOTPVerification.objects.create(
            email="bounce.test@example.com",
            otp_code="pbkdf2_sha256$hashed",
            delivery_status="ACCEPTED",
            expires_at=timezone.now() + timedelta(minutes=10),
        )

        # Check status endpoint
        res_status = self.client.get("/api/auth/otp/status/?email=bounce.test@example.com")
        self.assertEqual(res_status.status_code, status.HTTP_200_OK)
        self.assertEqual(res_status.data["delivery_status"], "ACCEPTED")

        # Fire bounce webhook
        webhook_payload = {
            "email": "bounce.test@example.com",
            "event": "bounce",
            "bounce_type": "permanent",
            "description": "550 5.1.1 User unknown",
        }
        res_bounce = self.client.post("/api/auth/email/webhook/bounce/", webhook_payload, format="json")
        self.assertEqual(res_bounce.status_code, status.HTTP_200_OK)
        self.assertTrue(res_bounce.data["success"])

        # Check status again -> must now be FAILED
        res_status_after = self.client.get("/api/auth/otp/status/?email=bounce.test@example.com")
        self.assertEqual(res_status_after.status_code, status.HTTP_200_OK)
        self.assertEqual(res_status_after.data["delivery_status"], "FAILED")
        self.assertEqual(res_status_after.data["message"], "Email delivery failed. Please correct your email address.")

    @patch("accounts.serializers.send_otp_email")
    def test_smtp_immediate_recipient_rejection(self, mock_send_email):
        mock_send_email.return_value = {
            "success": False,
            "status": "FAILED",
            "message": "Email could not be sent. Please check your email address.",
            "error": "550 User unknown",
            "is_recipient_error": True,
        }
        res = self.client.post("/api/auth/register/", self.valid_payload, format="json")
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("Email could not be sent. Please check your email address.", str(res.data))

    @patch("accounts.serializers.send_otp_email")
    def test_smtp_connection_failure(self, mock_send_email):
        mock_send_email.return_value = {
            "success": False,
            "status": "FAILED",
            "message": "Unable to send verification email. Please try again later.",
            "error": "Connection timed out",
            "is_recipient_error": False,
        }
        res = self.client.post("/api/auth/register/", self.valid_payload, format="json")
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertFalse(res.data["email_sent"])
        self.assertEqual(res.data["email_message"], "Unable to send verification email. Please try again later.")

    def test_realtime_email_validation_syntax_errors(self):
        invalid_syntax_emails = [
            "charan",
            "charan@",
            "@gmail.com",
            "charan@gmail",
            "charan gmail.com",
        ]
        for bad in invalid_syntax_emails:
            res = self.client.post("/api/auth/validate-email/", {"email": bad}, format="json")
            self.assertEqual(res.status_code, status.HTTP_200_OK)
            self.assertEqual(res.data["status"], "INVALID_FORMAT")
            self.assertFalse(res.data["is_valid"])
            self.assertEqual(res.data["message"], "Please enter a valid email address.")

    def test_realtime_email_validation_domain_errors(self):
        res = self.client.post("/api/auth/validate-email/", {"email": "charan@unknown-domain-xyz12345.com"}, format="json")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data["status"], "INVALID_DOMAIN")
        self.assertFalse(res.data["is_valid"])
        self.assertEqual(res.data["message"], "This email domain cannot receive emails.")

    def test_realtime_email_validation_disposable(self):
        disposable_emails = ["test@mailinator.com", "user@tempmail.com", "burner@10minutemail.com"]
        for disp in disposable_emails:
            res = self.client.post("/api/auth/validate-email/", {"email": disp}, format="json")
            self.assertEqual(res.status_code, status.HTTP_200_OK)
            self.assertEqual(res.data["status"], "DISPOSABLE")
            self.assertFalse(res.data["is_valid"])
            self.assertEqual(res.data["message"], "Temporary email addresses are not allowed.")

    def test_realtime_email_validation_typo_suggestion(self):
        res = self.client.post("/api/auth/validate-email/", {"email": "charan@gmial.com"}, format="json")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data["status"], "POSSIBLE_TYPO")
        self.assertFalse(res.data["is_valid"])
        self.assertEqual(res.data["suggested_email"], "charan@gmail.com")
        self.assertEqual(res.data["message"], "Did you mean charan@gmail.com?")

    @patch("accounts.email_verification_provider.AbstractAPIProvider.verify")
    def test_realtime_email_validation_mailbox_deliverable(self, mock_verify):
        mock_verify.return_value = {
            "provider": "abstractapi",
            "configured": True,
            "deliverability": "DELIVERABLE",
            "is_smtp_valid": True,
            "autocorrect": "",
            "error": None,
            "raw": {},
        }
        with patch("django.conf.settings.EMAIL_VERIFICATION_API_KEY", "dummy_api_key"):
            from django.core.cache import cache
            cache.clear()
            res = self.client.post("/api/auth/validate-email/", {"email": "charan123@gmail.com"}, format="json")
            self.assertEqual(res.status_code, status.HTTP_200_OK)
            self.assertEqual(res.data["status"], "VALID")
            self.assertTrue(res.data["is_valid"])
            self.assertEqual(res.data["message"], "Email address looks valid.")

    @patch("accounts.email_verification_provider.AbstractAPIProvider.verify")
    def test_realtime_email_validation_mailbox_undeliverable(self, mock_verify):
        mock_verify.return_value = {
            "provider": "abstractapi",
            "configured": True,
            "deliverability": "UNDELIVERABLE",
            "is_smtp_valid": False,
            "autocorrect": "",
            "error": None,
            "raw": {},
        }
        with patch("django.conf.settings.EMAIL_VERIFICATION_API_KEY", "dummy_api_key"):
            from django.core.cache import cache
            cache.clear()
            res = self.client.post("/api/auth/validate-email/", {"email": "charan@gmail.com"}, format="json")
            self.assertEqual(res.status_code, status.HTTP_200_OK)
            self.assertEqual(res.data["status"], "MAILBOX_NOT_FOUND")
            self.assertFalse(res.data["is_valid"])
            self.assertEqual(res.data["message"], "This email address does not exist.")

    def test_realtime_email_validation_unknown_when_unconfigured(self):
        from django.core.cache import cache
        cache.clear()
        # Without provider credentials, deliverability is unknown / inconclusive
        with patch("django.conf.settings.EMAIL_VERIFICATION_API_KEY", ""):
            res = self.client.post("/api/auth/validate-email/", {"email": "charan@careflow.com"}, format="json")
            self.assertEqual(res.status_code, status.HTTP_200_OK)
            self.assertEqual(res.data["status"], "UNKNOWN")
            self.assertIsNone(res.data["is_valid"])
            self.assertTrue(res.data["allow_continue"])
            self.assertEqual(res.data["message"], "We couldn't verify this email address. Please try again.")

    @patch("accounts.email_verification_provider.AbstractAPIProvider.verify")
    def test_realtime_email_validation_timeout_and_rate_limits(self, mock_verify):
        from django.core.cache import cache
        cache.clear()
        mock_verify.return_value = {
            "provider": "abstractapi",
            "configured": True,
            "deliverability": "UNKNOWN",
            "is_smtp_valid": None,
            "autocorrect": "",
            "error": "HTTP 429: Rate limit exceeded",
            "raw": {},
        }
        with patch("django.conf.settings.EMAIL_VERIFICATION_API_KEY", "dummy_api_key"):
            res = self.client.post("/api/auth/validate-email/", {"email": "rate_limited_tester@careflow.com"}, format="json")
            self.assertEqual(res.status_code, status.HTTP_200_OK)
            self.assertEqual(res.data["status"], "UNKNOWN")
            self.assertEqual(res.data["message"], "We couldn't verify this email address. Please try again.")

    @patch("accounts.email_verification_provider.AbstractAPIProvider.verify")
    def test_realtime_email_validation_caching(self, mock_verify):
        from django.core.cache import cache
        cache.clear()
        mock_verify.return_value = {
            "provider": "abstractapi",
            "configured": True,
            "deliverability": "DELIVERABLE",
            "is_smtp_valid": True,
            "autocorrect": "",
            "error": None,
            "raw": {},
        }
        with patch("django.conf.settings.EMAIL_VERIFICATION_API_KEY", "dummy_api_key"):
            res1 = self.client.post("/api/auth/validate-email/", {"email": "cached_tester@careflow.com"}, format="json")
            self.assertEqual(res1.status_code, status.HTTP_200_OK)
            self.assertEqual(mock_verify.call_count, 1)

            res2 = self.client.post("/api/auth/validate-email/", {"email": "cached_tester@careflow.com"}, format="json")
            self.assertEqual(res2.status_code, status.HTTP_200_OK)
            # Must NOT call provider a second time due to cache hit
            self.assertEqual(mock_verify.call_count, 1)
            self.assertTrue(res2.data["details"]["cached"])

    @patch("accounts.email_verification_provider.AbstractAPIProvider.verify")
    @patch("accounts.serializers.send_otp_email")
    def test_registration_blocks_invalid_mailboxes_and_typos(self, mock_send_email, mock_verify):
        mock_send_email.return_value = {"success": True, "message": "Sent", "error": None}

        # 1. Registration with typo is blocked
        typo_payload = dict(self.valid_payload, email="charan@gmial.com")
        res_typo = self.client.post("/api/auth/register/", typo_payload, format="json")
        self.assertEqual(res_typo.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("Did you mean charan@gmail.com?", str(res_typo.data))

        # 2. Registration with undeliverable mailbox is blocked
        mock_verify.return_value = {
            "provider": "abstractapi",
            "configured": True,
            "deliverability": "UNDELIVERABLE",
            "is_smtp_valid": False,
            "autocorrect": "",
            "error": None,
            "raw": {},
        }
        with patch("django.conf.settings.EMAIL_VERIFICATION_API_KEY", "dummy_api_key"):
            from django.core.cache import cache
            cache.clear()
            undeliv_payload = dict(self.valid_payload, email="undeliverable_box@careflow.com")
            res_undeliv = self.client.post("/api/auth/register/", undeliv_payload, format="json")
            self.assertEqual(res_undeliv.status_code, status.HTTP_400_BAD_REQUEST)
            self.assertIn("This email address does not exist.", str(res_undeliv.data))

        # 3. Registration with deliverable mailbox succeeds and issues OTP
        mock_verify.return_value = {
            "provider": "abstractapi",
            "configured": True,
            "deliverability": "DELIVERABLE",
            "is_smtp_valid": True,
            "autocorrect": "",
            "error": None,
            "raw": {},
        }
        with patch("django.conf.settings.EMAIL_VERIFICATION_API_KEY", "dummy_api_key"):
            cache.clear()
            good_payload = dict(self.valid_payload, email="deliverable_box@careflow.com")
            res_good = self.client.post("/api/auth/register/", good_payload, format="json")
            self.assertEqual(res_good.status_code, status.HTTP_201_CREATED)
            self.assertTrue(res_good.data["success"])
            self.assertIn("Verification email sending initiated. Please check your inbox.", res_good.data["message"])

    @patch("accounts.serializers.send_otp_email")
    def test_patient_demographics_flow_through_registration_and_otp_verification(self, mock_send_email):
        mock_send_email.return_value = {"success": True, "message": "Sent", "error": None}
        from patients.models import Patient

        payload = {
            "first_name": "Suneo",
            "last_name": "Honekawa",
            "email": "suneo.demo@example.com",
            "phone": "+1 555-9876",
            "date_of_birth": "2000-08-18",
            "gender": "PREFER_NOT_TO_SAY",
            "blood_group": "AB+",
            "address": "Tokyo, Japan",
            "password": "Password@123",
            "confirm_password": "Password@123",
        }

        # 1. Registration does NOT create a Patient record before verification
        res_reg = self.client.post("/api/auth/register/", payload, format="json")
        self.assertEqual(res_reg.status_code, status.HTTP_201_CREATED)
        self.assertFalse(Patient.objects.filter(email="suneo.demo@example.com").exists())

        # 2. OTP verification creates Patient with exact demographic details
        plain_code = mock_send_email.call_args[1]["otp_code"]
        res_verify = self.client.post("/api/auth/verify-otp/", {
            "email": "suneo.demo@example.com",
            "otp_code": plain_code,
        }, format="json")
        self.assertEqual(res_verify.status_code, status.HTTP_200_OK)

        patient = Patient.objects.filter(email="suneo.demo@example.com").first()
        self.assertIsNotNone(patient)
        self.assertEqual(patient.first_name, "Suneo")
        self.assertEqual(patient.last_name, "Honekawa")
        self.assertEqual(str(patient.date_of_birth), "2000-08-18")
        self.assertEqual(patient.gender, "PREFER_NOT_TO_SAY")
        self.assertEqual(patient.blood_group, "AB+")
        self.assertEqual(patient.address, "Tokyo, Japan")
        self.assertEqual(patient.phone_number, "+1 555-9876")




