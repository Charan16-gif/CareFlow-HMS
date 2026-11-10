import re
from datetime import timedelta
from django.contrib.auth.models import User
from django.contrib.auth.password_validation import validate_password
from django.contrib.auth.tokens import default_token_generator
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from django.utils.encoding import force_bytes, force_str
from django.utils import timezone
from django.db.models import Q
from rest_framework import serializers, exceptions
from rest_framework_simplejwt.tokens import RefreshToken
from drf_spectacular.utils import extend_schema_field

from .models import UserProfile, EmailOTPVerification, UserRole
from .emails import send_otp_email, send_password_reset_link_email, send_patient_welcome_email_async
from .email_validation import (
    validate_email_address_complete,
    MSG_INVALID_EMAIL_FORMAT,
    MSG_INVALID_DOMAIN,
    MSG_SMTP_IMMEDIATE_REJECTION,
    MSG_SMTP_CONNECTION_FAILURE,
    MSG_EMAIL_ACCEPTED_BY_SMTP,
    MSG_OTP_INCORRECT,
    MSG_OTP_EXPIRED,
    MSG_OTP_RESENT,
    MSG_OTP_VERIFIED,
    MSG_DELIVERY_BOUNCE,
    MSG_ALREADY_REGISTERED,
    WRONG_EMAIL_ERROR,
    ALREADY_REGISTERED_ERROR,
)


