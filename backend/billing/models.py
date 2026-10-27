from decimal import Decimal
from django.db import models, transaction
from django.contrib.auth.models import User
from django.core.exceptions import ValidationError


class BillStatus(models.TextChoices):
    UNPAID = "UNPAID", "Unpaid"
    PARTIALLY_PAID = "PARTIALLY_PAID", "Partially Paid"
    PAID = "PAID", "Fully Paid"
    CANCELLED = "CANCELLED", "Cancelled"


class BillItemType(models.TextChoices):
    CONSULTATION = "CONSULTATION", "Doctor Consultation Fee"
    MEDICINE = "MEDICINE", "Medicine / Pharmacy Charge"
    LAB_TEST = "LAB_TEST", "Laboratory Test Fee"
    PROCEDURE = "PROCEDURE", "Clinical Procedure Fee"
    OTHER = "OTHER", "Other Hospital Service"


class PaymentMethod(models.TextChoices):
    CASH = "CASH", "Cash"
    CARD = "CARD", "Credit / Debit Card"
    UPI = "UPI", "UPI Payment"
    NET_BANKING = "NET_BANKING", "Net Banking"
    INSURANCE = "INSURANCE", "Health Insurance"


class PaymentStatus(models.TextChoices):
    SUCCESS = "SUCCESS", "Success"
    FAILED = "FAILED", "Failed"
    REFUNDED = "REFUNDED", "Refunded"


class Bill(models.Model):
    """
    CareFlow HMS Patient Billing Invoice.
    Tracks all outpatient consultation fees, lab diagnostic charges, and dispensed medicines.
    Excludes inpatient/bed charges completely per specification.
    """
    bill_number = models.CharField(
        max_length=25,
        unique=True,
        db_index=True,
        help_text="Unique Invoice Number (e.g., CF-INV-10001)"
    )
    patient = models.ForeignKey(
        "patients.Patient",
        on_delete=models.PROTECT,
        related_name="bills"
    )
    appointment = models.ForeignKey(
        "appointments.Appointment",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="bills"
    )
    total_amount = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0.00"))
    discount_amount = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0.00"))
    net_amount = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0.00"))
    paid_amount = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0.00"))
    balance_due = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0.00"))
    status = models.CharField(
        max_length=20,
        choices=BillStatus.choices,
        default=BillStatus.UNPAID,
        db_index=True
    )
    due_date = models.DateField(blank=True, null=True)
    notes = models.TextField(blank=True, null=True)
    created_by = models.ForeignKey(
        User,
        on_delete=models.PROTECT,
        related_name="created_bills"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        constraints = [
            models.CheckConstraint(
                condition=models.Q(total_amount__gte=0),
                name="bill_total_non_negative"
            ),
            models.CheckConstraint(
                condition=models.Q(discount_amount__gte=0),
                name="bill_discount_non_negative"
            ),
            models.CheckConstraint(
                condition=models.Q(paid_amount__gte=0),
                name="bill_paid_non_negative"
            ),
            models.CheckConstraint(
                condition=models.Q(balance_due__gte=0),
                name="bill_balance_non_negative"
            ),
        ]
        indexes = [
            models.Index(fields=["patient", "status"]),
            models.Index(fields=["bill_number"]),
            models.Index(fields=["created_at"]),
        ]

    def recalculate_totals(self):
        """
        Recalculates net amount, paid amount, balance due, and updates bill status.
        """
        items_total = sum((item.subtotal for item in self.items.all()), Decimal("0.00"))
        self.total_amount = items_total
        self.net_amount = max(Decimal("0.00"), self.total_amount - self.discount_amount)
        
        # Calculate successful payments
        successful_payments = self.payments.filter(status=PaymentStatus.SUCCESS)
        self.paid_amount = sum((p.amount for p in successful_payments), Decimal("0.00"))
        self.balance_due = max(Decimal("0.00"), self.net_amount - self.paid_amount)

        if self.paid_amount >= self.net_amount and self.net_amount > 0:
            self.status = BillStatus.PAID
        elif self.paid_amount > 0:
            self.status = BillStatus.PARTIALLY_PAID
        elif self.status != BillStatus.CANCELLED:
            self.status = BillStatus.UNPAID

    def save(self, *args, **kwargs):
        if not self.bill_number:
            last_bill = Bill.objects.order_by("-id").first()
            next_num = (last_bill.id + 10001) if last_bill else 10001
            self.bill_number = f"CF-INV-{next_num}"
        if not self.net_amount and self.total_amount:
            self.net_amount = max(Decimal("0.00"), self.total_amount - self.discount_amount)
        if not self.balance_due and self.net_amount:
            self.balance_due = max(Decimal("0.00"), self.net_amount - self.paid_amount)
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.bill_number} - {self.patient.full_name} | Net: ₹{self.net_amount} (Due: ₹{self.balance_due}) [{self.status}]"


