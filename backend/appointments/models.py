from django.db import models
from django.contrib.auth.models import User
from django.core.exceptions import ValidationError
from django.utils import timezone


class AppointmentStatus(models.TextChoices):
    SCHEDULED = "SCHEDULED", "Scheduled"
    CONFIRMED = "CONFIRMED", "Confirmed"
    IN_PROGRESS = "IN_PROGRESS", "In Progress"
    COMPLETED = "COMPLETED", "Completed"
    CANCELLED = "CANCELLED", "Cancelled"
    NO_SHOW = "NO_SHOW", "No Show"
    CHECKED_OUT = "CHECKED_OUT", "Checked Out"


class Appointment(models.Model):
    """
    CareFlow HMS Patient-Doctor Appointment.
    Encapsulates scheduling details, clinical consultation notes, and status lifecycle.
    """
    appointment_id = models.CharField(
        max_length=20,
        unique=True,
        db_index=True,
        help_text="Unique Appointment Identifier (e.g., CF-APT-10001)"
    )
    patient = models.ForeignKey(
        "patients.Patient",
        on_delete=models.PROTECT,
        related_name="appointments"
    )
    doctor = models.ForeignKey(
        "staff.Doctor",
        on_delete=models.PROTECT,
        related_name="appointments"
    )
    appointment_date = models.DateField(db_index=True)
    appointment_time = models.TimeField()
    status = models.CharField(
        max_length=20,
        choices=AppointmentStatus.choices,
        default=AppointmentStatus.SCHEDULED,
        db_index=True
    )
    reason_for_visit = models.TextField(help_text="Primary complaint or purpose of consultation.")
    authorized_notes = models.TextField(
        blank=True,
        null=True,
        help_text="Clinical consultation notes recorded by authorized medical personnel."
    )
    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="created_appointments"
    )
    is_checked_in = models.BooleanField(
        default=False,
        db_index=True,
        help_text="Designates whether the patient has arrived and checked in at the front desk."
    )
    check_in_time = models.DateTimeField(
        blank=True,
        null=True,
        help_text="Timestamp when the patient was checked in by the receptionist."
    )
    check_out_time = models.DateTimeField(
        blank=True,
        null=True,
        help_text="Timestamp when the patient was checked out following consultation completion."
    )
    cancellation_reason = models.TextField(
        blank=True,
        null=True,
        help_text="Reason recorded upon cancellation of the appointment."
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["appointment_date", "appointment_time"]
        constraints = [
            models.UniqueConstraint(
                fields=["doctor", "appointment_date", "appointment_time"],
                condition=~models.Q(status="CANCELLED"),
                name="unique_doctor_active_appointment_slot"
            )
        ]
        indexes = [
            models.Index(fields=["appointment_date", "status"]),
            models.Index(fields=["patient", "appointment_date"]),
            models.Index(fields=["doctor", "appointment_date"]),
            models.Index(fields=["appointment_date", "is_checked_in"]),
        ]

    def clean(self):
        super().clean()
        # Prevent duplicate slot for the same doctor unless cancelled
        if self.doctor_id and self.appointment_date and self.appointment_time:
            conflicts = Appointment.objects.filter(
                doctor_id=self.doctor_id,
                appointment_date=self.appointment_date,
                appointment_time=self.appointment_time
            ).exclude(status=AppointmentStatus.CANCELLED)
            if self.pk:
                conflicts = conflicts.exclude(pk=self.pk)
            if conflicts.exists():
                raise ValidationError("The selected doctor already has an active appointment in this time slot.")

    def save(self, *args, **kwargs):
        self.clean()
        if not self.appointment_id:
            last_apt = Appointment.objects.order_by("-id").first()
            next_num = (last_apt.id + 10001) if last_apt else 10001
            self.appointment_id = f"CF-APT-{next_num}"
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.appointment_id} | {self.patient.full_name} with {self.doctor.full_name} on {self.appointment_date} {self.appointment_time}"