class RegisterSerializer(serializers.Serializer):
    first_name = serializers.CharField(max_length=150, required=True)
    last_name = serializers.CharField(max_length=150, required=True)
    username = serializers.CharField(max_length=150, required=False, allow_blank=True)
    email = serializers.EmailField(required=True, error_messages={"invalid": MSG_INVALID_EMAIL_FORMAT})
    phone = serializers.CharField(max_length=25, required=False, allow_blank=True)
    password = serializers.CharField(write_only=True, required=True, min_length=8)
    confirm_password = serializers.CharField(write_only=True, required=True)
    date_of_birth = serializers.DateField(required=False, allow_null=True)
    gender = serializers.CharField(max_length=30, required=False, allow_blank=True, allow_null=True)
    blood_group = serializers.CharField(max_length=15, required=False, allow_blank=True, allow_null=True)
    address = serializers.CharField(max_length=500, required=False, allow_blank=True, allow_null=True)

    def validate_username(self, value):
        if not value:
            return ""
        clean = value.strip()
        if len(clean) < 3:
            raise serializers.ValidationError("Username must be at least 3 characters long.")
        if not re.match(r"^[a-zA-Z0-9_.-]+$", clean):
            raise serializers.ValidationError("Username can only contain letters, numbers, underscores, dots, and hyphens.")
        target_email = str(self.initial_data.get("email", "")).strip().lower()
        if User.objects.filter(username__iexact=clean).exclude(email__iexact=target_email).exists():
            raise serializers.ValidationError("This username is already taken. Please choose another username.")
        return clean

    def validate_email(self, value):
        clean_email = validate_email_address_complete(value)
        # If active user already exists with this email, cannot re-register
        if User.objects.filter(email__iexact=clean_email, is_active=True).exists():
            raise serializers.ValidationError(MSG_ALREADY_REGISTERED)
        return clean_email

    def validate(self, data):
        if data.get("password") != data.get("confirm_password"):
            raise serializers.ValidationError({"confirm_password": "Passwords do not match."})

        # Validate password strength
        pwd = data.get("password")
        if not re.search(r"[A-Z]", pwd):
            raise serializers.ValidationError({"password": "Password must contain at least one uppercase letter."})
        if not re.search(r"[a-z]", pwd):
            raise serializers.ValidationError({"password": "Password must contain at least one lowercase letter."})
        if not re.search(r"[0-9]", pwd):
            raise serializers.ValidationError({"password": "Password must contain at least one number."})
        if not re.search(r'[!@#$%^&*(),.?":{}|<>\-_=+[\]\\/`~]', pwd):
            raise serializers.ValidationError({"password": "Password must contain at least one special character."})

        # Validate date_of_birth
        if data.get("date_of_birth"):
            if data["date_of_birth"] > timezone.localdate():
                raise serializers.ValidationError({"date_of_birth": "Date of birth cannot be in the future."})

        # Validate gender
        if data.get("gender"):
            raw_g = str(data["gender"]).strip().upper().replace(" ", "_")
            valid_genders = {
                "MALE": "MALE",
                "FEMALE": "FEMALE",
                "OTHER": "OTHER",
                "PREFER_NOT_TO_SAY": "PREFER_NOT_TO_SAY",
                "PREFER_NOT_TO_STATE": "PREFER_NOT_TO_SAY",
            }
            if raw_g in valid_genders:
                data["gender"] = valid_genders[raw_g]
            elif not raw_g:
                data["gender"] = None
            else:
                raise serializers.ValidationError({"gender": "Please select a valid gender."})

        # Validate blood_group
        if data.get("blood_group"):
            raw_bg = str(data["blood_group"]).strip().upper()
            bg_map = {
                "A+": "A+", "A-": "A-", "B+": "B+", "B-": "B-",
                "AB+": "AB+", "AB-": "AB-", "O+": "O+", "O-": "O-",
                "A_POSITIVE": "A+", "A_NEGATIVE": "A-", "B_POSITIVE": "B+", "B_NEGATIVE": "B-",
                "AB_POSITIVE": "AB+", "AB_NEGATIVE": "AB-", "O_POSITIVE": "O+", "O_NEGATIVE": "O-",
            }
            if raw_bg in bg_map:
                data["blood_group"] = bg_map[raw_bg]
            elif not raw_bg:
                data["blood_group"] = None
            else:
                raise serializers.ValidationError({"blood_group": "Please select a valid blood group."})

        return data

    def save(self):
        email = self.validated_data["email"].strip().lower()
        desired_username = self.validated_data.get("username", "").strip() or email
        first_name = self.validated_data["first_name"].strip()
        last_name = self.validated_data["last_name"].strip()
        phone = self.validated_data.get("phone", "").strip()
        password = self.validated_data["password"]

        reg_payload = {
            "first_name": first_name,
            "last_name": last_name,
            "phone": phone,
            "date_of_birth": str(self.validated_data["date_of_birth"]) if self.validated_data.get("date_of_birth") else None,
            "gender": self.validated_data.get("gender") or None,
            "blood_group": self.validated_data.get("blood_group") or None,
            "address": self.validated_data.get("address") or None,
        }

        # If an unverified user exists with this email or username, update credentials
        user = User.objects.filter(email__iexact=email).first()
        if not user and desired_username != email:
            user = User.objects.filter(username__iexact=desired_username).first()

        if user:
            user.username = desired_username
            user.email = email
            user.first_name = first_name
            user.last_name = last_name
            user.set_password(password)
            user.is_active = False  # Keep unverified until OTP check
            user.save()
        else:
            user = User.objects.create_user(
                username=desired_username,
                email=email,
                password=password,
                first_name=first_name,
                last_name=last_name,
                is_active=False
            )

        # Ensure user profile exists
        profile, _ = UserProfile.objects.get_or_create(user=user)
        profile.phone_number = phone
        profile.is_email_verified = False
        profile.save()

        # Generate OTP (stored as cryptographic hash)
        otp_record, plain_code = EmailOTPVerification.create_otp_for_email(
            email=email,
            user=user,
            purpose="registration",
            validity_minutes=10,
            registration_data=reg_payload,
        )

        # Dispatch real email with plain code
        display_name = f"{first_name} {last_name}".strip() or "Valued Patient"
        email_result = send_otp_email(
            email=email,
            otp_code=plain_code,
            user_name=display_name,
            purpose="registration"
        )

        # Update OTP delivery status in database
        otp_record.delivery_status = email_result.get("status", "PENDING")
        if email_result.get("success"):
            otp_record.sent_at = timezone.now()
        else:
            otp_record.delivery_error = email_result.get("message", "")
        otp_record.save(update_fields=["delivery_status", "sent_at", "delivery_error"])

        if not email_result.get("success"):
            # Email delivery failed: keep user unverified (is_active=False) so retry works,
            # and raise ValidationError to prevent HTTP 201 Created and inform frontend.
            raise serializers.ValidationError({"email": email_result.get("message") or MSG_SMTP_CONNECTION_FAILURE})

        return {
            "user": user,
            "email": email,
            "email_sent": True,
            "email_status": email_result.get("status", "ACCEPTED"),
            "email_message": email_result["message"],
            "email_error": None,
        }


