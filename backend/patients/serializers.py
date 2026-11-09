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
    date_of_birth = serializers.DateField(required=False, allow_null=True)
    gender = serializers.CharField(max_length=20, required=False, allow_null=True, allow_blank=True)
    blood_group = serializers.CharField(max_length=10, required=False, allow_null=True, allow_blank=True)
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

    GENDER_MAP = {
        "MALE": "MALE", "male": "MALE", "Male": "MALE",
        "FEMALE": "FEMALE", "female": "FEMALE", "Female": "FEMALE",
        "OTHER": "OTHER", "other": "OTHER", "Other": "OTHER",
        "PREFER_NOT_TO_SAY": "PREFER_NOT_TO_SAY",
        "prefer_not_to_say": "PREFER_NOT_TO_SAY",
        "Prefer not to say": "PREFER_NOT_TO_SAY",
        "PREFER NOT TO SAY": "PREFER_NOT_TO_SAY",
    }

    BLOOD_GROUP_MAP = {
        "A+": "A+",
        "A-": "A-",
        "B+": "B+",
        "B-": "B-",
        "AB+": "AB+",
        "AB-": "AB-",
        "O+": "O+",
        "O-": "O-",
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
        if "gender" in data:
            val = data["gender"]
            if val in self.GENDER_MAP:
                data["gender"] = self.GENDER_MAP[val]
            elif val == "" or val is None:
                data["gender"] = None
        if "blood_group" in data:
            val = data["blood_group"]
            if val in self.BLOOD_GROUP_MAP:
                data["blood_group"] = self.BLOOD_GROUP_MAP[val]
            elif val == "" or val is None:
                data["blood_group"] = None
        if "date_of_birth" in data and (data["date_of_birth"] == "" or data["date_of_birth"] is None):
            data["date_of_birth"] = None
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

    def validate_email(self, value):
        if not value:
            return ""
        from accounts.email_validation import validate_email_address_complete
        clean_email = validate_email_address_complete(value)
        user_id = self.instance.user_id if (self.instance and self.instance.user_id) else None
        if User.objects.filter(email__iexact=clean_email, is_active=True).exclude(id=user_id).exists():
            raise serializers.ValidationError("A user with this email address already exists.")
        return clean_email

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

