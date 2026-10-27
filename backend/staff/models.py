from django.db import models
from django.contrib.auth.models import User
from accounts.models import UserRole


class DoctorStatus(models.TextChoices):
    ACTIVE = "ACTIVE", "Active"
    ON_LEAVE = "ON_LEAVE", "On Leave"
    INACTIVE = "INACTIVE", "Inactive"


class StaffStatus(models.TextChoices):
    ACTIVE = "ACTIVE", "Active"
    INACTIVE = "INACTIVE", "Inactive"


class Doctor(models.Model):
    """
    CareFlow HMS Doctor Record.
    Linked 1:1 with an authenticated Doctor User account.
    """
    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name="doctor_profile"
    )
    doctor_id = models.CharField(
        max_length=20,
        unique=True,
        db_index=True,
        help_text="Unique Doctor Identifier (e.g., CF-DOC-101)"
    )
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    specialization = models.CharField(max_length=100, db_index=True)
    qualification = models.CharField(max_length=150, help_text="e.g. MBBS, MD (Cardiology)")
    license_number = models.CharField(max_length=50, unique=True)
    department = models.CharField(max_length=100, default="General Medicine")
    phone_number = models.CharField(max_length=25)
    email = models.EmailField()
    consultation_fee = models.DecimalField(max_digits=10, decimal_places=2, default=500.00)
    available_days = models.CharField(
        max_length=120,
        default="Monday,Tuesday,Wednesday,Thursday,Friday"
    )
    start_time = models.TimeField(default="09:00:00")
    end_time = models.TimeField(default="17:00:00")
    status = models.CharField(
        max_length=20,
        choices=DoctorStatus.choices,
        default=DoctorStatus.ACTIVE,
        db_index=True
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["last_name", "first_name"]
        indexes = [
            models.Index(fields=["specialization", "status"]),
            models.Index(fields=["department"]),
        ]

    @property
    def full_name(self):
        return f"Dr. {self.first_name} {self.last_name}".strip()

    def __str__(self):
        return f"{self.doctor_id} - {self.full_name} ({self.specialization})"

    def save(self, *args, **kwargs):
        if not self.doctor_id:
            last_doc = Doctor.objects.order_by("-id").first()
            next_num = (last_doc.id + 101) if last_doc else 101
            self.doctor_id = f"CF-DOC-{next_num}"
        # Ensure underlying user profile has role DOCTOR
        from accounts.models import UserProfile
        profile, _ = UserProfile.objects.get_or_create(user=self.user)
        if profile.role != UserRole.DOCTOR:
            profile.role = UserRole.DOCTOR
            profile.save(update_fields=["role"])
        super().save(*args, **kwargs)


class StaffProfile(models.Model):
    """
    CareFlow HMS Staff Record for Receptionists, Laboratory Staff, and Pharmacists.
    """
    ROLE_CHOICES = (
        (UserRole.RECEPTIONIST, "Receptionist"),
        (UserRole.LAB_STAFF, "Laboratory Staff"),
        (UserRole.PHARMACIST, "Pharmacist"),
    )

    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name="staff_profile"
    )
    staff_id = models.CharField(
        max_length=20,
        unique=True,
        db_index=True,
        help_text="Unique Staff Identifier (e.g., CF-STF-101)"
    )
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, db_index=True)
    department = models.CharField(max_length=100)
    qualification = models.CharField(max_length=150, blank=True, null=True)
    phone_number = models.CharField(max_length=25)
    email = models.EmailField()
    status = models.CharField(
        max_length=20,
        choices=StaffStatus.choices,
        default=StaffStatus.ACTIVE,
        db_index=True
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["last_name", "first_name"]
        indexes = [
            models.Index(fields=["role", "status"]),
        ]

    @property
    def full_name(self):
        return f"{self.first_name} {self.last_name}".strip()

    def __str__(self):
        return f"{self.staff_id} - {self.full_name} [{self.get_role_display()}]"

    def save(self, *args, **kwargs):
        if not self.staff_id:
            last_staff = StaffProfile.objects.order_by("-id").first()
            next_num = (last_staff.id + 101) if last_staff else 101
            self.staff_id = f"CF-STF-{next_num}"
        # Sync role with UserProfile
        from accounts.models import UserProfile
        profile, _ = UserProfile.objects.get_or_create(user=self.user)
        if profile.role != self.role:
            profile.role = self.role
            profile.save(update_fields=["role"])
        super().save(*args, **kwargs)