class VerifyOTPSerializer(serializers.Serializer):
    email = serializers.EmailField(required=True, error_messages={"invalid": MSG_INVALID_EMAIL_FORMAT})
    otp_code = serializers.CharField(max_length=6, min_length=6, required=True)
    purpose = serializers.CharField(default="registration", required=False)

    def validate(self, data):
        email = data.get("email", "").strip().lower()
        otp_input = data.get("otp_code", "").strip()
        purpose = data.get("purpose", "registration")

        # Find latest OTP record for this email
        otp_record = EmailOTPVerification.objects.filter(
            email__iexact=email,
            purpose=purpose,
            is_verified=False
        ).order_by("-created_at").first()

        if not otp_record:
            raise serializers.ValidationError({
                "otp_code": MSG_OTP_EXPIRED
            })

        # Check maximum failed attempts
        if otp_record.attempts >= 5:
            otp_record.delivery_status = "FAILED"
            otp_record.save(update_fields=["delivery_status"])
            raise serializers.ValidationError({
                "otp_code": f"Too many failed attempts. {MSG_OTP_EXPIRED}"
            })

        # Check expiration
        if otp_record.is_expired:
            raise serializers.ValidationError({
                "otp_code": MSG_OTP_EXPIRED
            })

        # Verify against stored cryptographic hash
        if not otp_record.check_otp(otp_input):
            otp_record.attempts += 1
            otp_record.save(update_fields=["attempts"])
            raise serializers.ValidationError({
                "otp_code": MSG_OTP_INCORRECT
            })

        data["otp_record"] = otp_record
        return data

    def save(self):
        otp_record = self.validated_data["otp_record"]
        email = self.validated_data["email"].strip().lower()

        # Mark OTP as verified and update delivery status
        otp_record.is_verified = True
        otp_record.delivery_status = "VERIFIED"
        otp_record.verified_at = timezone.now()
        otp_record.save(update_fields=["is_verified", "delivery_status", "verified_at"])

        # Activate user account
        user = otp_record.user or User.objects.filter(email__iexact=email).first()
        if user:
            user.is_active = True
            user.save(update_fields=["is_active"])

            # Mark profile verified
            profile, _ = UserProfile.objects.get_or_create(user=user)
            profile.is_email_verified = True
            profile.save(update_fields=["is_email_verified"])

            # Create or link Patient record for PATIENT role accounts upon successful OTP verification
            if profile.role == UserRole.PATIENT:
                try:
                    from patients.models import Patient
                    reg_data = otp_record.registration_data or {}
                    patient = Patient.objects.filter(user=user).first()
                    if not patient:
                        # Check if an unlinked patient with same email already exists (strictly excluding walk-in placeholders)
                        patient = (
                            Patient.objects.filter(email__iexact=user.email, user__isnull=True)
                            .exclude(patient_id="CF-WALKIN")
                            .exclude(patient_id__startswith="CF-WALKIN")
                            .exclude(first_name__icontains="Walk-in")
                            .exclude(last_name__icontains="Walk-in")
                            .exclude(first_name__icontains="Walkin")
                            .exclude(last_name__icontains="Walkin")
                            .exclude(last_name__iexact="Customer")
                            .first()
                        )
                        if patient:
                            patient.user = user
                            if not patient.first_name and user.first_name:
                                patient.first_name = user.first_name
                            if not patient.last_name and user.last_name:
                                patient.last_name = user.last_name
                            if not patient.phone_number and (reg_data.get("phone") or profile.phone_number):
                                patient.phone_number = reg_data.get("phone") or profile.phone_number
                            if not patient.date_of_birth and reg_data.get("date_of_birth"):
                                patient.date_of_birth = reg_data.get("date_of_birth")
                            if not patient.gender and reg_data.get("gender"):
                                patient.gender = reg_data.get("gender")
                            if not patient.blood_group and reg_data.get("blood_group"):
                                patient.blood_group = reg_data.get("blood_group")
                            if not patient.address and reg_data.get("address"):
                                patient.address = reg_data.get("address")
                            patient.save()
                        else:
                            phone = reg_data.get("phone") or profile.phone_number or "0000000000"
                            last_patient = Patient.objects.order_by("-id").first()
                            candidate_num = (last_patient.id + 10001) if last_patient else 10001
                            while Patient.objects.filter(patient_id=f"CF-P-{candidate_num}").exists():
                                candidate_num += 1

                            Patient.objects.create(
                                user=user,
                                patient_id=f"CF-P-{candidate_num}",
                                first_name=user.first_name or reg_data.get("first_name", "Registered"),
                                last_name=user.last_name or reg_data.get("last_name", "Patient"),
                                email=user.email,
                                phone_number=phone,
                                date_of_birth=reg_data.get("date_of_birth") or None,
                                gender=reg_data.get("gender") or None,
                                blood_group=reg_data.get("blood_group") or None,
                                address=reg_data.get("address") or None,
                                is_active=True,
                            )
                except Exception as p_err:
                    logger.error(f"Failed to create/link Patient record for user {user.id} ({user.email}): {p_err}")

                try:
                    from notifications.services import notify_role
                    from notifications.models import NotificationType
                    full_name = f"{user.first_name} {user.last_name}".strip() or user.username
                    notify_role(
                        role=UserRole.ADMIN,
                        title="New Patient Registration",
                        message=f"New patient {full_name} has registered and verified their account.",
                        notification_type=NotificationType.ACCOUNT,
                        action_url="/admin/users",
                        reference_id=f"PATIENT-{user.id}",
                    )
                except Exception as notif_err:
                    logger.error("Failed to notify admins of new patient registration: %s", notif_err)

            # Send official welcome email asynchronously
            send_patient_welcome_email_async(user=user, email=email)

            # Generate JWT credentials for automatic login
            refresh = RefreshToken.for_user(user)
            return {
                "verified": True,
                "user": {
                    "id": user.id,
                    "email": user.email,
                    "username": user.username,
                    "first_name": user.first_name,
                    "last_name": user.last_name,
                    "phone": profile.phone_number,
                },
                "tokens": {
                    "access": str(refresh.access_token),
                    "refresh": str(refresh),
                }
            }

        return {"verified": True, "user": None, "tokens": None}


