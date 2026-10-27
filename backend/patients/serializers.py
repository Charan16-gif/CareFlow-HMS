from django.db import transaction
from django.contrib.auth.models import User
from accounts.models import UserRole, UserProfile
from accounts.emails import send_user_welcome_credentials_email_async
from rest_framework import serializers
from .models import Patient


class PatientSerializer(serializers.ModelSerializer):
    full_name = serializers.CharField(read_only=True)
    username = serializers.CharField(write_only=True, required=False)
    password = serializers.CharField(write_only=True, required=False)
    phone = serializers.CharField(write_only=True, required=False)
    has_booked_appointment = serializers.SerializerMethodField()
    has_prescription = serializers.SerializerMethodField()
    has_unbilled_prescription = serializers.SerializerMethodField()
    can_generate_bill = serializers.SerializerMethodField()

    def get_has_booked_appointment(self, obj):
        return obj.appointments.exclude(status="CANCELLED").exists()

    def get_has_prescription(self, obj):
        return obj.prescriptions.exclude(status="CANCELLED").exists()

    def get_has_unbilled_prescription(self, obj):
        from billing.models import Bill, BillStatus, BillItemType
        from pharmacy.models import PrescriptionStatus
        valid_rxs = obj.prescriptions.exclude(status=PrescriptionStatus.CANCELLED)
        if not valid_rxs.exists():
            return False

        existing_bills = (
            Bill.objects.filter(patient=obj)
            .exclude(status=BillStatus.CANCELLED)
            .exclude(items__item_type=BillItemType.MEDICINE)
        )
        billed_appt_ids = set(
            existing_bills.filter(appointment__isnull=False).values_list("appointment_id", flat=True)
        )

        for rx in valid_rxs:
            if rx.appointment_id and rx.appointment_id in billed_appt_ids:
                continue
            bill_after = existing_bills.filter(created_at__gte=rx.created_at).exists()
            if not bill_after:
                return True

        return False

    def get_can_generate_bill(self, obj):
        has_appt = obj.appointments.exclude(status="CANCELLED").exists()
        if not has_appt:
            return False
        return self.get_has_unbilled_prescription(obj)

    BLOOD_GROUP_MAP = {
        "A_POSITIVE": "A+",
        "A_NEGATIVE": "A-",
        "B_POSITIVE": "B+",
        "B_NEGATIVE": "B-",
        "AB_POSITIVE": "AB+",
        "AB_NEGATIVE": "AB-",
        "O_POSITIVE": "O+",
        "O_NEGATIVE": "O-",
    }

    def to_internal_value(self, data):
        data = data.copy() if hasattr(data, "copy") else dict(data)
        if "phone" in data and ("phone_number" not in data or not data["phone_number"]):
            data["phone_number"] = data.get("phone")
        if "blood_group" in data and data["blood_group"] in self.BLOOD_GROUP_MAP:
            data["blood_group"] = self.BLOOD_GROUP_MAP[data["blood_group"]]
        return super().to_internal_value(data)

    class Meta:
        model = Patient
        fields = [
            "id",
            "patient_id",
            "user",
            "username",
            "password",
            "first_name",
            "last_name",
            "full_name",
            "date_of_birth",
            "gender",
            "blood_group",
            "phone_number",
            "phone",
            "email",
            "address",
            "emergency_contact_name",
            "emergency_contact_phone",
            "emergency_contact_relation",
            "medical_history",
            "allergies",
            "registration_date",
            "has_booked_appointment",
            "has_prescription",
            "has_unbilled_prescription",
            "can_generate_bill",
            "is_active",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "patient_id", "has_booked_appointment", "has_prescription", "has_unbilled_prescription", "can_generate_bill", "created_at", "updated_at"]

    def create(self, validated_data):
        user = validated_data.get("user")
        password = validated_data.pop("password", None)
        username = validated_data.pop("username", None)
        phone = validated_data.pop("phone", None)
        if phone and not validated_data.get("phone_number"):
            validated_data["phone_number"] = phone
        email = validated_data.get("email", "").strip().lower() if validated_data.get("email") else ""
        raw_password = password
        created_new_user = False

        with transaction.atomic():
            if not user and password:
                if not username:
                    phone_suffix = validated_data.get("phone_number", "").replace("-", "")[-6:]
                    username = email or f"patient_{phone_suffix}"
                if User.objects.filter(username__iexact=username).exists():
                    raise serializers.ValidationError({"username": "A user with this username already exists."})
                if email and User.objects.filter(email__iexact=email).exists():
                    raise serializers.ValidationError({"email": "A user with this email already exists."})

                user = User.objects.create_user(
                    username=username,
                    email=email,
                    password=password,
                    first_name=validated_data.get("first_name", ""),
                    last_name=validated_data.get("last_name", ""),
                )
                profile, _ = UserProfile.objects.get_or_create(user=user)
                profile.role = UserRole.PATIENT
                profile.is_email_verified = True
                profile.phone_number = validated_data.get("phone_number", "")
                profile.save()
                validated_data["user"] = user
                created_new_user = True

            patient = super().create(validated_data)

            # Automatically dispatch welcome credentials email to the patient
            if email and (created_new_user or raw_password):
                user_login = user.username if user else (username or email)
                full_name = patient.full_name or f"{patient.first_name} {patient.last_name}".strip() or "Valued Patient"
                send_user_welcome_credentials_email_async(
                    email=email,
                    user_name=full_name,
                    username=user_login,
                    password=raw_password,
                    role_display="Patient",
                    account_id=patient.patient_id,
                )

            return patient

