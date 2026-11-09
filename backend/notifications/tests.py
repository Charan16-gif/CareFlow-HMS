import datetime
from django.test import TestCase
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient

from accounts.models import User, UserRole, UserProfile
from notifications.models import Notification, NotificationType
from notifications.services import create_notification, notify_role


class NotificationBackendTests(TestCase):
    def setUp(self):
        self.client = APIClient()

        # Admin User
        self.admin_user = User.objects.create_user(
            username="admin_notif_test",
            email="admin_notif@test.com",
            password="StrongPassword123!",
            is_active=True,
        )
        admin_prof, _ = UserProfile.objects.get_or_create(user=self.admin_user)
        admin_prof.role = UserRole.ADMIN
        admin_prof.save()

        # Doctor User
        self.doctor_user = User.objects.create_user(
            username="doctor_notif_test",
            email="doctor_notif@test.com",
            password="StrongPassword123!",
            is_active=True,
        )
        doc_prof, _ = UserProfile.objects.get_or_create(user=self.doctor_user)
        doc_prof.role = UserRole.DOCTOR
        doc_prof.save()

        # Patient User
        self.patient_user = User.objects.create_user(
            username="patient_notif_test",
            email="patient_notif@test.com",
            password="StrongPassword123!",
            is_active=True,
        )
        pat_prof, _ = UserProfile.objects.get_or_create(user=self.patient_user)
        pat_prof.role = UserRole.PATIENT
        pat_prof.save()

    def test_create_notification_and_deduplication(self):
        """Test notification creation and deduplication within window"""
        ntf1 = create_notification(
            recipient=self.patient_user,
            title="Appointment Confirmed",
            message="Your appointment has been confirmed.",
            notification_type=NotificationType.APPOINTMENT,
            action_url="/patient/appointments",
            reference_id="APT-TEST-1",
        )
        self.assertIsNotNone(ntf1)
        self.assertFalse(ntf1.is_read)
        self.assertTrue(ntf1.notification_id.startswith("NTF-"))

        # Attempt to create duplicate with same reference and title
        ntf2 = create_notification(
            recipient=self.patient_user,
            title="Appointment Confirmed",
            message="Your appointment has been confirmed.",
            notification_type=NotificationType.APPOINTMENT,
            action_url="/patient/appointments",
            reference_id="APT-TEST-1",
            dedup_window_seconds=60,
        )
        # Should return existing notification rather than duplicate
        self.assertEqual(ntf1.id, ntf2.id)
        self.assertEqual(Notification.objects.filter(recipient=self.patient_user).count(), 1)

    def test_notify_role(self):
        """Test broadcast to users by role"""
        notifications = notify_role(
            role=UserRole.ADMIN,
            title="New Patient Registration",
            message="A new patient has joined.",
            notification_type=NotificationType.ACCOUNT,
            action_url="/admin/users",
            reference_id="PATIENT-TEST-1",
        )
        self.assertTrue(len(notifications) >= 1)
        self.assertEqual(notifications[0].recipient, self.admin_user)

    def test_user_isolation(self):
        """Test that users can only see their own notifications"""
        create_notification(
            recipient=self.admin_user,
            title="Admin Alert",
            message="System is healthy.",
            notification_type=NotificationType.SYSTEM,
        )
        create_notification(
            recipient=self.patient_user,
            title="Prescription Ready",
            message="Your medicine is ready.",
            notification_type=NotificationType.PRESCRIPTION,
        )

        # Authenticate as patient
        self.client.force_authenticate(user=self.patient_user)
        response = self.client.get("/api/notifications/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data.get("results", [])
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]["title"], "Prescription Ready")

        # Patient cannot access unauthenticated
        self.client.force_authenticate(user=None)
        unauth_resp = self.client.get("/api/notifications/")
        self.assertEqual(unauth_resp.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_unread_count_and_mark_as_read(self):
        """Test unread count endpoint and mark as read action"""
        ntf = create_notification(
            recipient=self.doctor_user,
            title="New Appointment Scheduled",
            message="New patient appointment.",
            notification_type=NotificationType.APPOINTMENT,
            reference_id="APT-DOC-1",
        )
        self.client.force_authenticate(user=self.doctor_user)

        # Check unread count
        count_resp = self.client.get("/api/notifications/unread-count/")
        self.assertEqual(count_resp.status_code, status.HTTP_200_OK)
        self.assertEqual(count_resp.data["unread_count"], 1)

        # Mark as read
        read_resp = self.client.post(f"/api/notifications/{ntf.id}/read/")
        self.assertEqual(read_resp.status_code, status.HTTP_200_OK)
        self.assertTrue(read_resp.data["success"])
        self.assertEqual(read_resp.data["unread_count"], 0)

        ntf.refresh_from_db()
        self.assertTrue(ntf.is_read)
        self.assertIsNotNone(ntf.read_at)

    def test_mark_all_as_read_and_clear_all(self):
        """Test bulk mark all read and clear all"""
        for i in range(3):
            create_notification(
                recipient=self.patient_user,
                title=f"Notification {i}",
                message=f"Message {i}",
                reference_id=f"REF-{i}",
            )

        self.client.force_authenticate(user=self.patient_user)
        count_resp = self.client.get("/api/notifications/unread-count/")
        self.assertEqual(count_resp.data["unread_count"], 3)

        # Mark all read
        mark_all_resp = self.client.post("/api/notifications/mark-all-read/")
        self.assertEqual(mark_all_resp.status_code, status.HTTP_200_OK)
        self.assertEqual(mark_all_resp.data["unread_count"], 0)

        # Clear all
        clear_resp = self.client.post("/api/notifications/clear/")
        self.assertEqual(clear_resp.status_code, status.HTTP_200_OK)
        self.assertEqual(clear_resp.data["unread_count"], 0)

        # Active list should now be empty
        list_resp = self.client.get("/api/notifications/")
        self.assertEqual(len(list_resp.data.get("results", [])), 0)

    def test_cross_user_manipulation_prevention(self):
        """Test that user cannot mark someone else's notification as read"""
        admin_ntf = create_notification(
            recipient=self.admin_user,
            title="Admin Confidential",
            message="Internal audit notice.",
            notification_type=NotificationType.SYSTEM,
        )

        self.client.force_authenticate(user=self.patient_user)
        # Attempt to mark admin's notification as read
        hack_resp = self.client.post(f"/api/notifications/{admin_ntf.id}/read/")
        self.assertEqual(hack_resp.status_code, status.HTTP_404_NOT_FOUND)
