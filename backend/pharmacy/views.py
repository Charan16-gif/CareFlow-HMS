from decimal import Decimal
from datetime import timedelta
import secrets
from django.db import transaction, models
from django.utils import timezone
from rest_framework import viewsets, permissions, status
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied, ValidationError
from drf_spectacular.utils import extend_schema, extend_schema_view
from accounts.models import UserRole
from accounts.permissions import get_user_role, IsSelfPatientOrStaff
from appointments.models import Appointment
from billing.models import Bill, BillItem, Payment, BillItemType, PaymentStatus, BillStatus
from billing.serializers import PaymentSerializer, BillSerializer
from .models import (
    Medicine,
    StockMovement,
    Prescription,
    PrescriptionItem,
    MedicineDispense,
    DispenseItem,
    MovementType,
    PrescriptionStatus,
)
from .serializers import (
    MedicineSerializer,
    StockMovementSerializer,
    PrescriptionSerializer,
    PrescriptionItemSerializer,
    MedicineDispenseSerializer,
)
from accounts.emails import (
    send_prescription_notification_email_async,
    send_medicine_dispense_email_async,
    send_payment_receipt_email_async,
)


@extend_schema_view(
    list=extend_schema(summary="List medicines in inventory catalogue"),
    retrieve=extend_schema(summary="Retrieve medicine details"),
    create=extend_schema(summary="Add new medicine (Admin or Pharmacist)"),
    update=extend_schema(summary="Update medicine (Admin or Pharmacist)"),
    partial_update=extend_schema(summary="Partial update medicine"),
    destroy=extend_schema(summary="Remove medicine record (Admin or Pharmacist)"),
)
class MedicineViewSet(viewsets.ModelViewSet):
    """
    CareFlow HMS Medicine Catalogue & Inventory.
    - Admin & Pharmacist: Full catalogue and inventory management.
    - Doctor & Staff & Patient: Read-only catalogue access.
    - Strictly prevents negative stock at the database level.
    """
    queryset = Medicine.objects.all()
    serializer_class = MedicineSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ["dosage_form", "is_active"]
    search_fields = ["medicine_code", "name", "generic_name", "brand_name"]
    ordering_fields = ["name", "stock_quantity", "unit_price"]

    def get_queryset(self):
        user = self.request.user
        role = get_user_role(user)
        qs = Medicine.objects.all()

        # Patients only see active catalogued medicines in stock
        if role == UserRole.PATIENT:
            return qs.filter(is_active=True, stock_quantity__gt=0)

        # Allow query parameter filter for is_active
        is_active_param = self.request.query_params.get("is_active")
        if is_active_param is not None:
            if is_active_param.lower() in ("true", "1"):
                qs = qs.filter(is_active=True)
            elif is_active_param.lower() in ("false", "0"):
                qs = qs.filter(is_active=False)
        elif role == UserRole.DOCTOR:
            # Doctors only prescribe active catalogue medicines by default
            qs = qs.filter(is_active=True)

        return qs

    def perform_create(self, serializer):
        user = self.request.user
        role = get_user_role(user)
        if role == UserRole.ADMIN:
            raise PermissionDenied("Administrators have view-only access to medicines inventory. Only Pharmacists can add new medicines.")
        if role != UserRole.PHARMACIST and not user.is_superuser:
            raise PermissionDenied("Only Pharmacists can add medicines to the catalogue.")
        serializer.save()

    def perform_update(self, serializer):
        user = self.request.user
        role = get_user_role(user)
        if role == UserRole.ADMIN:
            raise PermissionDenied("Administrators have view-only access to medicines inventory. Only Pharmacists can modify medicine records.")
        if role != UserRole.PHARMACIST and not user.is_superuser:
            raise PermissionDenied("Only Pharmacists can modify medicine records.")
        serializer.save()

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        user = request.user
        role = get_user_role(user)
        if role == UserRole.ADMIN:
            raise PermissionDenied("Administrators have view-only access to medicines inventory. Only Pharmacists can remove medicines.")
        if role != UserRole.PHARMACIST and not user.is_superuser:
            raise PermissionDenied("Only Pharmacists can remove medicines.")

        from billing.models import BillItem, BillItemType
        has_rx = instance.prescription_items.exists()
        has_dsp = instance.dispense_records.exists()
        has_stk = instance.stock_movements.exists()
        has_bill = BillItem.objects.filter(item_type=BillItemType.MEDICINE, reference_id=instance.medicine_code).exists()

        if has_rx or has_dsp or has_stk or has_bill:
            return Response(
                {
                    "error": f"Medicine '{instance.name}' cannot be deleted because it is referenced in clinical prescriptions, dispensations, billing invoices, or stock movement audit records. Deletion is prevented to maintain medical and financial audit integrity.",
                    "referenced": True,
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        med_name = instance.name
        instance.delete()
        return Response(
            {
                "message": f"Medicine '{med_name}' has been permanently deleted from inventory.",
                "deleted": True,
            },
            status=status.HTTP_200_OK,
        )

    @extend_schema(summary="Retrieve real-time pharmacy overview statistics (Pharmacist or Admin)")
    @action(detail=False, methods=["get"], url_path="stats")
    def stats(self, request):
        user = request.user
        role = get_user_role(user)
        if role not in (UserRole.ADMIN, UserRole.PHARMACIST) and not user.is_superuser:
            raise PermissionDenied("Only Pharmacists and Administrators can access pharmacy statistics.")

        today = timezone.localdate()
        all_meds = Medicine.objects.filter(is_active=True)
        total_medicines = all_meds.count()

        # Calculate total units in stock and total inventory value from database
        total_units_in_stock = all_meds.aggregate(total=models.Sum("stock_quantity"))["total"] or 0
        total_inventory_value = sum((m.stock_quantity * m.unit_price for m in all_meds), Decimal("0.00"))

        in_stock = all_meds.filter(stock_quantity__gt=models.F("reorder_level")).count()
        low_stock = all_meds.filter(stock_quantity__gt=0, stock_quantity__lte=models.F("reorder_level")).count()
        out_of_stock = all_meds.filter(stock_quantity=0).count()
        near_expiry = all_meds.filter(expiry_date__gt=today, expiry_date__lte=today + timedelta(days=30)).count()
        expired = all_meds.filter(expiry_date__lte=today).count()

        # Calculate today's pharmacy sales from successful payments linked to medicine bills
        today_sales_total = sum(
            (
                p.amount
                for p in Payment.objects.filter(
                    payment_date__date=today,
                    status=PaymentStatus.SUCCESS,
                    bill__items__item_type=BillItemType.MEDICINE,
                ).distinct()
            ),
            Decimal("0.00"),
        )

        today_dispensed_count = MedicineDispense.objects.filter(dispensed_at__date=today).count()

        # Attention medicines (low stock, out of stock, near expiry, expired)
        attention_meds = all_meds.filter(
            models.Q(stock_quantity__lte=models.F("reorder_level")) |
            models.Q(expiry_date__lte=today + timedelta(days=30))
        ).order_by("stock_quantity", "expiry_date")[:10]

        # Recent dispensing events
        recent_dispenses = MedicineDispense.objects.order_by("-dispensed_at")[:8]
        dispenses_data = MedicineDispenseSerializer(recent_dispenses, many=True).data

        # Recent pharmacy transactions / payments
        recent_payments = Payment.objects.filter(
            bill__items__item_type=BillItemType.MEDICINE,
            status=PaymentStatus.SUCCESS,
        ).order_by("-payment_date")[:8]
        payments_data = PaymentSerializer(recent_payments, many=True).data

        return Response({
            "total_medicines": total_medicines,
            "total_units_in_stock": total_units_in_stock,
            "total_inventory_value": str(total_inventory_value),
            "in_stock": in_stock,
            "low_stock": low_stock,
            "out_of_stock": out_of_stock,
            "near_expiry": near_expiry,
            "expired": expired,
            "today_sales": str(today_sales_total),
            "today_dispensed": today_dispensed_count,
            "attention_medicines": MedicineSerializer(attention_meds, many=True).data,
            "recent_dispensations": dispenses_data,
            "recent_sales": payments_data,
        }, status=status.HTTP_200_OK)

    @extend_schema(summary="Adjust or receive stock for a medicine (Pharmacist or Admin)")
    @action(detail=True, methods=["post"], url_path="adjust-stock")
    @transaction.atomic
    def adjust_stock(self, request, pk=None):
        user = request.user
        role = get_user_role(user)
        if role == UserRole.ADMIN:
            raise PermissionDenied("Administrators have view-only access to medicines inventory. Only Pharmacists can adjust medicine stock.")
        if role != UserRole.PHARMACIST and not user.is_superuser:
            raise PermissionDenied("Only Pharmacists can adjust medicine stock.")

        medicine = self.get_object()
        if not medicine.is_active:
            return Response(
                {"error": f"Medicine '{medicine.name}' is archived / inactive. New stock adjustments or purchases cannot be added to an archived catalogue item."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        movement_type = request.data.get("movement_type", MovementType.PURCHASE_IN)
        if movement_type not in MovementType.values:
            return Response(
                {"error": f"Invalid movement type '{movement_type}'. Allowed choices: {list(MovementType.values)}"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            quantity = int(request.data.get("quantity", 0))
            if quantity <= 0:
                raise ValueError()
        except (TypeError, ValueError):
            return Response(
                {"error": "Stock quantity must be a positive integer greater than zero."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        reference_note = request.data.get("reference_note", "").strip() or f"Stock update: {movement_type}"
        batch_number = request.data.get("batch_number", "").strip()
        expiry_date = request.data.get("expiry_date")

        prev_stock = medicine.stock_quantity

        if movement_type in (MovementType.PURCHASE_IN, MovementType.ADJUSTMENT_IN, MovementType.RETURN_IN):
            new_stock = prev_stock + quantity
        elif movement_type in (MovementType.DISPENSED_OUT, MovementType.ADJUSTMENT_OUT, MovementType.EXPIRED_OUT):
            if prev_stock < quantity:
                return Response(
                    {
                        "error": f"Insufficient stock for deduction. Available: {prev_stock}, Requested deduction: {quantity}."
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )
            new_stock = prev_stock - quantity
        else:
            return Response({"error": "Unsupported stock movement type."}, status=status.HTTP_400_BAD_REQUEST)

        medicine.stock_quantity = new_stock
        update_fields = ["stock_quantity", "updated_at"]
        if batch_number:
            medicine.batch_number = batch_number
            update_fields.append("batch_number")
        if expiry_date:
            medicine.expiry_date = expiry_date
            update_fields.append("expiry_date")
        medicine.save(update_fields=update_fields)

        movement = StockMovement.objects.create(
            medicine=medicine,
            movement_type=movement_type,
            quantity=quantity,
            previous_stock=prev_stock,
            new_stock=new_stock,
            reference_note=reference_note,
            performed_by=user,
        )

        return Response(
            {
                "success": True,
                "message": f"Stock successfully updated for {medicine.name}. New available quantity: {new_stock}.",
                "medicine": MedicineSerializer(medicine).data,
                "movement": StockMovementSerializer(movement).data,
            },
            status=status.HTTP_200_OK,
        )


@extend_schema_view(
    list=extend_schema(summary="List stock movement history (Pharmacist or Admin)"),
    retrieve=extend_schema(summary="Retrieve stock movement record"),
)
class StockMovementViewSet(viewsets.ReadOnlyModelViewSet):
    """
    CareFlow HMS Stock Movement Audit Trail.
    - Pharmacist & Admin: Full access to audit log.
    - Other roles: No access to inventory ledger.
    """
    queryset = StockMovement.objects.all()
    serializer_class = StockMovementSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ["medicine", "movement_type"]
    search_fields = ["movement_id", "medicine__name", "reference_note"]

    def get_queryset(self):
        user = self.request.user
        role = get_user_role(user)
        if role in (UserRole.ADMIN, UserRole.PHARMACIST) or user.is_superuser:
            return StockMovement.objects.all()
        return StockMovement.objects.none()


def complete_prescription_and_checkout(prescription, user=None):
    """
    Atomically transitions a prescription to COMPLETED status and checks out the
    associated checked-in patient appointment.
    - Safe against duplicate requests and repeated completion events (idempotent).
    - Preserves cancelled appointments.
    - Checks out ONLY the appointment associated with this prescription and patient.
    """
    with transaction.atomic():
        prescription = Prescription.objects.select_for_update().get(id=prescription.id)
        if prescription.status == PrescriptionStatus.COMPLETED:
            return prescription, prescription.appointment

        from appointments.models import Appointment, AppointmentStatus
        appointment = prescription.appointment
        if not appointment and prescription.patient and prescription.doctor:
            appointment = Appointment.objects.filter(
                patient=prescription.patient,
                doctor=prescription.doctor,
                is_checked_in=True
            ).exclude(
                status__in=[
                    AppointmentStatus.CANCELLED,
                    AppointmentStatus.COMPLETED,
                    getattr(AppointmentStatus, "CHECKED_OUT", "CHECKED_OUT")
                ]
            ).order_by("-appointment_date", "-appointment_time").first()

        prescription.status = PrescriptionStatus.COMPLETED
        prescription.save(update_fields=["status", "updated_at"])

        if appointment:
            appointment = Appointment.objects.select_for_update().get(id=appointment.id)
            if appointment.status != AppointmentStatus.CANCELLED:
                appointment.status = AppointmentStatus.COMPLETED
                appointment.is_checked_in = False
                appointment.check_out_time = timezone.now()
                appointment.save(update_fields=["status", "is_checked_in", "check_out_time", "updated_at"])

        return prescription, appointment


@extend_schema_view(
    list=extend_schema(summary="List prescriptions"),
    retrieve=extend_schema(summary="Retrieve prescription details"),
    create=extend_schema(summary="Create prescription (Doctor only)"),
    update=extend_schema(summary="Update prescription (Doctor only)"),
    partial_update=extend_schema(summary="Partial update prescription"),
    destroy=extend_schema(summary="Cancel prescription (Doctor only)"),
)
class PrescriptionViewSet(viewsets.ModelViewSet):
    """
    CareFlow HMS Prescriptions.
    - Doctor: Prescribes medications for patients with prescription items.
    - Admin: CANNOT perform doctor-only treatment activities (cannot prescribe).
    - Pharmacist: View prescriptions to dispense medications and generate bills for completed prescriptions.
    - Patient: View their own prescriptions only. Cannot alter prescriptions.
    """
    queryset = Prescription.objects.all()
    serializer_class = PrescriptionSerializer
    permission_classes = [permissions.IsAuthenticated, IsSelfPatientOrStaff]
    filterset_fields = ["status", "patient", "doctor"]
    search_fields = ["prescription_id", "patient__first_name", "patient__last_name", "diagnosis"]

    def get_queryset(self):
        user = self.request.user
        role = get_user_role(user)

        if role in (UserRole.ADMIN, UserRole.PHARMACIST, UserRole.RECEPTIONIST) or user.is_superuser:
            return Prescription.objects.all()
        elif role == UserRole.DOCTOR:
            return Prescription.objects.filter(doctor__user=user)
        elif role == UserRole.PATIENT:
            return Prescription.objects.filter(patient__user=user)
        return Prescription.objects.none()

    def perform_create(self, serializer):
        user = self.request.user
        role = get_user_role(user)

        # Enforce Rule: Admin cannot perform doctor-only treatment activities
        if role == UserRole.ADMIN or user.is_superuser:
            raise PermissionDenied(
                "Administrators cannot create prescriptions. "
                "Prescription issuance is strictly restricted to licensed Doctors."
            )

        if role != UserRole.DOCTOR:
            raise PermissionDenied("Only Doctors can issue prescriptions.")

        # Ensure doctor identity
        doctor = getattr(user, "doctor_profile", None)
        if not doctor:
            raise ValidationError("Authenticated doctor profile not found.")

        # Enforce: Doctors may only write prescriptions for checked-in patients assigned to their care
        patient = serializer.validated_data.get("patient")
        if not patient:
            raise ValidationError({"patient": "A valid patient is required to issue a prescription."})

        from appointments.models import Appointment, AppointmentStatus
        terminal_statuses = [
            AppointmentStatus.CANCELLED,
            AppointmentStatus.COMPLETED,
            AppointmentStatus.NO_SHOW,
        ]
        if hasattr(AppointmentStatus, "CHECKED_OUT"):
            terminal_statuses.append(AppointmentStatus.CHECKED_OUT)

        provided_appointment = serializer.validated_data.get("appointment")
        if provided_appointment:
            if provided_appointment.doctor != doctor:
                raise ValidationError({"appointment": "The specified appointment is not assigned to you."})
            if provided_appointment.patient != patient:
                raise ValidationError({"appointment": "The specified appointment does not belong to this patient."})
            if not provided_appointment.is_checked_in:
                raise ValidationError({
                    "appointment": "Prescriptions can only be created for checked-in patients. The patient has not checked in for this appointment."
                })
            if provided_appointment.status in terminal_statuses:
                raise ValidationError({
                    "appointment": "Prescriptions cannot be created after patient checkout or completion of the appointment."
                })
            target_appointment = provided_appointment
        else:
            checked_in_apt = Appointment.objects.filter(
                doctor=doctor,
                patient=patient,
                is_checked_in=True
            ).exclude(status__in=terminal_statuses).order_by("-appointment_date", "-appointment_time").first()

            if not checked_in_apt:
                raise ValidationError({
                    "patient": "Doctors may only write prescriptions for checked-in patients assigned to their care. Prescriptions cannot be created after patient checkout or completion."
                })
            target_appointment = checked_in_apt

        # Prevent duplicate / second-time prescription for this consultation
        existing_rx = Prescription.objects.filter(
            appointment=target_appointment
        ).exclude(status=PrescriptionStatus.CANCELLED).first()
        if existing_rx:
            raise ValidationError({
                "appointment": f"A prescription ({existing_rx.prescription_id}) has already been issued for this consultation. A second prescription cannot be accessed or created."
            })

        prescription = serializer.save(doctor=doctor, appointment=target_appointment)
        if prescription.status == PrescriptionStatus.COMPLETED:
            complete_prescription_and_checkout(prescription, user)
        try:
            send_prescription_notification_email_async(prescription=prescription)
        except Exception:
            pass

    def perform_update(self, serializer):
        user = self.request.user
        role = get_user_role(user)
        instance = serializer.instance

        if role == UserRole.PATIENT:
            raise PermissionDenied("Patients cannot alter prescription details or statuses.")

        new_status = serializer.validated_data.get("status")
        if new_status == PrescriptionStatus.COMPLETED and instance.status != PrescriptionStatus.COMPLETED:
            if role == UserRole.DOCTOR and instance.doctor.user != user:
                raise PermissionDenied("Doctors can only complete their own prescriptions.")
            if role not in (UserRole.DOCTOR, UserRole.ADMIN) and not user.is_superuser:
                raise PermissionDenied("Only the prescribing Doctor or Administrator can complete a prescription.")
            serializer.save()
            complete_prescription_and_checkout(instance, user)
            return

        if role == UserRole.DOCTOR:
            if instance.doctor.user != user:
                raise PermissionDenied("Doctors can only modify their own prescriptions.")
            if instance.status not in (PrescriptionStatus.PENDING, PrescriptionStatus.COMPLETED):
                raise PermissionDenied("Cannot modify a prescription that has already been dispensed or cancelled.")

            # Validate patient eligibility if changing patient
            new_patient = serializer.validated_data.get("patient", instance.patient)
            if new_patient != instance.patient:
                from appointments.models import Appointment, AppointmentStatus
                checked_in_apt = Appointment.objects.filter(
                    doctor=instance.doctor,
                    patient=new_patient,
                    is_checked_in=True
                ).exclude(status=AppointmentStatus.CANCELLED).first()
                if not checked_in_apt:
                    raise ValidationError({
                        "patient": "Doctors may only write prescriptions for checked-in patients assigned to their care."
                    })

            serializer.save()
            return

        if role in (UserRole.ADMIN, UserRole.PHARMACIST) or user.is_superuser:
            serializer.save()
            return

        raise PermissionDenied("You do not have permission to modify this prescription.")

    @action(detail=True, methods=["post"], url_path="complete")
    def complete(self, request, pk=None):
        prescription = self.get_object()
        user = request.user
        role = get_user_role(user)

        if role == UserRole.DOCTOR and prescription.doctor.user != user:
            raise PermissionDenied("Doctors can only complete their own prescriptions.")
        if role not in (UserRole.DOCTOR, UserRole.ADMIN) and not user.is_superuser:
            raise PermissionDenied("Only the prescribing Doctor or Administrator can complete a prescription.")

        rx, apt = complete_prescription_and_checkout(prescription, user)
        serializer = self.get_serializer(rx)
        data = dict(serializer.data)
        if apt:
            data["checked_out_appointment"] = {
                "id": apt.id,
                "appointment_id": apt.appointment_id,
                "status": apt.status,
                "visit_status": "Checked Out",
            }
        return Response({
            "success": True,
            "message": f"Prescription {rx.prescription_id} marked as Completed. Associated visit checked out.",
            "prescription": data
        }, status=status.HTTP_200_OK)

    @action(detail=True, methods=["post"], url_path="generate-bill")
    def generate_bill(self, request, pk=None):
        prescription = self.get_object()
        user = request.user
        role = get_user_role(user)

        if role == UserRole.RECEPTIONIST:
            raise PermissionDenied("Receptionists are not permitted to generate medicine bills.")

        if role not in (UserRole.PHARMACIST, UserRole.ADMIN) and not user.is_superuser:
            raise PermissionDenied("Only Pharmacists or Administrators can generate prescription medicine bills.")

        if prescription.status != PrescriptionStatus.COMPLETED:
            raise ValidationError({
                "error": "A prescription is eligible for prescription-related billing only when its status is Completed."
            })

        # Prevent duplicate billing for this prescription
        existing_bill = Bill.objects.filter(
            items__item_type=BillItemType.MEDICINE,
            items__reference_id=prescription.prescription_id
        ).exclude(status=BillStatus.CANCELLED).first()
        if existing_bill:
            raise ValidationError({
                "error": f"A bill ({existing_bill.bill_number}) has already been generated for prescription {prescription.prescription_id}."
            })

        items = prescription.items.all()
        if not items.exists():
            raise ValidationError({"error": "Prescription contains no medicines to bill."})

        with transaction.atomic():
            bill = Bill.objects.create(
                patient=prescription.patient,
                total_amount=Decimal("0.00"),
                discount_amount=Decimal("0.00"),
                net_amount=Decimal("0.00"),
                paid_amount=Decimal("0.00"),
                balance_due=Decimal("0.00"),
                status=BillStatus.UNPAID,
                notes=f"Prescription Bill: {prescription.prescription_id}",
                created_by=user,
            )
            for item in items:
                subtotal = item.medicine.unit_price * item.quantity_prescribed
                BillItem.objects.create(
                    bill=bill,
                    item_type=BillItemType.MEDICINE,
                    description=f"{item.medicine.name} {item.medicine.strength or ''}".strip(),
                    quantity=item.quantity_prescribed,
                    unit_price=item.medicine.unit_price,
                    subtotal=subtotal,
                    reference_id=prescription.prescription_id,
                )
            bill.recalculate_totals()
            bill.save()

        return Response({
            "success": True,
            "message": f"Bill {bill.bill_number} generated for completed prescription {prescription.prescription_id}.",
            "bill": BillSerializer(bill).data
        }, status=status.HTTP_201_CREATED)

    def perform_destroy(self, instance):
        user = self.request.user
        role = get_user_role(user)

        if role == UserRole.DOCTOR:
            if instance.doctor.user != user:
                raise PermissionDenied("Doctors can only delete prescriptions written by themselves.")
            if instance.dispensations.exists():
                raise ValidationError("Cannot delete a prescription that has already been dispensed.")
            instance.delete()
        elif role == UserRole.ADMIN or user.is_superuser:
            if instance.dispensations.exists():
                instance.status = PrescriptionStatus.CANCELLED
                instance.save(update_fields=["status"])
            else:
                instance.delete()
        else:
            raise PermissionDenied("Only the prescribing Doctor or Administrator can delete a prescription.")



@extend_schema_view(
    list=extend_schema(summary="List prescription items"),
    retrieve=extend_schema(summary="Retrieve prescription item"),
    create=extend_schema(summary="Add item to prescription (Doctor only)"),
    update=extend_schema(summary="Update prescription item"),
    destroy=extend_schema(summary="Remove prescription item"),
)
class PrescriptionItemViewSet(viewsets.ModelViewSet):
    """
    Dedicated endpoint for managing individual prescription line items.
    """
    queryset = PrescriptionItem.objects.all()
    serializer_class = PrescriptionItemSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        role = get_user_role(user)
        if role in (UserRole.ADMIN, UserRole.PHARMACIST) or user.is_superuser:
            return PrescriptionItem.objects.all()
        elif role == UserRole.DOCTOR:
            return PrescriptionItem.objects.filter(prescription__doctor__user=user)
        elif role == UserRole.PATIENT:
            return PrescriptionItem.objects.filter(prescription__patient__user=user)
        return PrescriptionItem.objects.none()

    def perform_create(self, serializer):
        user = self.request.user
        role = get_user_role(user)
        if role != UserRole.DOCTOR and not user.is_superuser:
            raise PermissionDenied("Only Doctors can add items to prescriptions.")
        prescription = serializer.validated_data.get("prescription")
        if prescription.doctor.user != user and not user.is_superuser:
            raise PermissionDenied("You can only add items to your own prescriptions.")

        from appointments.models import AppointmentStatus
        terminal_statuses = [
            AppointmentStatus.CANCELLED,
            AppointmentStatus.COMPLETED,
            AppointmentStatus.NO_SHOW,
        ]
        if hasattr(AppointmentStatus, "CHECKED_OUT"):
            terminal_statuses.append(AppointmentStatus.CHECKED_OUT)

        if prescription.status in (PrescriptionStatus.COMPLETED, PrescriptionStatus.CANCELLED, PrescriptionStatus.DISPENSED):
            raise ValidationError("Cannot add items to a completed, dispensed, or cancelled prescription.")
        if prescription.appointment and prescription.appointment.status in terminal_statuses:
            raise ValidationError("Cannot add prescription items after the patient has checked out or the appointment is completed.")

        medicine = serializer.validated_data.get("medicine")
        if medicine and not medicine.is_active:
            raise ValidationError({"medicine": f"Medicine '{medicine.name}' is archived / inactive and cannot be newly prescribed."})

        serializer.save()

    def perform_update(self, serializer):
        user = self.request.user
        role = get_user_role(user)
        if role != UserRole.DOCTOR and not user.is_superuser:
            raise PermissionDenied("Only Doctors can modify prescription items.")
        serializer.save()

    def perform_destroy(self, instance):
        user = self.request.user
        role = get_user_role(user)
        if role != UserRole.DOCTOR and not user.is_superuser:
            raise PermissionDenied("Only Doctors can delete prescription items.")
        instance.delete()


@extend_schema_view(
    list=extend_schema(summary="List dispensing events"),
    retrieve=extend_schema(summary="Retrieve dispensing event details"),
    create=extend_schema(summary="Dispense medicines for prescription (Pharmacist only)"),
)
class MedicineDispenseViewSet(viewsets.ModelViewSet):
    """
    CareFlow HMS Pharmacy Dispensing Workflow.
    - Pharmacist: Dispense medicines, atomically decrementing inventory and preventing negative stock.
    - Immutable audit records: modifications and deletions are disallowed.
    """
    queryset = MedicineDispense.objects.all()
    serializer_class = MedicineDispenseSerializer
    permission_classes = [permissions.IsAuthenticated, IsSelfPatientOrStaff]

    def get_queryset(self):
        user = self.request.user
        role = get_user_role(user)

        if role in (UserRole.ADMIN, UserRole.PHARMACIST) or user.is_superuser:
            return MedicineDispense.objects.all()
        elif role == UserRole.PATIENT:
            return MedicineDispense.objects.filter(patient__user=user)
        return MedicineDispense.objects.none()

    @transaction.atomic
    def create(self, request, *args, **kwargs):
        user = request.user
        role = get_user_role(user)

        if role != UserRole.PHARMACIST and not user.is_superuser:
            raise PermissionDenied("Only Pharmacists can dispense medications.")

        prescription_id = request.data.get("prescription")
        notes = request.data.get("notes", "")
        custom_items = request.data.get("items")
        create_bill = request.data.get("create_bill", False)
        payment_method = request.data.get("payment_method", "CASH")

        try:
            prescription = Prescription.objects.select_for_update().get(id=prescription_id)
        except Prescription.DoesNotExist:
            return Response({"error": "Prescription not found."}, status=status.HTTP_404_NOT_FOUND)

        if prescription.status == PrescriptionStatus.DISPENSED:
            return Response({"error": "Prescription has already been fully dispensed."}, status=status.HTTP_400_BAD_REQUEST)

        if create_bill:
            if prescription.status != PrescriptionStatus.COMPLETED:
                return Response(
                    {"error": "A prescription is eligible for prescription-related billing only when its status is Completed."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            if Bill.objects.filter(
                items__item_type=BillItemType.MEDICINE,
                items__reference_id=prescription.prescription_id
            ).exclude(status=BillStatus.CANCELLED).exists():
                return Response(
                    {"error": f"A bill has already been generated for prescription {prescription.prescription_id}."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        # Build list of items to dispense: tuple of (PrescriptionItem, qty_to_dispense)
        dispense_plan = []
        if custom_items and isinstance(custom_items, list) and len(custom_items) > 0:
            for c_item in custom_items:
                p_item_id = c_item.get("prescription_item") or c_item.get("id")
                qty = int(c_item.get("quantity", 0))
                if qty <= 0:
                    continue
                try:
                    p_item = prescription.items.select_for_update().get(id=p_item_id)
                except PrescriptionItem.DoesNotExist:
                    return Response(
                        {"error": f"Prescription item {p_item_id} not found in this prescription."},
                        status=status.HTTP_400_BAD_REQUEST,
                    )

                remaining = p_item.quantity_prescribed - p_item.quantity_dispensed
                if qty > remaining:
                    return Response(
                        {"error": f"Requested quantity for {p_item.medicine.name} ({qty}) exceeds remaining prescribed allowance ({remaining})."},
                        status=status.HTTP_400_BAD_REQUEST,
                    )
                dispense_plan.append((p_item, qty))
        else:
            rx_items = prescription.items.select_for_update().filter(is_dispensed=False)
            if not rx_items.exists():
                return Response({"error": "No pending items to dispense for this prescription."}, status=status.HTTP_400_BAD_REQUEST)
            for item in rx_items:
                qty = item.quantity_prescribed - item.quantity_dispensed
                if qty > 0:
                    dispense_plan.append((item, qty))

        if not dispense_plan:
            return Response({"error": "No items selected or available for dispensing."}, status=status.HTTP_400_BAD_REQUEST)

        # Validate stock availability and active status for all items before any deduction
        for item, qty in dispense_plan:
            med = Medicine.objects.select_for_update().get(id=item.medicine_id)
            if not med.is_active:
                raise ValidationError(
                    f"Medicine '{med.name}' is archived / inactive and cannot be newly dispensed."
                )
            if med.stock_quantity < qty:
                raise ValidationError(
                    f"Insufficient inventory for {med.name}. Available: {med.stock_quantity}, Required: {qty}."
                )

        dispense = MedicineDispense.objects.create(
            prescription=prescription,
            patient=prescription.patient,
            dispensed_by=user,
            notes=notes,
            total_amount=Decimal("0.00"),
        )

        total_dispense_amount = Decimal("0.00")
        dispensed_line_items = []

        for item, qty in dispense_plan:
            med = Medicine.objects.select_for_update().get(id=item.medicine_id)

            # Atomically deduct stock
            prev_stock = med.stock_quantity
            new_stock = prev_stock - qty
            med.stock_quantity = new_stock
            med.save(update_fields=["stock_quantity"])

            # Create immutable StockMovement audit entry
            StockMovement.objects.create(
                medicine=med,
                movement_type=MovementType.DISPENSED_OUT,
                quantity=qty,
                previous_stock=prev_stock,
                new_stock=new_stock,
                reference_note=f"Dispensed for Rx {prescription.prescription_id}",
                performed_by=user,
            )

            # Update prescription item quantity
            item.quantity_dispensed += qty
            if item.quantity_dispensed >= item.quantity_prescribed:
                item.is_dispensed = True
            item.save(update_fields=["quantity_dispensed", "is_dispensed"])

            # Create DispenseItem record
            subtotal = med.unit_price * qty
            DispenseItem.objects.create(
                dispense=dispense,
                prescription_item=item,
                medicine=med,
                quantity=qty,
                unit_price=med.unit_price,
                subtotal=subtotal,
            )
            total_dispense_amount += subtotal
            dispensed_line_items.append((med, qty, subtotal))

        dispense.total_amount = total_dispense_amount
        dispense.save(update_fields=["total_amount"])

        # Update prescription overall status
        pending_items_left = prescription.items.filter(is_dispensed=False).exists()
        if not pending_items_left:
            prescription.status = PrescriptionStatus.DISPENSED
        else:
            prescription.status = PrescriptionStatus.PARTIALLY_DISPENSED
        prescription.save(update_fields=["status"])

        # Optionally generate bill & payment if requested
        bill_data = None
        receipt_data = None
        if create_bill and total_dispense_amount > 0:
            record_payment = request.data.get("record_payment", True)
            bill = Bill.objects.create(
                patient=prescription.patient,
                total_amount=total_dispense_amount,
                net_amount=total_dispense_amount,
                paid_amount=Decimal("0.00"),
                balance_due=total_dispense_amount,
                status=BillStatus.UNPAID,
                notes=f"Pharmacy Dispense: {dispense.dispense_id} (Rx: {prescription.prescription_id})",
                created_by=user,
            )
            for med, qty, subtotal in dispensed_line_items:
                BillItem.objects.create(
                    bill=bill,
                    item_type=BillItemType.MEDICINE,
                    description=f"{med.name} {med.strength or ''}".strip(),
                    quantity=qty,
                    unit_price=med.unit_price,
                    subtotal=subtotal,
                    reference_id=prescription.prescription_id,
                )
            bill.recalculate_totals()
            bill.save()

            payment = None
            if record_payment and payment_method:
                payment = Payment.objects.create(
                    bill=bill,
                    amount=total_dispense_amount,
                    payment_method=payment_method,
                    status=PaymentStatus.SUCCESS,
                    transaction_reference=f"TXN-PHARM-{secrets.token_hex(6).upper()}",
                    received_by=user,
                    notes=f"Settled at pharmacy counter for {dispense.dispense_id}",
                )
                bill.recalculate_totals()
                bill.save()

            bill_data = BillSerializer(bill).data
            if payment:
                receipt_data = PaymentSerializer(payment).data

        serializer = self.get_serializer(dispense)
        resp_data = dict(serializer.data)
        if bill_data:
            resp_data["bill"] = bill_data
        if receipt_data:
            resp_data["receipt"] = receipt_data

        try:
            send_medicine_dispense_email_async(dispense=dispense)
            if payment:
                send_payment_receipt_email_async(payment=payment)
        except Exception:
            pass

        return Response(resp_data, status=status.HTTP_201_CREATED)

    def update(self, request, *args, **kwargs):
        raise PermissionDenied("Dispensing records are immutable audit logs and cannot be edited.")

    def partial_update(self, request, *args, **kwargs):
        raise PermissionDenied("Dispensing records are immutable audit logs and cannot be edited.")

    def destroy(self, request, *args, **kwargs):
        raise PermissionDenied("Dispensing records cannot be deleted.")
