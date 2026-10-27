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

from .models import UserProfile, EmailOTPVerification
from .emails import send_otp_email, send_password_reset_link_email, send_patient_welcome_email_async


class RegisterSerializer(serializers.Serializer):
    first_name = serializers.CharField(max_length=150, required=True)
    last_name = serializers.CharField(max_length=150, required=True)
    username = serializers.CharField(max_length=150, required=False, allow_blank=True)
    email = serializers.EmailField(required=True)
    phone = serializers.CharField(max_length=25, required=False, allow_blank=True)
    password = serializers.CharField(write_only=True, required=True, min_length=8)
    confirm_password = serializers.CharField(write_only=True, required=True)

    def validate_username(self, value):
        if not value:
            return ""
        clean = value.strip()
        if len(clean) < 3:
            raise serializers.ValidationError("Username must be at least 3 characters long.")
        if not re.match(r"^[a-zA-Z0-9_.-]+$", clean):
            raise serializers.ValidationError("Username can only contain letters, numbers, underscores, dots, and hyphens.")
        if User.objects.filter(username__iexact=clean, is_active=True).exists():
            raise serializers.ValidationError("This username is already taken. Please choose another username.")
        return clean

    def validate_email(self, value):
        clean_email = value.strip().lower()
        # If active user already exists with this email, cannot re-register
        if User.objects.filter(email__iexact=clean_email, is_active=True).exists():
            raise serializers.ValidationError("An active account with this email address already exists. Please sign in instead.")
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

        return data

    def save(self):
        email = self.validated_data["email"].strip().lower()
        desired_username = self.validated_data.get("username", "").strip() or email
        first_name = self.validated_data["first_name"].strip()
        last_name = self.validated_data["last_name"].strip()
        phone = self.validated_data.get("phone", "").strip()
        password = self.validated_data["password"]

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
            validity_minutes=10
        )

        # Dispatch real email with plain code
        display_name = f"{first_name} {last_name}".strip() or "Valued Patient"
        email_result = send_otp_email(
            email=email,
            otp_code=plain_code,
            user_name=display_name,
            purpose="registration"
        )

        return {
            "user": user,
            "email": email,
            "email_sent": email_result["success"],
            "email_message": email_result["message"],
            "email_error": email_result.get("error"),
        }


class VerifyOTPSerializer(serializers.Serializer):
    email = serializers.EmailField(required=True)
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
                "otp_code": "No active verification code found for this email. Please request a new OTP."
            })

        # Check maximum failed attempts
        if otp_record.attempts >= 5:
            raise serializers.ValidationError({
                "otp_code": "Too many failed attempts for this code. Please request a new OTP code."
            })

        # Check expiration
        if otp_record.is_expired:
            raise serializers.ValidationError({
                "otp_code": "This verification code has expired. Please request a new code."
            })

        # Verify against stored cryptographic hash
        if not otp_record.check_otp(otp_input):
            otp_record.attempts += 1
            otp_record.save(update_fields=["attempts"])
            remaining = 5 - otp_record.attempts
            raise serializers.ValidationError({
                "otp_code": f"Incorrect verification code. ({remaining} attempts remaining)"
            })

        data["otp_record"] = otp_record
        return data

    def save(self):
        otp_record = self.validated_data["otp_record"]
        email = self.validated_data["email"].strip().lower()

        # Mark OTP as verified
        otp_record.is_verified = True
        otp_record.save(update_fields=["is_verified"])

        # Activate user account
        user = otp_record.user or User.objects.filter(email__iexact=email).first()
        if user:
            user.is_active = True
            user.save(update_fields=["is_active"])

            # Mark profile verified
            profile, _ = UserProfile.objects.get_or_create(user=user)
            profile.is_email_verified = True
            profile.save(update_fields=["is_email_verified"])

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
    email = serializers.EmailField(required=True)
    purpose = serializers.CharField(default="registration", required=False)

    def validate_email(self, value):
        return value.strip().lower()

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

        return {
            "email": email,
            "email_sent": email_result["success"],
            "email_message": email_result["message"],
            "email_error": email_result.get("error"),
        }


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
            "date_joined",
        ]

    def update(self, instance, validated_data):
        profile_data = validated_data.pop("profile", {})
        phone_number = profile_data.get("phone_number")

        instance.first_name = validated_data.get("first_name", instance.first_name)
        instance.last_name = validated_data.get("last_name", instance.last_name)
        instance.email = validated_data.get("email", instance.email)
        instance.save()

        if phone_number is not None and hasattr(instance, "profile"):
            profile = instance.profile
            profile.phone_number = phone_number
            profile.save(update_fields=["phone_number"])

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


