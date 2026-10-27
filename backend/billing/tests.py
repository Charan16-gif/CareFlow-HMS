from decimal import Decimal
from django.test import TestCase
from django.contrib.auth.models import User
from django.core.exceptions import ValidationError
from rest_framework.test import APIClient
from rest_framework import status
from accounts.models import UserProfile, UserRole
from patients.models import Patient
from staff.models import Doctor
from .models import Bill, BillItem, Payment, BillStatus, BillItemType, PaymentStatus


class BillingModuleTests(TestCase):
    def setUp(self):
        self.client = APIClient()

        # Receptionist
        self.staff_user = User.objects.create_user(username="bill_clerk", email="clerk@careflow.com", password="Password@123")
        prof, _ = UserProfile.objects.get_or_create(user=self.staff_user)
        prof.role = UserRole.RECEPTIONIST
        prof.save()

        # Patient
        self.patient_user = User.objects.create_user(username="patient_natasha", email="natasha@careflow.com", password="Password@123")
        p_prof, _ = UserProfile.objects.get_or_create(user=self.patient_user)
        p_prof.role = UserRole.PATIENT
        p_prof.save()
        self.patient = Patient.objects.create(
            user=self.patient_user,
            first_name="Natasha",
            last_name="Romanoff",
            phone_number="555-7777",
            gender="FEMALE"
        )

        # Doctor
        self.doc_user = User.objects.create_user(username="doc_bruce", email="bruce_banner@careflow.com", password="Password@123")
        doc_prof, _ = UserProfile.objects.get_or_create(user=self.doc_user)
        doc_prof.role = UserRole.DOCTOR
        doc_prof.save()
        self.doctor = Doctor.objects.create(
            user=self.doc_user,
            first_name="Bruce",
            last_name="Banner",
            specialization="General Medicine",
            qualification="MD",
            license_number="LIC-BANNER",
            phone_number="555-9000",
            email="bruce_banner@careflow.com"
        )

        from datetime import date, time
        from appointments.models import Appointment, AppointmentStatus
        from pharmacy.models import Prescription, PrescriptionStatus
        self.apt = Appointment.objects.create(
            patient=self.patient,
            doctor=self.doctor,
            appointment_date=date.today(),
            appointment_time=time(10, 0),
            status=AppointmentStatus.CONFIRMED,
            reason_for_visit="Consultation"
        )
        self.rx = Prescription.objects.create(
            patient=self.patient,
            doctor=self.doctor,
            appointment=self.apt,
            diagnosis="Routine Consultation",
            status=PrescriptionStatus.PENDING
        )

    def test_bill_creation_and_item_totals(self):
        bill = Bill.objects.create(
            patient=self.patient,
            created_by=self.staff_user
        )
        self.assertTrue(bill.bill_number.startswith("CF-INV-"))

        item1 = BillItem.objects.create(
            bill=bill,
            item_type=BillItemType.CONSULTATION,
            description="Cardiology Specialist Consultation",
            quantity=1,
            unit_price=Decimal("600.00")
        )
        self.assertEqual(item1.subtotal, Decimal("600.00"))

        item2 = BillItem.objects.create(
            bill=bill,
            item_type=BillItemType.LAB_TEST,
            description="Complete Blood Count",
            quantity=1,
            unit_price=Decimal("350.00")
        )
        self.assertEqual(item2.subtotal, Decimal("350.00"))

        bill.recalculate_totals()
        bill.save()

        self.assertEqual(bill.total_amount, Decimal("950.00"))
        self.assertEqual(bill.net_amount, Decimal("950.00"))
        self.assertEqual(bill.balance_due, Decimal("950.00"))
        self.assertEqual(bill.status, BillStatus.UNPAID)

    def test_bill_creation_with_nested_items_via_api(self):
        self.client.force_authenticate(user=self.staff_user)
        payload = {
            "patient": self.patient.id,
            "discount_amount": "50.00",
            "notes": "Outpatient consultation and tests",
            "bill_items": [
                {
                    "item_type": "CONSULTATION",
                    "description": "General Consultation",
                    "quantity": 1,
                    "unit_price": "500.00"
                },
                {
                    "item_type": "LAB_TEST",
                    "description": "Blood Diagnostic Test",
                    "quantity": 2,
                    "unit_price": "100.00"
                }
            ]
        }
        res = self.client.post("/api/billing/invoices/", payload, format="json")
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Decimal(str(res.data["total_amount"])), Decimal("700.00"))
        self.assertEqual(Decimal(str(res.data["discount_amount"])), Decimal("50.00"))
        self.assertEqual(Decimal(str(res.data["net_amount"])), Decimal("650.00"))
        self.assertEqual(Decimal(str(res.data["balance_due"])), Decimal("650.00"))
        self.assertEqual(len(res.data["items"]), 2)

    def test_dedicated_bill_items_endpoint_recalculates_parent_bill(self):
        self.client.force_authenticate(user=self.staff_user)
        bill = Bill.objects.create(patient=self.patient, created_by=self.staff_user)

        # Add item via dedicated endpoint (Lab Test permitted for receptionist)
        item_payload = {
            "bill": bill.id,
            "item_type": "LAB_TEST",
            "description": "Lipid Profile Diagnostic",
            "quantity": 1,
            "unit_price": "400.00"
        }
        res = self.client.post("/api/billing/items/", item_payload, format="json")
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)

        bill.refresh_from_db()
        self.assertEqual(bill.total_amount, Decimal("400.00"))
        self.assertEqual(bill.balance_due, Decimal("400.00"))

    def test_payment_recording_atomically_updates_bill_balance(self):
        bill = Bill.objects.create(
            patient=self.patient,
            created_by=self.staff_user
        )
        BillItem.objects.create(
            bill=bill,
            item_type=BillItemType.MEDICINE,
            description="Prescribed Antibiotics",
            quantity=2,
            unit_price=Decimal("200.00")
        )
        bill.recalculate_totals()
        bill.save()

        self.assertEqual(bill.net_amount, Decimal("400.00"))
        self.assertEqual(bill.balance_due, Decimal("400.00"))

        # Partial payment of 250
        pay1 = Payment.objects.create(
            bill=bill,
            amount=Decimal("250.00"),
            payment_method="UPI",
            received_by=self.staff_user
        )
        self.assertTrue(pay1.receipt_number.startswith("CF-RCP-"))

        bill.refresh_from_db()
        self.assertEqual(bill.paid_amount, Decimal("250.00"))
        self.assertEqual(bill.balance_due, Decimal("150.00"))
        self.assertEqual(bill.status, BillStatus.PARTIALLY_PAID)

        # Full settlement payment of 150
        Payment.objects.create(
            bill=bill,
            amount=Decimal("150.00"),
            payment_method="CASH",
            received_by=self.staff_user
        )

        bill.refresh_from_db()
        self.assertEqual(bill.paid_amount, Decimal("400.00"))
        self.assertEqual(bill.balance_due, Decimal("0.00"))
        self.assertEqual(bill.status, BillStatus.PAID)

    def test_prevent_overpayment_beyond_balance_due(self):
        bill = Bill.objects.create(
            patient=self.patient,
            created_by=self.staff_user
        )
        BillItem.objects.create(
            bill=bill,
            item_type=BillItemType.CONSULTATION,
            description="Consultation",
            quantity=1,
            unit_price=Decimal("300.00")
        )
        bill.recalculate_totals()
        bill.save()

        with self.assertRaises(ValidationError):
            bad_payment = Payment(
                bill=bill,
                amount=Decimal("500.00"),
                payment_method="CASH",
                received_by=self.staff_user
            )
            bad_payment.clean()

    def test_payments_are_immutable(self):
        self.client.force_authenticate(user=self.staff_user)
        bill = Bill.objects.create(patient=self.patient, created_by=self.staff_user)
        BillItem.objects.create(bill=bill, item_type="OTHER", description="Service", quantity=1, unit_price=Decimal("100.00"))
        bill.recalculate_totals()
        bill.save()

        pay_res = self.client.post("/api/billing/payments/", {
            "bill": bill.id,
            "amount": "100.00",
            "payment_method": "CASH"
        }, format="json")
        self.assertEqual(pay_res.status_code, status.HTTP_201_CREATED)
        pay_id = pay_res.data["id"]

        # Attempt to edit payment
        edit_res = self.client.patch(f"/api/billing/payments/{pay_id}/", {"amount": "50.00"}, format="json")
        self.assertEqual(edit_res.status_code, status.HTTP_403_FORBIDDEN)

        # Attempt to delete payment
        del_res = self.client.delete(f"/api/billing/payments/{pay_id}/")
        self.assertEqual(del_res.status_code, status.HTTP_403_FORBIDDEN)

    def test_doctor_cannot_create_bills(self):
        self.client.force_authenticate(user=self.doc_user)
        res = self.client.post("/api/billing/invoices/", {
            "patient": self.patient.id,
        }, format="json")
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_patient_checkout_medicine_workflow(self):
        from pharmacy.models import Medicine, StockMovement
        med = Medicine.objects.create(
            name="Amoxicillin 500mg",
            unit_price=Decimal("15.50"),
            stock_quantity=50
        )
        self.client.force_authenticate(user=self.patient_user)
        payload = {
            "medicine_id": med.id,
            "quantity": 3,
            "payment_method": "UPI",
            "notes": "Patient order"
        }
        res = self.client.post("/api/billing/invoices/checkout/", payload, format="json")
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertTrue(res.data["success"])
        receipt = res.data["receipt"]
        self.assertTrue(receipt["receipt_number"].startswith("CF-RCP-"))
        self.assertTrue(receipt["bill_number"].startswith("CF-INV-"))
        self.assertEqual(Decimal(receipt["amount"]), Decimal("46.50"))

        # Verify medicine stock decremented
        med.refresh_from_db()
        self.assertEqual(med.stock_quantity, 47)

        # Verify stock movement recorded
        stk = StockMovement.objects.filter(medicine=med).first()
        self.assertIsNotNone(stk)
        self.assertEqual(stk.quantity, 3)

    def test_patient_checkout_insufficient_stock_rejected(self):
        from pharmacy.models import Medicine
        med = Medicine.objects.create(
            name="Rare Vaccine",
            unit_price=Decimal("500.00"),
            stock_quantity=2
        )
        self.client.force_authenticate(user=self.patient_user)
        payload = {
            "medicine_id": med.id,
            "quantity": 5,
            "payment_method": "CARD"
        }
        res = self.client.post("/api/billing/invoices/checkout/", payload, format="json")
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("Insufficient stock", res.data["error"])

    def test_bill_creation_blocked_without_appointment_or_prescription(self):
        """Ensure bill cannot be generated for a patient without an appointment or prescription."""
        ineligible_patient = Patient.objects.create(
            first_name="Peter",
            last_name="Parker",
            phone_number="555-8888",
            gender="MALE"
        )
        self.client.force_authenticate(user=self.staff_user)
        payload = {
            "patient": ineligible_patient.id,
            "bill_items": [
                {
                    "item_type": "CONSULTATION",
                    "description": "General Consultation",
                    "quantity": 1,
                    "unit_price": "500.00"
                }
            ]
        }
        res = self.client.post("/api/billing/invoices/", payload, format="json")
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("patient", res.data)
        self.assertIn("Bills can only be generated for patients who have booked an appointment and have a prescription created", str(res.data["patient"]))

    def test_bill_creation_blocked_if_prescription_already_billed(self):
        """Ensure bill can only be generated once per doctor-created prescription."""
        self.client.force_authenticate(user=self.staff_user)
        payload = {
            "patient": self.patient.id,
            "bill_items": [
                {
                    "item_type": "CONSULTATION",
                    "description": "First Consultation",
                    "quantity": 1,
                    "unit_price": "500.00"
                }
            ]
        }
        # First bill succeeds (self.patient has self.rx)
        res1 = self.client.post("/api/billing/invoices/", payload, format="json")
        self.assertEqual(res1.status_code, status.HTTP_201_CREATED)

        # Second bill fails because bill can only be generated once per prescription
        res2 = self.client.post("/api/billing/invoices/", payload, format="json")
        self.assertEqual(res2.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("patient", res2.data)
        self.assertIn("Bills can only be generated once", str(res2.data["patient"]))

    def test_bill_creation_blocked_if_appointment_has_no_prescription(self):
        """Ensure appointment cannot be billed if doctor has not created a prescription for it."""
        from datetime import date, time
        from appointments.models import Appointment, AppointmentStatus
        self.client.force_authenticate(user=self.staff_user)
        apt2 = Appointment.objects.create(
            patient=self.patient,
            doctor=self.doctor,
            appointment_date=date.today(),
            appointment_time=time(11, 0),
            status=AppointmentStatus.CONFIRMED,
            reason_for_visit="Follow up"
        )
        payload = {
            "patient": self.patient.id,
            "appointment": apt2.id,
            "bill_items": [
                {
                    "item_type": "CONSULTATION",
                    "description": "Follow up consultation",
                    "quantity": 1,
                    "unit_price": "500.00"
                }
            ]
        }
        res = self.client.post("/api/billing/invoices/", payload, format="json")
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("appointment", res.data)
        self.assertIn("doctor has not created a prescription", str(res.data["appointment"]))

    def test_bill_creation_blocked_for_duplicate_appointment(self):
        """Ensure an appointment cannot be billed twice."""
        self.client.force_authenticate(user=self.staff_user)
        payload = {
            "patient": self.patient.id,
            "appointment": self.apt.id,
            "bill_items": [
                {
                    "item_type": "CONSULTATION",
                    "description": "Consultation",
                    "quantity": 1,
                    "unit_price": "500.00"
                }
            ]
        }
        res1 = self.client.post("/api/billing/invoices/", payload, format="json")
        self.assertEqual(res1.status_code, status.HTTP_201_CREATED)

        res2 = self.client.post("/api/billing/invoices/", payload, format="json")
        self.assertEqual(res2.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertTrue("appointment" in res2.data or "patient" in res2.data)

    def test_pharmacist_multi_item_cart_checkout(self):
        from pharmacy.models import Medicine, StockMovement
        pharm_user = User.objects.create_user(username="pharm_clerk", email="pharm@careflow.com", password="Password@123")
        prof, _ = UserProfile.objects.get_or_create(user=pharm_user)
        prof.role = UserRole.PHARMACIST
        prof.save()

        med1 = Medicine.objects.create(name="Cart Med 1", unit_price=Decimal("20.00"), stock_quantity=100)
        med2 = Medicine.objects.create(name="Cart Med 2", unit_price=Decimal("15.00"), stock_quantity=50)

        self.client.force_authenticate(user=pharm_user)
        payload = {
            "patient_id": self.patient.id,
            "items": [
                {"medicine_id": med1.id, "quantity": 2},
                {"medicine_id": med2.id, "quantity": 3}
            ],
            "payment_method": "CASH",
            "notes": "Counter purchase for Natasha"
        }
        res = self.client.post("/api/billing/invoices/checkout/", payload, format="json")
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertTrue(res.data["success"])
        receipt = res.data["receipt"]
        self.assertEqual(Decimal(str(receipt["amount"])), Decimal("85.00")) # 2*20 + 3*15 = 85.00

        med1.refresh_from_db()
        med2.refresh_from_db()
        self.assertEqual(med1.stock_quantity, 98)
        self.assertEqual(med2.stock_quantity, 47)
