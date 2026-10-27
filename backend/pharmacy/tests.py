from decimal import Decimal
from django.test import TestCase
from django.contrib.auth.models import User
from django.core.exceptions import ValidationError
from django.utils import timezone
from rest_framework.test import APIClient
from rest_framework import status
from accounts.models import UserProfile, UserRole
from patients.models import Patient
from staff.models import Doctor
from .models import (
    Medicine,
    Prescription,
    PrescriptionItem,
    MedicineDispense,
    StockMovement,
    MovementType,
    PrescriptionStatus,
)


class PharmacyModuleTests(TestCase):
    def setUp(self):
        self.client = APIClient()

        # Doctor
        self.doc_user = User.objects.create_user(username="dr_stephen", email="stephen@careflow.com", password="Password@123")
        self.doctor = Doctor.objects.create(
            user=self.doc_user,
            first_name="Stephen",
            last_name="Strange",
            specialization="Neuro Surgery",
            qualification="MD, PhD",
            license_number="LIC-STRANGE",
            phone_number="555-1111",
            email="stephen@careflow.com"
        )

        # Pharmacist
        self.pharm_user = User.objects.create_user(username="pharmacist_peter", email="peter@careflow.com", password="Password@123")
        pharm_prof, _ = UserProfile.objects.get_or_create(user=self.pharm_user)
        pharm_prof.role = UserRole.PHARMACIST
        pharm_prof.save()

        # Admin
        self.admin_user = User.objects.create_superuser(username="admin_hms", email="admin_hms@careflow.com", password="Password@123")
        admin_prof, _ = UserProfile.objects.get_or_create(user=self.admin_user)
        admin_prof.role = UserRole.ADMIN
        admin_prof.save()

        # Patient
        self.patient_user = User.objects.create_user(username="patient_peter", email="pparker@careflow.com", password="Password@123")
        p_prof, _ = UserProfile.objects.get_or_create(user=self.patient_user)
        p_prof.role = UserRole.PATIENT
        p_prof.save()
        self.patient = Patient.objects.create(
            user=self.patient_user,
            first_name="Peter",
            last_name="Parker",
            phone_number="555-3333",
            gender="MALE"
        )
        from appointments.models import Appointment
        self.appointment = Appointment.objects.create(
            patient=self.patient,
            doctor=self.doctor,
            appointment_date=timezone.now().date(),
            appointment_time="10:00:00",
            reason_for_visit="General consultation",
            is_checked_in=True,
            check_in_time=timezone.now()
        )

        # Medicine
        self.paracetamol = Medicine.objects.create(
            name="Paracetamol",
            dosage_form="TABLET",
            strength="500mg",
            unit_price=Decimal("5.00"),
            stock_quantity=100,
            reorder_level=20
        )

    def test_medicine_negative_stock_forbidden(self):
        with self.assertRaises(ValidationError):
            bad_med = Medicine(
                name="Invalid Medicine",
                unit_price=Decimal("10.00"),
                stock_quantity=-5
            )
            bad_med.clean()

    def test_doctor_can_create_prescription(self):
        self.client.force_authenticate(user=self.doc_user)
        payload = {
            "patient": self.patient.id,
            "doctor": self.doctor.id,
            "diagnosis": "Viral fever and headache",
            "clinical_notes": "Adequate hydration and rest required"
        }
        res = self.client.post("/api/pharmacy/prescriptions/", payload, format="json")
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertTrue(res.data["prescription_id"].startswith("CF-RX-"))

    def test_doctor_cannot_create_prescription_for_non_checked_in_patient(self):
        self.appointment.is_checked_in = False
        self.appointment.save()
        self.client.force_authenticate(user=self.doc_user)
        payload = {
            "patient": self.patient.id,
            "diagnosis": "Viral fever and headache",
            "clinical_notes": "Adequate hydration and rest required"
        }
        res = self.client.post("/api/pharmacy/prescriptions/", payload, format="json")
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("checked-in patients", str(res.data))
        # Restore for other tests
        self.appointment.is_checked_in = True
        self.appointment.save()

    def test_doctor_cannot_create_prescription_after_checkout(self):
        from appointments.models import AppointmentStatus
        self.appointment.is_checked_in = True
        self.appointment.status = AppointmentStatus.COMPLETED
        self.appointment.save()
        self.client.force_authenticate(user=self.doc_user)
        payload = {
            "patient": self.patient.id,
            "diagnosis": "Post consultation check",
            "clinical_notes": "Should be rejected because appointment is completed/checked out"
        }
        res = self.client.post("/api/pharmacy/prescriptions/", payload, format="json")
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("Prescriptions cannot be created after patient checkout", str(res.data))

        # Test CHECKED_OUT status as well
        self.appointment.status = getattr(AppointmentStatus, "CHECKED_OUT", "CHECKED_OUT")
        self.appointment.save()
        res = self.client.post("/api/pharmacy/prescriptions/", payload, format="json")
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

        # Restore
        self.appointment.status = AppointmentStatus.CONFIRMED
        self.appointment.save()

    def test_doctor_cannot_create_prescription_with_explicit_checked_out_appointment(self):
        from appointments.models import AppointmentStatus
        self.appointment.is_checked_in = True
        self.appointment.status = AppointmentStatus.COMPLETED
        self.appointment.save()
        self.client.force_authenticate(user=self.doc_user)
        payload = {
            "patient": self.patient.id,
            "appointment": self.appointment.id,
            "diagnosis": "Direct appointment link check",
            "clinical_notes": "Explicit completed appointment"
        }
        res = self.client.post("/api/pharmacy/prescriptions/", payload, format="json")
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("Prescriptions cannot be created after patient checkout", str(res.data))

        # Restore
        self.appointment.status = AppointmentStatus.CONFIRMED
        self.appointment.save()

    def test_doctor_can_create_prescription_with_nested_items(self):
        self.client.force_authenticate(user=self.doc_user)
        payload = {
            "patient": self.patient.id,
            "diagnosis": "Bacterial pharyngitis",
            "clinical_notes": "Take with meals",
            "prescription_items": [
                {
                    "medicine": self.paracetamol.id,
                    "dosage": "500mg",
                    "frequency": "1-0-1",
                    "duration": "5 Days",
                    "quantity_prescribed": 10,
                    "instructions": "After meals"
                }
            ]
        }
        res = self.client.post("/api/pharmacy/prescriptions/", payload, format="json")
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(len(res.data["items"]), 1)
        self.assertEqual(res.data["items"][0]["medicine"], self.paracetamol.id)
        self.assertEqual(res.data["items"][0]["quantity_prescribed"], 10)

    def test_dedicated_prescription_items_endpoint(self):
        self.client.force_authenticate(user=self.doc_user)
        rx = Prescription.objects.create(
            patient=self.patient,
            doctor=self.doctor,
            diagnosis="Routine check"
        )
        payload = {
            "prescription": rx.id,
            "medicine": self.paracetamol.id,
            "dosage": "500mg",
            "frequency": "0-0-1",
            "duration": "3 Days",
            "quantity_prescribed": 3
        }
        res = self.client.post("/api/pharmacy/items/", payload, format="json")
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(rx.items.count(), 1)

    def test_admin_cannot_create_prescription(self):
        self.client.force_authenticate(user=self.admin_user)
        payload = {
            "patient": self.patient.id,
            "doctor": self.doctor.id,
            "diagnosis": "Admin diagnosing",
        }
        res = self.client.post("/api/pharmacy/prescriptions/", payload, format="json")
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)
        self.assertIn("Administrators cannot create prescriptions", str(res.data))

    def test_pharmacist_dispensing_decrements_stock_and_creates_audit_trail(self):
        self.client.force_authenticate(user=self.pharm_user)

        rx = Prescription.objects.create(
            patient=self.patient,
            doctor=self.doctor,
            diagnosis="Fever"
        )
        PrescriptionItem.objects.create(
            prescription=rx,
            medicine=self.paracetamol,
            dosage="1 Tablet",
            frequency="1-0-1",
            duration="5 Days",
            quantity_prescribed=10
        )

        dispense_payload = {
            "prescription": rx.id,
            "notes": "Dispensed 10 tablets after food directions"
        }
        res = self.client.post("/api/pharmacy/dispensations/", dispense_payload, format="json")
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)

        # Verify stock decremented from 100 to 90
        self.paracetamol.refresh_from_db()
        self.assertEqual(self.paracetamol.stock_quantity, 90)

        # Verify stock movement audit record created
        mov = StockMovement.objects.filter(medicine=self.paracetamol, movement_type=MovementType.DISPENSED_OUT).first()
        self.assertIsNotNone(mov)
        self.assertEqual(mov.quantity, 10)
        self.assertEqual(mov.previous_stock, 100)
        self.assertEqual(mov.new_stock, 90)

        # Verify prescription status marked DISPENSED
        rx.refresh_from_db()
        self.assertEqual(rx.status, PrescriptionStatus.DISPENSED)

    def test_insufficient_stock_prevents_dispensing(self):
        self.client.force_authenticate(user=self.pharm_user)
        # Set low stock
        self.paracetamol.stock_quantity = 3
        self.paracetamol.save(update_fields=["stock_quantity"])

        rx = Prescription.objects.create(
            patient=self.patient,
            doctor=self.doctor,
            diagnosis="Severe pain"
        )
        PrescriptionItem.objects.create(
            prescription=rx,
            medicine=self.paracetamol,
            dosage="1 Tablet",
            frequency="1-1-1",
            duration="5 Days",
            quantity_prescribed=15  # Exceeds 3 available
        )

        dispense_payload = {
            "prescription": rx.id,
            "notes": "Attempting dispense"
        }
        res = self.client.post("/api/pharmacy/dispensations/", dispense_payload, format="json")
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("Insufficient inventory", str(res.data))
        # Stock untouched
        self.paracetamol.refresh_from_db()
        self.assertEqual(self.paracetamol.stock_quantity, 3)

    def test_dispense_records_are_immutable(self):
        self.client.force_authenticate(user=self.pharm_user)
        rx = Prescription.objects.create(
            patient=self.patient,
            doctor=self.doctor,
            diagnosis="Cold"
        )
        PrescriptionItem.objects.create(
            prescription=rx,
            medicine=self.paracetamol,
            dosage="1 Tablet",
            frequency="1-0-0",
            duration="2 Days",
            quantity_prescribed=2
        )
        dispense_res = self.client.post("/api/pharmacy/dispensations/", {"prescription": rx.id}, format="json")
        dispense_id = dispense_res.data["id"]

        # Attempt to edit
        edit_res = self.client.patch(f"/api/pharmacy/dispensations/{dispense_id}/", {"notes": "Tampered note"}, format="json")
        self.assertEqual(edit_res.status_code, status.HTTP_403_FORBIDDEN)

        # Attempt to delete
        del_res = self.client.delete(f"/api/pharmacy/dispensations/{dispense_id}/")
        self.assertEqual(del_res.status_code, status.HTTP_403_FORBIDDEN)

    def test_patient_cannot_modify_prescription(self):
        self.client.force_authenticate(user=self.patient_user)
        rx = Prescription.objects.create(
            patient=self.patient,
            doctor=self.doctor,
            diagnosis="Migraine"
        )
        res = self.client.patch(f"/api/pharmacy/prescriptions/{rx.id}/", {"diagnosis": "Tampered"}, format="json")
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_pharmacist_stats_endpoint(self):
        self.client.force_authenticate(user=self.pharm_user)
        res = self.client.get("/api/pharmacy/medicines/stats/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertIn("total_medicines", res.data)
        self.assertIn("in_stock", res.data)
        self.assertIn("low_stock", res.data)
        self.assertIn("out_of_stock", res.data)
        self.assertIn("near_expiry", res.data)
        self.assertIn("today_sales", res.data)
        self.assertIn("today_dispensed", res.data)

    def test_pharmacist_adjust_stock_purchase_in(self):
        self.client.force_authenticate(user=self.pharm_user)
        init_stock = self.paracetamol.stock_quantity
        payload = {
            "movement_type": "PURCHASE_IN",
            "quantity": 50,
            "reference_note": "Supplier delivery PO-998",
            "batch_number": "BATCH-2026-X",
        }
        res = self.client.post(f"/api/pharmacy/medicines/{self.paracetamol.id}/adjust-stock/", payload, format="json")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.paracetamol.refresh_from_db()
        self.assertEqual(self.paracetamol.stock_quantity, init_stock + 50)
        self.assertEqual(self.paracetamol.batch_number, "BATCH-2026-X")
        # Verify movement logged
        mov = StockMovement.objects.filter(medicine=self.paracetamol, movement_type="PURCHASE_IN").first()
        self.assertIsNotNone(mov)
        self.assertEqual(mov.quantity, 50)

    def test_pharmacist_adjust_stock_insufficient_rejected(self):
        self.client.force_authenticate(user=self.pharm_user)
        payload = {
            "movement_type": "EXPIRED_OUT",
            "quantity": 9999,  # exceeds current stock
            "reference_note": "Attempt to discard excess",
        }
        res = self.client.post(f"/api/pharmacy/medicines/{self.paracetamol.id}/adjust-stock/", payload, format="json")
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("Insufficient stock", str(res.data))

    def test_pharmacist_item_level_dispensing_with_bill(self):
        self.client.force_authenticate(user=self.pharm_user)
        rx = Prescription.objects.create(
            patient=self.patient,
            doctor=self.doctor,
            diagnosis="Bronchitis",
            status=PrescriptionStatus.COMPLETED
        )
        item1 = PrescriptionItem.objects.create(
            prescription=rx,
            medicine=self.paracetamol,
            dosage="500mg",
            frequency="1-0-1",
            duration="5 Days",
            quantity_prescribed=10
        )
        dispense_payload = {
            "prescription": rx.id,
            "items": [
                {"prescription_item": item1.id, "quantity": 5}
            ],
            "create_bill": True,
            "payment_method": "CASH",
            "notes": "Partial dispensing first 5 tablets"
        }
        res = self.client.post("/api/pharmacy/dispensations/", dispense_payload, format="json")
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertIn("bill", res.data)
        self.assertIn("receipt", res.data)
        rx.refresh_from_db()
        self.assertEqual(rx.status, PrescriptionStatus.PARTIALLY_DISPENSED)
        item1.refresh_from_db()
        self.assertEqual(item1.quantity_dispensed, 5)
        self.assertFalse(item1.is_dispensed)

    def test_medicine_safe_delete_prevented_when_referenced(self):
        self.client.force_authenticate(user=self.pharm_user)
        # paracetamol is referenced by prescription items
        rx = Prescription.objects.create(
            patient=self.patient,
            doctor=self.doctor,
            diagnosis="Routine"
        )
        PrescriptionItem.objects.create(
            prescription=rx,
            medicine=self.paracetamol,
            dosage="1 tab",
            frequency="1-0-0",
            duration="1 day",
            quantity_prescribed=1
        )
        # Attempt delete
        res = self.client.delete(f"/api/pharmacy/medicines/{self.paracetamol.id}/")
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("referenced", str(res.data))
        # Medicine still exists in DB
        self.assertTrue(Medicine.objects.filter(id=self.paracetamol.id).exists())

    def test_medicine_permanent_delete_when_unreferenced(self):
        self.client.force_authenticate(user=self.pharm_user)
        unreferenced_med = Medicine.objects.create(
            name="Unreferenced Med",
            unit_price=Decimal("12.00"),
            stock_quantity=20
        )
        res = self.client.delete(f"/api/pharmacy/medicines/{unreferenced_med.id}/")
        self.assertIn(res.status_code, [status.HTTP_200_OK, status.HTTP_204_NO_CONTENT])
        self.assertFalse(Medicine.objects.filter(id=unreferenced_med.id).exists())

    def test_admin_has_view_only_access_to_medicines(self):
        self.client.force_authenticate(user=self.admin_user)

        # 1. View access (GET list & retrieve) MUST succeed
        list_res = self.client.get("/api/pharmacy/medicines/")
        self.assertEqual(list_res.status_code, status.HTTP_200_OK)

        detail_res = self.client.get(f"/api/pharmacy/medicines/{self.paracetamol.id}/")
        self.assertEqual(detail_res.status_code, status.HTTP_200_OK)

        # 2. Create access (POST) MUST be forbidden
        create_res = self.client.post("/api/pharmacy/medicines/", {
            "name": "Amoxicillin",
            "dosage_form": "CAPSULE",
            "unit_price": "12.50",
            "stock_quantity": 50,
        }, format="json")
        self.assertEqual(create_res.status_code, status.HTTP_403_FORBIDDEN)

        # 3. Update access (PATCH) MUST be forbidden
        update_res = self.client.patch(f"/api/pharmacy/medicines/{self.paracetamol.id}/", {
            "unit_price": "99.00"
        }, format="json")
        self.assertEqual(update_res.status_code, status.HTTP_403_FORBIDDEN)

        # 4. Delete access (DELETE) MUST be forbidden
        delete_res = self.client.delete(f"/api/pharmacy/medicines/{self.paracetamol.id}/")
        self.assertEqual(delete_res.status_code, status.HTTP_403_FORBIDDEN)
