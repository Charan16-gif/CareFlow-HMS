from decimal import Decimal
from rest_framework import serializers
from .models import LabTest, LabOrder, LabCategory
from .validators import validate_lab_report_file


class LabTestSerializer(serializers.ModelSerializer):
    class Meta:
        model = LabTest
        fields = [
            "id",
            "test_code",
            "test_name",
            "category",
            "description",
            "price",
            "reference_range",
            "unit",
            "turnaround_time",
            "is_active",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "test_code", "created_at", "updated_at"]


class LabOrderSerializer(serializers.ModelSerializer):
    test_name = serializers.CharField(source="test.test_name", read_only=True)
    test_code = serializers.CharField(source="test.test_code", read_only=True)
    test_category = serializers.CharField(source="test.category", read_only=True)
    test_price = serializers.DecimalField(source="test.price", max_digits=10, decimal_places=2, read_only=True)
    test_unit = serializers.CharField(source="test.unit", read_only=True)
    test_reference_range = serializers.CharField(source="test.reference_range", read_only=True)

    patient_name = serializers.CharField(source="patient.full_name", read_only=True)
    patient_identifier = serializers.CharField(source="patient.patient_id", read_only=True)
    patient_gender = serializers.CharField(source="patient.gender", read_only=True)
    patient_phone = serializers.CharField(source="patient.phone_number", read_only=True)

    doctor_name = serializers.CharField(source="doctor.full_name", read_only=True)
    doctor_specialization = serializers.CharField(source="doctor.specialization", read_only=True)

    assigned_staff_name = serializers.CharField(source="assigned_staff.username", read_only=True)
    cancelled_by_name = serializers.CharField(source="cancelled_by.username", read_only=True)

    # Optional field for doctors entering a custom test
    custom_test_name = serializers.CharField(write_only=True, required=False, allow_blank=True)
    custom_test_category = serializers.ChoiceField(
        choices=LabCategory.choices,
        write_only=True,
        required=False,
        default=LabCategory.OTHER
    )

    class Meta:
        model = LabOrder
        fields = [
            "id",
            "order_id",
            "patient",
            "patient_name",
            "patient_identifier",
            "patient_gender",
            "patient_phone",
            "doctor",
            "doctor_name",
            "doctor_specialization",
            "appointment",
            "test",
            "custom_test_name",
            "custom_test_category",
            "test_name",
            "test_code",
            "test_category",
            "test_price",
            "test_unit",
            "test_reference_range",
            "status",
            "clinical_notes",
            "assigned_staff",
            "assigned_staff_name",
            "result_value",
            "result_unit",
            "result_interpretation",
            "result_notes",
            "reference_range_used",
            "report_file",
            "cancellation_requested",
            "cancellation_reason",
            "cancellation_requested_at",
            "cancellation_status",
            "cancellation_remarks",
            "cancellation_processed_at",
            "cancelled_by",
            "cancelled_by_name",
            "ordered_at",
            "sample_collected_at",
            "completed_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "order_id",
            "doctor",
            "ordered_at",
            "updated_at",
            "assigned_staff",
            "cancelled_by",
            "cancellation_requested",
            "cancellation_requested_at",
            "cancellation_status",
            "cancellation_processed_at",
        ]
        extra_kwargs = {
            "test": {"required": False},
        }

    def validate(self, attrs):
        # Support either existing test OR custom_test_name
        test = attrs.get("test")
        custom_test_name = attrs.get("custom_test_name")

        if not test and not custom_test_name and self.instance is None:
            raise serializers.ValidationError({
                "test": "Please select a diagnostic test from the catalogue or enter a custom test name."
            })

        if not test and custom_test_name:
            category = attrs.get("custom_test_category", LabCategory.OTHER)
            # Find existing test or create new one
            lab_test, _ = LabTest.objects.get_or_create(
                test_name__iexact=custom_test_name.strip(),
                defaults={
                    "test_name": custom_test_name.strip(),
                    "category": category,
                    "price": Decimal("25.00"),
                    "reference_range": "Standard clinical thresholds",
                    "unit": "standard",
                    "is_active": True,
                }
            )
            attrs["test"] = lab_test

        attrs.pop("custom_test_name", None)
        attrs.pop("custom_test_category", None)
        return attrs

    def validate_report_file(self, value):
        if value:
            validate_lab_report_file(value)
        return value
