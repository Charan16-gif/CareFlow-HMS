from datetime import date, time, timedelta
from decimal import Decimal
from django.utils import timezone
from django.test import TestCase
from django.contrib.auth.models import User
from rest_framework.test import APIClient
from rest_framework import status

from accounts.models import UserProfile, UserRole
from patients.models import Patient
from staff.models import Doctor, DoctorStatus
from pharmacy.models import Prescription, Medicine
from appointments.models import (
    Appointment,
    AppointmentStatus,
    PatientFeedback,
    ConsultationExperience,
    DoctorCommunication,
    OverallSatisfaction,
    MedicalQuery,
    MedicalQueryCategory,
    QuerySeverity,
    MedicalQueryStatus,
)
from appointments.assignment import (
    HEALTH_PROBLEM_SPECIALIZATION_MAP,
    assign_doctor_automatically,
    get_available_problem_slots,
)


class AutoDoctorAssignmentAndFeedbackTests(TestCase):
    def setUp(self):
        self.client = APIClient()

        # 1. Doctors with distinct specializations
        # General Physician 1
        self.u_doc1 = User.objects.create_user(username="dr_gen1", email="gen1@careflow.com", password="Password@123")
        UserProfile.objects.filter(user=self.u_doc1).update(role=UserRole.DOCTOR)
        self.doc_gen1 = Doctor.objects.create(
            user=self.u_doc1,
            first_name="Alice",
            last_name="Smith",
            specialization="General Physician",
            qualification="MD General Medicine",
            license_number="LIC-GEN-01",
            available_days="Monday,Tuesday,Wednesday,Thursday,Friday,Saturday,Sunday",
            start_time=time(9, 0),
            end_time=time(17, 0),
            status=DoctorStatus.ACTIVE
        )

        # General Physician 2 (for fair workload distribution testing)
        self.u_doc2 = User.objects.create_user(username="dr_gen2", email="gen2@careflow.com", password="Password@123")
        UserProfile.objects.filter(user=self.u_doc2).update(role=UserRole.DOCTOR)
        self.doc_gen2 = Doctor.objects.create(
            user=self.u_doc2,
            first_name="Bob",
            last_name="Johnson",
            specialization="General Medicine",
            qualification="MBBS",
            license_number="LIC-GEN-02",
            available_days="Monday,Tuesday,Wednesday,Thursday,Friday,Saturday,Sunday",
            start_time=time(9, 0),
            end_time=time(17, 0),
            status=DoctorStatus.ACTIVE
        )

        # Cardiologist
        self.u_cardio = User.objects.create_user(username="dr_cardio", email="cardio@careflow.com", password="Password@123")
        UserProfile.objects.filter(user=self.u_cardio).update(role=UserRole.DOCTOR)
        self.doc_cardio = Doctor.objects.create(
            user=self.u_cardio,
            first_name="Carol",
            last_name="Davis",
            specialization="Cardiologist",
            qualification="MD Cardiology",
            license_number="LIC-CAR-01",
            available_days="Monday,Tuesday,Wednesday,Thursday,Friday,Saturday,Sunday",
            start_time=time(9, 0),
            end_time=time(17, 0),
            status=DoctorStatus.ACTIVE
        )

        # ENT Specialist
        self.u_ent = User.objects.create_user(username="dr_ent", email="ent@careflow.com", password="Password@123")
        UserProfile.objects.filter(user=self.u_ent).update(role=UserRole.DOCTOR)
        self.doc_ent = Doctor.objects.create(
            user=self.u_ent,
            first_name="Daniel",
            last_name="Lee",
            specialization="ENT Specialist",
            qualification="MS ENT",
            license_number="LIC-ENT-01",
            available_days="Monday,Tuesday,Wednesday,Thursday,Friday,Saturday,Sunday",
            start_time=time(9, 0),
            end_time=time(17, 0),
            status=DoctorStatus.ACTIVE
        )

        # Inactive Doctor (should NEVER be assigned)
        self.u_inactive = User.objects.create_user(username="dr_inactive", email="inact@careflow.com", password="Password@123")
        UserProfile.objects.filter(user=self.u_inactive).update(role=UserRole.DOCTOR)
        self.doc_inactive = Doctor.objects.create(
            user=self.u_inactive,
            first_name="Inactive",
            last_name="Doctor",
            specialization="Dermatologist",
            qualification="MD",
            license_number="LIC-INA-01",
            available_days="Monday,Tuesday,Wednesday,Thursday,Friday,Saturday,Sunday",
            start_time=time(9, 0),
            end_time=time(17, 0),
            status=DoctorStatus.INACTIVE
        )

        # 2. Patients
        self.u_patient1 = User.objects.create_user(username="pat_john", email="john@careflow.com", password="Password@123")
        UserProfile.objects.filter(user=self.u_patient1).update(role=UserRole.PATIENT)
        self.patient1 = Patient.objects.create(
            user=self.u_patient1,
            first_name="John",
            last_name="Doe",
            phone_number="555-0101",
            gender="MALE"
        )

        self.u_patient2 = User.objects.create_user(username="pat_jane", email="jane@careflow.com", password="Password@123")
        UserProfile.objects.filter(user=self.u_patient2).update(role=UserRole.PATIENT)
        self.patient2 = Patient.objects.create(
            user=self.u_patient2,
            first_name="Jane",
            last_name="Roe",
            phone_number="555-0102",
            gender="FEMALE"
        )

        # 3. Admin User
        self.u_admin = User.objects.create_user(username="admin_super", email="admin@careflow.com", password="Password@123", is_staff=True)
        UserProfile.objects.filter(user=self.u_admin).update(role=UserRole.ADMIN)

        # Future date for test bookings
        self.future_date = (timezone.localdate() + timedelta(days=2))
        self.booking_time = time(10, 0)

    # ─── PART 2: AUTOMATIC DOCTOR ASSIGNMENT TESTS ───────────────────────────
    def test_health_problem_specialization_mapping(self):
        """Verify the 12 specified health problems map to the required specializations."""
        self.assertEqual(HEALTH_PROBLEM_SPECIALIZATION_MAP["Fever"], "General Physician")
        self.assertEqual(HEALTH_PROBLEM_SPECIALIZATION_MAP["Cold and Cough"], "General Physician")
        self.assertEqual(HEALTH_PROBLEM_SPECIALIZATION_MAP["Headache"], "General Physician")
        self.assertEqual(HEALTH_PROBLEM_SPECIALIZATION_MAP["Ear Pain"], "ENT Specialist")
        self.assertEqual(HEALTH_PROBLEM_SPECIALIZATION_MAP["Eye Problems"], "Ophthalmologist")
        self.assertEqual(HEALTH_PROBLEM_SPECIALIZATION_MAP["Skin Problems"], "Dermatologist")
        self.assertEqual(HEALTH_PROBLEM_SPECIALIZATION_MAP["Heart-related Symptoms"], "Cardiologist")
        self.assertEqual(HEALTH_PROBLEM_SPECIALIZATION_MAP["Stomach Pain"], "General Physician")
        self.assertEqual(HEALTH_PROBLEM_SPECIALIZATION_MAP["Bone and Joint Pain"], "Orthopedic")
        self.assertEqual(HEALTH_PROBLEM_SPECIALIZATION_MAP["Dental Problems"], "Dentist")
        self.assertEqual(HEALTH_PROBLEM_SPECIALIZATION_MAP["General Health Checkup"], "General Physician")
        self.assertEqual(HEALTH_PROBLEM_SPECIALIZATION_MAP["Other"], "General Physician")

    def test_auto_assignment_fever_assigns_general_physician(self):
        """Booking for Fever automatically routes to an available General Physician."""
        self.client.force_authenticate(user=self.u_patient1)
        res = self.client.post("/api/appointments/", {
            "health_problem": "Fever",
            "problem_description": "High temperature and chills",
            "appointment_date": str(self.future_date),
            "appointment_time": "10:00:00",
        })
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        apt = Appointment.objects.get(id=res.data["id"])
        self.assertIn(apt.doctor, [self.doc_gen1, self.doc_gen2])
        self.assertIn("General", apt.doctor.specialization)

    def test_auto_assignment_heart_symptoms_assigns_cardiologist(self):
        """Booking for Heart-related Symptoms routes to Cardiologist."""
        self.client.force_authenticate(user=self.u_patient1)
        res = self.client.post("/api/appointments/", {
            "health_problem": "Heart-related Symptoms",
            "problem_description": "Mild palpitations while walking",
            "appointment_date": str(self.future_date),
            "appointment_time": "11:00:00",
        })
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        apt = Appointment.objects.get(id=res.data["id"])
        self.assertEqual(apt.doctor, self.doc_cardio)

    def test_auto_assignment_ear_pain_assigns_ent_specialist(self):
        """Booking for Ear Pain routes to ENT Specialist."""
        self.client.force_authenticate(user=self.u_patient1)
        res = self.client.post("/api/appointments/", {
            "health_problem": "Ear Pain",
            "problem_description": "Sharp pain in left ear",
            "appointment_date": str(self.future_date),
            "appointment_time": "14:00:00",
        })
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        apt = Appointment.objects.get(id=res.data["id"])
        self.assertEqual(apt.doctor, self.doc_ent)

    def test_patient_supplied_doctor_id_is_ignored_by_backend(self):
        """Backend ignores patient-submitted doctor ID and enforces automatic assignment."""
        self.client.force_authenticate(user=self.u_patient1)
        # Patient tries to pass Cardiologist ID for an ENT complaint:
        res = self.client.post("/api/appointments/", {
            "doctor": self.doc_cardio.id,
            "health_problem": "Ear Pain",
            "problem_description": "Ear discharge",
            "appointment_date": str(self.future_date),
            "appointment_time": "15:00:00",
        })
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        apt = Appointment.objects.get(id=res.data["id"])
        # Must be assigned to ENT doctor, NOT the patient-passed cardio doctor!
        self.assertEqual(apt.doctor, self.doc_ent)

    def test_fair_distribution_between_multiple_eligible_doctors(self):
        """Appointments are distributed to the doctor with fewer bookings on that date."""
        # Create an existing booking for doc_gen1 on that date
        Appointment.objects.create(
            patient=self.patient2,
            doctor=self.doc_gen1,
            appointment_date=self.future_date,
            appointment_time=time(9, 0),
            reason_for_visit="Earlier checkup"
        )
        # Next booking at 10:00 should be assigned to doc_gen2 because doc_gen2 has 0 load
        self.client.force_authenticate(user=self.u_patient1)
        res = self.client.post("/api/appointments/", {
            "health_problem": "Cold and Cough",
            "problem_description": "Persistent dry cough",
            "appointment_date": str(self.future_date),
            "appointment_time": "10:00:00",
        })
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        apt = Appointment.objects.get(id=res.data["id"])
        self.assertEqual(apt.doctor, self.doc_gen2)

    def test_no_available_doctor_returns_exact_error_message(self):
        """When no doctor is available for the specialization, returns user-mandated message."""
        # Eye Problems -> Ophthalmologist. We have no active Ophthalmologist in setup.
        self.client.force_authenticate(user=self.u_patient1)
        res = self.client.post("/api/appointments/", {
            "health_problem": "Eye Problems",
            "problem_description": "Blurry vision",
            "appointment_date": str(self.future_date),
            "appointment_time": "10:00:00",
        })
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        detail = str(res.data)
        self.assertIn("No suitable doctor is available for your selected problem and appointment time", detail)

    def test_other_complaint_requires_description(self):
        """When selecting 'Other', problem description is mandatory."""
        self.client.force_authenticate(user=self.u_patient1)
        res = self.client.post("/api/appointments/", {
            "health_problem": "Other",
            "problem_description": "   ",
            "appointment_date": str(self.future_date),
            "appointment_time": "10:00:00",
        })
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("problem_description", res.data)

    # ─── PART 3: PATIENT FEEDBACK TESTS ─────────────────────────────────────
    def test_patient_feedback_submission_for_completed_consultation(self):
        """Patient can submit rating and experience feedback for a completed appointment."""
        apt = Appointment.objects.create(
            patient=self.patient1,
            doctor=self.doc_gen1,
            appointment_date=self.future_date - timedelta(days=5),
            appointment_time=time(10, 0),
            status=AppointmentStatus.COMPLETED,
            reason_for_visit="Fever checkup"
        )
        self.client.force_authenticate(user=self.u_patient1)
        res = self.client.post("/api/feedback/", {
            "appointment": apt.id,
            "doctor_rating": 5,
            "consultation_experience": "EXCELLENT",
            "doctor_communication": "EXCELLENT",
            "overall_satisfaction": "SATISFIED",
            "comments": "Dr. Smith was thorough and empathetic."
        })
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        fb = PatientFeedback.objects.get(appointment=apt)
        self.assertEqual(fb.doctor_rating, 5)
        self.assertEqual(fb.patient, self.patient1)
        self.assertEqual(fb.doctor, self.doc_gen1)

    def test_patient_cannot_submit_feedback_for_non_completed_appointment(self):
        """Scheduled or In-Progress appointments cannot receive feedback."""
        apt = Appointment.objects.create(
            patient=self.patient1,
            doctor=self.doc_gen1,
            appointment_date=self.future_date,
            appointment_time=time(10, 0),
            status=AppointmentStatus.SCHEDULED,
            reason_for_visit="Upcoming checkup"
        )
        self.client.force_authenticate(user=self.u_patient1)
        res = self.client.post("/api/feedback/", {
            "appointment": apt.id,
            "doctor_rating": 4,
            "consultation_experience": "GOOD",
            "doctor_communication": "GOOD",
            "overall_satisfaction": "SATISFIED",
        })
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_prevent_duplicate_feedback_for_same_appointment(self):
        """An appointment can only have one feedback record."""
        apt = Appointment.objects.create(
            patient=self.patient1,
            doctor=self.doc_gen1,
            appointment_date=self.future_date - timedelta(days=5),
            appointment_time=time(10, 0),
            status=AppointmentStatus.COMPLETED,
            reason_for_visit="Checkup"
        )
        PatientFeedback.objects.create(
            appointment=apt,
            patient=self.patient1,
            doctor=self.doc_gen1,
            doctor_rating=4,
            consultation_experience="GOOD",
            doctor_communication="GOOD",
            overall_satisfaction="SATISFIED"
        )
        self.client.force_authenticate(user=self.u_patient1)
        res = self.client.post("/api/feedback/", {
            "appointment": apt.id,
            "doctor_rating": 5,
            "consultation_experience": "EXCELLENT",
            "doctor_communication": "EXCELLENT",
            "overall_satisfaction": "SATISFIED",
        })
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_doctor_sees_only_own_consultation_feedback_and_cannot_modify(self):
        """Doctors view only their own feedback and cannot modify or delete it."""
        apt = Appointment.objects.create(
            patient=self.patient1,
            doctor=self.doc_gen1,
            appointment_date=self.future_date - timedelta(days=4),
            appointment_time=time(11, 0),
            status=AppointmentStatus.COMPLETED,
            reason_for_visit="Checkup"
        )
        fb = PatientFeedback.objects.create(
            appointment=apt,
            patient=self.patient1,
            doctor=self.doc_gen1,
            doctor_rating=5,
            consultation_experience="EXCELLENT",
            doctor_communication="EXCELLENT",
            overall_satisfaction="SATISFIED"
        )

        # Authenticate doc_gen2 (unrelated doctor): cannot see doc_gen1's feedback
        self.client.force_authenticate(user=self.u_doc2)
        res = self.client.get(f"/api/feedback/{fb.id}/")
        self.assertEqual(res.status_code, status.HTTP_404_NOT_FOUND)

        # Authenticate doc_gen1: can read, but cannot modify
        self.client.force_authenticate(user=self.u_doc1)
        res_read = self.client.get(f"/api/feedback/{fb.id}/")
        self.assertEqual(res_read.status_code, status.HTTP_200_OK)

        res_edit = self.client.patch(f"/api/feedback/{fb.id}/", {"doctor_rating": 1})
        self.assertEqual(res_edit.status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_feedback_analytics_real_db_records(self):
        """Admin analytics returns calculated database statistics."""
        apt1 = Appointment.objects.create(
            patient=self.patient1, doctor=self.doc_gen1,
            appointment_date=self.future_date - timedelta(days=2), appointment_time=time(10, 0),
            status=AppointmentStatus.COMPLETED, reason_for_visit="Checkup 1"
        )
        PatientFeedback.objects.create(
            appointment=apt1, patient=self.patient1, doctor=self.doc_gen1,
            doctor_rating=5, consultation_experience="EXCELLENT", doctor_communication="EXCELLENT",
            overall_satisfaction="SATISFIED"
        )
        apt2 = Appointment.objects.create(
            patient=self.patient2, doctor=self.doc_cardio,
            appointment_date=self.future_date - timedelta(days=1), appointment_time=time(11, 0),
            status=AppointmentStatus.COMPLETED, reason_for_visit="Cardio consultation"
        )
        PatientFeedback.objects.create(
            appointment=apt2, patient=self.patient2, doctor=self.doc_cardio,
            doctor_rating=3, consultation_experience="AVERAGE", doctor_communication="GOOD",
            overall_satisfaction="NEUTRAL"
        )

        self.client.force_authenticate(user=self.u_admin)
        res = self.client.get("/api/feedback/analytics/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data["total_feedbacks"], 2)
        self.assertEqual(res.data["average_doctor_rating"], 4.0)
        self.assertEqual(res.data["positive_count"], 1)
        self.assertEqual(res.data["neutral_count"], 1)
        self.assertEqual(len(res.data["doctor_summaries"]), 2)

    # ─── PART 4: CONTACT DOCTOR (MEDICAL QUERY) TESTS ───────────────────────
    def test_patient_submits_medical_query_assigned_to_treating_doctor(self):
        """Patient submits a query linked to an appointment; it assigns the treating doctor."""
        apt = Appointment.objects.create(
            patient=self.patient1,
            doctor=self.doc_gen1,
            appointment_date=self.future_date - timedelta(days=2),
            appointment_time=time(10, 0),
            status=AppointmentStatus.COMPLETED,
            reason_for_visit="Fever checkup"
        )
        self.client.force_authenticate(user=self.u_patient1)
        res = self.client.post("/api/medical-queries/", {
            "appointment": apt.id,
            "category": "MEDICINE_SIDE_EFFECTS",
            "description": "Developed mild nausea and rash after taking prescribed antibiotic.",
            "started_at": "Yesterday evening",
            "severity": "MODERATE",
            "medicine_name": "Amoxicillin 500mg"
        })
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        mq = MedicalQuery.objects.get(id=res.data["id"])
        self.assertEqual(mq.patient, self.patient1)
        self.assertEqual(mq.doctor, self.doc_gen1)
        self.assertEqual(mq.status, MedicalQueryStatus.PENDING_REVIEW)
        self.assertTrue(mq.query_id.startswith("CF-MQ-"))

    def test_patient_cannot_submit_query_for_another_patients_appointment(self):
        """A patient cannot query a consultation that belongs to someone else."""
        apt = Appointment.objects.create(
            patient=self.patient2,
            doctor=self.doc_cardio,
            appointment_date=self.future_date - timedelta(days=1),
            appointment_time=time(10, 0),
            status=AppointmentStatus.COMPLETED,
            reason_for_visit="Jane consultation"
        )
        self.client.force_authenticate(user=self.u_patient1)  # Patient 1
        res = self.client.post("/api/medical-queries/", {
            "appointment": apt.id,  # Belongs to Patient 2!
            "category": "TREATMENT_CLARIFICATION",
            "description": "Attempting unauthorized query",
            "started_at": "Today",
            "severity": "MILD"
        })
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_doctor_responds_to_medical_query(self):
        """Treating doctor reviews query and provides a written response with recommendation."""
        apt = Appointment.objects.create(
            patient=self.patient1,
            doctor=self.doc_gen1,
            appointment_date=self.future_date - timedelta(days=1),
            appointment_time=time(10, 0),
            status=AppointmentStatus.COMPLETED,
            reason_for_visit="Consultation"
        )
        mq = MedicalQuery.objects.create(
            appointment=apt,
            patient=self.patient1,
            doctor=self.doc_gen1,
            category=MedicalQueryCategory.TREATMENT_NOT_IMPROVING,
            description="Fever has not subsided after 48 hours.",
            started_at="2 days ago",
            severity=QuerySeverity.MODERATE
        )

        # Authenticate assigned doctor
        self.client.force_authenticate(user=self.u_doc1)
        res = self.client.post(f"/api/medical-queries/{mq.id}/respond/", {
            "doctor_response": "Please continue hydration and visit the hospital for a physical follow-up.",
            "recommend_follow_up": True,
            "recommend_lab_tests": True,
            "lab_test_recommendations": "Complete Blood Count (CBC) and Dengue Serology.",
            "mark_resolved": False
        })
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        mq.refresh_from_db()
        self.assertEqual(mq.status, MedicalQueryStatus.FOLLOW_UP_REQUIRED)
        self.assertTrue(mq.recommend_follow_up)
        self.assertTrue(mq.recommend_lab_tests)
        self.assertIn("CBC", mq.lab_test_recommendations)
        self.assertIsNotNone(mq.responded_at)

    def test_unrelated_doctor_cannot_respond_to_query(self):
        """Doctor 2 cannot respond to a query assigned to Doctor 1."""
        apt = Appointment.objects.create(
            patient=self.patient1,
            doctor=self.doc_gen1,
            appointment_date=self.future_date - timedelta(days=1),
            appointment_time=time(10, 0),
            status=AppointmentStatus.COMPLETED,
            reason_for_visit="Consultation"
        )
        mq = MedicalQuery.objects.create(
            appointment=apt,
            patient=self.patient1,
            doctor=self.doc_gen1,
            category=MedicalQueryCategory.QUESTION_ABOUT_PRESCRIBED_MEDICINE,
            description="Dosage timing question",
            started_at="Today",
            severity=QuerySeverity.MILD
        )
        self.client.force_authenticate(user=self.u_doc2)
        res = self.client.post(f"/api/medical-queries/{mq.id}/respond/", {
            "doctor_response": "Unauthorized response"
        })
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_patient_marked_as_checkout_after_prescription_written(self):
        """When a doctor writes a prescription for an appointment, the patient visit is automatically marked completed and checked out."""
        from pharmacy.models import DosageForm, PrescriptionStatus
        med, _ = Medicine.objects.get_or_create(
            medicine_code="MED-TEST-CHKOUT",
            defaults={
                "name": "Paracetamol 650mg",
                "generic_name": "Paracetamol",
                "brand_name": "Dolo 650",
                "dosage_form": DosageForm.TABLET,
                "strength": "650mg",
                "unit_price": Decimal("5.00"),
                "stock_quantity": 100,
                "reorder_level": 10,
                "is_active": True,
            }
        )
        apt = Appointment.objects.create(
            patient=self.patient1,
            doctor=self.doc_gen1,
            appointment_date=self.future_date,
            appointment_time=time(11, 0),
            status=AppointmentStatus.CONFIRMED,
            is_checked_in=True,
            check_in_time=timezone.now(),
            reason_for_visit="Severe Headache"
        )
        self.client.force_authenticate(user=self.u_doc1)
        res = self.client.post("/api/pharmacy/prescriptions/", {
            "patient": self.patient1.id,
            "appointment": apt.id,
            "diagnosis": "Tension Headache",
            "clinical_notes": "Take rest and drink plenty of water.",
            "prescription_items": [
                {
                    "medicine": med.id,
                    "dosage": "1 Tablet",
                    "frequency": "1-0-1",
                    "duration": "3 Days",
                    "quantity_prescribed": 6,
                    "instructions": "After food",
                }
            ]
        }, format="json")
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        apt.refresh_from_db()
        # Appointment must be marked as completed and checked out
        self.assertEqual(apt.status, AppointmentStatus.COMPLETED)
        self.assertFalse(apt.is_checked_in)
        self.assertIsNotNone(apt.check_out_time)
        rx = Prescription.objects.get(appointment=apt)
        self.assertEqual(rx.status, PrescriptionStatus.COMPLETED)

        # Now patient can immediately query eligible feedback and submit review
        self.client.force_authenticate(user=self.u_patient1)
        eligible_res = self.client.get("/api/feedback/eligible-appointments/")
        self.assertEqual(eligible_res.status_code, status.HTTP_200_OK)
        eligible_ids = [item["id"] for item in eligible_res.data]
        self.assertIn(apt.id, eligible_ids)

    def test_medical_inquiry_button_activation_eligibility(self):
        """
        Tests the New Medical Inquiry activation logic:
        1. When patient has no completed consultations -> is_eligible = False, appointments = []
        2. When patient has at least 1 completed consultation (even with no prescription) -> is_eligible = True
        3. When prescription exists -> prescription and medicines are linked correctly without error
        """
        # Create a new patient with 0 completed appointments
        u_new_patient = User.objects.create_user(username="pat_inquiry_test", email="inquiry_test@careflow.com", password="Password@123")
        UserProfile.objects.filter(user=u_new_patient).update(role=UserRole.PATIENT)
        new_patient = Patient.objects.create(
            user=u_new_patient,
            patient_id="CF-P-99991",
            first_name="Test",
            last_name="Inquirer",
            date_of_birth=date(1995, 1, 1),
            gender="MALE",
            phone_number="9876543210"
        )

        self.client.force_authenticate(user=u_new_patient)

        # 1. Initially no consultations -> not eligible
        res1 = self.client.get("/api/medical-queries/eligible-records/")
        self.assertEqual(res1.status_code, status.HTTP_200_OK)
        self.assertFalse(res1.data["is_eligible"])
        self.assertEqual(len(res1.data["appointments"]), 0)

        # 2. Add an appointment that is COMPLETED without any prescription
        apt_completed = Appointment.objects.create(
            appointment_id="CF-APT-99001",
            patient=new_patient,
            doctor=self.doc_gen1,
            appointment_date=date.today() - timedelta(days=2),
            appointment_time=time(10, 0),
            status=AppointmentStatus.COMPLETED,
            reason_for_visit="Routine Examination"
        )

        res2 = self.client.get("/api/medical-queries/eligible-records/")
        self.assertEqual(res2.status_code, status.HTTP_200_OK)
        self.assertTrue(res2.data["is_eligible"])
        self.assertEqual(len(res2.data["appointments"]), 1)
        self.assertEqual(res2.data["appointments"][0]["id"], apt_completed.id)
        self.assertEqual(res2.data["appointments"][0]["doctor_name"], self.doc_gen1.full_name)

        # 3. Add a prescription for this appointment
        from pharmacy.models import DosageForm, PrescriptionItem
        med = Medicine.objects.create(
            medicine_code="MED-INQ-01",
            name="Amoxicillin 500mg",
            generic_name="Amoxicillin",
            brand_name="Mox 500",
            dosage_form=DosageForm.CAPSULE,
            strength="500mg",
            unit_price=Decimal("12.00"),
            stock_quantity=50,
            reorder_level=5,
            is_active=True
        )
        rx = Prescription.objects.create(
            prescription_id="CF-RX-99001",
            appointment=apt_completed,
            patient=new_patient,
            doctor=self.doc_gen1,
            diagnosis="Bacterial Infection",
            clinical_notes="Course of antibiotics",
            status="COMPLETED"
        )
        PrescriptionItem.objects.create(
            prescription=rx,
            medicine=med,
            dosage="1 Capsule",
            frequency="1-0-1",
            duration="5 Days",
            quantity_prescribed=10,
            quantity_dispensed=10
        )

        res3 = self.client.get("/api/medical-queries/eligible-records/")
        self.assertEqual(res3.status_code, status.HTTP_200_OK)
        self.assertTrue(res3.data["is_eligible"])
        self.assertEqual(len(res3.data["prescriptions"]), 1)
        self.assertEqual(res3.data["prescriptions"][0]["prescription_id"], "CF-RX-99001")
        self.assertEqual(len(res3.data["prescriptions"][0]["medicines"]), 1)
        self.assertEqual(res3.data["prescriptions"][0]["medicines"][0]["medicine_name"], "Amoxicillin 500mg")

        # 4. Patient submits medical inquiry referencing this completed consultation
        create_res = self.client.post("/api/medical-queries/", {
            "appointment": apt_completed.id,
            "prescription": rx.id,
            "medicine_name": "Amoxicillin 500mg",
            "category": "MEDICINE_SIDE_EFFECTS",
            "severity": "MILD",
            "started_at": "Yesterday evening",
            "description": "Mild stomach discomfort after taking the evening antibiotic."
        }, format="json")
        self.assertEqual(create_res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(create_res.data["doctor_name"], self.doc_gen1.full_name)
        self.assertEqual(create_res.data["status"], "PENDING_REVIEW")

    def test_resolved_medical_query_cannot_be_modified(self):
        """
        Requirement 4: Resolved medical queries are finalized and cannot be modified.
        Doctor response API, status update API, and ModelViewSet updates must all reject with 400.
        """
        apt = Appointment.objects.create(
            patient=self.patient1,
            doctor=self.doc_gen1,
            appointment_date=date.today(),
            appointment_time=time(10, 0),
            reason_for_visit="Consultation",
            status=AppointmentStatus.COMPLETED
        )
        query = MedicalQuery.objects.create(
            appointment=apt,
            patient=self.patient1,
            doctor=self.doc_gen1,
            category=MedicalQueryCategory.TREATMENT_CLARIFICATION,
            severity=QuerySeverity.MILD,
            started_at="Today",
            description="Is it okay to take with juice?",
            doctor_response="Yes, perfectly fine.",
            status=MedicalQueryStatus.RESOLVED,
            resolved_at=timezone.now()
        )

        # 1. Doctor attempts to respond again to a resolved query
        self.client.force_authenticate(user=self.u_doc1)
        res1 = self.client.post(f"/api/medical-queries/{query.id}/respond/", {
            "doctor_response": "Updated response",
            "mark_resolved": True
        }, format="json")
        self.assertEqual(res1.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("Resolved medical queries are finalized and cannot be modified", res1.data["error"])

        # 2. Doctor attempts to update status of resolved query
        res2 = self.client.patch(f"/api/medical-queries/{query.id}/status/", {
            "status": "UNDER_REVIEW"
        }, format="json")
        self.assertEqual(res2.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("Resolved medical queries are finalized and cannot be modified", res2.data["error"])

        # 3. Direct PATCH attempt
        res3 = self.client.patch(f"/api/medical-queries/{query.id}/", {
            "description": "Tampered description"
        }, format="json")
        self.assertEqual(res3.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("Resolved medical queries are finalized and cannot be modified", res3.data["error"])

    def test_sync_verified_patients_and_walkin_isolation(self):
        """
        Requirement 2: Verified registered users are synced into Patient records,
        while walk-in customer records (CF-WALKIN) remain strictly isolated and excluded.
        """
        from patients.services import sync_verified_registered_patients

        # Create a verified patient user without a Patient row
        test_patient_user = User.objects.create_user(
            username="unlinked_verified",
            email="unlinked_verified@example.com",
            password="Password@123",
            first_name="Verified",
            last_name="User"
        )
        prof, _ = UserProfile.objects.get_or_create(user=test_patient_user)
        prof.role = UserRole.PATIENT
        prof.is_email_verified = True
        prof.phone_number = "555-123456"
        prof.save()

        # Ensure no Patient record exists yet
        self.assertFalse(Patient.objects.filter(user=test_patient_user).exists())

        # Create or ensure CF-WALKIN placeholder exists
        walkin_patient, _ = Patient.objects.get_or_create(
            patient_id="CF-WALKIN",
            defaults={
                "first_name": "Walk-in",
                "last_name": "Customer",
                "phone_number": "0000000000"
            }
        )

        # Run safe synchronization
        sync_verified_registered_patients()

        # Verify Patient record was cleanly created
        new_pat = Patient.objects.filter(user=test_patient_user).first()
        self.assertIsNotNone(new_pat)
        self.assertEqual(new_pat.first_name, "Verified")
        self.assertEqual(new_pat.last_name, "User")
        self.assertEqual(new_pat.email, "unlinked_verified@example.com")
        self.assertEqual(new_pat.phone_number, "555-123456")
        self.assertTrue(new_pat.patient_id.startswith("CF-P-"))

        # Verify walk-in customer remains unlinked
        walkin_patient.refresh_from_db()
        self.assertIsNone(walkin_patient.user)
        self.assertEqual(walkin_patient.patient_id, "CF-WALKIN")

        # Verify PatientViewSet queryset excludes walk-in for Receptionist
        u_rec = User.objects.create_user(username="rec_tester", email="rec_test@careflow.com", password="Password@123")
        UserProfile.objects.filter(user=u_rec).update(role=UserRole.RECEPTIONIST)
        self.client.force_authenticate(user=u_rec)
        list_res = self.client.get("/api/patients/")
        self.assertEqual(list_res.status_code, status.HTTP_200_OK)
        pat_list = list_res.data if isinstance(list_res.data, list) else list_res.data.get("results", [])
        returned_pids = [p["patient_id"] for p in pat_list]
        self.assertNotIn("CF-WALKIN", returned_pids)
        self.assertIn(new_pat.patient_id, returned_pids)