class BillItem(models.Model):
    """
    Line item charges making up a patient bill.
    """
    bill = models.ForeignKey(
        Bill,
        on_delete=models.CASCADE,
        related_name="items"
    )
    item_type = models.CharField(max_length=25, choices=BillItemType.choices)
    description = models.CharField(max_length=255)
    quantity = models.PositiveIntegerField(default=1)
    unit_price = models.DecimalField(max_digits=10, decimal_places=2)
    subtotal = models.DecimalField(max_digits=10, decimal_places=2)
    reference_id = models.CharField(
        max_length=50,
        blank=True,
        null=True,
        help_text="Related order ID (e.g. Lab Order ID, Prescription Dispense ID)"
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.CheckConstraint(
                condition=models.Q(quantity__gt=0),
                name="bill_item_quantity_positive"
            ),
            models.CheckConstraint(
                condition=models.Q(subtotal__gte=0),
                name="bill_item_subtotal_non_negative"
            ),
        ]

    def save(self, *args, **kwargs):
        if self.unit_price is not None and self.quantity is not None:
            self.subtotal = self.unit_price * self.quantity
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.description} ({self.get_item_type_display()}) x{self.quantity} = ₹{self.subtotal}"


class Payment(models.Model):
    """
    CareFlow HMS Payment Transaction Record.
    Maintains payment audit trail and prevents duplicate transaction recording.
    """
    receipt_number = models.CharField(
        max_length=25,
        unique=True,
        db_index=True,
        help_text="Unique Payment Receipt Number (e.g., CF-RCP-10001)"
    )
    bill = models.ForeignKey(
        Bill,
        on_delete=models.PROTECT,
        related_name="payments"
    )
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    payment_method = models.CharField(
        max_length=20,
        choices=PaymentMethod.choices,
        default=PaymentMethod.CASH
    )
    status = models.CharField(
        max_length=20,
        choices=PaymentStatus.choices,
        default=PaymentStatus.SUCCESS,
        db_index=True
    )
    transaction_reference = models.CharField(
        max_length=100,
        blank=True,
        null=True,
        unique=True,
        help_text="External gateway transaction ID / UPI Reference / Bank UTR"
    )
    received_by = models.ForeignKey(
        User,
        on_delete=models.PROTECT,
        related_name="payments_received"
    )
    payment_date = models.DateTimeField(auto_now_add=True)
    notes = models.TextField(blank=True, null=True)

    class Meta:
        ordering = ["-payment_date"]
        constraints = [
            models.CheckConstraint(
                condition=models.Q(amount__gt=0),
                name="payment_amount_positive"
            ),
        ]
        indexes = [
            models.Index(fields=["bill", "status"]),
            models.Index(fields=["payment_date"]),
        ]

    def clean(self):
        super().clean()
        if self.amount is not None and self.amount <= 0:
            raise ValidationError("Payment amount must be greater than zero.")
        if self.bill_id and self.amount is not None and self.status == PaymentStatus.SUCCESS:
            if self.amount > self.bill.balance_due:
                raise ValidationError(
                    f"Payment amount (₹{self.amount}) exceeds outstanding balance due (₹{self.bill.balance_due})."
                )

    def save(self, *args, **kwargs):
        self.clean()
        if not self.receipt_number:
            last_pay = Payment.objects.order_by("-id").first()
            next_num = (last_pay.id + 10001) if last_pay else 10001
            self.receipt_number = f"CF-RCP-{next_num}"
        
        with transaction.atomic():
            super().save(*args, **kwargs)
            # Atomically update bill status and balance
            if self.status == PaymentStatus.SUCCESS:
                self.bill.recalculate_totals()
                self.bill.save(update_fields=["total_amount", "net_amount", "paid_amount", "balance_due", "status", "updated_at"])

    def __str__(self):
        return f"{self.receipt_number} - ₹{self.amount} via {self.get_payment_method_display()} [{self.status}]"