class ResendOTPSerializer(serializers.Serializer):
    email = serializers.EmailField(required=True, error_messages={"invalid": MSG_INVALID_EMAIL_FORMAT})
    purpose = serializers.CharField(default="registration", required=False)

    def validate_email(self, value):
        return validate_email_address_complete(value)

    def validate(self, data):
        email = data.get("email")
        purpose = data.get("purpose", "registration")

        # Rate-limiting: Check if an OTP was generated within the last 45 seconds
        recent_otp = EmailOTPVerification.objects.filter(
            email__iexact=email,
            purpose=purpose,
            created_at__gte=timezone.now() - timedelta(seconds=45)
        ).first()

        if recent_otp:
            time_left = 45 - int((timezone.now() - recent_otp.created_at).total_seconds())
            raise serializers.ValidationError({
                "detail": f"Please wait {max(1, time_left)} seconds before requesting a new verification code."
            })

        return data

    def save(self):
        email = self.validated_data["email"]
        purpose = self.validated_data.get("purpose", "registration")

        user = User.objects.filter(email__iexact=email).first()
        display_name = (
            f"{user.first_name} {user.last_name}".strip()
            if user and (user.first_name or user.last_name)
            else "Valued Patient"
        )

        # Generate fresh OTP (stored as cryptographic hash)
        otp_record, plain_code = EmailOTPVerification.create_otp_for_email(
            email=email,
            user=user,
            purpose=purpose,
            validity_minutes=10
        )

        # Dispatch real email with plain code
        email_result = send_otp_email(
            email=email,
            otp_code=plain_code,
            user_name=display_name,
            purpose=purpose
        )

        # Update OTP delivery status in database
        otp_record.delivery_status = email_result.get("status", "PENDING")
        if email_result.get("success"):
            otp_record.sent_at = timezone.now()
        else:
            otp_record.delivery_error = email_result.get("message", "")
        otp_record.save(update_fields=["delivery_status", "sent_at", "delivery_error"])

        if not email_result.get("success"):
            raise serializers.ValidationError({"detail": email_result.get("message") or MSG_SMTP_CONNECTION_FAILURE})

        return {
            "email": email,
            "email_sent": True,
            "email_status": email_result.get("status", "ACCEPTED"),
            "email_message": MSG_OTP_RESENT,
            "email_error": None,
        }


