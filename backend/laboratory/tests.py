import os
from decimal import Decimal
from django.test import TestCase
from django.contrib.auth.models import User
from django.core.files.uploadedfile import SimpleUploadedFile
from django.utils import timezone
from rest_framework.test import APIClient
from rest_framework import status
from accounts.models import UserProfile, UserRole
from patients.models import Patient
from staff.models import Doctor
from appointments.models import Appointment
from .models import LabTest, LabOrder, LabOrderStatus


class LaboratoryModuleTests(TestCase):
    def setUp(self):
        self.client = APIClient()

        # Doctor 1
        self.doc_user = User.objects.create_user(username="dr_claire", email="claire@careflow.com", password="Password@123")
        self.doctor = Doctor.objects.create(
            user=self.doc_user,
            first_name="Claire",
            last_name="Temple",
            specialization="Internal Medicine",
            qualification="MD",
            license_number="LIC-CLAIRE",
            phone_number="555-4444",
            email="claire@careflow.com"
        )

        # Doctor 2
        self.doc2_user = User.objects.create_user(username="dr_strange", email="strange@careflow.com", password="Password@123")
        self.doctor2 = Doctor.objects.create(
            user=self.doc2_user,
            first_name="Stephen",
            last_name="Strange",
            specialization="Neurology",
            qualification="MD, PhD",
            license_number="LIC-STRANGE",
            phone_number="555-9999",
            email="strange@careflow.com"
        )

        # Lab Staff
        self.lab_user = User.objects.create_user(username="lab_tech_bruce", email="bruce@careflow.com", password="Password@123")
        lab_prof, _ = UserProfile.objects.get_or_create(user=self.lab_user)
        lab_prof.role = UserRole.LAB_STAFF
        lab_prof.save()

        # Admin
        self.admin_user = User.objects.create_superuser(username="admin_hms2", email="admin2@careflow.com", password="Password@123")
        admin_prof, _ = UserProfile.objects.get_or_create(user=self.admin_user)
        admin_prof.role = UserRole.ADMIN
        admin_prof.save()

        # Patient 1 (Connected to Doctor 1)
        self.patient_user = User.objects.create_user(username="patient_matt", email="matt@careflow.com", password="Password@123")
        p_prof, _ = UserProfile.objects.get_or_create(user=self.patient_user)
        p_prof.role = UserRole.PATIENT
        p_prof.save()
        self.patient = Patient.objects.create(
            user=self.patient_user,
            first_name="Matt",
            last_name="Murdock",
            phone_number="555-5555",
            gender="MALE"
        )

        # Connect Doctor 1 and Patient 1 via appointment
        self.appointment = Appointment.objects.create(
            patient=self.patient,
            doctor=self.doctor,
            appointment_date=timezone.localdate(),
            appointment_time="10:00:00",
            reason_for_visit="General consultation",
            is_checked_in=True,
            check_in_time=timezone.now()
        )

        # Patient 2 (Unrelated to Doctor 1)
        self.unrelated_patient_user = User.objects.create_user(username="patient_jessica", email="jessica@careflow.com", password="Password@123")
        p2_prof, _ = UserProfile.objects.get_or_create(user=self.unrelated_patient_user)
        p2_prof.role = UserRole.PATIENT
        p2_prof.save()
        self.unrelated_patient = Patient.objects.create(
            user=self.unrelated_patient_user,
            first_name="Jessica",
            last_name="Jones",
            phone_number="555-7777",
            gender="FEMALE"
        )

        # Lab Test
        self.cbc_test = LabTest.objects.create(
            test_code="LAB-CBC-TEST",
            test_name="Complete Blood Count",
            category="HEMATOLOGY",
            price=Decimal("350.00"),
            reference_range="13.5 - 17.5 g/dL",
            unit="g/dL"
        )

    def test_doctor_can_order_lab_test_for_connected_patient(self):
        self.client.force_authenticate(user=self.doc_user)
        payload = {
            "patient": self.patient.id,
            "test": self.cbc_test.id,
            "clinical_notes": "Evaluate anemia and infection markers"
        }
        res = self.client.post("/api/laboratory/orders/", payload, format="json")
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertTrue(res.data["order_id"].startswith("CF-LAB-"))
        self.assertEqual(res.data["status"], LabOrderStatus.REQUESTED)

    def test_doctor_cannot_order_lab_test_for_unrelated_patient(self):
        self.client.force_authenticate(user=self.doc_user)
        payload = {
            "patient": self.unrelated_patient.id,
            "test": self.cbc_test.id,
            "clinical_notes": "Attempting test on unrelated patient"
        }
        res = self.client.post("/api/laboratory/orders/", payload, format="json")
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("checked-in patients assigned to their care", str(res.data))

    def test_doctor_cannot_order_lab_test_for_non_checked_in_patient(self):
        self.appointment.is_checked_in = False
        self.appointment.save()
        self.client.force_authenticate(user=self.doc_user)
        payload = {
            "patient": self.patient.id,
            "test": self.cbc_test.id,
            "clinical_notes": "Attempting test on non checked in patient"
        }
        res = self.client.post("/api/laboratory/orders/", payload, format="json")
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("checked-in patients assigned to their care", str(res.data))
        # Restore for subsequent tests
        self.appointment.is_checked_in = True
        self.appointment.save()

    def test_doctor_cannot_order_lab_test_after_checkout(self):
        from appointments.models import AppointmentStatus
        self.appointment.is_checked_in = True
        self.appointment.status = AppointmentStatus.COMPLETED
        self.appointment.save()
        self.client.force_authenticate(user=self.doc_user)
        payload = {
            "patient": self.patient.id,
            "test": self.cbc_test.id,
            "clinical_notes": "Attempting test after patient checkout"
        }
        res = self.client.post("/api/laboratory/orders/", payload, format="json")
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("Lab orders cannot be created after patient checkout", str(res.data))

        # Test CHECKED_OUT status as well
        self.appointment.status = getattr(AppointmentStatus, "CHECKED_OUT", "CHECKED_OUT")
        self.appointment.save()
        res = self.client.post("/api/laboratory/orders/", payload, format="json")
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

        # Restore
        self.appointment.status = AppointmentStatus.CONFIRMED
        self.appointment.save()

    def test_doctor_cannot_order_lab_test_with_explicit_checked_out_appointment(self):
        from appointments.models import AppointmentStatus
        self.appointment.is_checked_in = True
        self.appointment.status = AppointmentStatus.COMPLETED
        self.appointment.save()
        self.client.force_authenticate(user=self.doc_user)
        payload = {
            "patient": self.patient.id,
            "appointment": self.appointment.id,
            "test": self.cbc_test.id,
            "clinical_notes": "Explicit completed appointment"
        }
        res = self.client.post("/api/laboratory/orders/", payload, format="json")
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("Laboratory orders cannot be created after patient checkout", str(res.data))

        # Restore
        self.appointment.status = AppointmentStatus.CONFIRMED
        self.appointment.save()

    def test_doctor_can_order_with_custom_test_name(self):
        self.client.force_authenticate(user=self.doc_user)
        payload = {
            "patient": self.patient.id,
            "custom_test_name": "Serum Ferritin Diagnostic",
            "custom_test_category": "BIOCHEMISTRY",
            "clinical_notes": "Checking iron stores"
        }
        res = self.client.post("/api/laboratory/orders/", payload, format="json")
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(res.data["test_name"], "Serum Ferritin Diagnostic")

    def test_admin_cannot_order_lab_test(self):
        self.client.force_authenticate(user=self.admin_user)
        payload = {
            "patient": self.patient.id,
            "test": self.cbc_test.id,
            "clinical_notes": "Admin ordering lab test"
        }
        res = self.client.post("/api/laboratory/orders/", payload, format="json")
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)
        self.assertIn("Administrators cannot order clinical laboratory tests", str(res.data))

    def test_doctor_cannot_directly_cancel_or_bypass_workflow(self):
        self.client.force_authenticate(user=self.doc_user)
        order = LabOrder.objects.create(
            patient=self.patient,
            doctor=self.doctor,
            test=self.cbc_test,
            status=LabOrderStatus.REQUESTED
        )
        # Attempt direct PATCH to CANCELLED
        res = self.client.patch(
            f"/api/laboratory/orders/{order.id}/",
            {"status": LabOrderStatus.CANCELLED},
            format="json"
        )
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)
        self.assertIn("Doctors cannot change laboratory processing statuses or directly cancel tests", str(res.data))

        # Attempt DELETE
        del_res = self.client.delete(f"/api/laboratory/orders/{order.id}/")
        self.assertEqual(del_res.status_code, status.HTTP_403_FORBIDDEN)

    def test_doctor_can_request_cancellation_for_eligible_test(self):
        self.client.force_authenticate(user=self.doc_user)
        order = LabOrder.objects.create(
            patient=self.patient,
            doctor=self.doctor,
            test=self.cbc_test,
            status=LabOrderStatus.REQUESTED
        )
        res = self.client.post(
            f"/api/laboratory/orders/{order.id}/request-cancellation/",
            {"reason": "Patient discharged prior to specimen collection"},
            format="json"
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        order.refresh_from_db()
        self.assertTrue(order.cancellation_requested)
        self.assertEqual(order.cancellation_status, "REQUESTED")
        self.assertEqual(order.cancellation_reason, "Patient discharged prior to specimen collection")
        # Ensure status was NOT changed to CANCELLED directly
        self.assertEqual(order.status, LabOrderStatus.REQUESTED)

    def test_doctor_cannot_request_cancellation_for_completed_test(self):
        self.client.force_authenticate(user=self.doc_user)
        order = LabOrder.objects.create(
            patient=self.patient,
            doctor=self.doctor,
            test=self.cbc_test,
            status=LabOrderStatus.COMPLETED,
            result_value="Normal"
        )
        res = self.client.post(
            f"/api/laboratory/orders/{order.id}/request-cancellation/",
            {"reason": "Try cancel completed"},
            format="json"
        )
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("Cannot request cancellation for an order that is already completed", str(res.data))

    def test_lab_staff_can_process_cancellation_request(self):
        order = LabOrder.objects.create(
            patient=self.patient,
            doctor=self.doctor,
            test=self.cbc_test,
            status=LabOrderStatus.REQUESTED,
            cancellation_requested=True,
            cancellation_status="REQUESTED",
            cancellation_reason="Patient discharged"
        )
        self.client.force_authenticate(user=self.lab_user)
        res = self.client.post(
            f"/api/laboratory/orders/{order.id}/process-cancellation/",
            {"decision": "APPROVE", "remarks": "Cancellation verified with clinical ward"},
            format="json"
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        order.refresh_from_db()
        self.assertEqual(order.status, LabOrderStatus.CANCELLED)
        self.assertEqual(order.cancellation_status, "APPROVED")
        self.assertEqual(order.cancelled_by, self.lab_user)

    def test_valid_laboratory_status_transitions(self):
        self.client.force_authenticate(user=self.lab_user)
        order = LabOrder.objects.create(
            patient=self.patient,
            doctor=self.doctor,
            test=self.cbc_test,
            status=LabOrderStatus.REQUESTED
        )

        # 1. REQUESTED -> ACCEPTED
        res1 = self.client.patch(f"/api/laboratory/orders/{order.id}/", {"status": LabOrderStatus.ACCEPTED}, format="json")
        self.assertEqual(res1.status_code, status.HTTP_200_OK)
        order.refresh_from_db()
        self.assertEqual(order.status, LabOrderStatus.ACCEPTED)

        # 2. ACCEPTED -> IN_PROGRESS
        res2 = self.client.patch(f"/api/laboratory/orders/{order.id}/", {"status": LabOrderStatus.IN_PROGRESS}, format="json")
        self.assertEqual(res2.status_code, status.HTTP_200_OK)
        order.refresh_from_db()
        self.assertEqual(order.status, LabOrderStatus.IN_PROGRESS)

        # 3. IN_PROGRESS -> COMPLETED (with result)
        res3 = self.client.patch(
            f"/api/laboratory/orders/{order.id}/",
            {
                "status": LabOrderStatus.COMPLETED,
                "result_value": "14.5",
                "result_notes": "Normal cell counts",
                "result_interpretation": "Within normal limits"
            },
            format="json"
        )
        self.assertEqual(res3.status_code, status.HTTP_200_OK)
        order.refresh_from_db()
        self.assertEqual(order.status, LabOrderStatus.COMPLETED)
        self.assertIsNotNone(order.completed_at)

    def test_invalid_status_transitions_rejected(self):
        self.client.force_authenticate(user=self.lab_user)
        order = LabOrder.objects.create(
            patient=self.patient,
            doctor=self.doctor,
            test=self.cbc_test,
            status=LabOrderStatus.REQUESTED
        )

        # Cannot skip directly from REQUESTED to IN_PROGRESS or COMPLETED
        res = self.client.patch(f"/api/laboratory/orders/{order.id}/", {"status": LabOrderStatus.IN_PROGRESS}, format="json")
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("Invalid status transition", str(res.data))

        # Completed tests cannot be reopened
        order.status = LabOrderStatus.COMPLETED
        order.result_value = "14.0"
        order.save()

        res_reopen = self.client.patch(f"/api/laboratory/orders/{order.id}/", {"status": LabOrderStatus.IN_PROGRESS}, format="json")
        self.assertEqual(res_reopen.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("Completed or cancelled tests cannot be reopened", str(res_reopen.data))

    def test_completion_without_results_rejected(self):
        self.client.force_authenticate(user=self.lab_user)
        order = LabOrder.objects.create(
            patient=self.patient,
            doctor=self.doctor,
            test=self.cbc_test,
            status=LabOrderStatus.IN_PROGRESS
        )
        res = self.client.patch(f"/api/laboratory/orders/{order.id}/", {"status": LabOrderStatus.COMPLETED}, format="json")
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("A test cannot be marked as Completed without recording test results or uploading a report", str(res.data))

    def test_lab_staff_can_record_results_and_upload_valid_pdf_report(self):
        self.client.force_authenticate(user=self.lab_user)
        order = LabOrder.objects.create(
            patient=self.patient,
            doctor=self.doctor,
            test=self.cbc_test,
            status=LabOrderStatus.IN_PROGRESS
        )

        valid_pdf = SimpleUploadedFile(
            "report.pdf",
            b"%PDF-1.4\n1 0 obj\n<<\n>>\nendobj\ntrailer\n<<\n>>\n%%EOF",
            content_type="application/pdf"
        )

        update_payload = {
            "status": LabOrderStatus.COMPLETED,
            "result_value": "14.8",
            "result_notes": "Normal hemoglobin and platelet distribution.",
            "result_interpretation": "Normal",
            "report_file": valid_pdf
        }
        res = self.client.patch(
            f"/api/laboratory/orders/{order.id}/",
            update_payload,
            format="multipart"
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        order.refresh_from_db()
        self.assertEqual(order.status, LabOrderStatus.COMPLETED)
        self.assertEqual(order.result_value, "14.8")
        self.assertTrue(bool(order.report_file))

    def test_unsupported_file_extension_rejected(self):
        self.client.force_authenticate(user=self.lab_user)
        order = LabOrder.objects.create(
            patient=self.patient,
            doctor=self.doctor,
            test=self.cbc_test,
            status=LabOrderStatus.IN_PROGRESS
        )
        malicious_file = SimpleUploadedFile(
            "script.exe",
            b"MZ executable content",
            content_type="application/octet-stream"
        )
        res = self.client.patch(
            f"/api/laboratory/orders/{order.id}/",
            {"report_file": malicious_file},
            format="multipart"
        )
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("Unsupported file format", str(res.data))

    def test_oversized_file_rejected(self):
        self.client.force_authenticate(user=self.lab_user)
        order = LabOrder.objects.create(
            patient=self.patient,
            doctor=self.doctor,
            test=self.cbc_test,
            status=LabOrderStatus.IN_PROGRESS
        )
        oversized = SimpleUploadedFile(
            "large_scan.pdf",
            b"%PDF-" + b"0" * (5242880 + 1024),
            content_type="application/pdf"
        )
        res = self.client.patch(
            f"/api/laboratory/orders/{order.id}/",
            {"report_file": oversized},
            format="multipart"
        )
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("exceeds maximum permitted limit of 5 MB", str(res.data))

    def test_patient_can_only_view_own_orders(self):
        order1 = LabOrder.objects.create(
            patient=self.patient,
            doctor=self.doctor,
            test=self.cbc_test
        )
        order2 = LabOrder.objects.create(
            patient=self.unrelated_patient,
            doctor=self.doctor2,
            test=self.cbc_test
        )
        self.client.force_authenticate(user=self.patient_user)
        res = self.client.get("/api/laboratory/orders/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        order_ids = [o["id"] for o in res.data["results"]] if "results" in res.data else [o["id"] for o in res.data]
        self.assertIn(order1.id, order_ids)
        self.assertNotIn(order2.id, order_ids)

    def test_patient_cannot_modify_lab_orders(self):
        self.client.force_authenticate(user=self.patient_user)
        order = LabOrder.objects.create(
            patient=self.patient,
            doctor=self.doctor,
            test=self.cbc_test
        )
        res = self.client.patch(
            f"/api/laboratory/orders/{order.id}/",
            {"status": LabOrderStatus.COMPLETED},
            format="json"
        )
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_is_read_only_for_lab_orders(self):
        order = LabOrder.objects.create(
            patient=self.patient,
            doctor=self.doctor,
            test=self.cbc_test,
            status=LabOrderStatus.COMPLETED,
            result_value="Normal"
        )
        self.client.force_authenticate(user=self.admin_user)

        # Admin CAN view list & detail
        res_list = self.client.get("/api/laboratory/orders/")
        self.assertEqual(res_list.status_code, status.HTTP_200_OK)
        res_detail = self.client.get(f"/api/laboratory/orders/{order.id}/")
        self.assertEqual(res_detail.status_code, status.HTTP_200_OK)

        # Admin CANNOT update status or results
        res_patch = self.client.patch(
            f"/api/laboratory/orders/{order.id}/",
            {"result_value": "Modified By Admin"},
            format="json"
        )
        self.assertEqual(res_patch.status_code, status.HTTP_403_FORBIDDEN)
        self.assertIn("Administrators have read-only access", str(res_patch.data))

        # Admin CANNOT delete lab order
        res_del = self.client.delete(f"/api/laboratory/orders/{order.id}/")
        self.assertEqual(res_del.status_code, status.HTTP_403_FORBIDDEN)

    def test_protected_report_download_endpoint(self):
        valid_pdf = SimpleUploadedFile(
            "report.pdf",
            b"%PDF-1.4\n1 0 obj\n<<\n>>\nendobj\ntrailer\n<<\n>>\n%%EOF",
            content_type="application/pdf"
        )
        order = LabOrder.objects.create(
            patient=self.patient,
            doctor=self.doctor,
            test=self.cbc_test,
            status=LabOrderStatus.COMPLETED,
            result_value="14.8",
            report_file=valid_pdf
        )

        # 1. Ordering doctor can download
        self.client.force_authenticate(user=self.doc_user)
        res_doc = self.client.get(f"/api/laboratory/orders/{order.id}/download-report/")
        self.assertEqual(res_doc.status_code, status.HTTP_200_OK)

        # 2. Patient can download own report
        self.client.force_authenticate(user=self.patient_user)
        res_patient = self.client.get(f"/api/laboratory/orders/{order.id}/download-report/")
        self.assertEqual(res_patient.status_code, status.HTTP_200_OK)

        # 3. Admin can view / download
        self.client.force_authenticate(user=self.admin_user)
        res_admin = self.client.get(f"/api/laboratory/orders/{order.id}/download-report/")
        self.assertEqual(res_admin.status_code, status.HTTP_200_OK)

        # 4. Lab staff can download
        self.client.force_authenticate(user=self.lab_user)
        res_lab = self.client.get(f"/api/laboratory/orders/{order.id}/download-report/")
        self.assertEqual(res_lab.status_code, status.HTTP_200_OK)

        # 5. Unrelated doctor cannot download
        self.client.force_authenticate(user=self.doc2_user)
        res_doc2 = self.client.get(f"/api/laboratory/orders/{order.id}/download-report/")
        self.assertEqual(res_doc2.status_code, status.HTTP_403_FORBIDDEN)

        # 6. Unrelated patient cannot download
        self.client.force_authenticate(user=self.unrelated_patient_user)
        res_p2 = self.client.get(f"/api/laboratory/orders/{order.id}/download-report/")
        self.assertEqual(res_p2.status_code, status.HTTP_403_FORBIDDEN)

    def test_lab_staff_and_admin_can_access_stats(self):
        LabOrder.objects.create(patient=self.patient, doctor=self.doctor, test=self.cbc_test, status=LabOrderStatus.REQUESTED)
        LabOrder.objects.create(patient=self.patient, doctor=self.doctor, test=self.cbc_test, status=LabOrderStatus.IN_PROGRESS)
        LabOrder.objects.create(patient=self.patient, doctor=self.doctor, test=self.cbc_test, status=LabOrderStatus.COMPLETED, result_value="Normal")

        # Lab staff access
        self.client.force_authenticate(user=self.lab_user)
        res_lab = self.client.get("/api/laboratory/orders/stats/")
        self.assertEqual(res_lab.status_code, status.HTTP_200_OK)
        self.assertIn("total", res_lab.data)
        self.assertIn("requested", res_lab.data)
        self.assertIn("completed", res_lab.data)
        self.assertEqual(res_lab.data["total"], 3)
        self.assertEqual(res_lab.data["requested"], 1)
        self.assertEqual(res_lab.data["in_progress"], 1)
        self.assertEqual(res_lab.data["completed"], 1)

        # Admin access
        self.client.force_authenticate(user=self.admin_user)
        res_admin = self.client.get("/api/laboratory/orders/stats/")
        self.assertEqual(res_admin.status_code, status.HTTP_200_OK)

        # Doctor access denied
        self.client.force_authenticate(user=self.doc_user)
        res_doc = self.client.get("/api/laboratory/orders/stats/")
        self.assertEqual(res_doc.status_code, status.HTTP_403_FORBIDDEN)

        # Patient access denied
        self.client.force_authenticate(user=self.patient_user)
        res_pat = self.client.get("/api/laboratory/orders/stats/")
        self.assertEqual(res_pat.status_code, status.HTTP_403_FORBIDDEN)

    def test_lab_staff_can_upload_report_and_complete(self):
        order = LabOrder.objects.create(
            patient=self.patient,
            doctor=self.doctor,
            test=self.cbc_test,
            status=LabOrderStatus.IN_PROGRESS
        )
        self.client.force_authenticate(user=self.lab_user)
        pdf_file = SimpleUploadedFile("cbc_final.pdf", b"%PDF-1.4 test report content", content_type="application/pdf")
        res = self.client.post(
            f"/api/laboratory/orders/{order.id}/upload-report/",
            {"report_file": pdf_file, "mark_completed": "true"},
            format="multipart"
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        order.refresh_from_db()
        self.assertTrue(bool(order.report_file))
        self.assertEqual(order.status, LabOrderStatus.COMPLETED)
        self.assertIsNotNone(order.completed_at)

    def test_completed_order_is_locked_against_modification(self):
        order = LabOrder.objects.create(
            patient=self.patient,
            doctor=self.doctor,
            test=self.cbc_test,
            status=LabOrderStatus.COMPLETED,
            result_value="Normal",
            completed_at=timezone.now()
        )
        self.client.force_authenticate(user=self.lab_user)
        # Attempt to modify result_value
        res = self.client.patch(
            f"/api/laboratory/orders/{order.id}/",
            {"result_value": "Tampered Value"},
            format="json"
        )
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("verified records cannot be modified", str(res.data))

