from django.db import models, transaction
from django.contrib.auth.models import User
from django.core.exceptions import ValidationError


class DosageForm(models.TextChoices):
    TABLET = "TABLET", "Tablet"
    CAPSULE = "CAPSULE", "Capsule"
    SYRUP = "SYRUP", "Syrup"
    INJECTION = "INJECTION", "Injection"
    OINTMENT = "OINTMENT", "Ointment"
    DROPS = "DROPS", "Drops"
    INHALER = "INHALER", "Inhaler"
    OTHER = "OTHER", "Other"


class MovementType(models.TextChoices):
    PURCHASE_IN = "PURCHASE_IN", "Purchase / Stock Received"
    DISPENSED_OUT = "DISPENSED_OUT", "Dispensed to Patient"
    ADJUSTMENT_IN = "ADJUSTMENT_IN", "Adjustment In"
    ADJUSTMENT_OUT = "ADJUSTMENT_OUT", "Adjustment Out"
    RETURN_IN = "RETURN_IN", "Patient Return"
    EXPIRED_OUT = "EXPIRED_OUT", "Expired / Discarded"


class PrescriptionStatus(models.TextChoices):
    PENDING = "PENDING", "Pending Dispensation"
    COMPLETED = "COMPLETED", "Completed"
    PARTIALLY_DISPENSED = "PARTIALLY_DISPENSED", "Partially Dispensed"
    DISPENSED = "DISPENSED", "Fully Dispensed"
    CANCELLED = "CANCELLED", "Cancelled"


class Medicine(models.Model):
    """
    CareFlow HMS Medicine / Tablet Catalogue and Inventory Tracker.
    Strictly prevents negative stock at the database level.
    """
    medicine_code = models.CharField(
        max_length=20,
        unique=True,
        db_index=True,
        help_text="Unique Medicine / Tablet Code (e.g., MED-1001)"
    )
    name = models.CharField(max_length=200, db_index=True)
    generic_name = models.CharField(max_length=200, blank=True, null=True)
    brand_name = models.CharField(max_length=200, blank=True, null=True)
    dosage_form = models.CharField(
        max_length=30,
        choices=DosageForm.choices,
        default=DosageForm.TABLET
    )
    strength = models.CharField(max_length=50, blank=True, null=True, help_text="e.g. 500mg, 10ml, 250mg/5ml")
    unit_price = models.DecimalField(max_digits=10, decimal_places=2)
    stock_quantity = models.IntegerField(default=0)
    reorder_level = models.IntegerField(default=10, help_text="Low stock alert threshold")
    manufacturer = models.CharField(max_length=150, blank=True, null=True)
    batch_number = models.CharField(max_length=50, blank=True, null=True)
    expiry_date = models.DateField(blank=True, null=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["name"]
        constraints = [
            models.CheckConstraint(
                condition=models.Q(stock_quantity__gte=0),
                name="medicine_stock_non_negative"
            ),
            models.CheckConstraint(
                condition=models.Q(unit_price__gte=0),
                name="medicine_unit_price_non_negative"
            ),
        ]
        indexes = [
            models.Index(fields=["name", "dosage_form"]),
            models.Index(fields=["is_active", "stock_quantity"]),
        ]

    def clean(self):
        super().clean()
        if self.stock_quantity < 0:
            raise ValidationError("Stock quantity cannot be negative.")
        if self.unit_price is not None and self.unit_price < 0:
            raise ValidationError("Unit price cannot be negative.")

    def save(self, *args, **kwargs):
        self.clean()
        if not self.medicine_code:
            last_med = Medicine.objects.order_by("-id").first()
            next_num = (last_med.id + 1001) if last_med else 1001
            self.medicine_code = f"MED-{next_num}"
        super().save(*args, **kwargs)

    @property
    def is_low_stock(self):
        return self.stock_quantity <= self.reorder_level

    def __str__(self):
        return f"{self.medicine_code} - {self.name} {self.strength or ''} (Stock: {self.stock_quantity})"


class StockMovement(models.Model):
    """
    CareFlow HMS Medicine Stock Movement Ledger.
    Maintains an immutable historical record of inventory transactions.
    """
    movement_id = models.CharField(
        max_length=25,
        unique=True,
        db_index=True,
        help_text="Unique Stock Movement Reference (e.g., STK-10001)"
    )
    medicine = models.ForeignKey(
        Medicine,
        on_delete=models.PROTECT,
        related_name="stock_movements"
    )
    movement_type = models.CharField(max_length=25, choices=MovementType.choices)
    quantity = models.PositiveIntegerField()
    previous_stock = models.IntegerField()
    new_stock = models.IntegerField()
    reference_note = models.CharField(max_length=255, blank=True, null=True)
    performed_by = models.ForeignKey(
        User,
        on_delete=models.PROTECT,
        related_name="stock_movements_performed"
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["medicine", "movement_type"]),
            models.Index(fields=["created_at"]),
        ]

    def save(self, *args, **kwargs):
        if not self.movement_id:
            last_mov = StockMovement.objects.order_by("-id").first()
            next_num = (last_mov.id + 10001) if last_mov else 10001
            self.movement_id = f"STK-{next_num}"
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.movement_id} - {self.medicine.name} [{self.movement_type}] Qty: {self.quantity}"


