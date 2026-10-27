from django.db import transaction
from rest_framework import serializers
from django.contrib.auth.models import User
from accounts.models import UserRole, UserProfile
from accounts.emails import send_user_welcome_credentials_email_async
from .models import Doctor, StaffProfile


class DoctorSerializer(serializers.ModelSerializer):
    full_name = serializers.CharField(read_only=True)
    is_available = serializers.SerializerMethodField()
    is_active = serializers.SerializerMethodField()
    user = serializers.PrimaryKeyRelatedField(queryset=User.objects.all(), required=False)
    username = serializers.CharField(write_only=True, required=False)
    password = serializers.CharField(write_only=True, required=False)
    phone = serializers.CharField(write_only=True, required=False)

    def get_is_available(self, obj):
        return obj.status == "ACTIVE" and (not obj.user or obj.user.is_active)

    def get_is_active(self, obj):
        return obj.status == "ACTIVE" and (not obj.user or obj.user.is_active)

    def to_internal_value(self, data):
        data = data.copy() if hasattr(data, "copy") else dict(data)
        if "phone" in data and ("phone_number" not in data or not data["phone_number"]):
            data["phone_number"] = data.get("phone")
        if "qualification" not in data or not data["qualification"]:
            data["qualification"] = "MBBS"
        if "department" not in data or not data["department"]:
            data["department"] = data.get("specialization") or "General Medicine"
        if "is_available" in data and "status" not in data:
            data["status"] = "ACTIVE" if data["is_available"] else "INACTIVE"
        elif "is_active" in data and "status" not in data:
            data["status"] = "ACTIVE" if data["is_active"] else "INACTIVE"
        return super().to_internal_value(data)

    class Meta:
        model = Doctor
        fields = [
            "id",
            "doctor_id",
            "user",
            "username",
            "password",
            "first_name",
            "last_name",
            "full_name",
            "specialization",
            "qualification",
            "license_number",
            "department",
            "phone_number",
            "phone",
            "email",
            "consultation_fee",
            "available_days",
            "start_time",
            "end_time",
            "status",
            "is_available",
            "is_active",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "doctor_id", "is_available", "is_active", "created_at", "updated_at"]

    def create(self, validated_data):
        user = validated_data.get("user")
        password = validated_data.pop("password", None)
        username = validated_data.pop("username", None)
        phone = validated_data.pop("phone", None)
        if phone and not validated_data.get("phone_number"):
            validated_data["phone_number"] = phone
        email = validated_data.get("email", "").strip().lower()
        raw_password = password
        created_new_user = False

        with transaction.atomic():
            if not user:
                if not password:
                    raise serializers.ValidationError({"password": "Password is required to create a new doctor account."})
                if not username:
                    username = email or f"doc_{validated_data.get('license_number', '').lower()}"

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
                validated_data["user"] = user
                created_new_user = True

            doctor = super().create(validated_data)

            # Ensure user profile role matches Doctor and email is verified
            profile, _ = UserProfile.objects.get_or_create(user=doctor.user)
            profile.role = UserRole.DOCTOR
            profile.is_email_verified = True
            profile.phone_number = validated_data.get("phone_number", "")
            profile.save()

            # Automatically dispatch welcome credentials email to the doctor
            if email and (created_new_user or raw_password):
                user_login = doctor.user.username if doctor.user else (username or email)
                full_name = doctor.full_name or f"Dr. {doctor.first_name} {doctor.last_name}".strip()
                send_user_welcome_credentials_email_async(
                    email=email,
                    user_name=full_name,
                    username=user_login,
                    password=raw_password,
                    role_display="Doctor",
                    account_id=doctor.doctor_id,
                )

            return doctor


class StaffProfileSerializer(serializers.ModelSerializer):
    full_name = serializers.CharField(read_only=True)
    is_active = serializers.SerializerMethodField()
    role = serializers.CharField(max_length=20)
    user = serializers.PrimaryKeyRelatedField(queryset=User.objects.all(), required=False)
    username = serializers.CharField(write_only=True, required=False)
    password = serializers.CharField(write_only=True, required=False)
    phone = serializers.CharField(write_only=True, required=False)

    DEPARTMENT_MAP = {
        "LAB_STAFF": "Pathology",
        "PHARMACIST": "Dispensary",
        "RECEPTIONIST": "Front Desk",
    }

    def get_is_active(self, obj):
        return obj.status == "ACTIVE" and (not obj.user or obj.user.is_active)

    def to_internal_value(self, data):
        data = data.copy() if hasattr(data, "copy") else dict(data)
        if "phone" in data and ("phone_number" not in data or not data["phone_number"]):
            data["phone_number"] = data.get("phone")
        role = data.get("role", "")
        if "department" not in data or not data["department"]:
            data["department"] = self.DEPARTMENT_MAP.get(role, "General Staff")
        if "is_active" in data and "status" not in data:
            data["status"] = "ACTIVE" if data["is_active"] else "INACTIVE"
        return super().to_internal_value(data)

    class Meta:
        model = StaffProfile
        fields = [
            "id",
            "staff_id",
            "user",
            "username",
            "password",
            "first_name",
            "last_name",
            "full_name",
            "role",
            "department",
            "qualification",
            "phone_number",
            "phone",
            "email",
            "status",
            "is_active",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "staff_id", "is_active", "created_at", "updated_at"]

    def validate_role(self, value):
        # Strictly prevent creating an Admin account through staff CRUD
        if value == UserRole.ADMIN or str(value).upper() == "ADMIN":
            raise serializers.ValidationError(
                "Creating additional Administrator accounts is strictly prohibited in CareFlow HMS."
            )
        if value not in (UserRole.RECEPTIONIST, UserRole.LAB_STAFF, UserRole.PHARMACIST):
            raise serializers.ValidationError("Invalid staff role specified.")
        return value

    def create(self, validated_data):
        user = validated_data.get("user")
        password = validated_data.pop("password", None)
        username = validated_data.pop("username", None)
        phone = validated_data.pop("phone", None)
        if phone and not validated_data.get("phone_number"):
            validated_data["phone_number"] = phone
        email = validated_data.get("email", "").strip().lower()
        role = validated_data.get("role")
        raw_password = password
        created_new_user = False

        with transaction.atomic():
            if not user:
                if not password:
                    raise serializers.ValidationError({"password": "Password is required to create a new staff account."})
                if not username:
                    username = email or f"staff_{str(role).lower()}_{validated_data.get('last_name', '').lower()}"

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
                validated_data["user"] = user
                created_new_user = True

            staff = super().create(validated_data)
            # Ensure user profile role matches and email is verified
            profile, _ = UserProfile.objects.get_or_create(user=staff.user)
            profile.role = role
            profile.is_email_verified = True
            profile.phone_number = validated_data.get("phone_number", "")
            profile.save()

            role_display_map = {
                UserRole.RECEPTIONIST: "Receptionist",
                UserRole.LAB_STAFF: "Laboratory Staff",
                UserRole.PHARMACIST: "Pharmacist",
            }
            role_label = role_display_map.get(role, staff.get_role_display() if hasattr(staff, "get_role_display") else str(role))

            # Automatically dispatch welcome credentials email to staff member
            if email and (created_new_user or raw_password):
                user_login = staff.user.username if staff.user else (username or email)
                full_name = staff.full_name or f"{staff.first_name} {staff.last_name}".strip()
                send_user_welcome_credentials_email_async(
                    email=email,
                    user_name=full_name,
                    username=user_login,
                    password=raw_password,
                    role_display=role_label,
                    account_id=staff.staff_id,
                )

            return staff

