from django.db import models
from django.contrib.auth.models import User
from django.core.exceptions import ValidationError
from django.core.validators import MinValueValidator, MaxValueValidator
from django.utils import timezone


class AppointmentStatus(models.TextChoices):
    SCHEDULED = "SCHEDULED", "Scheduled"
    CONFIRMED = "CONFIRMED", "Confirmed"
    IN_PROGRESS = "IN_PROGRESS", "In Progress"
    COMPLETED = "COMPLETED", "Completed"
    CANCELLED = "CANCELLED", "Cancelled"
    NO_SHOW = "NO_SHOW", "No Show"
    CHECKED_OUT = "CHECKED_OUT", "Checked Out"


class ConsultationExperience(models.TextChoices):
    EXCELLENT = "EXCELLENT", "Excellent"
    GOOD = "GOOD", "Good"
    AVERAGE = "AVERAGE", "Average"
    POOR = "POOR", "Poor"


class DoctorCommunication(models.TextChoices):
    EXCELLENT = "EXCELLENT", "Excellent"
    GOOD = "GOOD", "Good"
    POOR = "POOR", "Poor"


class OverallSatisfaction(models.TextChoices):
    SATISFIED = "SATISFIED", "Satisfied"
    NEUTRAL = "NEUTRAL", "Neutral"
    UNSATISFIED = "UNSATISFIED", "Unsatisfied"


class MedicalQueryCategory(models.TextChoices):
    TREATMENT_NOT_IMPROVING = "TREATMENT_NOT_IMPROVING", "Treatment Not Improving"
    MEDICINE_SIDE_EFFECTS = "MEDICINE_SIDE_EFFECTS", "Medicine Side Effects"
    QUESTION_ABOUT_PRESCRIBED_MEDICINE = "QUESTION_ABOUT_PRESCRIBED_MEDICINE", "Question About Prescribed Medicine"
    TREATMENT_CLARIFICATION = "TREATMENT_CLARIFICATION", "Treatment Clarification"
    OTHER_MEDICAL_CONCERN = "OTHER_MEDICAL_CONCERN", "Other Medical Concern"


class QuerySeverity(models.TextChoices):
    MILD = "MILD", "Mild"
    MODERATE = "MODERATE", "Moderate"
    SEVERE = "SEVERE", "Severe"


class MedicalQueryStatus(models.TextChoices):
    PENDING_REVIEW = "PENDING_REVIEW", "Pending Review"
    UNDER_REVIEW = "UNDER_REVIEW", "Under Review"
    RESPONSE_SENT = "RESPONSE_SENT", "Response Sent"
    FOLLOW_UP_REQUIRED = "FOLLOW_UP_REQUIRED", "Follow-up Required"
    RESOLVED = "RESOLVED", "Resolved"


