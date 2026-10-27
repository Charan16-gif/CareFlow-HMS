from decimal import Decimal
from datetime import date, time, timedelta
from django.utils import timezone
from django.contrib.auth.models import User
from rest_framework.test import APITestCase
from rest_framework import status
from accounts.models import UserProfile, UserRole
from patients.models import Patient
from staff.models import Doctor
from appointments.models import Appointment, AppointmentStatus
from pharmacy.models import Medicine, Prescription, PrescriptionItem, PrescriptionStatus
from billing.models import Bill, BillItem, Payment, BillStatus, BillItemType, PaymentStatus


class ReceptionistBusinessLogicComprehensiveTests(APITestCase):
    def setUp(self):
        # 1. Users & Roles
        self.receptionist_user = User.objects.create_user(
            username="recept_sara", email="sara@careflow.com", password="Password@123"
        )
        r_prof, _ = UserProfile.objects.get_or_create(user=self.receptionist_user)
        r_prof.role = UserRole.RECEPTIONIST
        r_prof.save()

        self.doctor_user = User.objects.create_user(
            username="doc_arun", email="arun@careflow.com", password="Password@123"
        )
        d_prof, _ = UserProfile.objects.get_or_create(user=self.doctor_user)
        d_prof.role = UserRole.DOCTOR
        d_prof.save()

        self.pharmacist_user = User.objects.create_user(
            username="pharm_priya", email="priya@careflow.com", password="Password@123"
        )
        ph_prof, _ = UserProfile.objects.get_or_create(user=self.pharmacist_user)
        ph_prof.role = UserRole.PHARMACIST
        ph_prof.save()

        self.admin_user = User.objects.create_user(
            username="admin_kiran", email="kiran@careflow.com", password="Password@123", is_staff=True
        )
        a_prof, _ = UserProfile.objects.get_or_create(user=self.admin_user)
        a_prof.role = UserRole.ADMIN
        a_prof.save()

        self.patient_user = User.objects.create_user(
            username="pat_rahul", email="rahul@careflow.com", password="Password@123"
        )
        p_prof, _ = UserProfile.objects.get_or_create(user=self.patient_user)
        p_prof.role = UserRole.PATIENT
        p_prof.save()

        # 2. Profiles
        self.patient = Patient.objects.create(
            user=self.patient_user,
            first_name="Rahul",
            last_name="Sharma",
            phone_number="9876500001",
            gender="MALE",
            date_of_birth=date(1985, 3, 20)
        )

        self.doctor = Doctor.objects.create(
            user=self.doctor_user,
            first_name="Arun",
            last_name="Kumar",
            specialization="Cardiology",
            qualification="MD",
            license_number="LIC-AK-1001",
            department="Cardiology",
            phone_number="9876500002",
            email="arun@careflow.com",
            available_days="Monday,Tuesday,Wednesday,Thursday,Friday,Saturday,Sunday",
            start_time=time(9, 0),
            end_time=time(17, 0),
            consultation_fee=Decimal("500.00")
        )

        self.paracetamol = Medicine.objects.create(
            medicine_code="MED-PCM-500",
            name="Paracetamol",
            generic_name="Acetaminophen",
            dosage_form="TABLET",
            unit_price=Decimal("15.00"),
            stock_quantity=200,
            is_active=True
        )

        self.today = timezone.localdate()
        from pharmacy.models import Prescription, PrescriptionStatus
        self.patient_apt = Appointment.objects.create(
            patient=self.patient,
            doctor=self.doctor,
            appointment_date=self.today,
            appointment_time=time(11, 0),
            status=AppointmentStatus.CONFIRMED,
            is_checked_in=True,
            check_in_time=timezone.now(),
            reason_for_visit="Checkup"
        )
        self.patient_rx = Prescription.objects.create(
            patient=self.patient,
            doctor=self.doctor,
            appointment=self.patient_apt,
            diagnosis="Routine Consultation",
            status=PrescriptionStatus.PENDING
        )

    # ─────────────────────────────────────────────────────────────────
    # REQUIREMENT 1: Automatic Patient Checkout After Prescription Completion
    # ─────────────────────────────────────────────────────────────────
    def test_auto_checkout_when_prescription_completed(self):
        """When doctor completes prescription, checked-in visit automatically updates to Checked Out."""
        # 1. Check in appointment
        apt = Appointment.objects.create(
            patient=self.patient,
            doctor=self.doctor,
            appointment_date=self.today,
            appointment_time=time(10, 0),
            status=AppointmentStatus.CONFIRMED,
            is_checked_in=True,
            check_in_time=timezone.now(),
            reason_for_visit="Chest Pain"
        )

        # Unrelated second appointment for the same patient (future date)
        other_apt = Appointment.objects.create(
            patient=self.patient,
            doctor=self.doctor,
            appointment_date=self.today + timedelta(days=5),
            appointment_time=time(11, 0),
            status=AppointmentStatus.SCHEDULED,
            reason_for_visit="Follow up"
        )

        # Cancelled appointment for the patient
        cancelled_apt = Appointment.objects.create(
            patient=self.patient,
            doctor=self.doctor,
            appointment_date=self.today,
            appointment_time=time(14, 0),
            status=AppointmentStatus.CANCELLED,
            reason_for_visit="Cancelled evaluation"
        )

        # 2. Doctor creates prescription linked to the checked-in appointment
        rx = Prescription.objects.create(
            patient=self.patient,
            doctor=self.doctor,
            appointment=apt,
            diagnosis="Angina Pectoris",
            status=PrescriptionStatus.PENDING
        )
        PrescriptionItem.objects.create(
            prescription=rx,
            medicine=self.paracetamol,
            dosage="500mg",
            frequency="1-0-1",
            duration="5 Days",
            quantity_prescribed=10
        )

        # Confirm not checked out while prescription is PENDING
        apt.refresh_from_db()
        self.assertEqual(apt.status, AppointmentStatus.CONFIRMED)
        self.assertTrue(apt.is_checked_in)

        # 3. Doctor completes prescription via API
        self.client.force_authenticate(user=self.doctor_user)
        res = self.client.post(f"/api/pharmacy/prescriptions/{rx.id}/complete/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)

        # 4. Confirm associated appointment automatically transitioned to Checked Out
        apt.refresh_from_db()
        self.assertEqual(apt.status, AppointmentStatus.COMPLETED)
        # Verify serializer outputs visit_status="Checked Out"
        apt_res = self.client.get(f"/api/appointments/{apt.id}/")
        self.assertEqual(apt_res.data["visit_status"], "Checked Out")

        # 5. Confirm unrelated appointments were NOT modified
        other_apt.refresh_from_db()
        self.assertEqual(other_apt.status, AppointmentStatus.SCHEDULED)
        cancelled_apt.refresh_from_db()
        self.assertEqual(cancelled_apt.status, AppointmentStatus.CANCELLED)

        # 6. Idempotent: repeat completion request should succeed without duplicate side-effects
        repeat_res = self.client.post(f"/api/pharmacy/prescriptions/{rx.id}/complete/")
        self.assertEqual(repeat_res.status_code, status.HTTP_200_OK)
        apt.refresh_from_db()
        self.assertEqual(apt.status, AppointmentStatus.COMPLETED)

    # ─────────────────────────────────────────────────────────────────
    # REQUIREMENT 2: Restrict Receptionist Billing Permissions
    # ─────────────────────────────────────────────────────────────────
    def test_receptionist_can_bill_consultation_and_lab_fees(self):
        """Receptionist is permitted to create bills with Consultation and Lab Test fees."""
        self.client.force_authenticate(user=self.receptionist_user)
        payload = {
            "patient": self.patient.id,
            "bill_items": [
                {
                    "item_type": "CONSULTATION",
                    "description": "Doctor Outpatient Consultation",
                    "quantity": 1,
                    "unit_price": "500.00"
                },
                {
                    "item_type": "LAB_TEST",
                    "description": "Lipid Profile Test",
                    "quantity": 1,
                    "unit_price": "350.00"
                }
            ]
        }
        res = self.client.post("/api/billing/invoices/", payload, format="json")
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Decimal(str(res.data["net_amount"])), Decimal("850.00"))

    def test_receptionist_prohibited_from_medicine_billing(self):
        """Receptionist attempting to bill medicines receives 403 Forbidden."""
        self.client.force_authenticate(user=self.receptionist_user)
        payload = {
            "patient": self.patient.id,
            "bill_items": [
                {
                    "item_type": "MEDICINE",
                    "description": "Paracetamol 500mg Strip",
                    "quantity": 2,
                    "unit_price": "30.00"
                }
            ]
        }
        res = self.client.post("/api/billing/invoices/", payload, format="json")
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_receptionist_prohibited_from_pharmacy_checkout(self):
        """Receptionist attempting to call billing/invoices/checkout receives 403 Forbidden."""
        self.client.force_authenticate(user=self.receptionist_user)
        payload = {
            "patient_id": self.patient.id,
            "medicine_id": self.paracetamol.id,
            "quantity": 1
        }
        res = self.client.post("/api/billing/invoices/checkout/", payload, format="json")
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_receptionist_prohibited_from_collecting_medicine_payments(self):
        """Receptionist cannot collect payments for bills containing medicine charges."""
        bill = Bill.objects.create(patient=self.patient, created_by=self.pharmacist_user)
        BillItem.objects.create(
            bill=bill,
            item_type=BillItemType.MEDICINE,
            description="Prescription Antibiotic",
            quantity=1,
            unit_price=Decimal("150.00")
        )
        bill.recalculate_totals()
        bill.save()

        self.client.force_authenticate(user=self.receptionist_user)
        res = self.client.post("/api/billing/payments/", {
            "bill": bill.id,
            "amount": "150.00",
            "payment_method": "CASH"
        }, format="json")
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_pharmacist_and_admin_billing_permissions_preserved(self):
        """Pharmacist and Admin can manage medicine billing for completed prescriptions."""
        rx = Prescription.objects.create(
            patient=self.patient,
            doctor=self.doctor,
            diagnosis="Bronchitis",
            status=PrescriptionStatus.COMPLETED
        )
        PrescriptionItem.objects.create(
            prescription=rx,
            medicine=self.paracetamol,
            dosage="500mg",
            frequency="1-0-1",
            duration="5 Days",
            quantity_prescribed=10
        )

        self.client.force_authenticate(user=self.pharmacist_user)
        res = self.client.post(f"/api/pharmacy/prescriptions/{rx.id}/generate-bill/")
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(res.data["bill"]["status"], "UNPAID")

    # ─────────────────────────────────────────────────────────────────
    # REQUIREMENT 3: Generate Bills Only for Completed Prescriptions
    # ─────────────────────────────────────────────────────────────────
    def test_generate_bill_rejected_for_incomplete_prescription(self):
        """Prescription billing is strictly rejected if prescription status is not Completed."""
        rx = Prescription.objects.create(
            patient=self.patient,
            doctor=self.doctor,
            diagnosis="Gastritis",
            status=PrescriptionStatus.PENDING
        )
        PrescriptionItem.objects.create(
            prescription=rx,
            medicine=self.paracetamol,
            dosage="500mg",
            frequency="1-0-1",
            duration="3 Days",
            quantity_prescribed=6
        )

        self.client.force_authenticate(user=self.pharmacist_user)
        res = self.client.post(f"/api/pharmacy/prescriptions/{rx.id}/generate-bill/")
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("Completed", str(res.data))

    def test_prescription_bill_payment_status_lifecycle_and_duplicate_prevention(self):
        """Completed prescription bill starts UNPAID, supports partial payment, and rejects duplicate bill."""
        rx = Prescription.objects.create(
            patient=self.patient,
            doctor=self.doctor,
            diagnosis="Hypertension",
            status=PrescriptionStatus.COMPLETED
        )
        PrescriptionItem.objects.create(
            prescription=rx,
            medicine=self.paracetamol,
            dosage="500mg",
            frequency="1-0-1",
            duration="10 Days",
            quantity_prescribed=10  # 10 * 15 = 150
        )

        # 1. Generate eligible bill as Pharmacist
        self.client.force_authenticate(user=self.pharmacist_user)
        res = self.client.post(f"/api/pharmacy/prescriptions/{rx.id}/generate-bill/")
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        bill_id = res.data["bill"]["id"]

        bill = Bill.objects.get(id=bill_id)
        self.assertEqual(bill.status, BillStatus.UNPAID)
        self.assertEqual(bill.paid_amount, Decimal("0.00"))
        self.assertEqual(bill.balance_due, Decimal("150.00"))

        # 2. Prevent duplicate bill generation for the same prescription
        dup_res = self.client.post(f"/api/pharmacy/prescriptions/{rx.id}/generate-bill/")
        self.assertEqual(dup_res.status_code, status.HTTP_400_BAD_REQUEST)

        # 3. Partial payment
        pay_res = self.client.post("/api/billing/payments/", {
            "bill": bill.id,
            "amount": "50.00",
            "payment_method": "UPI"
        }, format="json")
        self.assertEqual(pay_res.status_code, status.HTTP_201_CREATED)

        bill.refresh_from_db()
        self.assertEqual(bill.status, BillStatus.PARTIALLY_PAID)
        self.assertEqual(bill.paid_amount, Decimal("50.00"))
        self.assertEqual(bill.balance_due, Decimal("100.00"))

        # 4. Final settlement payment
        pay_res2 = self.client.post("/api/billing/payments/", {
            "bill": bill.id,
            "amount": "100.00",
            "payment_method": "CASH"
        }, format="json")
        self.assertEqual(pay_res2.status_code, status.HTTP_201_CREATED)

        bill.refresh_from_db()
        self.assertEqual(bill.status, BillStatus.PAID)
        self.assertEqual(bill.balance_due, Decimal("0.00"))

    # ─────────────────────────────────────────────────────────────────
    # REQUIREMENT 4: Display Only Future, Available Appointment Time Slots
    # ─────────────────────────────────────────────────────────────────
    def test_past_date_returns_zero_slots_with_message(self):
        """Querying available slots for past date returns empty list with message."""
        self.client.force_authenticate(user=self.receptionist_user)
        past_date = self.today - timedelta(days=2)
        url = f"/api/appointments/available-slots/?doctor={self.doctor.id}&date={past_date}"
        res = self.client.get(url)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(len(res.data["available_slots"]), 0)
        self.assertIn("No available appointment slots. Please choose another date or doctor.", res.data["message"])

    def test_completed_appointment_slots_remain_historical(self):
        """A completed appointment does not reopen its slot for new booking."""
        self.client.force_authenticate(user=self.receptionist_user)
        tomorrow = self.today + timedelta(days=1)
        slot_time = time(11, 0)

        # Create completed appointment
        Appointment.objects.create(
            patient=self.patient,
            doctor=self.doctor,
            appointment_date=tomorrow,
            appointment_time=slot_time,
            status=AppointmentStatus.COMPLETED,
            reason_for_visit="Historical Checkup"
        )

        # Check available slots
        url = f"/api/appointments/available-slots/?doctor={self.doctor.id}&date={tomorrow}"
        res = self.client.get(url)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertNotIn("11:00:00", res.data["available_slots"])

    def test_past_slot_booking_rejected_by_api(self):
        """Booking an appointment in the past directly via API is rejected."""
        self.client.force_authenticate(user=self.receptionist_user)
        past_date = self.today - timedelta(days=1)
        payload = {
            "patient": self.patient.id,
            "doctor": self.doctor.id,
            "appointment_date": str(past_date),
            "appointment_time": "10:00:00",
            "reason_for_visit": "Past date attempt"
        }
        res = self.client.post("/api/appointments/", payload, format="json")
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
