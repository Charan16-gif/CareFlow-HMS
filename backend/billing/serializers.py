from decimal import Decimal
from django.db import transaction
from rest_framework import serializers
from .models import Bill, BillItem, Payment


class BillItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = BillItem
        fields = [
            "id",
            "bill",
            "item_type",
            "description",
            "quantity",
            "unit_price",
            "subtotal",
            "reference_id",
            "created_at",
        ]
        read_only_fields = ["id", "subtotal", "created_at"]

    def validate_quantity(self, value):
        if value <= 0:
            raise serializers.ValidationError("Quantity must be greater than zero.")
        return value

    def validate_unit_price(self, value):
        if value < 0:
            raise serializers.ValidationError("Unit price cannot be negative.")
        return value


class BillItemWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = BillItem
        fields = [
            "id",
            "item_type",
            "description",
            "quantity",
            "unit_price",
            "subtotal",
            "reference_id",
        ]
        read_only_fields = ["id", "subtotal"]

    def validate_quantity(self, value):
        if value <= 0:
            raise serializers.ValidationError("Quantity must be greater than zero.")
        return value

    def validate_unit_price(self, value):
        if value < 0:
            raise serializers.ValidationError("Unit price cannot be negative.")
        return value


class PaymentSerializer(serializers.ModelSerializer):
    received_by_name = serializers.CharField(source="received_by.username", read_only=True)
    bill_number = serializers.CharField(source="bill.bill_number", read_only=True)
    patient_name = serializers.CharField(source="bill.patient.full_name", read_only=True)
    patient_id = serializers.CharField(source="bill.patient.patient_id", read_only=True)
    bill_items = BillItemSerializer(source="bill.items", many=True, read_only=True)
    total_amount = serializers.DecimalField(
        source="bill.total_amount",
        max_digits=12,
        decimal_places=2,
        read_only=True
    )

    class Meta:
        model = Payment
        fields = [
            "id",
            "receipt_number",
            "bill",
            "bill_number",
            "patient_name",
            "patient_id",
            "amount",
            "total_amount",
            "payment_method",
            "status",
            "transaction_reference",
            "received_by",
            "received_by_name",
            "payment_date",
            "notes",
            "bill_items",
        ]
        read_only_fields = ["id", "receipt_number", "received_by", "payment_date"]

    def validate_amount(self, value):
        if value <= 0:
            raise serializers.ValidationError("Payment amount must be greater than zero.")
        return value


class BillSerializer(serializers.ModelSerializer):
    items = BillItemSerializer(many=True, read_only=True)
    bill_items = BillItemWriteSerializer(many=True, required=False, write_only=True)
    payments = PaymentSerializer(many=True, read_only=True)
    patient_name = serializers.CharField(source="patient.full_name", read_only=True)
    patient_id_code = serializers.CharField(source="patient.patient_id", read_only=True)
    doctor_name = serializers.CharField(source="appointment.doctor.full_name", read_only=True, default=None)
    appointment_code = serializers.CharField(source="appointment.appointment_id", read_only=True, default=None)
    created_by_name = serializers.CharField(source="created_by.username", read_only=True)

    class Meta:
        model = Bill
        fields = [
            "id",
            "bill_number",
            "patient",
            "patient_name",
            "patient_id_code",
            "doctor_name",
            "appointment",
            "appointment_code",
            "total_amount",
            "discount_amount",
            "net_amount",
            "paid_amount",
            "balance_due",
            "status",
            "due_date",
            "notes",
            "items",
            "bill_items",
            "payments",
            "created_by",
            "created_by_name",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "bill_number",
            "total_amount",
            "net_amount",
            "paid_amount",
            "balance_due",
            "created_by",
            "created_at",
            "updated_at",
        ]

    def to_internal_value(self, data):
        data = data.copy() if hasattr(data, "copy") else dict(data)
        if "bill_items" not in data and "items" in data and isinstance(data["items"], list):
            data["bill_items"] = data["items"]
        return super().to_internal_value(data)

    def validate_discount_amount(self, value):
        if value < 0:
            raise serializers.ValidationError("Discount cannot be negative.")
        return value

    def create(self, validated_data):
        items_data = validated_data.pop("bill_items", None)
        with transaction.atomic():
            bill = Bill.objects.create(**validated_data)
            if items_data:
                for item_dict in items_data:
                    BillItem.objects.create(bill=bill, **item_dict)
            bill.recalculate_totals()
            bill.save(update_fields=["total_amount", "net_amount", "balance_due", "status"])
            return bill

    def update(self, instance, validated_data):
        items_data = validated_data.pop("bill_items", None)
        with transaction.atomic():
            for attr, val in validated_data.items():
                setattr(instance, attr, val)
            instance.save()
            if items_data is not None:
                instance.items.all().delete()
                for item_dict in items_data:
                    BillItem.objects.create(bill=instance, **item_dict)
            instance.recalculate_totals()
            instance.save(update_fields=["total_amount", "net_amount", "balance_due", "status"])
            return instance