class Appointment(models.Model):
    """
    CareFlow HMS Patient-Doctor Appointment.
    Encapsulates scheduling details, clinical consultation notes, and status lifecycle.
    Supports centralized automatic doctor assignment based on patient-selected health problem.
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
    health_problem = models.CharField(
        max_length=100,
        blank=True,
        default="General Health Checkup",
        db_index=True,
        help_text="Patient-selected primary health complaint for automatic doctor routing."
    )
    problem_description = models.TextField(
        blank=True,
        default="",
        help_text="Patient's detailed symptom explanation or consultation notes."
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
            models.Index(fields=["health_problem"]),
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
        # Keep reason_for_visit in sync with health problem description if not explicitly set
        if not self.reason_for_visit or self.reason_for_visit == "General Consultation":
            if self.health_problem and self.problem_description:
                self.reason_for_visit = f"{self.health_problem}: {self.problem_description}"
            elif self.health_problem:
                self.reason_for_visit = self.health_problem
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.appointment_id} | {self.patient.full_name} with {self.doctor.full_name} on {self.appointment_date} {self.appointment_time}"


class PatientFeedback(models.Model):
    """
    CareFlow HMS Patient Feedback Record.
    Captures patient satisfaction and doctor ratings strictly for completed consultations.
    Prevents duplicate submissions per consultation and preserves historical records.
    """
    appointment = models.OneToOneField(
        Appointment,
        on_delete=models.CASCADE,
        related_name="feedback",
        help_text="Completed appointment consultation evaluated by the patient."
    )
    patient = models.ForeignKey(
        "patients.Patient",
        on_delete=models.PROTECT,
        related_name="feedbacks"
    )
    doctor = models.ForeignKey(
        "staff.Doctor",
        on_delete=models.PROTECT,
        related_name="feedbacks"
    )
    doctor_rating = models.IntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(5)],
        help_text="Doctor consultation rating from 1 to 5 stars."
    )
    consultation_experience = models.CharField(
        max_length=20,
        choices=ConsultationExperience.choices,
        help_text="Patient's experience rating for the clinical session."
    )
    doctor_communication = models.CharField(
        max_length=20,
        choices=DoctorCommunication.choices,
        help_text="Assessment of doctor's clarity and listening skills."
    )
    overall_satisfaction = models.CharField(
        max_length=20,
        choices=OverallSatisfaction.choices,
        help_text="Overall hospital consultation satisfaction."
    )
    comments = models.TextField(
        blank=True,
        default="",
        help_text="Optional written remarks and constructive feedback from the patient."
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["doctor", "created_at"]),
            models.Index(fields=["patient", "created_at"]),
            models.Index(fields=["doctor_rating"]),
            models.Index(fields=["overall_satisfaction"]),
        ]

    def clean(self):
        super().clean()
        if self.appointment_id:
            valid_statuses = [AppointmentStatus.COMPLETED, getattr(AppointmentStatus, "CHECKED_OUT", "CHECKED_OUT")]
            if self.appointment.status not in valid_statuses:
                raise ValidationError("Feedback can only be submitted for completed consultations.")
            if self.appointment.patient_id != self.patient_id:
                raise ValidationError("Only the patient associated with the consultation may submit feedback.")
            if self.appointment.doctor_id != self.doctor_id:
                raise ValidationError("Feedback must correspond to the consulting practitioner.")

    def save(self, *args, **kwargs):
        self.clean()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"Feedback for {self.appointment.appointment_id} - Rating {self.doctor_rating}/5"


class MedicalQuery(models.Model):
    """
    CareFlow HMS Patient-to-Doctor Medical Query (Contact Doctor).
    Allows patients to contact their treating physician regarding treatment response,
    potential medicine side-effects, prescription clarifications, or post-consultation concerns.
    """
    query_id = models.CharField(
        max_length=20,
        unique=True,
        db_index=True,
        help_text="Unique Query Code (e.g. CF-MQ-10001)"
    )
    appointment = models.ForeignKey(
        Appointment,
        on_delete=models.PROTECT,
        related_name="medical_queries",
        help_text="Relevant consultation for which the patient is requesting follow-up guidance."
    )
    patient = models.ForeignKey(
        "patients.Patient",
        on_delete=models.PROTECT,
        related_name="medical_queries"
    )
    doctor = models.ForeignKey(
        "staff.Doctor",
        on_delete=models.PROTECT,
        related_name="medical_queries",
        help_text="Treating or prescribing physician responsible for clinical evaluation."
    )
    prescription = models.ForeignKey(
        "pharmacy.Prescription",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="medical_queries",
        help_text="Associated prescription if the query pertains to prescribed medicines."
    )
    medicine = models.ForeignKey(
        "pharmacy.Medicine",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="medical_queries",
        help_text="Specific pharmaceutical product under query."
    )
    medicine_name = models.CharField(
        max_length=200,
        blank=True,
        default="",
        help_text="Medicine name or label identified by patient."
    )
    category = models.CharField(
        max_length=60,
        choices=MedicalQueryCategory.choices,
        help_text="Clinical category of medical query."
    )
    description = models.TextField(
        help_text="Patient's detailed narrative describing symptoms, concerns, or side-effects."
    )
    started_at = models.CharField(
        max_length=150,
        help_text="Onset timeline (e.g. 'Since yesterday', '2 days ago', or specific date)."
    )
    severity = models.CharField(
        max_length=20,
        choices=QuerySeverity.choices,
        help_text="Patient-reported symptom severity (Mild / Moderate / Severe)."
    )
    status = models.CharField(
        max_length=30,
        choices=MedicalQueryStatus.choices,
        default=MedicalQueryStatus.PENDING_REVIEW,
        db_index=True
    )
    doctor_response = models.TextField(
        blank=True,
        default="",
        help_text="Doctor's authoritative written clinical response."
    )
    responded_at = models.DateTimeField(null=True, blank=True)
    recommend_follow_up = models.BooleanField(
        default=False,
        help_text="Flag indicating doctor advises scheduling a physical follow-up appointment."
    )
    recommend_lab_tests = models.BooleanField(
        default=False,
        help_text="Flag indicating doctor advises diagnostic laboratory investigations."
    )
    lab_test_recommendations = models.TextField(
        blank=True,
        default="",
        help_text="Specific diagnostic lab tests recommended by doctor."
    )
    reviewed_at = models.DateTimeField(null=True, blank=True)
    resolved_at = models.DateTimeField(null=True, blank=True)
    follow_up_appointment = models.ForeignKey(
        Appointment,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="originating_medical_queries",
        help_text="Linked follow-up appointment booked subsequently."
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["patient", "created_at"]),
            models.Index(fields=["doctor", "status"]),
            models.Index(fields=["status", "created_at"]),
            models.Index(fields=["category"]),
        ]

    def save(self, *args, **kwargs):
        if not self.query_id:
            last_q = MedicalQuery.objects.order_by("-id").first()
            next_num = (last_q.id + 10001) if last_q else 10001
            self.query_id = f"CF-MQ-{next_num}"
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.query_id} ({self.get_category_display()}) - {self.patient.full_name} to {self.doctor.full_name}"
