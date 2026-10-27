from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone


class Gender(models.TextChoices):
    MALE = "MALE", "Male"
    FEMALE = "FEMALE", "Female"
    OTHER = "OTHER", "Other"


class BloodGroup(models.TextChoices):
    A_POSITIVE = "A+", "A+"
    A_NEGATIVE = "A-", "A-"
    B_POSITIVE = "B+", "B+"
    B_NEGATIVE = "B-", "B-"
    AB_POSITIVE = "AB+", "AB+"
    AB_NEGATIVE = "AB-", "AB-"
    O_POSITIVE = "O+", "O+"
    O_NEGATIVE = "O-", "O-"


class Patient(models.Model):
    """
    CareFlow HMS Patient Record.
    Holds clinical demographics, emergency contact info, and medical history.
    Can be linked 1:1 with an authenticated portal User.
    """
    user = models.OneToOneField(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="patient_profile"
    )
    patient_id = models.CharField(
        max_length=20,
        unique=True,
        db_index=True,
        help_text="Unique Patient Healthcare Identifier (e.g., CF-P-10001)"
    )
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    date_of_birth = models.DateField(null=True, blank=True)
    gender = models.CharField(max_length=10, choices=Gender.choices, default=Gender.MALE)
    blood_group = models.CharField(max_length=5, choices=BloodGroup.choices, blank=True, null=True)
    phone_number = models.CharField(max_length=25, db_index=True)
    email = models.EmailField(blank=True, null=True)
    address = models.TextField(blank=True, null=True)
    emergency_contact_name = models.CharField(max_length=150, blank=True, null=True)
    emergency_contact_phone = models.CharField(max_length=25, blank=True, null=True)
    emergency_contact_relation = models.CharField(max_length=50, blank=True, null=True)
    medical_history = models.TextField(blank=True, null=True, help_text="Chronic conditions, past surgeries, etc.")
    allergies = models.TextField(blank=True, null=True, help_text="Known drug, food, or environmental allergies.")
    registration_date = models.DateField(default=timezone.localdate)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["last_name", "first_name"]),
            models.Index(fields=["phone_number"]),
            models.Index(fields=["patient_id"]),
            models.Index(fields=["registration_date"]),
        ]

    @property
    def full_name(self):
        return f"{self.first_name} {self.last_name}".strip()

    def __str__(self):
        return f"{self.patient_id} - {self.full_name}"

    def save(self, *args, **kwargs):
        if not self.patient_id:
            # Auto-generate next patient_id
            last_patient = Patient.objects.order_by("-id").first()
            next_num = (last_patient.id + 10001) if last_patient else 10001
            self.patient_id = f"CF-P-{next_num}"
        super().save(*args, **kwargs)
