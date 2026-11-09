import logging
from django.db import models
from django.contrib.auth.models import User
from accounts.models import UserRole, UserProfile
from .models import Patient

logger = logging.getLogger(__name__)


def sync_verified_registered_patients():
    """
    Safely synchronizes Patient records for all verified Users with the PATIENT role.
    Ensures:
    1. Every active, email-verified PATIENT user has a corresponding Patient instance.
    2. Links existing unlinked Patient records matching the user's email if available.
    3. Strictly excludes walk-in customers ('CF-WALKIN', 'Walk-in Customer').
    4. Never creates duplicate Patient records for the same user.
    """
    try:
        walkin_q = (
            models.Q(patient_id="CF-WALKIN")
            | models.Q(patient_id__startswith="CF-WALKIN")
            | models.Q(first_name__icontains="Walk-in")
            | models.Q(last_name__icontains="Walk-in")
            | models.Q(first_name__icontains="Walkin")
            | models.Q(last_name__icontains="Walkin")
            | models.Q(last_name__iexact="Customer")
        )

        verified_profiles = (
            UserProfile.objects.select_related("user")
            .filter(
                role=UserRole.PATIENT,
                is_email_verified=True,
                user__is_active=True,
            )
        )

        from accounts.models import EmailOTPVerification

        for profile in verified_profiles:
            user = profile.user
            if not user or not user.email:
                continue

            # Check if user already has an associated Patient profile
            if Patient.objects.filter(user=user).exists():
                continue

            last_otp = (
                EmailOTPVerification.objects.filter(email__iexact=user.email, is_verified=True)
                .order_by("-verified_at", "-created_at")
                .first()
            )
            reg_data = (last_otp.registration_data or {}) if last_otp else {}

            # Look for existing unlinked patient record with same email (strictly excluding walk-ins)
            existing_unlinked = (
                Patient.objects.filter(email__iexact=user.email, user__isnull=True)
                .exclude(walkin_q)
                .first()
            )

            if existing_unlinked:
                existing_unlinked.user = user
                if not existing_unlinked.first_name and user.first_name:
                    existing_unlinked.first_name = user.first_name
                if not existing_unlinked.last_name and user.last_name:
                    existing_unlinked.last_name = user.last_name
                if not existing_unlinked.phone_number and (reg_data.get("phone") or profile.phone_number):
                    existing_unlinked.phone_number = reg_data.get("phone") or profile.phone_number
                if not existing_unlinked.date_of_birth and reg_data.get("date_of_birth"):
                    existing_unlinked.date_of_birth = reg_data.get("date_of_birth")
                if not existing_unlinked.gender and reg_data.get("gender"):
                    existing_unlinked.gender = reg_data.get("gender")
                if not existing_unlinked.blood_group and reg_data.get("blood_group"):
                    existing_unlinked.blood_group = reg_data.get("blood_group")
                if not existing_unlinked.address and reg_data.get("address"):
                    existing_unlinked.address = reg_data.get("address")
                existing_unlinked.save()
                logger.info(f"Linked existing unlinked Patient {existing_unlinked.patient_id} to user {user.username}")
            else:
                phone = reg_data.get("phone") or profile.phone_number or "0000000000"
                # Auto-generate next collision-proof patient_id if needed
                last_patient = Patient.objects.order_by("-id").first()
                candidate_num = (last_patient.id + 10001) if last_patient else 10001
                while Patient.objects.filter(patient_id=f"CF-P-{candidate_num}").exists():
                    candidate_num += 1

                new_patient = Patient.objects.create(
                    user=user,
                    patient_id=f"CF-P-{candidate_num}",
                    first_name=user.first_name or reg_data.get("first_name", "Registered"),
                    last_name=user.last_name or reg_data.get("last_name", "Patient"),
                    email=user.email,
                    phone_number=phone,
                    date_of_birth=reg_data.get("date_of_birth") or None,
                    gender=reg_data.get("gender") or None,
                    blood_group=reg_data.get("blood_group") or None,
                    address=reg_data.get("address") or None,
                    is_active=True,
                )
                logger.info(f"Created new Patient {new_patient.patient_id} for verified user {user.username}")
    except Exception as exc:
        logger.error(f"Error during sync_verified_registered_patients: {exc}")

