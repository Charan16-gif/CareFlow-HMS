from datetime import date, time, timedelta
from django.utils import timezone
from django.contrib.auth.models import User
from rest_framework.test import APITestCase
from rest_framework import status
from accounts.models import UserProfile, UserRole
from patients.models import Patient
from staff.models import Doctor
from appointments.models import Appointment, AppointmentStatus


class ReceptionistWorkflowBackendTests(APITestCase):
    def setUp(self):
        # 1. Setup Receptionist User
        self.receptionist_user = User.objects.create_user(
            username="test_receptionist",
            email="receptionist@careflow.com",
            password="StrongPassword123!",
            first_name="Madhu",
            last_name="Receptionist"
        )
        self.receptionist_profile, _ = UserProfile.objects.get_or_create(user=self.receptionist_user)
        self.receptionist_profile.role = UserRole.RECEPTIONIST
        self.receptionist_profile.save()

        # 2. Setup Patient User & Patient Record
        self.patient_user = User.objects.create_user(
            username="test_patient",
            email="patient@careflow.com",
            password="StrongPassword123!",
            first_name="John",
            last_name="Doe"
        )
        self.patient_profile, _ = UserProfile.objects.get_or_create(user=self.patient_user)
        self.patient_profile.role = UserRole.PATIENT
        self.patient_profile.save()

        self.patient = Patient.objects.create(
            user=self.patient_user,
            first_name="John",
            last_name="Doe",
            phone_number="9876543210",
            email="patient@careflow.com",
            date_of_birth=date(1990, 5, 15)
        )

        # 3. Setup Doctor User & Doctor Record
        self.doctor_user = User.objects.create_user(
            username="test_doctor",
            email="doctor@careflow.com",
            password="StrongPassword123!",
            first_name="Devi",
            last_name="Shetty"
        )
        self.doctor_profile, _ = UserProfile.objects.get_or_create(user=self.doctor_user)
        self.doctor_profile.role = UserRole.DOCTOR
        self.doctor_profile.save()

        self.doctor = Doctor.objects.create(
            user=self.doctor_user,
            first_name="Devi",
            last_name="Shetty",
            specialization="Cardiology",
            qualification="MS, FRCS",
            license_number="MED-CARD-9912",
            department="Cardiology",
            phone_number="9123456780",
            email="doctor@careflow.com",
            available_days="Monday,Tuesday,Wednesday,Thursday,Friday,Saturday,Sunday",
            start_time=time(9, 0),
            end_time=time(17, 0)
        )

        self.today = timezone.localdate()

        # 4. Existing Appointment
        self.appointment = Appointment.objects.create(
            patient=self.patient,
            doctor=self.doctor,
            appointment_date=self.today,
            appointment_time=time(10, 0),
            status=AppointmentStatus.SCHEDULED,
            reason_for_visit="Routine Cardiac Evaluation"
        )

    def test_receptionist_stats_endpoint(self):
        """Receptionist can access real-time calculated statistics for today."""
        self.client.force_authenticate(user=self.receptionist_user)
        url = "/api/appointments/receptionist-stats/"
        res = self.client.get(url)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertIn("today_appointments", res.data)
        self.assertIn("registered_patients", res.data)
        self.assertIn("checked_in_today", res.data)
        self.assertIn("waiting_patients", res.data)
        self.assertEqual(res.data["today_appointments"], 1)
        self.assertEqual(res.data["checked_in_today"], 0)
        self.assertEqual(res.data["waiting_patients"], 0)

    def test_unauthorized_user_denied_receptionist_stats(self):
        """Patient or other non-receptionist role cannot access receptionist stats."""
        self.client.force_authenticate(user=self.patient_user)
        url = "/api/appointments/receptionist-stats/"
        res = self.client.get(url)
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_receptionist_check_in_workflow(self):
        """Receptionist checks in patient; timestamp and confirmed status are recorded."""
        self.client.force_authenticate(user=self.receptionist_user)
        url = f"/api/appointments/{self.appointment.id}/check-in/"
        res = self.client.post(url)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.appointment.refresh_from_db()
        self.assertTrue(self.appointment.is_checked_in)
        self.assertIsNotNone(self.appointment.check_in_time)
        self.assertEqual(self.appointment.status, AppointmentStatus.CONFIRMED)

        # Re-check stats shows checked in and waiting count = 1
        stats_res = self.client.get("/api/appointments/receptionist-stats/")
        self.assertEqual(stats_res.data["checked_in_today"], 1)
        self.assertEqual(stats_res.data["waiting_patients"], 1)

    def test_duplicate_check_in_prevented(self):
        """Attempting to check in an already checked in patient returns 400 error."""
        self.client.force_authenticate(user=self.receptionist_user)
        self.appointment.is_checked_in = True
        self.appointment.check_in_time = timezone.now()
        self.appointment.save()

        url = f"/api/appointments/{self.appointment.id}/check-in/"
        res = self.client.post(url)
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("already been checked in", res.data["error"])

    def test_receptionist_undo_check_in(self):
        """Receptionist can revert an accidental check-in."""
        self.client.force_authenticate(user=self.receptionist_user)
        self.appointment.is_checked_in = True
        self.appointment.check_in_time = timezone.now()
        self.appointment.save()

        url = f"/api/appointments/{self.appointment.id}/undo-check-in/"
        res = self.client.post(url)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.appointment.refresh_from_db()
        self.assertFalse(self.appointment.is_checked_in)
        self.assertIsNone(self.appointment.check_in_time)

    def test_receptionist_cancel_appointment_with_reason(self):
        """Receptionist cancels appointment with confirmation and cancellation reason."""
        self.client.force_authenticate(user=self.receptionist_user)
        url = f"/api/appointments/{self.appointment.id}/cancel-appointment/"
        payload = {"cancellation_reason": "Patient requested cancellation due to travel."}
        res = self.client.post(url, payload)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.appointment.refresh_from_db()
        self.assertEqual(self.appointment.status, AppointmentStatus.CANCELLED)
        self.assertEqual(self.appointment.cancellation_reason, "Patient requested cancellation due to travel.")
        self.assertFalse(self.appointment.is_checked_in)

    def test_receptionist_book_appointment(self):
        """Receptionist can book appointment for patient into valid slot."""
        self.client.force_authenticate(user=self.receptionist_user)
        tomorrow = self.today + timedelta(days=1)
        url = "/api/appointments/"
        payload = {
            "patient": self.patient.id,
            "doctor": self.doctor.id,
            "appointment_date": str(tomorrow),
            "appointment_time": "14:30:00",
            "reason_for_visit": "Follow up consultation",
            "status": "SCHEDULED"
        }
        res = self.client.post(url, payload)
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertIn("appointment_id", res.data)
        self.assertEqual(res.data["patient_name"], "John Doe")

    def test_double_booking_prevented(self):
        """Booking the same doctor slot at the same date and time fails validation."""
        self.client.force_authenticate(user=self.receptionist_user)
        url = "/api/appointments/"
        payload = {
            "patient": self.patient.id,
            "doctor": self.doctor.id,
            "appointment_date": str(self.today),
            "appointment_time": "10:00:00",  # Same as self.appointment
            "reason_for_visit": "Conflicting Slot Request"
        }
        res = self.client.post(url, payload)
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