class EmailCorrectionSerializer(serializers.Serializer):
    old_email = serializers.EmailField(required=True, error_messages={"invalid": MSG_INVALID_EMAIL_FORMAT})
    new_email = serializers.EmailField(required=True, error_messages={"invalid": MSG_INVALID_EMAIL_FORMAT})
    purpose = serializers.CharField(default="registration", required=False)

    def validate_new_email(self, value):
        clean_email = validate_email_address_complete(value)
        if User.objects.filter(email__iexact=clean_email, is_active=True).exists():
            raise serializers.ValidationError(MSG_ALREADY_REGISTERED)
        return clean_email

    def validate(self, data):
        old_email = data.get("old_email", "").strip().lower()
        new_email = data.get("new_email", "").strip().lower()
        if old_email == new_email:
            raise serializers.ValidationError({"new_email": "New email cannot be the same as the old email."})
        return data

    def save(self):
        old_email = self.validated_data["old_email"].strip().lower()
        new_email = self.validated_data["new_email"].strip().lower()
        purpose = self.validated_data.get("purpose", "registration")

        # Invalidate all previous unverified OTPs for old_email
        EmailOTPVerification.objects.filter(
            email__iexact=old_email,
            purpose=purpose,
            is_verified=False
        ).update(expires_at=timezone.now(), delivery_status="FAILED", delivery_error="Superseded by email correction")

        # Update unverified user if exists
        user = User.objects.filter(email__iexact=old_email, is_active=False).first()
        if user:
            user.email = new_email
            if user.username.lower() == old_email:
                user.username = new_email
            user.save(update_fields=["email", "username"])

        display_name = (
            f"{user.first_name} {user.last_name}".strip()
            if user and (user.first_name or user.last_name)
            else "Valued Patient"
        )

        # Create fresh OTP for new_email
        otp_record, plain_code = EmailOTPVerification.create_otp_for_email(
            email=new_email,
            user=user,
            purpose=purpose,
            validity_minutes=10
        )

        email_result = send_otp_email(
            email=new_email,
            otp_code=plain_code,
            user_name=display_name,
            purpose=purpose
        )

        otp_record.delivery_status = email_result.get("status", "PENDING")
        if email_result.get("success"):
            otp_record.sent_at = timezone.now()
        else:
            otp_record.delivery_error = email_result.get("message", "")
        otp_record.save(update_fields=["delivery_status", "sent_at", "delivery_error"])

        if not email_result.get("success"):
            raise serializers.ValidationError({"new_email": email_result.get("message") or MSG_SMTP_CONNECTION_FAILURE})

        return {
            "message": MSG_OTP_RESENT,
            "old_email": old_email,
            "new_email": new_email,
            "email_sent": True,
            "email_status": email_result.get("status", "ACCEPTED"),
            "email_message": MSG_OTP_RESENT,
        }


class RealtimeEmailValidationSerializer(serializers.Serializer):
    email = serializers.CharField(required=True, allow_blank=False, max_length=254)
    check_mailbox = serializers.BooleanField(default=True, required=False)

    def validate_email(self, value):
        return (value or "").strip().lower()


class EmailDeliveryStatusSerializer(serializers.Serializer):
    email = serializers.EmailField(required=True, error_messages={"invalid": MSG_INVALID_EMAIL_FORMAT})
    purpose = serializers.CharField(default="registration", required=False)


class EmailBounceWebhookSerializer(serializers.Serializer):
    email = serializers.EmailField(required=True)
    bounce_type = serializers.CharField(default="permanent")
    reason = serializers.CharField(required=False, allow_blank=True, default="Mailbox delivery failure / bounce")


class TestEmailSerializer(serializers.Serializer):
    recipient_email = serializers.EmailField(required=True)


