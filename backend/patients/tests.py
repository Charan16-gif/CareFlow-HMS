from django.test import TestCase
from django.contrib.auth.models import User
from rest_framework.test import APIClient
from rest_framework import status
from accounts.models import UserProfile, UserRole
from .models import Patient


class PatientModuleTests(TestCase):
    def setUp(self):
        self.client = APIClient()

        # Receptionist user
        self.receptionist_user = User.objects.create_user(
            username="receptionist_mary",
            email="mary@careflow.com",
            password="Password@123"
        )
        self.rec_profile, _ = UserProfile.objects.get_or_create(user=self.receptionist_user)
        self.rec_profile.role = UserRole.RECEPTIONIST
        self.rec_profile.save()

        # Admin user
        self.admin_user = User.objects.create_superuser(
            username="admin_boss",
            email="boss@careflow.com",
            password="Password@123"
        )
        self.admin_profile, _ = UserProfile.objects.get_or_create(user=self.admin_user)
        self.admin_profile.role = UserRole.ADMIN
        self.admin_profile.save()

        # Patient 1
        self.patient1_user = User.objects.create_user(
            username="patient_arthur",
            email="arthur@careflow.com",
            password="Password@123"
        )
        self.p1_prof, _ = UserProfile.objects.get_or_create(user=self.patient1_user)
        self.p1_prof.role = UserRole.PATIENT
        self.p1_prof.save()
        self.patient1 = Patient.objects.create(
            user=self.patient1_user,
            first_name="Arthur",
            last_name="Dent",
            phone_number="555-4242",
            gender="MALE",
            blood_group="O+",
            medical_history="Mild asthma",
            allergies="Penicillin"
        )

        # Patient 2
        self.patient2_user = User.objects.create_user(
            username="patient_ford",
            email="ford@careflow.com",
            password="Password@123"
        )
        self.p2_prof, _ = UserProfile.objects.get_or_create(user=self.patient2_user)
        self.p2_prof.role = UserRole.PATIENT
        self.p2_prof.save()
        self.patient2 = Patient.objects.create(
            user=self.patient2_user,
            first_name="Ford",
            last_name="Prefect",
            phone_number="555-1234",
            gender="MALE",
            blood_group="AB+"
        )

    def test_patient_model_creation_and_auto_id(self):
        self.assertTrue(self.patient1.patient_id.startswith("CF-P-"))
        self.assertEqual(self.patient1.full_name, "Arthur Dent")
        self.assertEqual(str(self.patient1), f"{self.patient1.patient_id} - Arthur Dent")

    def test_receptionist_can_register_patient(self):
        self.client.force_authenticate(user=self.receptionist_user)
        payload = {
            "first_name": "Tricia",
            "last_name": "McMillan",
            "phone_number": "555-7890",
            "gender": "FEMALE",
            "blood_group": "A+",
            "medical_history": "None",
            "allergies": "None",
        }
        res = self.client.post("/api/patients/", payload, format="json")
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertTrue(res.data["patient_id"].startswith("CF-P-"))

    def test_admin_can_register_patient(self):
        self.client.force_authenticate(user=self.admin_user)
        payload = {
            "first_name": "Trillian",
            "last_name": "Astra",
            "phone_number": "555-9999",
            "gender": "FEMALE",
            "blood_group": "A+",
        }
        res = self.client.post("/api/patients/", payload, format="json")
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertTrue(res.data["patient_id"].startswith("CF-P-"))

    def test_patient_data_isolation(self):
        # Authenticate as patient 1
        self.client.force_authenticate(user=self.patient1_user)

        # Patient 1 can retrieve their own profile
        own_res = self.client.get(f"/api/patients/{self.patient1.id}/")
        self.assertEqual(own_res.status_code, status.HTTP_200_OK)
        self.assertEqual(own_res.data["patient_id"], self.patient1.patient_id)

        # Patient 1 cannot retrieve patient 2's profile (returns 404 due to filtered queryset)
        other_res = self.client.get(f"/api/patients/{self.patient2.id}/")
        self.assertEqual(other_res.status_code, status.HTTP_404_NOT_FOUND)

        # List returns only patient 1
        list_res = self.client.get("/api/patients/")
        self.assertEqual(list_res.status_code, status.HTTP_200_OK)
        results = list_res.data.get("results", list_res.data)
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]["id"], self.patient1.id)

    def test_patient_cannot_modify_clinical_history(self):
        self.client.force_authenticate(user=self.patient1_user)
        # Attempt to overwrite medical history
        res = self.client.patch(f"/api/patients/{self.patient1.id}/", {
            "medical_history": "Falsified medical records",
            "allergies": "No allergies"
        }, format="json")
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)
        self.assertIn("Patients cannot modify clinical records", str(res.data))

    def test_patient_cannot_delete_record(self):
        self.client.force_authenticate(user=self.patient1_user)
        res = self.client.delete(f"/api/patients/{self.patient1.id}/")
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)
