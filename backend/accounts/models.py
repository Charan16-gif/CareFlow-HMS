import secrets
from datetime import timedelta
from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.core.exceptions import ValidationError


class UserRole(models.TextChoices):
    ADMIN = "ADMIN", "Administrator"
    DOCTOR = "DOCTOR", "Doctor"
    RECEPTIONIST = "RECEPTIONIST", "Receptionist"
    LAB_STAFF = "LAB_STAFF", "Laboratory Staff"
    PHARMACIST = "PHARMACIST", "Pharmacist"
    PATIENT = "PATIENT", "Patient"


class UserProfile(models.Model):
    """
    Profile extension for the default Django User model.
    Stores healthcare role, phone number, and verification status.
    Strictly enforces the CareFlow single-admin constraint.
    """
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="profile")
    role = models.CharField(
        max_length=20,
        choices=UserRole.choices,
        default=UserRole.PATIENT,
        db_index=True
    )
    phone_number = models.CharField(max_length=25, blank=True, null=True)
    is_email_verified = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "User Profile"
        verbose_name_plural = "User Profiles"

    def clean(self):
        super().clean()
        if self.role == UserRole.ADMIN:
            existing_admin = UserProfile.objects.filter(role=UserRole.ADMIN).exclude(pk=self.pk).first()
            if existing_admin:
                raise ValidationError("Only one administrator account is allowed in CareFlow HMS.")

    def save(self, *args, **kwargs):
        self.clean()
        super().save(*args, **kwargs)

    @property
    def is_admin(self):
        return self.role == UserRole.ADMIN or self.user.is_superuser

    @property
    def is_doctor(self):
        return self.role == UserRole.DOCTOR

    @property
    def is_receptionist(self):
        return self.role == UserRole.RECEPTIONIST

    @property
    def is_lab_staff(self):
        return self.role == UserRole.LAB_STAFF

    @property
    def is_pharmacist(self):
        return self.role == UserRole.PHARMACIST

    @property
    def is_patient(self):
        return self.role == UserRole.PATIENT

    def __str__(self):
        return f"{self.user.username} [{self.get_role_display()}] ({'Verified' if self.is_email_verified else 'Unverified'})"


from django.contrib.auth.hashers import make_password, check_password