class UserProfileSerializer(serializers.ModelSerializer):
    role = serializers.SerializerMethodField()
    phone_number = serializers.CharField(source="profile.phone_number", required=False, allow_blank=True)
    is_email_verified = serializers.BooleanField(source="profile.is_email_verified", read_only=True)
    doctor_id = serializers.SerializerMethodField()
    specialization = serializers.SerializerMethodField()
    department = serializers.SerializerMethodField()
    qualification = serializers.SerializerMethodField()
    patient_id = serializers.SerializerMethodField()
    date_of_birth = serializers.SerializerMethodField()
    gender = serializers.SerializerMethodField()
    blood_group = serializers.SerializerMethodField()
    address = serializers.SerializerMethodField()

    @extend_schema_field(serializers.CharField)
    def get_role(self, obj):
        from accounts.permissions import get_user_role
        return get_user_role(obj)

    @extend_schema_field(serializers.CharField)
    def get_doctor_id(self, obj):
        doc = getattr(obj, "doctor_profile", None)
        return doc.doctor_id if doc else None

    @extend_schema_field(serializers.CharField)
    def get_specialization(self, obj):
        doc = getattr(obj, "doctor_profile", None)
        return doc.specialization if doc else None

    @extend_schema_field(serializers.CharField)
    def get_department(self, obj):
        doc = getattr(obj, "doctor_profile", None)
        return doc.department if doc else None

    @extend_schema_field(serializers.CharField)
    def get_qualification(self, obj):
        doc = getattr(obj, "doctor_profile", None)
        return doc.qualification if doc else None

    @extend_schema_field(serializers.CharField(allow_null=True))
    def get_patient_id(self, obj):
        from accounts.permissions import get_user_role
        if get_user_role(obj) == UserRole.PATIENT:
            p = getattr(obj, "patient_profile", None)
            return p.patient_id if p else None
        return None

    @extend_schema_field(serializers.DateField(allow_null=True))
    def get_date_of_birth(self, obj):
        from accounts.permissions import get_user_role
        if get_user_role(obj) == UserRole.PATIENT:
            p = getattr(obj, "patient_profile", None)
            return p.date_of_birth if p else None
        return None

    @extend_schema_field(serializers.CharField(allow_null=True))
    def get_gender(self, obj):
        from accounts.permissions import get_user_role
        if get_user_role(obj) == UserRole.PATIENT:
            p = getattr(obj, "patient_profile", None)
            return p.gender if p else None
        return None

    @extend_schema_field(serializers.CharField(allow_null=True))
    def get_blood_group(self, obj):
        from accounts.permissions import get_user_role
        if get_user_role(obj) == UserRole.PATIENT:
            p = getattr(obj, "patient_profile", None)
            return p.blood_group if p else None
        return None

    @extend_schema_field(serializers.CharField(allow_null=True))
    def get_address(self, obj):
        from accounts.permissions import get_user_role
        if get_user_role(obj) == UserRole.PATIENT:
            p = getattr(obj, "patient_profile", None)
            return p.address if p else None
        return None

    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "email",
            "first_name",
            "last_name",
            "role",
            "phone_number",
            "is_email_verified",
            "doctor_id",
            "specialization",
            "department",
            "qualification",
            "patient_id",
            "date_of_birth",
            "gender",
            "blood_group",
            "address",
            "date_joined",
        ]
        read_only_fields = [
            "id",
            "username",
            "role",
            "is_email_verified",
            "doctor_id",
            "specialization",
            "department",
            "qualification",
            "patient_id",
            "date_joined",
        ]

    def validate_email(self, value):
        if not value:
            return ""
        clean_email = validate_email_address_complete(value)
        user_id = self.instance.id if self.instance else None
        if User.objects.filter(email__iexact=clean_email, is_active=True).exclude(id=user_id).exists():
            raise serializers.ValidationError(MSG_ALREADY_REGISTERED)
        return clean_email

    def update(self, instance, validated_data):
        from accounts.permissions import get_user_role
        from patients.models import Patient, Gender, BloodGroup

        profile_data = validated_data.pop("profile", {})
        phone_number = (
            profile_data.get("phone_number")
            or self.initial_data.get("phone")
            or self.initial_data.get("phone_number")
        )

        instance.first_name = validated_data.get("first_name", instance.first_name)
        instance.last_name = validated_data.get("last_name", instance.last_name)
        instance.email = validated_data.get("email", instance.email)
        instance.save()

        if phone_number is not None and hasattr(instance, "profile"):
            profile = instance.profile
            profile.phone_number = phone_number
            profile.save(update_fields=["phone_number"])

        # Strictly restrict patient fields ONLY to PATIENT role
        if get_user_role(instance) == UserRole.PATIENT:
            patient = getattr(instance, "patient_profile", None)
            if not patient:
                patient = (
                    Patient.objects.filter(email__iexact=instance.email, user__isnull=True)
                    .exclude(patient_id="CF-WALKIN")
                    .exclude(patient_id__startswith="CF-WALKIN")
                    .first()
                )
                if patient:
                    patient.user = instance
                    patient.save()
                else:
                    last_patient = Patient.objects.order_by("-id").first()
                    candidate_num = (last_patient.id + 10001) if last_patient else 10001
                    while Patient.objects.filter(patient_id=f"CF-P-{candidate_num}").exists():
                        candidate_num += 1

                    patient = Patient.objects.create(
                        user=instance,
                        patient_id=f"CF-P-{candidate_num}",
                        first_name=instance.first_name,
                        last_name=instance.last_name,
                        email=instance.email,
                        phone_number=phone_number or getattr(instance.profile, "phone_number", "") or "0000000000",
                        is_active=True,
                    )

            if patient:
                if "date_of_birth" in self.initial_data:
                    raw_dob = self.initial_data.get("date_of_birth")
                    patient.date_of_birth = raw_dob if raw_dob else None

                if "gender" in self.initial_data:
                    raw_gender = self.initial_data.get("gender")
                    if raw_gender:
                        g_str = str(raw_gender).strip().upper().replace(" ", "_")
                        valid_g = [c[0] for c in Gender.choices]
                        if g_str in valid_g:
                            patient.gender = g_str
                    else:
                        patient.gender = None

                if "blood_group" in self.initial_data:
                    raw_bg = self.initial_data.get("blood_group")
                    if raw_bg:
                        valid_bg = [c[0] for c in BloodGroup.choices]
                        if raw_bg in valid_bg:
                            patient.blood_group = raw_bg
                    else:
                        patient.blood_group = None

                if "address" in self.initial_data:
                    raw_addr = self.initial_data.get("address")
                    patient.address = raw_addr.strip() if raw_addr else None

                patient.first_name = instance.first_name
                patient.last_name = instance.last_name
                patient.email = instance.email
                if phone_number is not None:
                    patient.phone_number = phone_number
                patient.save()

        return instance


