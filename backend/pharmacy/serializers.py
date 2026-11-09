from rest_framework import serializers
from django.db import transaction
from .models import (
    Medicine,
    StockMovement,
    Prescription,
    PrescriptionItem,
    MedicineDispense,
    DispenseItem,
)


class MedicineSerializer(serializers.ModelSerializer):
    is_low_stock = serializers.BooleanField(read_only=True)

    class Meta:
        model = Medicine
        fields = [
            "id",
            "medicine_code",
            "name",
            "generic_name",
            "brand_name",
            "dosage_form",
            "strength",
            "unit_price",
            "stock_quantity",
            "reorder_level",
            "is_low_stock",
            "manufacturer",
            "batch_number",
            "expiry_date",
            "is_active",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "medicine_code", "created_at", "updated_at"]


class StockMovementSerializer(serializers.ModelSerializer):
    medicine_name = serializers.CharField(source="medicine.name", read_only=True)
    medicine_code = serializers.CharField(source="medicine.medicine_code", read_only=True)
    dosage_form = serializers.CharField(source="medicine.dosage_form", read_only=True)
    performed_by_name = serializers.CharField(source="performed_by.username", read_only=True)
    movement_type_display = serializers.CharField(source="get_movement_type_display", read_only=True)

    class Meta:
        model = StockMovement
        fields = [
            "id",
            "movement_id",
            "medicine",
            "medicine_name",
            "medicine_code",
            "dosage_form",
            "movement_type",
            "movement_type_display",
            "quantity",
            "previous_stock",
            "new_stock",
            "reference_note",
            "performed_by",
            "performed_by_name",
            "created_at",
        ]
        read_only_fields = ["id", "movement_id", "previous_stock", "new_stock", "performed_by", "created_at"]


class PrescriptionItemSerializer(serializers.ModelSerializer):
    medicine_name = serializers.CharField(source="medicine.name", read_only=True)
    medicine_dosage_form = serializers.CharField(source="medicine.dosage_form", read_only=True)
    medicine_strength = serializers.CharField(source="medicine.strength", read_only=True)
    medicine_unit_price = serializers.DecimalField(
        source="medicine.unit_price",
        max_digits=10,
        decimal_places=2,
        read_only=True
    )
    medicine_stock = serializers.IntegerField(source="medicine.stock_quantity", read_only=True)

    class Meta:
        model = PrescriptionItem
        fields = [
            "id",
            "prescription",
            "medicine",
            "medicine_name",
            "medicine_dosage_form",
            "medicine_strength",
            "medicine_unit_price",
            "medicine_stock",
            "dosage",
            "frequency",
            "duration",
            "quantity_prescribed",
            "quantity_dispensed",
            "instructions",
            "is_dispensed",
            "created_at",
        ]
        read_only_fields = ["id", "quantity_dispensed", "is_dispensed", "created_at"]


class PrescriptionItemWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = PrescriptionItem
        fields = [
            "medicine",
            "dosage",
            "frequency",
            "duration",
            "quantity_prescribed",
            "instructions",
        ]


