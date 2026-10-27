from datetime import date, time
from django.utils import timezone
from django.test import TestCase
from django.contrib.auth.models import User
from django.core.exceptions import ValidationError
from rest_framework.test import APIClient
from rest_framework import status
from accounts.models import UserProfile, UserRole
from patients.models import Patient
from staff.models import Doctor
from .models import Appointment, AppointmentStatus


class AppointmentModuleTests(TestCase):
    def setUp(self):
        self.client = APIClient()

        # Doctor
        self.doc_user = User.objects.create_user(username="dr_watson", email="watson@careflow.com", password="Password@123")
        doc_prof, _ = UserProfile.objects.get_or_create(user=self.doc_user)
        doc_prof.role = UserRole.DOCTOR
        doc_prof.save()
        self.doctor = Doctor.objects.create(
            user=self.doc_user,
            first_name="John",
            last_name="Watson",
            specialization="General Medicine",
            qualification="MD",
            license_number="LIC-8899",
            department="General",
            phone_number="555-8888",
            email="watson@careflow.com"
        )

        # Receptionist
        self.rec_user = User.objects.create_user(username="rec_mary", email="rec_mary@careflow.com", password="Password@123")
        rec_prof, _ = UserProfile.objects.get_or_create(user=self.rec_user)
        rec_prof.role = UserRole.RECEPTIONIST
        rec_prof.save()

        # Patient 1
        self.p1_user = User.objects.create_user(username="sherlock", email="sherlock@careflow.com", password="Password@123")
        p1_prof, _ = UserProfile.objects.get_or_create(user=self.p1_user)
        p1_prof.role = UserRole.PATIENT
        p1_prof.save()
        self.patient1 = Patient.objects.create(
            user=self.p1_user,
            first_name="Sherlock",
            last_name="Holmes",
            phone_number="555-221",
            gender="MALE"
        )

        # Patient 2
        self.p2_user = User.objects.create_user(username="mycroft", email="mycroft@careflow.com", password="Password@123")
        p2_prof, _ = UserProfile.objects.get_or_create(user=self.p2_user)
        p2_prof.role = UserRole.PATIENT
        p2_prof.save()
        self.patient2 = Patient.objects.create(
            user=self.p2_user,
            first_name="Mycroft",
            last_name="Holmes",
            phone_number="555-222",
            gender="MALE"
        )

    def test_appointment_creation_and_auto_id(self):
        apt = Appointment.objects.create(
            patient=self.patient1,
            doctor=self.doctor,
            appointment_date=date(2026, 11, 1),
            appointment_time=time(10, 0),
            reason_for_visit="Annual health check"
        )
        self.assertTrue(apt.appointment_id.startswith("CF-APT-"))
        self.assertEqual(apt.status, AppointmentStatus.SCHEDULED)

    def test_prevent_double_booking_for_same_doctor_slot(self):
        Appointment.objects.create(
            patient=self.patient1,
            doctor=self.doctor,
            appointment_date=date(2026, 11, 1),
            appointment_time=time(10, 0),
            reason_for_visit="First visit"
        )

        with self.assertRaises(ValidationError):
            conflicting_apt = Appointment(
                patient=self.patient2,
                doctor=self.doctor,
                appointment_date=date(2026, 11, 1),
                appointment_time=time(10, 0),
                reason_for_visit="Conflicting visit"
            )
            conflicting_apt.clean()

    def test_receptionist_can_book_appointment_via_api(self):
        self.client.force_authenticate(user=self.rec_user)
        payload = {
            "patient": self.patient1.id,
            "doctor": self.doctor.id,
            "appointment_date": "2026-11-05",
            "appointment_time": "14:00",
            "reason_for_visit": "Follow up consultation"
        }
        res = self.client.post("/api/appointments/", payload, format="json")
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertTrue(res.data["appointment_id"].startswith("CF-APT-"))

    def test_patient_appointment_isolation(self):
        apt1 = Appointment.objects.create(
            patient=self.patient1,
            doctor=self.doctor,
            appointment_date=date(2026, 11, 2),
            appointment_time=time(11, 0),
            reason_for_visit="Sherlock check"
        )
        apt2 = Appointment.objects.create(
            patient=self.patient2,
            doctor=self.doctor,
            appointment_date=date(2026, 11, 2),
            appointment_time=time(12, 0),
            reason_for_visit="Mycroft check"
        )

        self.client.force_authenticate(user=self.p1_user)
        # Patient 1 cannot view Patient 2's appointment
        other_res = self.client.get(f"/api/appointments/{apt2.id}/")
        self.assertEqual(other_res.status_code, status.HTTP_404_NOT_FOUND)

        # List shows only Patient 1's appointment
        list_res = self.client.get("/api/appointments/")
        self.assertEqual(list_res.status_code, status.HTTP_200_OK)
        results = list_res.data.get("results", list_res.data)
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]["id"], apt1.id)

    def test_patient_self_booking_and_pending_status(self):
        self.client.force_authenticate(user=self.p1_user)
        payload = {
            "doctor": self.doctor.id,
            "appointment_date": "2026-11-10",
            "appointment_time": "10:30:00",
            "reason_for_visit": "Persistent headache and fever",
        }
        res = self.client.post("/api/appointments/", payload, format="json")
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(res.data["status"], AppointmentStatus.SCHEDULED)
        self.assertEqual(res.data["patient"], self.patient1.id)
        self.assertEqual(res.data["doctor_name"], "Dr. John Watson")
        self.assertEqual(res.data["doctor_department"], "General")

    def test_available_slots_endpoint(self):
        self.client.force_authenticate(user=self.p1_user)
        # Doctor Watson is available Mon-Fri 09:00 to 17:00
        # 2026-11-10 is Tuesday
        res = self.client.get(f"/api/appointments/available-slots/?doctor={self.doctor.id}&date=2026-11-10")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertTrue(res.data["is_available_day"])
        self.assertIn("09:00:00", res.data["available_slots"])
        self.assertIn("09:30:00", res.data["available_slots"])

        # If a slot is booked, it is excluded
        Appointment.objects.create(
            patient=self.patient1,
            doctor=self.doctor,
            appointment_date=date(2026, 11, 10),
            appointment_time=time(9, 0),
            reason_for_visit="Pre-booked check"
        )
        res2 = self.client.get(f"/api/appointments/available-slots/?doctor={self.doctor.id}&date=2026-11-10")
        self.assertNotIn("09:00:00", res2.data["available_slots"])
        self.assertIn("09:30:00", res2.data["available_slots"])

    def test_doctor_can_cancel_assigned_appointment(self):
        apt = Appointment.objects.create(
            patient=self.patient1,
            doctor=self.doctor,
            appointment_date=date(2026, 11, 15),
            appointment_time=time(10, 0),
            reason_for_visit="Consultation"
        )
        self.client.force_authenticate(user=self.doc_user)

        # Doctor can cancel via PATCH status=CANCELLED
        patch_res = self.client.patch(f"/api/appointments/{apt.id}/", {"status": AppointmentStatus.CANCELLED}, format="json")
        self.assertEqual(patch_res.status_code, status.HTTP_200_OK)
        apt.refresh_from_db()
        self.assertEqual(apt.status, AppointmentStatus.CANCELLED)

        # Doctor can cancel another appointment via DELETE
        apt2 = Appointment.objects.create(
            patient=self.patient2,
            doctor=self.doctor,
            appointment_date=date(2026, 11, 16),
            appointment_time=time(11, 0),
            reason_for_visit="Checkup"
        )
        del_res = self.client.delete(f"/api/appointments/{apt2.id}/")
        self.assertEqual(del_res.status_code, status.HTTP_204_NO_CONTENT)
        apt2.refresh_from_db()
        self.assertEqual(apt2.status, AppointmentStatus.CANCELLED)

    def test_patient_cannot_cancel_checked_in_appointment(self):
        """Ensure patient cannot cancel an appointment if they have already checked in."""
        apt = Appointment.objects.create(
            patient=self.patient1,
            doctor=self.doctor,
            appointment_date=date(2026, 11, 1),
            appointment_time=time(14, 0),
            status=AppointmentStatus.CONFIRMED,
            is_checked_in=True,
            check_in_time=timezone.now(),
            reason_for_visit="Emergency consultation"
        )
        self.client.force_authenticate(user=self.p1_user)

        # 1. Via cancel-appointment endpoint
        res = self.client.post(f"/api/appointments/{apt.id}/cancel-appointment/", {"cancellation_reason": "Need cancel"})
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("Checked-in appointments cannot be cancelled by the patient", res.data["error"])

        # 2. Via PATCH status=CANCELLED
        patch_res = self.client.patch(f"/api/appointments/{apt.id}/", {"status": AppointmentStatus.CANCELLED})
        self.assertEqual(patch_res.status_code, status.HTTP_403_FORBIDDEN)

        # 3. Via DELETE
        del_res = self.client.delete(f"/api/appointments/{apt.id}/")
        self.assertEqual(del_res.status_code, status.HTTP_403_FORBIDDEN)

        # Ensure appointment remained CONFIRMED and checked in
        apt.refresh_from_db()
        self.assertEqual(apt.status, AppointmentStatus.CONFIRMED)
        self.assertTrue(apt.is_checked_in)