class ChangePasswordSerializer(serializers.Serializer):
    current_password = serializers.CharField(required=True, write_only=True)
    new_password = serializers.CharField(required=True, write_only=True)
    confirm_password = serializers.CharField(required=True, write_only=True)

    def validate_current_password(self, value):
        user = self.context["request"].user
        if not user.check_password(value):
            raise serializers.ValidationError("Current password is incorrect.")
        return value

    def validate(self, data):
        new_pwd = data.get("new_password")
        confirm_pwd = data.get("confirm_password")
        if new_pwd != confirm_pwd:
            raise serializers.ValidationError({"confirm_password": "New passwords do not match."})

        if len(new_pwd) < 8:
            raise serializers.ValidationError({"new_password": "Password must be at least 8 characters long."})
        if not re.search(r'[A-Z]', new_pwd):
            raise serializers.ValidationError({"new_password": "Password must contain at least one uppercase letter."})
        if not re.search(r'[a-z]', new_pwd):
            raise serializers.ValidationError({"new_password": "Password must contain at least one lowercase letter."})
        if not re.search(r'[0-9]', new_pwd):
            raise serializers.ValidationError({"new_password": "Password must contain at least one digit."})
        if not re.search(r'[!@#$%^&*(),.?":{}|<>\-_=+[\]\\/`~]', new_pwd):
            raise serializers.ValidationError({"new_password": "Password must contain at least one special character."})

        return data

    def save(self):
        user = self.context["request"].user
        user.set_password(self.validated_data["new_password"])
        user.save()
        return user


class PasswordResetRequestSerializer(serializers.Serializer):
    """
    Validates email/username and generates password reset link sent to email.
    """
    email = serializers.CharField(required=True, help_text="Registered email address or username")

    def validate_email(self, value):
        identifier = value.strip()
        user = User.objects.filter(
            Q(email__iexact=identifier) | Q(username__iexact=identifier)
        ).first()

        if not user:
            raise serializers.ValidationError("No registered CareFlow HMS account found with this email or username.")

        if not user.email:
            raise serializers.ValidationError("This account does not have a registered email address associated with it.")

        return identifier

    def save(self, frontend_base_url="http://localhost:3000"):
        identifier = self.validated_data["email"]
        user = User.objects.filter(
            Q(email__iexact=identifier) | Q(username__iexact=identifier)
        ).first()

        uid = urlsafe_base64_encode(force_bytes(user.pk))
        token = default_token_generator.make_token(user)

        # Build reset URL
        clean_base = frontend_base_url.rstrip("/")
        reset_url = f"{clean_base}/reset-password?uid={uid}&token={token}"

        display_name = user.get_full_name() or user.username or "Valued User"
        result = send_password_reset_link_email(
            email=user.email,
            reset_url=reset_url,
            user_name=display_name
        )

        return {
            "email": user.email,
            "reset_url": reset_url,
            "email_sent": result["success"],
            "message": result["message"],
            "error": result.get("error"),
        }


class PasswordResetConfirmSerializer(serializers.Serializer):
    """
    Validates token and updates user password securely.
    """
    uid = serializers.CharField(required=True)
    token = serializers.CharField(required=True)
    new_password = serializers.CharField(required=True, min_length=8, write_only=True)
    confirm_password = serializers.CharField(required=True, write_only=True)

    def validate(self, data):
        uid = data.get("uid")
        token = data.get("token")
        new_pwd = data.get("new_password")
        confirm_pwd = data.get("confirm_password")

        # Decode UID
        try:
            user_id = force_str(urlsafe_base64_decode(uid))
            user = User.objects.get(pk=user_id)
        except (TypeError, ValueError, OverflowError, User.DoesNotExist):
            raise serializers.ValidationError({"uid": "Invalid password reset link or user ID."})

        # Validate token
        if not default_token_generator.check_token(user, token):
            raise serializers.ValidationError({
                "token": "This password reset link is invalid or has expired. Please request a new link."
            })

        # Passwords matching check
        if new_pwd != confirm_pwd:
            raise serializers.ValidationError({"confirm_password": "Passwords do not match."})

        # Password complexity check
        if not re.search(r"[A-Z]", new_pwd):
            raise serializers.ValidationError({"new_password": "Password must contain at least one uppercase letter."})
        if not re.search(r"[a-z]", new_pwd):
            raise serializers.ValidationError({"new_password": "Password must contain at least one lowercase letter."})
        if not re.search(r"[0-9]", new_pwd):
            raise serializers.ValidationError({"new_password": "Password must contain at least one number."})
        if not re.search(r'[!@#$%^&*(),.?":{}|<>\-_=+[\]\\/`~]', new_pwd):
            raise serializers.ValidationError({"new_password": "Password must contain at least one special character."})

        data["user"] = user
        return data

    def save(self):
        user = self.validated_data["user"]
        user.set_password(self.validated_data["new_password"])
        # If user was unverified/inactive, activate them now
        user.is_active = True
        user.save()

        # Update profile verification status if exists
        if hasattr(user, "profile"):
            user.profile.is_email_verified = True
            user.profile.save(update_fields=["is_email_verified"])

        return user