class EmailOTPVerification(models.Model):
    """
    Stores cryptographically hashed 6-digit OTP codes for email verification, registration, and recovery.
    Includes rate-limiting attempt counters and expiration timestamps.
    Raw OTP codes are NEVER stored in plain text.
    """
    PURPOSE_CHOICES = (
        ("registration", "Account Registration"),
        ("login", "Two-Factor Login"),
        ("password_reset", "Password Reset"),
    )

    DELIVERY_STATUS_CHOICES = (
        ("PENDING", "Pending"),
        ("ACCEPTED", "Accepted by SMTP"),
        ("DELIVERED", "Delivered"),
        ("FAILED", "Delivery Failed"),
        ("VERIFIED", "Verified by User"),
    )

    email = models.EmailField(db_index=True)
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="otp_verifications"
    )
    otp_code = models.CharField(
        max_length=255,
        help_text="Cryptographically hashed OTP code (never plain text)"
    )
    purpose = models.CharField(max_length=30, choices=PURPOSE_CHOICES, default="registration")
    attempts = models.PositiveIntegerField(default=0)
    is_verified = models.BooleanField(default=False)
    delivery_status = models.CharField(
        max_length=20,
        choices=DELIVERY_STATUS_CHOICES,
        default="PENDING",
        db_index=True,
    )
    delivery_error = models.TextField(blank=True, default="")
    registration_data = models.JSONField(blank=True, null=True, default=dict)
    sent_at = models.DateTimeField(null=True, blank=True)
    verified_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["email", "purpose", "is_verified"]),
        ]

    def __str__(self):
        return f"OTP for {self.email} [{self.purpose}] - {'Verified' if self.is_verified else 'Pending'}"

    @property
    def is_expired(self):
        return timezone.now() > self.expires_at

    def check_otp(self, raw_otp: str) -> bool:
        """
        Securely verify raw 6-digit OTP against the stored cryptographic hash.
        Includes constant-time comparison.
        """
        if not raw_otp or len(str(raw_otp).strip()) != 6:
            return False
        clean_code = str(raw_otp).strip()
        # If stored as Django password hash
        if self.otp_code.startswith("pbkdf2_") or self.otp_code.startswith("argon2") or self.otp_code.startswith("bcrypt"):
            return check_password(clean_code, self.otp_code)
        # Fallback for legacy plain text comparison with constant time check
        return secrets.compare_digest(self.otp_code, clean_code)

    @classmethod
    def generate_otp_code(cls) -> str:
        """
        Generate a cryptographically secure 6-digit OTP string.
        """
        return f"{secrets.randbelow(900000) + 100000:06d}"

    @classmethod
    def create_otp_for_email(
        cls,
        email: str,
        user: User = None,
        purpose: str = "registration",
        validity_minutes: int = 10,
        registration_data: dict = None,
    ):
        """
        Invalidates previous active unverified OTPs for the same email and purpose,
        then creates and returns (fresh_otp_record, plain_code_string).
        Only the cryptographic hash is persisted to the database.
        """
        clean_email = email.strip().lower()
        if registration_data is None:
            prev_otp = cls.objects.filter(
                email=clean_email,
                purpose=purpose,
                is_verified=False
            ).order_by("-created_at").first()
            if prev_otp and prev_otp.registration_data:
                registration_data = prev_otp.registration_data

        cls.objects.filter(
            email=clean_email,
            purpose=purpose,
            is_verified=False
        ).update(expires_at=timezone.now())

        plain_code = cls.generate_otp_code()
        hashed_code = make_password(plain_code)
        expires = timezone.now() + timedelta(minutes=validity_minutes)

        record = cls.objects.create(
            email=clean_email,
            user=user,
            otp_code=hashed_code,
            purpose=purpose,
            expires_at=expires,
            registration_data=registration_data or {},
        )
        return record, plain_code


@receiver(post_save, sender=User)
def create_or_update_user_profile(sender, instance, created, **kwargs):
    """
    Ensure every User instance has an associated UserProfile.
    Assigns ADMIN role automatically if user is a superuser.
    """
    if created:
        role = UserRole.ADMIN if instance.is_superuser else UserRole.PATIENT
        UserProfile.objects.get_or_create(user=instance, defaults={"role": role})


class DatabaseBackupRecord(models.Model):
    """
    CareFlow HMS Database Backup & Audit Ledger.
    Tracks complete PostgreSQL database backups, file integrity checksums,
    retention lifecycles, and audited restoration events.
    """
    BACKUP_STATUS_CHOICES = (
        ("SUCCESS", "Success"),
        ("FAILED", "Failed"),
        ("RESTORED", "Restored"),
    )

    filename = models.CharField(max_length=255, unique=True, db_index=True)
    file_path = models.CharField(max_length=500)
    file_size_bytes = models.BigIntegerField(default=0)
    sha256_checksum = models.CharField(max_length=64, blank=True, null=True)
    status = models.CharField(max_length=20, choices=BACKUP_STATUS_CHOICES, default="SUCCESS", db_index=True)
    is_automated = models.BooleanField(default=False)
    notes = models.TextField(blank=True, null=True)
    error_message = models.TextField(blank=True, null=True)
    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="backups_created"
    )
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    restored_at = models.DateTimeField(null=True, blank=True)
    restored_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="backups_restored"
    )

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "Database Backup Record"
        verbose_name_plural = "Database Backup Records"

    @property
    def file_size_display(self):
        bytes_val = self.file_size_bytes or 0
        if bytes_val >= 1024 * 1024:
            return f"{round(bytes_val / (1024 * 1024), 2)} MB"
        elif bytes_val >= 1024:
            return f"{round(bytes_val / 1024, 2)} KB"
        return f"{bytes_val} B"

    def __str__(self):
        return f"{self.filename} ({self.status}) - {self.created_at}"

