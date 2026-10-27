from decimal import Decimal
from django.db import transaction
from rest_framework import viewsets, permissions, status
from rest_framework.response import Response
from rest_framework.exceptions import PermissionDenied, ValidationError
from drf_spectacular.utils import extend_schema, extend_schema_view
from accounts.models import UserRole
from accounts.permissions import get_user_role
from .models import (
    Bill,
    BillItem,
    Payment,
    BillStatus,
    BillItemType,
    PaymentMethod,
    PaymentStatus,
)
from .serializers import BillSerializer, BillItemSerializer, PaymentSerializer
from accounts.emails import send_payment_receipt_email_async


from rest_framework.decorators import action
import secrets
from patients.models import Patient
from pharmacy.models import (
    Medicine,
    Prescription,
    PrescriptionItem,
    StockMovement,
    MovementType,
    PrescriptionStatus,
)


@extend_schema_view(
    list=extend_schema(summary="List patient bills and invoices"),
    retrieve=extend_schema(summary="Retrieve invoice details"),
    create=extend_schema(summary="Create patient bill (Receptionist, Pharmacist, Admin)"),
    update=extend_schema(summary="Update invoice"),
    partial_update=extend_schema(summary="Partial update invoice"),
    destroy=extend_schema(summary="Cancel or remove invoice"),
)
class BillViewSet(viewsets.ModelViewSet):
    """
    CareFlow HMS Billing & Financial Invoices.
    - Receptionist & Pharmacist: Create and manage outpatient invoices.
    - Patient: View only their own bills and balances.
    - Doctor: View bills associated with their consultations.
    - Admin: Oversight and administrative auditing.
    - Completely excludes bed/ward/inpatient charges.
    """
    queryset = Bill.objects.all()
    serializer_class = BillSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ["status", "patient"]
    search_fields = ["bill_number", "patient__first_name", "patient__last_name", "notes"]
    ordering_fields = ["created_at", "total_amount", "balance_due"]

    def get_queryset(self):
        user = self.request.user
        role = get_user_role(user)

        if role in (UserRole.ADMIN, UserRole.PHARMACIST) or user.is_superuser:
            return Bill.objects.all()
        elif role == UserRole.RECEPTIONIST:
            # Receptionists may only access bills without pharmacy/medicine charges
            return Bill.objects.exclude(items__item_type=BillItemType.MEDICINE).distinct()
        elif role == UserRole.DOCTOR:
            return Bill.objects.filter(appointment__doctor__user=user)
        elif role == UserRole.PATIENT:
            return Bill.objects.filter(patient__user=user)
        return Bill.objects.none()

    def perform_create(self, serializer):
        user = self.request.user
        role = get_user_role(user)

        if role not in (UserRole.ADMIN, UserRole.RECEPTIONIST, UserRole.PHARMACIST) and not user.is_superuser:
            raise PermissionDenied("Only Receptionists, Pharmacists, and Administrators can generate bills.")

        raw_items = self.request.data.get("bill_items") or self.request.data.get("items") or []
        if role == UserRole.RECEPTIONIST:
            for itm in raw_items:
                itype = itm.get("item_type")
                if itype not in (BillItemType.CONSULTATION, BillItemType.LAB_TEST):
                    raise PermissionDenied(
                        "Receptionists are only permitted to bill consultation and laboratory test fees."
                    )
        elif role in (UserRole.PHARMACIST, UserRole.ADMIN) or user.is_superuser:
            for itm in raw_items:
                if itm.get("item_type") == BillItemType.MEDICINE:
                    ref_id = itm.get("reference_id")
                    if ref_id:
                        rx = Prescription.objects.filter(prescription_id=ref_id).first()
                        if not rx and str(ref_id).isdigit():
                            rx = Prescription.objects.filter(id=int(ref_id)).first()
                        if rx:
                            if rx.status != PrescriptionStatus.COMPLETED:
                                raise ValidationError({
                                    "detail": "A prescription is eligible for prescription-related billing only when its status is Completed."
                                })
                            if Bill.objects.filter(items__item_type=BillItemType.MEDICINE, items__reference_id=rx.prescription_id).exclude(status=BillStatus.CANCELLED).exists():
                                raise ValidationError({
                                    "detail": f"A bill has already been generated for prescription {rx.prescription_id}."
                                })

        # Enforce rule: Bills can only be generated for patients who have booked an appointment and have a prescription created,
        # and only once per doctor-created prescription / appointment.
        patient = serializer.validated_data.get("patient")
        appointment = serializer.validated_data.get("appointment")
        if patient:
            from appointments.models import Appointment, AppointmentStatus
            has_appointment = Appointment.objects.filter(patient=patient).exclude(status=AppointmentStatus.CANCELLED).exists()
            valid_prescriptions = Prescription.objects.filter(patient=patient).exclude(status=PrescriptionStatus.CANCELLED)
            total_rx = valid_prescriptions.count()

            if not has_appointment or total_rx == 0:
                raise ValidationError({
                    "patient": "Bills can only be generated for patients who have booked an appointment and have a prescription created."
                })

            existing_bills = (
                Bill.objects.filter(patient=patient)
                .exclude(status=BillStatus.CANCELLED)
                .exclude(items__item_type=BillItemType.MEDICINE)
            )
            billed_appt_ids = set(
                existing_bills.filter(appointment__isnull=False).values_list("appointment_id", flat=True)
            )

            if appointment:
                if appointment.patient_id != patient.id:
                    raise ValidationError({
                        "appointment": "The selected appointment does not belong to this patient."
                    })
                appt_has_rx = valid_prescriptions.filter(appointment=appointment).exists()
                if not appt_has_rx:
                    raise ValidationError({
                        "appointment": "A bill cannot be generated for this appointment because the doctor has not created a prescription for it yet."
                    })
                if appointment.id in billed_appt_ids:
                    raise ValidationError({
                        "appointment": "A bill has already been generated for this appointment. Bills can only be generated once."
                    })
            else:
                has_unbilled = False
                for rx in valid_prescriptions:
                    if rx.appointment_id and rx.appointment_id in billed_appt_ids:
                        continue
                    bill_after = existing_bills.filter(created_at__gte=rx.created_at).exists()
                    if not bill_after:
                        has_unbilled = True
                        break

                if not has_unbilled:
                    raise ValidationError({
                        "patient": "A bill has already been generated for this patient's doctor-created prescription. Bills can only be generated once."
                    })

        serializer.save(created_by=user)

    @action(detail=False, methods=["post"], permission_classes=[permissions.IsAuthenticated], url_path="checkout")
    @transaction.atomic
    def checkout(self, request):
        """
        Secure Pharmacy Purchase & Instant Receipt Generation (Patient & Pharmacist).
        - Supports multi-item cart purchases (items=[...]) as well as single-item purchases.
        - Recalculates all pricing authoritatively on backend with trusted Medicine unit prices.
        - Concurrency-safe atomic stock deduction with select_for_update().
        - Validates prescription association and remaining prescribed quantities if prescribed.
        - Atomically creates Bill, BillItems, and successful Payment transaction.
        - Generates immutable StockMovement audit records.
        - Returns official verified payment receipt.
        """
        user = request.user
        role = get_user_role(user)

        if role == UserRole.RECEPTIONIST:
            raise PermissionDenied("Receptionists cannot charge patients for medicines or pharmacy purchases.")

        # Determine target patient
        patient_inst = getattr(user, "patient_profile", None)
        if not patient_inst:
            patient_inst = Patient.objects.filter(user=user).first()
        if not patient_inst and role == UserRole.PATIENT:
            patient_inst = Patient.objects.create(
                user=user,
                first_name=user.first_name or user.username,
                last_name=user.last_name or "",
                email=user.email or "",
                phone_number=getattr(getattr(user, "profile", None), "phone_number", "") or "0000000000",
            )
        elif not patient_inst and (role in (UserRole.ADMIN, UserRole.PHARMACIST) or user.is_superuser):
            patient_id_param = request.data.get("patient_id") or request.data.get("patient")
            if patient_id_param:
                patient_inst = Patient.objects.filter(id=patient_id_param).first()

        # Parse cart items or single medicine payload
        items_payload = request.data.get("items")
        if items_payload and isinstance(items_payload, list) and len(items_payload) > 0:
            raw_items = items_payload
        else:
            medicine_id = request.data.get("medicine_id") or request.data.get("medicine")
            if not medicine_id:
                return Response({"error": "Medicine selection is required."}, status=status.HTTP_400_BAD_REQUEST)
            raw_items = [{
                "medicine_id": medicine_id,
                "quantity": request.data.get("quantity", 1),
                "prescription_id": request.data.get("prescription_id") or request.data.get("prescription"),
            }]

        payment_method = request.data.get("payment_method", "UPI")
        notes = request.data.get("notes", "CareFlow Pharmacy Purchase")

        # Consolidate and validate items
        consolidated = {}
        for it in raw_items:
            m_id = it.get("medicine_id") or it.get("medicine") or it.get("id")
            if not m_id:
                continue
            try:
                m_id = int(m_id)
                q = int(it.get("quantity", 1))
                if q <= 0:
                    return Response({"error": "Quantity must be a positive integer."}, status=status.HTTP_400_BAD_REQUEST)
            except (TypeError, ValueError):
                return Response({"error": "Invalid quantity provided."}, status=status.HTTP_400_BAD_REQUEST)

            rx_id = it.get("prescription_id") or it.get("prescription")
            key = (m_id, rx_id)
            consolidated[key] = consolidated.get(key, 0) + q

        if not consolidated:
            return Response({"error": "At least one valid medicine item is required."}, status=status.HTTP_400_BAD_REQUEST)

        # If patient still not resolved for Pharmacist, check if any prescription is linked
        if not patient_inst and (role in (UserRole.ADMIN, UserRole.PHARMACIST) or user.is_superuser):
            for (m_id, rx_id) in consolidated.keys():
                if rx_id:
                    rx_obj = Prescription.objects.filter(id=rx_id).first()
                    if rx_obj and rx_obj.patient:
                        patient_inst = rx_obj.patient
                        break
            if not patient_inst:
                # Fallback to Walk-in Patient
                patient_inst = Patient.objects.filter(patient_id="CF-WALKIN").first()
                if not patient_inst:
                    patient_inst = Patient.objects.create(
                        patient_id="CF-WALKIN",
                        first_name="Walk-in",
                        last_name="Customer",
                        phone_number="0000000000",
                    )

        if not patient_inst:
            return Response(
                {"error": "A valid patient profile is required for medicine purchase."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Plan and validate stock and prescriptions
        purchase_plan = []
        grand_total = Decimal("0.00")

        for (m_id, rx_id), qty in consolidated.items():
            try:
                medicine = Medicine.objects.select_for_update().get(id=m_id, is_active=True)
            except Medicine.DoesNotExist:
                return Response(
                    {"error": f"Medicine ID {m_id} is not active or available in catalogue."},
                    status=status.HTTP_404_NOT_FOUND
                )

            if medicine.stock_quantity < qty:
                return Response({
                    "error": f"Insufficient stock for {medicine.name}. Available: {medicine.stock_quantity}, Requested: {qty}."
                }, status=status.HTTP_400_BAD_REQUEST)

            rx_item = None
            prescription = None
            if rx_id:
                try:
                    prescription = Prescription.objects.select_for_update().get(id=rx_id)
                except Prescription.DoesNotExist:
                    return Response({"error": f"Specified prescription {rx_id} not found."}, status=status.HTTP_404_NOT_FOUND)

                if prescription.patient != patient_inst and role == UserRole.PATIENT:
                    raise PermissionDenied("Prescription does not belong to your authenticated patient account.")

                if prescription.status not in (PrescriptionStatus.COMPLETED, PrescriptionStatus.PENDING, PrescriptionStatus.PARTIALLY_DISPENSED):
                    return Response({
                        "error": f"Prescription {prescription.prescription_id} is in status {prescription.status} and cannot be billed."
                    }, status=status.HTTP_400_BAD_REQUEST)

                rx_item = prescription.items.select_for_update().filter(medicine=medicine).first()
                if not rx_item:
                    return Response({
                        "error": f"{medicine.name} is not included in prescription {prescription.prescription_id}."
                    }, status=status.HTTP_400_BAD_REQUEST)

                remaining_qty = rx_item.quantity_prescribed - rx_item.quantity_dispensed
                if qty > remaining_qty:
                    return Response({
                        "error": f"Requested quantity ({qty}) exceeds remaining prescribed allowance ({remaining_qty}) for {medicine.name}."
                    }, status=status.HTTP_400_BAD_REQUEST)

            subtotal = medicine.unit_price * qty
            grand_total += subtotal
            purchase_plan.append({
                "medicine": medicine,
                "quantity": qty,
                "unit_price": medicine.unit_price,
                "subtotal": subtotal,
                "prescription": prescription,
                "rx_item": rx_item,
            })

        # Create Bill
        bill = Bill.objects.create(
            patient=patient_inst,
            total_amount=grand_total,
            discount_amount=Decimal("0.00"),
            net_amount=grand_total,
            paid_amount=Decimal("0.00"),
            balance_due=grand_total,
            status=BillStatus.UNPAID,
            notes=notes,
            created_by=user
        )

        # Create BillItems, update stock, and create StockMovement audit records
        for item in purchase_plan:
            med = item["medicine"]
            q = item["quantity"]
            sub = item["subtotal"]
            rx = item["prescription"]
            rx_i = item["rx_item"]

            BillItem.objects.create(
                bill=bill,
                item_type=BillItemType.MEDICINE,
                description=f"{med.name} {med.strength or ''}".strip(),
                quantity=q,
                unit_price=item["unit_price"],
                subtotal=sub,
                reference_id=rx.prescription_id if rx else med.medicine_code
            )

            # Atomically deduct stock
            prev_stock = med.stock_quantity
            new_stock = prev_stock - q
            med.stock_quantity = new_stock
            med.save(update_fields=["stock_quantity"])

            StockMovement.objects.create(
                medicine=med,
                movement_type=MovementType.DISPENSED_OUT,
                quantity=q,
                previous_stock=prev_stock,
                new_stock=new_stock,
                reference_note=f"Pharmacy Purchase (Bill: {bill.bill_number})",
                performed_by=user
            )

            # Update prescription dispensing progress if applicable
            if rx_i:
                rx_i.quantity_dispensed += q
                if rx_i.quantity_dispensed >= rx_i.quantity_prescribed:
                    rx_i.is_dispensed = True
                rx_i.save(update_fields=["quantity_dispensed", "is_dispensed"])

                pending_items = rx.items.filter(is_dispensed=False)
                if not pending_items.exists():
                    rx.status = PrescriptionStatus.DISPENSED
                else:
                    rx.status = PrescriptionStatus.PARTIALLY_DISPENSED
                rx.save(update_fields=["status"])

        bill.recalculate_totals()
        bill.save(update_fields=["total_amount", "net_amount", "balance_due", "status"])

        # Create Payment Transaction
        txn_ref = f"TXN-PORTAL-{secrets.token_hex(6).upper()}"
        payment = Payment.objects.create(
            bill=bill,
            amount=grand_total,
            payment_method=payment_method,
            status=PaymentStatus.SUCCESS,
            transaction_reference=txn_ref,
            received_by=user,
            notes=f"Pharmacy Checkout: {len(purchase_plan)} item(s) for {patient_inst.full_name}"
        )
        bill.recalculate_totals()
        bill.save(update_fields=["paid_amount", "balance_due", "status"])

        receipt_data = PaymentSerializer(payment).data
        try:
            send_payment_receipt_email_async(payment=payment)
        except Exception:
            pass

        items_summary = ", ".join(f"{it['quantity']}x {it['medicine'].name}" for it in purchase_plan[:3])
        if len(purchase_plan) > 3:
            items_summary += f" +{len(purchase_plan) - 3} more"

        return Response({
            "success": True,
            "message": f"Successfully purchased {items_summary}. Receipt #{payment.receipt_number} issued.",
            "receipt": receipt_data,
        }, status=status.HTTP_201_CREATED)

    def perform_update(self, serializer):
        user = self.request.user
        role = get_user_role(user)

        if role not in (UserRole.ADMIN, UserRole.RECEPTIONIST, UserRole.PHARMACIST) and not user.is_superuser:
            raise PermissionDenied("You do not have permission to modify bills.")

        instance = serializer.instance
        if role == UserRole.RECEPTIONIST:
            if instance.items.filter(item_type=BillItemType.MEDICINE).exists():
                raise PermissionDenied("Receptionists are not permitted to modify medicine bills.")
            raw_items = self.request.data.get("bill_items") or self.request.data.get("items")
            if raw_items is not None:
                for itm in raw_items:
                    itype = itm.get("item_type")
                    if itype not in (BillItemType.CONSULTATION, BillItemType.LAB_TEST):
                        raise PermissionDenied(
                            "Receptionists are only permitted to manage consultation and laboratory test fees."
                        )

        instance = serializer.save()
        instance.recalculate_totals()
        instance.save(update_fields=["total_amount", "net_amount", "paid_amount", "balance_due", "status"])

    def perform_destroy(self, instance):
        user = self.request.user
        role = get_user_role(user)

        if role != UserRole.ADMIN and not user.is_superuser:
            raise PermissionDenied("Only Administrators can delete or cancel bills.")

        if instance.paid_amount > Decimal("0.00"):
            raise ValidationError("Cannot delete a bill with recorded payments. Mark it as cancelled instead.")

        instance.delete()


@extend_schema_view(
    list=extend_schema(summary="List invoice line items"),
    retrieve=extend_schema(summary="Retrieve invoice line item"),
    create=extend_schema(summary="Add line item to invoice (Receptionist, Pharmacist, Admin)"),
    update=extend_schema(summary="Update line item"),
    destroy=extend_schema(summary="Remove line item"),
)
class BillItemViewSet(viewsets.ModelViewSet):
    """
    Dedicated endpoint for managing individual bill line items.
    Automatically recalculates the parent bill totals and balances upon any modification.
    """
    queryset = BillItem.objects.all()
    serializer_class = BillItemSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        role = get_user_role(user)

        if role in (UserRole.ADMIN, UserRole.PHARMACIST) or user.is_superuser:
            return BillItem.objects.all()
        elif role == UserRole.RECEPTIONIST:
            return BillItem.objects.filter(item_type__in=[BillItemType.CONSULTATION, BillItemType.LAB_TEST])
        elif role == UserRole.DOCTOR:
            return BillItem.objects.filter(bill__appointment__doctor__user=user)
        elif role == UserRole.PATIENT:
            return BillItem.objects.filter(bill__patient__user=user)
        return BillItem.objects.none()

    @transaction.atomic
    def perform_create(self, serializer):
        user = self.request.user
        role = get_user_role(user)

        if role not in (UserRole.ADMIN, UserRole.RECEPTIONIST, UserRole.PHARMACIST) and not user.is_superuser:
            raise PermissionDenied("Only authorized staff can add items to bills.")

        if role == UserRole.RECEPTIONIST:
            item_type = serializer.validated_data.get("item_type")
            if item_type not in (BillItemType.CONSULTATION, BillItemType.LAB_TEST):
                raise PermissionDenied("Receptionists are only permitted to add consultation and laboratory test items.")

        item = serializer.save()
        bill = item.bill
        bill.recalculate_totals()
        bill.save(update_fields=["total_amount", "net_amount", "paid_amount", "balance_due", "status"])

    @transaction.atomic
    def perform_update(self, serializer):
        user = self.request.user
        role = get_user_role(user)

        if role not in (UserRole.ADMIN, UserRole.RECEPTIONIST, UserRole.PHARMACIST) and not user.is_superuser:
            raise PermissionDenied("Only authorized staff can modify bill items.")

        if role == UserRole.RECEPTIONIST:
            if serializer.instance.item_type not in (BillItemType.CONSULTATION, BillItemType.LAB_TEST) or serializer.validated_data.get("item_type") not in (None, BillItemType.CONSULTATION, BillItemType.LAB_TEST):
                raise PermissionDenied("Receptionists are only permitted to modify consultation and laboratory test items.")

        item = serializer.save()
        bill = item.bill
        bill.recalculate_totals()
        bill.save(update_fields=["total_amount", "net_amount", "paid_amount", "balance_due", "status"])

    @transaction.atomic
    def perform_destroy(self, instance):
        user = self.request.user
        role = get_user_role(user)

        if role not in (UserRole.ADMIN, UserRole.RECEPTIONIST, UserRole.PHARMACIST) and not user.is_superuser:
            raise PermissionDenied("Only authorized staff can delete bill items.")

        if role == UserRole.RECEPTIONIST:
            if instance.item_type not in (BillItemType.CONSULTATION, BillItemType.LAB_TEST):
                raise PermissionDenied("Receptionists are only permitted to delete consultation and laboratory test items.")

        bill = instance.bill
        instance.delete()
        bill.recalculate_totals()
        bill.save(update_fields=["total_amount", "net_amount", "paid_amount", "balance_due", "status"])


@extend_schema_view(
    list=extend_schema(summary="List payments and receipts"),
    retrieve=extend_schema(summary="Retrieve payment receipt"),
    create=extend_schema(summary="Record payment against bill (Receptionist, Pharmacist, Admin)"),
)
class PaymentViewSet(viewsets.ModelViewSet):
    """
    CareFlow HMS Payments & Receipts.
    - Receptionist & Pharmacist: Record payments for bills.
    - Patient: View their own receipts.
    - Atomically updates invoice balance and status.
    - Immutable audit logs: payments cannot be edited or deleted.
    """
    queryset = Payment.objects.all()
    serializer_class = PaymentSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ["payment_method", "status", "bill"]
    search_fields = ["receipt_number", "transaction_reference", "bill__bill_number"]
    ordering_fields = ["payment_date", "amount"]

    def get_queryset(self):
        user = self.request.user
        role = get_user_role(user)

        if role in (UserRole.ADMIN, UserRole.PHARMACIST) or user.is_superuser:
            return Payment.objects.all()
        elif role == UserRole.RECEPTIONIST:
            return Payment.objects.exclude(bill__items__item_type=BillItemType.MEDICINE).distinct()
        elif role == UserRole.PATIENT:
            return Payment.objects.filter(bill__patient__user=user)
        return Payment.objects.none()

    def perform_create(self, serializer):
        user = self.request.user
        role = get_user_role(user)

        if role == UserRole.PATIENT:
            bill = serializer.validated_data.get("bill")
            if not bill or bill.patient.user != user:
                raise PermissionDenied("You can only submit payments for your own medical bills.")
            payment = serializer.save(received_by=user)
            try:
                send_payment_receipt_email_async(payment=payment)
            except Exception:
                pass
            return

        if role not in (UserRole.ADMIN, UserRole.RECEPTIONIST, UserRole.PHARMACIST) and not user.is_superuser:
            raise PermissionDenied("Only Receptionists, Pharmacists, and Administrators can collect payments.")

        if role == UserRole.RECEPTIONIST:
            bill = serializer.validated_data.get("bill")
            if bill and bill.items.filter(item_type=BillItemType.MEDICINE).exists():
                raise PermissionDenied("Receptionists are not permitted to collect payments for medicine or pharmacy bills.")

        payment = serializer.save(received_by=user)
        try:
            send_payment_receipt_email_async(payment=payment)
        except Exception:
            pass

    def update(self, request, *args, **kwargs):
        raise PermissionDenied("Payment receipts are immutable financial records and cannot be edited.")

    def partial_update(self, request, *args, **kwargs):
        raise PermissionDenied("Payment receipts are immutable financial records and cannot be edited.")

    def destroy(self, request, *args, **kwargs):
        raise PermissionDenied("Payment receipts are immutable financial records and cannot be deleted.")