class CareFlowTokenObtainPairSerializer(serializers.Serializer):
    """
    CareFlow HMS Authoritative Authentication Serializer.
    Validates user credentials, distinguishes specific authentication error categories,
    authoritatively verifies the requested role, and issues JWT tokens.
    """
    username = serializers.CharField(required=False, allow_blank=True)
    password = serializers.CharField(required=False, allow_blank=True, write_only=True)
    role = serializers.CharField(required=False, allow_blank=True)

    def validate(self, attrs):
        username = attrs.get("username", "").strip()
        password = attrs.get("password", "")
        selected_role = attrs.get("role", "").strip().upper()

        if not username or not password:
            raise serializers.ValidationError({"detail": "Please enter your required login details."})

        # Match user by username or email (case-insensitive)
        user = User.objects.filter(
            Q(username__iexact=username) | Q(email__iexact=username)
        ).first()

        if not user:
            raise exceptions.AuthenticationFailed(
                detail="No account found with these details.",
                code="unregistered_account"
            )

        if not user.check_password(password):
            raise exceptions.AuthenticationFailed(
                detail="Incorrect password. Please try again.",
                code="incorrect_password"
            )

        if not user.is_active:
            raise exceptions.AuthenticationFailed(
                detail="Please verify your email before logging in.",
                code="unverified_email"
            )

        # Authoritative backend role detection
        user_role = getattr(user, "profile", None) and user.profile.role
        if not user_role:
            if user.is_superuser:
                user_role = "ADMIN"
            elif hasattr(user, "patient_profile") and user.patient_profile:
                user_role = "PATIENT"
            elif hasattr(user, "doctor_profile") and user.doctor_profile:
                user_role = "DOCTOR"
            elif hasattr(user, "staff_profile") and user.staff_profile:
                user_role = user.staff_profile.role

        # Normalize role string (e.g. 'LAB STAFF' -> 'LAB_STAFF')
        normalized_selected = selected_role.replace(" ", "_") if selected_role else ""

        if normalized_selected and user_role:
            if normalized_selected != user_role:
                raise exceptions.AuthenticationFailed(
                    detail="Wrong role selected. Please select the correct role.",
                    code="role_mismatch"
                )

        refresh = RefreshToken.for_user(user)
        user.last_login = timezone.now()
        user.save(update_fields=["last_login"])

        return {
            "refresh": str(refresh),
            "access": str(refresh.access_token),
            "user": {
                "id": user.id,
                "username": user.username,
                "email": user.email,
                "first_name": user.first_name,
                "last_name": user.last_name,
                "role": user_role,
            }
        }


class DatabaseBackupRecordSerializer(serializers.ModelSerializer):
    created_by_name = serializers.SerializerMethodField()
    restored_by_name = serializers.SerializerMethodField()
    file_size_display = serializers.CharField(read_only=True)

    class Meta:
        from .models import DatabaseBackupRecord
        model = DatabaseBackupRecord
        fields = [
            "id",
            "filename",
            "file_size_bytes",
            "file_size_display",
            "sha256_checksum",
            "status",
            "is_automated",
            "notes",
            "error_message",
            "created_by",
            "created_by_name",
            "created_at",
            "restored_at",
            "restored_by",
            "restored_by_name",
        ]
        read_only_fields = fields

    def get_created_by_name(self, obj):
        if not obj.created_by:
            return "System / Scheduler" if obj.is_automated else "CLI Administrator"
        return obj.created_by.get_full_name() or obj.created_by.username

    def get_restored_by_name(self, obj):
        if not obj.restored_by:
            return None
        return obj.restored_by.get_full_name() or obj.restored_by.username


class DatabaseRestoreRequestSerializer(serializers.Serializer):
    confirmation_phrase = serializers.CharField(
        required=True,
        help_text="Must match exact pattern: RESTORE-CONFIRM-<filename>"
    )