class Prescription(models.Model):
    """
    CareFlow HMS Doctor Prescription.
    Links the patient, prescribing doctor, and optional clinical appointment.
    """
    prescription_id = models.CharField(
        max_length=20,
        unique=True,
        db_index=True,
        help_text="Unique Prescription Identifier (e.g., CF-RX-10001)"
    )
    patient = models.ForeignKey(
        "patients.Patient",
        on_delete=models.PROTECT,
        related_name="prescriptions"
    )
    doctor = models.ForeignKey(
        "staff.Doctor",
        on_delete=models.PROTECT,
        related_name="prescriptions"
    )
    appointment = models.ForeignKey(
        "appointments.Appointment",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="prescriptions"
    )
    diagnosis = models.TextField(help_text="Clinical diagnosis and condition summary.")
    clinical_notes = models.TextField(blank=True, null=True, help_text="Physician instructions for patient care.")
    status = models.CharField(
        max_length=25,
        choices=PrescriptionStatus.choices,
        default=PrescriptionStatus.PENDING,
        db_index=True
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["patient", "status"]),
            models.Index(fields=["doctor", "created_at"]),
        ]

    def save(self, *args, **kwargs):
        if not self.prescription_id:
            last_rx = Prescription.objects.order_by("-id").first()
            next_num = (last_rx.id + 10001) if last_rx else 10001
            self.prescription_id = f"CF-RX-{next_num}"
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.prescription_id} | {self.patient.full_name} prescribed by {self.doctor.full_name} [{self.status}]"


class PrescriptionItem(models.Model):
    """
    Individual medicine item specified within a doctor prescription.
    """
    prescription = models.ForeignKey(
        Prescription,
        on_delete=models.CASCADE,
        related_name="items"
    )
    medicine = models.ForeignKey(
        Medicine,
        on_delete=models.PROTECT,
        related_name="prescription_items"
    )
    dosage = models.CharField(max_length=100, help_text="e.g. 1 Tablet, 10ml")
    frequency = models.CharField(max_length=100, help_text="e.g. 1-0-1 (Twice daily after food)")
    duration = models.CharField(max_length=100, help_text="e.g. 5 Days, 2 Weeks")
    quantity_prescribed = models.PositiveIntegerField(help_text="Total units prescribed")
    quantity_dispensed = models.PositiveIntegerField(default=0, help_text="Units dispensed so far")
    instructions = models.TextField(blank=True, null=True, help_text="Specific usage directions for patient")
    is_dispensed = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.CheckConstraint(
                condition=models.Q(quantity_prescribed__gt=0),
                name="rx_item_qty_prescribed_positive"
            ),
            models.CheckConstraint(
                condition=models.Q(quantity_dispensed__lte=models.F("quantity_prescribed")),
                name="rx_item_dispensed_lte_prescribed"
            ),
        ]

    def clean(self):
        super().clean()
        if self.quantity_dispensed > self.quantity_prescribed:
            raise ValidationError("Quantity dispensed cannot exceed quantity prescribed.")

    def save(self, *args, **kwargs):
        self.clean()
        if self.quantity_dispensed >= self.quantity_prescribed:
            self.is_dispensed = True
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.medicine.name} ({self.dosage}, {self.frequency}) - {self.quantity_prescribed} units"


class MedicineDispense(models.Model):
    """
    CareFlow HMS Pharmacy Dispensing Event.
    Records medicines handed over to a patient by an authorized pharmacist.
    """
    dispense_id = models.CharField(
        max_length=20,
        unique=True,
        db_index=True,
        help_text="Unique Dispensing Reference (e.g., CF-DSP-10001)"
    )
    prescription = models.ForeignKey(
        Prescription,
        on_delete=models.PROTECT,
        related_name="dispensations"
    )
    patient = models.ForeignKey(
        "patients.Patient",
        on_delete=models.PROTECT,
        related_name="dispensations"
    )
    dispensed_by = models.ForeignKey(
        User,
        on_delete=models.PROTECT,
        related_name="dispensed_records"
    )
    total_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    notes = models.TextField(blank=True, null=True)
    dispensed_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-dispensed_at"]

    def save(self, *args, **kwargs):
        if not self.dispense_id:
            last_dsp = MedicineDispense.objects.order_by("-id").first()
            next_num = (last_dsp.id + 10001) if last_dsp else 10001
            self.dispense_id = f"CF-DSP-{next_num}"
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.dispense_id} - Dispensed for Rx: {self.prescription.prescription_id} to {self.patient.full_name}"


class DispenseItem(models.Model):
    """
    Line items within a pharmacy dispensing event.
    """
    dispense = models.ForeignKey(
        MedicineDispense,
        on_delete=models.CASCADE,
        related_name="items"
    )
    prescription_item = models.ForeignKey(
        PrescriptionItem,
        on_delete=models.PROTECT,
        related_name="dispense_records"
    )
    medicine = models.ForeignKey(
        Medicine,
        on_delete=models.PROTECT,
        related_name="dispense_records"
    )
    quantity = models.PositiveIntegerField()
    unit_price = models.DecimalField(max_digits=10, decimal_places=2)
    subtotal = models.DecimalField(max_digits=10, decimal_places=2)

    class Meta:
        constraints = [
            models.CheckConstraint(
                condition=models.Q(quantity__gt=0),
                name="dispense_item_quantity_positive"
            ),
            models.CheckConstraint(
                condition=models.Q(subtotal__gte=0),
                name="dispense_item_subtotal_non_negative"
            ),
        ]

    def save(self, *args, **kwargs):
        if not self.subtotal:
            self.subtotal = self.unit_price * self.quantity
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.medicine.name} x {self.quantity} = {self.subtotal}"
