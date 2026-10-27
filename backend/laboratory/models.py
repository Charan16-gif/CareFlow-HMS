from django.db import models
from django.contrib.auth.models import User
from django.core.exceptions import ValidationError
from .validators import validate_lab_report_file


class LabCategory(models.TextChoices):
    HEMATOLOGY = "HEMATOLOGY", "Hematology"
    BIOCHEMISTRY = "BIOCHEMISTRY", "Biochemistry"
    MICROBIOLOGY = "MICROBIOLOGY", "Microbiology"
    PATHOLOGY = "PATHOLOGY", "Pathology"
    RADIOLOGY = "RADIOLOGY", "Radiology / Imaging"
    IMMUNOLOGY = "IMMUNOLOGY", "Immunology"
    URINALYSIS = "URINALYSIS", "Urinalysis"
    OTHER = "OTHER", "Other Diagnostic"


class LabOrderStatus(models.TextChoices):
    REQUESTED = "REQUESTED", "Requested"
    ACCEPTED = "ACCEPTED", "Accepted"
    IN_PROGRESS = "IN_PROGRESS", "In Progress"
    COMPLETED = "COMPLETED", "Completed"
    CANCELLED = "CANCELLED", "Cancelled"
    # Aliases for backwards compatibility
    ORDERED = "ORDERED", "Ordered"
    SAMPLE_COLLECTED = "SAMPLE_COLLECTED", "Sample Collected"


class LabTest(models.Model):
    """
    CareFlow HMS Laboratory Test Catalogue.
    Stores test descriptions, reference ranges, standard units, and billing prices.
    """
    test_code = models.CharField(
        max_length=20,
        unique=True,
        db_index=True,
        help_text="Standard Laboratory Diagnostic Code (e.g., LAB-CBC)"
    )
    test_name = models.CharField(max_length=200, db_index=True)
    category = models.CharField(
        max_length=50,
        choices=LabCategory.choices,
        default=LabCategory.HEMATOLOGY,
        db_index=True
    )
    description = models.TextField(blank=True, null=True)
    price = models.DecimalField(max_digits=10, decimal_places=2, help_text="Standard diagnostic test fee")
    reference_range = models.CharField(
        max_length=200,
        blank=True,
        null=True,
        help_text="Normal clinical reference range (e.g., 13.5 - 17.5 g/dL)"
    )
    unit = models.CharField(
        max_length=50,
        blank=True,
        null=True,
        help_text="Measurement unit (e.g., g/dL, mg/dL, mmol/L)"
    )
    turnaround_time = models.CharField(max_length=50, blank=True, null=True, help_text="e.g. 2 Hours, 24 Hours")
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["category", "test_name"]
        constraints = [
            models.CheckConstraint(
                condition=models.Q(price__gte=0),
                name="lab_test_price_non_negative"
            ),
        ]
        indexes = [
            models.Index(fields=["category", "is_active"]),
            models.Index(fields=["test_name"]),
        ]

    def clean(self):
        super().clean()
        if self.price is not None and self.price < 0:
            raise ValidationError("Test fee cannot be negative.")

    def save(self, *args, **kwargs):
        self.clean()
        if not self.test_code:
            last_test = LabTest.objects.order_by("-id").first()
            next_num = (last_test.id + 101) if last_test else 101
            self.test_code = f"LAB-{next_num}"
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.test_code} - {self.test_name} ({self.get_category_display()})"


class LabOrder(models.Model):
    """
    CareFlow HMS Laboratory Test Order.
    Tracks doctor orders, specimen collection, technician assignment, results, and uploaded reports.
    """
    order_id = models.CharField(
        max_length=20,
        unique=True,
        db_index=True,
        help_text="Unique Lab Order Identifier (e.g., CF-LAB-10001)"
    )
    patient = models.ForeignKey(
        "patients.Patient",
        on_delete=models.PROTECT,
        related_name="lab_orders"
    )
    doctor = models.ForeignKey(
        "staff.Doctor",
        on_delete=models.PROTECT,
        related_name="lab_orders"
    )
    appointment = models.ForeignKey(
        "appointments.Appointment",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="lab_orders"
    )
    test = models.ForeignKey(
        LabTest,
        on_delete=models.PROTECT,
        related_name="orders"
    )
    status = models.CharField(
        max_length=25,
        choices=LabOrderStatus.choices,
        default=LabOrderStatus.REQUESTED,
        db_index=True
    )
    clinical_notes = models.TextField(blank=True, null=True, help_text="Physician reason for ordering diagnostic")
    assigned_staff = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="assigned_lab_orders"
    )
    result_value = models.CharField(max_length=255, blank=True, null=True, help_text="Quantitative or qualitative result")
    result_unit = models.CharField(max_length=50, blank=True, null=True, help_text="Result unit of measurement")
    result_interpretation = models.TextField(blank=True, null=True, help_text="Clinical interpretation of findings")
    result_notes = models.TextField(blank=True, null=True, help_text="Technician remarks and clinical interpretation")
    reference_range_used = models.CharField(max_length=200, blank=True, null=True)
    report_file = models.FileField(
        upload_to="lab_reports/%Y/%m/",
        blank=True,
        null=True,
        validators=[validate_lab_report_file]
    )
    # Cancellation request fields
    cancellation_requested = models.BooleanField(
        default=False,
        db_index=True,
        help_text="Physician has requested cancellation"
    )
    cancellation_reason = models.TextField(
        blank=True,
        null=True,
        help_text="Physician's reason for cancellation"
    )
    cancellation_requested_at = models.DateTimeField(
        blank=True,
        null=True,
        help_text="Timestamp of physician cancellation request"
    )
    cancellation_status = models.CharField(
        max_length=25,
        blank=True,
        null=True,
        choices=[
            ("NONE", "None"),
            ("REQUESTED", "Cancellation Requested"),
            ("APPROVED", "Cancellation Approved"),
            ("REJECTED", "Cancellation Rejected"),
        ],
        default="NONE"
    )
    cancellation_remarks = models.TextField(
        blank=True,
        null=True,
        help_text="Laboratory staff processing remarks for cancellation"
    )
    cancellation_processed_at = models.DateTimeField(
        blank=True,
        null=True
    )
    cancelled_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="cancelled_lab_orders"
    )
    ordered_at = models.DateTimeField(auto_now_add=True)
    sample_collected_at = models.DateTimeField(blank=True, null=True)
    completed_at = models.DateTimeField(blank=True, null=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-ordered_at"]
        indexes = [
            models.Index(fields=["patient", "status"]),
            models.Index(fields=["status", "ordered_at"]),
            models.Index(fields=["doctor", "ordered_at"]),
            models.Index(fields=["cancellation_requested"]),
        ]

    def save(self, *args, **kwargs):
        if not self.order_id:
            last_order = LabOrder.objects.order_by("-id").first()
            next_num = (last_order.id + 10001) if last_order else 10001
            self.order_id = f"CF-LAB-{next_num}"
        if not self.reference_range_used and self.test_id:
            self.reference_range_used = self.test.reference_range
        if not self.result_unit and self.test_id:
            self.result_unit = self.test.unit
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.order_id} - {self.test.test_name} for {self.patient.full_name} [{self.status}]"
