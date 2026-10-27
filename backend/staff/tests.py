from django.test import TestCase
from django.contrib.auth.models import User
from rest_framework.test import APIClient
from rest_framework import status
from accounts.models import UserProfile, UserRole
from .models import Doctor, StaffProfile


class StaffModuleTests(TestCase):
    def setUp(self):
        self.client = APIClient()

        # Admin
        self.admin_user = User.objects.create_superuser(
            username="admin_sys",
            email="admin_sys@careflow.com",
            password="Password@123"
        )
        self.admin_profile, _ = UserProfile.objects.get_or_create(user=self.admin_user)
        self.admin_profile.role = UserRole.ADMIN
        self.admin_profile.save()

        # Receptionist
        self.rec_user = User.objects.create_user(
            username="rec_staff",
            email="rec_staff@careflow.com",
            password="Password@123"
        )
        self.rec_profile, _ = UserProfile.objects.get_or_create(user=self.rec_user)
        self.rec_profile.role = UserRole.RECEPTIONIST
        self.rec_profile.save()

        # Doctor
        self.doc_user = User.objects.create_user(
            username="dr_house",
            email="house@careflow.com",
            password="Password@123"
        )
        self.doc_profile, _ = UserProfile.objects.get_or_create(user=self.doc_user)
        self.doc_profile.role = UserRole.DOCTOR
        self.doc_profile.save()

    def test_doctor_creation_and_auto_id(self):
        doctor = Doctor.objects.create(
            user=self.doc_user,
            first_name="Gregory",
            last_name="House",
            specialization="Diagnostics & Nephrology",
            qualification="MD",
            license_number="LIC-12345",
            department="Diagnostics",
            phone_number="555-7890",
            email="house@careflow.com",
            consultation_fee=1000.00
        )
        self.assertTrue(doctor.doctor_id.startswith("CF-DOC-"))
        self.assertEqual(doctor.full_name, "Dr. Gregory House")
        self.doc_user.refresh_from_db()
        self.assertEqual(self.doc_user.profile.role, UserRole.DOCTOR)

    def test_cannot_create_admin_through_staff_crud(self):
        self.client.force_authenticate(user=self.admin_user)
        user_new = User.objects.create_user(username="intruder", email="intruder@careflow.com", password="Password@123")
        payload = {
            "user": user_new.id,
            "first_name": "Fake",
            "last_name": "Admin",
            "role": "ADMIN",
            "department": "Administration",
            "phone_number": "555-0000",
            "email": "intruder@careflow.com"
        }
        res = self.client.post("/api/staff/profiles/", payload, format="json")
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("Creating additional Administrator accounts is strictly prohibited", str(res.data))

    def test_doctor_cannot_manage_staff_profiles(self):
        self.client.force_authenticate(user=self.doc_user)
        target_user = User.objects.create_user(username="worker", email="worker@careflow.com", password="Password@123")
        payload = {
            "user": target_user.id,
            "first_name": "John",
            "last_name": "Staff",
            "role": "RECEPTIONIST",
            "department": "Reception",
            "phone_number": "555-1122",
            "email": "worker@careflow.com"
        }
        res = self.client.post("/api/staff/profiles/", payload, format="json")
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_can_create_doctor_with_atomic_user(self):
        self.client.force_authenticate(user=self.admin_user)
        payload = {
            "username": "dr_new_doc",
            "password": "Password@123",
            "first_name": "Allison",
            "last_name": "Cameron",
            "email": "cameron@careflow.com",
            "specialization": "Immunology",
            "qualification": "MD",
            "license_number": "LIC-CAMERON-01",
            "department": "Immunology",
            "phone_number": "555-4321",
            "consultation_fee": "800.00"
        }
        res = self.client.post("/api/staff/doctors/", payload, format="json")
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertTrue(res.data["doctor_id"].startswith("CF-DOC-"))
        created_user = User.objects.get(username="dr_new_doc")
        self.assertEqual(created_user.profile.role, UserRole.DOCTOR)

    def test_admin_can_create_staff_with_atomic_user(self):
        self.client.force_authenticate(user=self.admin_user)
        payload = {
            "username": "lab_tech_sarah",
            "password": "Password@123",
            "first_name": "Sarah",
            "last_name": "Connor",
            "email": "sarah@careflow.com",
            "role": "LAB_STAFF",
            "department": "Hematology Lab",
            "qualification": "B.Sc Medical Laboratory",
            "phone_number": "555-9876"
        }
        res = self.client.post("/api/staff/profiles/", payload, format="json")
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertTrue(res.data["staff_id"].startswith("CF-STF-"))
        created_user = User.objects.get(username="lab_tech_sarah")
        self.assertEqual(created_user.profile.role, UserRole.LAB_STAFF)

