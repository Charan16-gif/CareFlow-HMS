import uuid
from django.conf import settings
from django.db import models


class NotificationType(models.TextChoices):
    APPOINTMENT = "APPOINTMENT", "Appointment"
    PRESCRIPTION = "PRESCRIPTION", "Prescription"
    LAB_TEST = "LAB_TEST", "Laboratory Test"
    MEDICAL_QUERY = "MEDICAL_QUERY", "Medical Query"
    PAYMENT = "PAYMENT", "Payment"
    MEDICINE_STOCK = "MEDICINE_STOCK", "Medicine Stock"
    ACCOUNT = "ACCOUNT", "Account Activity"
    SYSTEM = "SYSTEM", "System Alert"


class Notification(models.Model):
    id = models.BigAutoField(primary_key=True)
    notification_id = models.CharField(
        max_length=64,
        unique=True,
        editable=False,
        db_index=True,
        help_text="Unique external reference identifier for the notification (e.g. NTF-XXXXXXXX)",
    )
    recipient = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="notifications",
        help_text="User who receives this notification",
    )
    title = models.CharField(max_length=255)
    message = models.TextField()
    notification_type = models.CharField(
        max_length=32,
        choices=NotificationType.choices,
        default=NotificationType.SYSTEM,
        db_index=True,
    )
    action_url = models.CharField(
        max_length=255,
        blank=True,
        default="",
        help_text="Internal frontend route to navigate when clicking the notification",
    )
    reference_id = models.CharField(
        max_length=100,
        blank=True,
        default="",
        db_index=True,
        help_text="Optional ID of the related object (e.g. appointment_id, prescription_id, etc.)",
    )
    is_read = models.BooleanField(default=False, db_index=True)
    read_at = models.DateTimeField(null=True, blank=True)
    is_cleared = models.BooleanField(default=False, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["recipient", "is_cleared", "is_read"]),
            models.Index(fields=["recipient", "-created_at"]),
        ]

    def __str__(self):
        return f"[{self.notification_type}] {self.title} -> {self.recipient.username} ({'Read' if self.is_read else 'Unread'})"

    def save(self, *args, **kwargs):
        if not self.notification_id:
            self.notification_id = f"NTF-{uuid.uuid4().hex[:10].upper()}"
        super().save(*args, **kwargs)