class PrescriptionSerializer(serializers.ModelSerializer):
    items = PrescriptionItemSerializer(many=True, read_only=True)
    prescription_items = PrescriptionItemWriteSerializer(many=True, write_only=True, required=False)
    patient_name = serializers.CharField(source="patient.full_name", read_only=True)
    patient_id_code = serializers.CharField(source="patient.patient_id", read_only=True)
    doctor_name = serializers.CharField(source="doctor.full_name", read_only=True)
    doctor_specialization = serializers.CharField(source="doctor.specialization", read_only=True)
    doctor_department = serializers.CharField(source="doctor.department", read_only=True)
    appointment_code = serializers.CharField(source="appointment.appointment_id", read_only=True, default=None)
    max_duration_days = serializers.SerializerMethodField()
    valid_until = serializers.SerializerMethodField()
    is_active_course = serializers.SerializerMethodField()
    days_remaining = serializers.SerializerMethodField()

    class Meta:
        model = Prescription
        fields = [
            "id",
            "prescription_id",
            "patient",
            "patient_name",
            "patient_id_code",
            "doctor",
            "doctor_name",
            "doctor_specialization",
            "doctor_department",
            "appointment",
            "appointment_code",
            "diagnosis",
            "clinical_notes",
            "status",
            "items",
            "prescription_items",
            "max_duration_days",
            "valid_until",
            "is_active_course",
            "days_remaining",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "prescription_id",
            "doctor",
            "status",
            "max_duration_days",
            "valid_until",
            "is_active_course",
            "days_remaining",
            "created_at",
            "updated_at",
        ]

    def _parse_item_duration(self, duration_str):
        if not duration_str:
            return 5
        import re
        match = re.search(r"(\d+)\s*(day|week|month|year)?", str(duration_str).lower())
        if not match:
            return 5
        num = int(match.group(1))
        unit = match.group(2) or "day"
        if unit.startswith("w"):
            return num * 7
        elif unit.startswith("m"):
            return num * 30
        elif unit.startswith("y"):
            return num * 365
        return num

    def get_max_duration_days(self, obj):
        items = obj.items.all() if hasattr(obj, "items") else []
        durations = [self._parse_item_duration(item.duration) for item in items]
        return max(durations) if durations else 5

    def get_valid_until(self, obj):
        from datetime import timedelta
        from django.utils import timezone
        duration_days = self.get_max_duration_days(obj)
        created_date = obj.created_at.date() if obj.created_at else timezone.now().date()
        valid_until_date = created_date + timedelta(days=duration_days)
        return str(valid_until_date)

    def get_days_remaining(self, obj):
        from datetime import timedelta
        from django.utils import timezone
        today = timezone.localdate() if hasattr(timezone, "localdate") else timezone.now().date()
        duration_days = self.get_max_duration_days(obj)
        created_date = obj.created_at.date() if obj.created_at else today
        end_date = created_date + timedelta(days=duration_days)
        remaining = (end_date - today).days
        return max(0, remaining)

    def get_is_active_course(self, obj):
        from pharmacy.models import PrescriptionStatus
        if obj.status == PrescriptionStatus.CANCELLED:
            return False
        # If pending or partially dispensed, always considered active until fulfilled
        if obj.status in (PrescriptionStatus.PENDING, PrescriptionStatus.PARTIALLY_DISPENSED):
            return True
        # If completed or dispensed, it remains active throughout the duration of the prescription
        from django.utils import timezone
        from datetime import timedelta
        today = timezone.localdate() if hasattr(timezone, "localdate") else timezone.now().date()
        duration_days = self.get_max_duration_days(obj)
        created_date = obj.created_at.date() if obj.created_at else today
        end_date = created_date + timedelta(days=duration_days)
        return today <= end_date

    def to_internal_value(self, data):
        data = data.copy() if hasattr(data, "copy") else dict(data)
        if "prescription_items" not in data and "items" in data and isinstance(data["items"], list):
            data["prescription_items"] = data["items"]
        return super().to_internal_value(data)

    def create(self, validated_data):
        items_data = validated_data.pop("prescription_items", [])
        with transaction.atomic():
            prescription = Prescription.objects.create(**validated_data)
            for item in items_data:
                PrescriptionItem.objects.create(prescription=prescription, **item)
        return prescription

    def update(self, instance, validated_data):
        items_data = validated_data.pop("prescription_items", None)
        with transaction.atomic():
            for attr, val in validated_data.items():
                setattr(instance, attr, val)
            instance.save()
            if items_data is not None:
                instance.items.all().delete()
                for item in items_data:
                    PrescriptionItem.objects.create(prescription=instance, **item)
        return instance


class DispenseItemSerializer(serializers.ModelSerializer):
    medicine_name = serializers.CharField(source="medicine.name", read_only=True)
    medicine_code = serializers.CharField(source="medicine.medicine_code", read_only=True)
    dosage_form = serializers.CharField(source="medicine.dosage_form", read_only=True)
    strength = serializers.CharField(source="medicine.strength", read_only=True)

    class Meta:
        model = DispenseItem
        fields = [
            "id",
            "dispense",
            "prescription_item",
            "medicine",
            "medicine_name",
            "medicine_code",
            "dosage_form",
            "strength",
            "quantity",
            "unit_price",
            "subtotal",
        ]
        read_only_fields = ["id", "subtotal"]


class MedicineDispenseSerializer(serializers.ModelSerializer):
    items = DispenseItemSerializer(many=True, read_only=True)
    dispensed_by_name = serializers.CharField(source="dispensed_by.username", read_only=True)
    patient_name = serializers.CharField(source="patient.full_name", read_only=True)
    patient_id_code = serializers.CharField(source="patient.patient_id", read_only=True)
    prescription_code = serializers.CharField(source="prescription.prescription_id", read_only=True)
    doctor_name = serializers.CharField(source="prescription.doctor.full_name", read_only=True)

    class Meta:
        model = MedicineDispense
        fields = [
            "id",
            "dispense_id",
            "prescription",
            "prescription_code",
            "patient",
            "patient_name",
            "patient_id_code",
            "doctor_name",
            "dispensed_by",
            "dispensed_by_name",
            "total_amount",
            "notes",
            "items",
            "dispensed_at",
        ]
        read_only_fields = ["id", "dispense_id", "dispensed_by", "dispensed_at"]
