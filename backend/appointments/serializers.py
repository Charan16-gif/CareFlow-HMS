from rest_framework import serializers
from rest_framework.exceptions import PermissionDenied
from django.utils import timezone
from .models import (
    Appointment,
    AppointmentStatus,
    PatientFeedback,
    ConsultationExperience,
    DoctorCommunication,
    OverallSatisfaction,
    MedicalQuery,
    MedicalQueryCategory,
    QuerySeverity,
    MedicalQueryStatus,
)
from patients.models import Patient
from staff.models import Doctor
from pharmacy.models import Prescription, Medicine


class AppointmentSerializer(serializers.ModelSerializer):
    patient = serializers.PrimaryKeyRelatedField(
        queryset=Patient.objects.all(),
        required=False
    )
    patient_name = serializers.CharField(source="patient.full_name", read_only=True)
    patient_id_code = serializers.CharField(source="patient.patient_id", read_only=True)
    doctor = serializers.PrimaryKeyRelatedField(
        queryset=Doctor.objects.all(),
        required=False,
        allow_null=True
    )
    doctor_name = serializers.CharField(source="doctor.full_name", read_only=True)
    doctor_department = serializers.CharField(source="doctor.department", read_only=True)
    doctor_specialization = serializers.CharField(source="doctor.specialization", read_only=True)
    consultation_fee = serializers.DecimalField(
        source="doctor.consultation_fee",
        max_digits=10,
        decimal_places=2,
        read_only=True
    )
    patient_details = serializers.SerializerMethodField()
    doctor_details = serializers.SerializerMethodField()
    health_problem = serializers.CharField(required=False, default="General Health Checkup", allow_blank=True)
    problem_description = serializers.CharField(required=False, default="", allow_blank=True)
    reason_for_visit = serializers.CharField(required=False, default="General Consultation", allow_blank=True)
    has_prescription = serializers.SerializerMethodField()
    has_lab_test = serializers.SerializerMethodField()
    visit_status = serializers.SerializerMethodField()
    feedback = serializers.SerializerMethodField()

    def get_has_prescription(self, obj):
        return obj.prescriptions.exclude(status="CANCELLED").exists()

    def get_has_lab_test(self, obj):
        return obj.lab_orders.exclude(status="CANCELLED").exists()

    def get_feedback(self, obj):
        feedback_obj = getattr(obj, "feedback", None)
        if not feedback_obj:
            return None
        return {
            "id": feedback_obj.id,
            "doctor_rating": feedback_obj.doctor_rating,
            "consultation_experience": feedback_obj.consultation_experience,
            "doctor_communication": feedback_obj.doctor_communication,
            "overall_satisfaction": feedback_obj.overall_satisfaction,
            "comments": feedback_obj.comments,
            "created_at": feedback_obj.created_at,
        }

    def get_patient_details(self, obj):
        if not obj.patient:
            return None
        return {
            "id": obj.patient.id,
            "patient_id": obj.patient.patient_id,
            "first_name": obj.patient.first_name,
            "last_name": obj.patient.last_name,
            "full_name": obj.patient.full_name,
            "phone_number": obj.patient.phone_number,
            "gender": obj.patient.gender,
            "blood_group": obj.patient.blood_group,
        }

    def get_doctor_details(self, obj):
        if not obj.doctor:
            return None
        return {
            "id": obj.doctor.id,
            "doctor_id": obj.doctor.doctor_id,
            "first_name": obj.doctor.first_name,
            "last_name": obj.doctor.last_name,
            "full_name": obj.doctor.full_name,
            "specialization": obj.doctor.specialization,
            "department": obj.doctor.department,
            "phone_number": obj.doctor.phone_number,
            "consultation_fee": str(obj.doctor.consultation_fee),
            "user": {
                "first_name": obj.doctor.first_name,
                "last_name": obj.doctor.last_name,
                "email": obj.doctor.email,
            },
        }

    def get_visit_status(self, obj):
        if obj.status == AppointmentStatus.CANCELLED:
            return "Cancelled"
        if obj.status in (AppointmentStatus.COMPLETED, getattr(AppointmentStatus, "CHECKED_OUT", "CHECKED_OUT")):
            return "Checked Out"
        if self.get_has_prescription(obj):
            return "Consulted"
        if obj.is_checked_in:
            return "Checked In"
        return "Scheduled"

    def to_internal_value(self, data):
        data = data.copy() if hasattr(data, "copy") else dict(data)
        if "reason" in data and ("reason_for_visit" not in data or not data.get("reason_for_visit")):
            data["reason_for_visit"] = data.get("reason")
        if not data.get("reason_for_visit"):
            data["reason_for_visit"] = "General Consultation"
        return super().to_internal_value(data)

    def validate(self, attrs):
        request = self.context.get("request")
        user = getattr(request, "user", None)
        role = None
        if user and user.is_authenticated:
            from accounts.permissions import get_user_role
            role = get_user_role(user)

        health_problem = attrs.get("health_problem") or getattr(self.instance, "health_problem", "General Health Checkup")
        problem_description = (attrs.get("problem_description") or getattr(self.instance, "problem_description", "")).strip()

        # Handle Patient automatic doctor assignment during validation (only for new appointments or date/time/problem changes)
        is_new = self.instance is None
        is_rescheduling = bool(
            self.instance
            and (
                ("appointment_date" in attrs and attrs["appointment_date"] != self.instance.appointment_date)
                or ("appointment_time" in attrs and attrs["appointment_time"] != self.instance.appointment_time)
                or ("health_problem" in attrs and attrs["health_problem"] != self.instance.health_problem)
            )
        )

        if (is_new or is_rescheduling) and (role == "PATIENT" or (role is not None and not attrs.get("doctor") and not getattr(self.instance, "doctor", None))):
            if health_problem == "Other" and not problem_description:
                raise serializers.ValidationError({
                    "problem_description": "Please provide a description of your symptoms when selecting 'Other'."
                })

            appointment_date = attrs.get("appointment_date") or getattr(self.instance, "appointment_date", None)
            appointment_time = attrs.get("appointment_time") or getattr(self.instance, "appointment_time", None)

            if appointment_date and appointment_time:
                from .assignment import assign_doctor_automatically
                assigned_doc = assign_doctor_automatically(
                    health_problem=health_problem,
                    target_date=appointment_date,
                    target_time=appointment_time
                )
                attrs["doctor"] = assigned_doc

        attrs = super().validate(attrs)
        appointment_date = attrs.get("appointment_date") or getattr(self.instance, "appointment_date", None)
        appointment_time = attrs.get("appointment_time") or getattr(self.instance, "appointment_time", None)
        doctor = attrs.get("doctor") or getattr(self.instance, "doctor", None)

        is_new = self.instance is None
        time_changed = False
        if self.instance and (self.instance.appointment_date != appointment_date or self.instance.appointment_time != appointment_time):
            time_changed = True

        status_val = attrs.get("status") or getattr(self.instance, "status", None)
        terminal_statuses = (AppointmentStatus.CANCELLED, AppointmentStatus.COMPLETED, getattr(AppointmentStatus, "CHECKED_OUT", "CHECKED_OUT"))

        if (is_new or time_changed) and status_val not in terminal_statuses:
            if appointment_date and appointment_time:
                now_local = timezone.localtime(timezone.now())
                today = now_local.date()
                now_time = now_local.time()

                if appointment_date < today:
                    raise serializers.ValidationError({
                        "appointment_date": "Cannot book an appointment for a past date."
                    })
                elif appointment_date == today and appointment_time <= now_time:
                    raise serializers.ValidationError({
                        "appointment_time": "Cannot book an appointment for a past time slot."
                    })

            if doctor and appointment_date:
                weekday_name = appointment_date.strftime("%A")
                doc_days = [d.strip().lower() for d in (doctor.available_days or "").split(",") if d.strip()]
                if doc_days and weekday_name.lower() not in doc_days:
                    raise serializers.ValidationError({
                        "appointment_date": f"{doctor.full_name} is not available on {weekday_name}s."
                    })

            if doctor and appointment_date and appointment_time:
                conflicts = Appointment.objects.filter(
                    doctor=doctor,
                    appointment_date=appointment_date,
                    appointment_time=appointment_time
                ).exclude(status=AppointmentStatus.CANCELLED)
                if self.instance:
                    conflicts = conflicts.exclude(pk=self.instance.pk)
                if conflicts.exists():
                    raise serializers.ValidationError({
                        "appointment_time": "The selected doctor already has an active appointment in this time slot."
                    })

        return attrs

    class Meta:
        model = Appointment
        fields = [
            "id",
            "appointment_id",
            "patient",
            "patient_name",
            "patient_id_code",
            "patient_details",
            "doctor",
            "doctor_name",
            "doctor_department",
            "doctor_specialization",
            "doctor_details",
            "consultation_fee",
            "appointment_date",
            "appointment_time",
            "status",
            "visit_status",
            "health_problem",
            "problem_description",
            "reason_for_visit",
            "authorized_notes",
            "has_prescription",
            "has_lab_test",
            "feedback",
            "is_checked_in",
            "check_in_time",
            "check_out_time",
            "cancellation_reason",
            "created_by",
            "created_at",
            "updated_at",
        ]
        validators = []
        extra_kwargs = {
            "doctor": {"required": False, "allow_null": True},
        }
        read_only_fields = [
            "id",
            "appointment_id",
            "visit_status",
            "has_prescription",
            "has_lab_test",
            "feedback",
            "patient_details",
            "doctor_details",
            "created_by",
            "created_at",
            "updated_at",
            "check_out_time",
        ]


class PatientFeedbackSerializer(serializers.ModelSerializer):
    appointment = serializers.PrimaryKeyRelatedField(
        queryset=Appointment.objects.all()
    )
    appointment_id = serializers.CharField(source="appointment.appointment_id", read_only=True)
    appointment_date = serializers.DateField(source="appointment.appointment_date", read_only=True)
    patient = serializers.PrimaryKeyRelatedField(read_only=True)
    patient_name = serializers.CharField(source="patient.full_name", read_only=True)
    doctor = serializers.PrimaryKeyRelatedField(read_only=True)
    doctor_name = serializers.CharField(source="doctor.full_name", read_only=True)
    doctor_specialization = serializers.CharField(source="doctor.specialization", read_only=True)

    class Meta:
        model = PatientFeedback
        fields = [
            "id",
            "appointment",
            "appointment_id",
            "appointment_date",
            "patient",
            "patient_name",
            "doctor",
            "doctor_name",
            "doctor_specialization",
            "doctor_rating",
            "consultation_experience",
            "doctor_communication",
            "overall_satisfaction",
            "comments",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "patient", "doctor", "created_at", "updated_at"]

    def validate_appointment(self, value):
        valid_statuses = [AppointmentStatus.COMPLETED, getattr(AppointmentStatus, "CHECKED_OUT", "CHECKED_OUT")]
        if value.status not in valid_statuses:
            raise serializers.ValidationError("Feedback can only be submitted for completed consultations.")
        if hasattr(value, "feedback"):
            raise serializers.ValidationError("Feedback has already been submitted for this consultation.")
        return value

    def validate(self, attrs):
        request = self.context.get("request")
        appointment = attrs.get("appointment")
        if request and request.user:
            patient_profile = getattr(request.user, "patient_profile", None) or Patient.objects.filter(user=request.user).first()
            if appointment and patient_profile and appointment.patient != patient_profile:
                raise PermissionDenied("You can only submit feedback for your own consultations.")
        return attrs


class MedicalQuerySerializer(serializers.ModelSerializer):
    appointment = serializers.PrimaryKeyRelatedField(queryset=Appointment.objects.all())
    appointment_id = serializers.CharField(source="appointment.appointment_id", read_only=True)
    appointment_date = serializers.DateField(source="appointment.appointment_date", read_only=True)
    patient = serializers.PrimaryKeyRelatedField(read_only=True)
    patient_name = serializers.CharField(source="patient.full_name", read_only=True)
    doctor = serializers.PrimaryKeyRelatedField(read_only=True)
    doctor_name = serializers.CharField(source="doctor.full_name", read_only=True)
    doctor_specialization = serializers.CharField(source="doctor.specialization", read_only=True)
    prescription = serializers.PrimaryKeyRelatedField(
        queryset=Prescription.objects.all(),
        required=False,
        allow_null=True
    )
    prescription_code = serializers.CharField(source="prescription.prescription_id", read_only=True, default="")
    medicine = serializers.PrimaryKeyRelatedField(
        queryset=Medicine.objects.all(),
        required=False,
        allow_null=True
    )
    category_display = serializers.CharField(source="get_category_display", read_only=True)
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    follow_up_appointment_id = serializers.CharField(source="follow_up_appointment.appointment_id", read_only=True, default="")

    class Meta:
        model = MedicalQuery
        fields = [
            "id",
            "query_id",
            "appointment",
            "appointment_id",
            "appointment_date",
            "patient",
            "patient_name",
            "doctor",
            "doctor_name",
            "doctor_specialization",
            "prescription",
            "prescription_code",
            "medicine",
            "medicine_name",
            "category",
            "category_display",
            "description",
            "started_at",
            "severity",
            "status",
            "status_display",
            "doctor_response",
            "responded_at",
            "recommend_follow_up",
            "recommend_lab_tests",
            "lab_test_recommendations",
            "reviewed_at",
            "resolved_at",
            "follow_up_appointment",
            "follow_up_appointment_id",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "query_id",
            "patient",
            "doctor",
            "status",
            "doctor_response",
            "responded_at",
            "recommend_follow_up",
            "recommend_lab_tests",
            "lab_test_recommendations",
            "reviewed_at",
            "resolved_at",
            "follow_up_appointment",
            "created_at",
            "updated_at",
        ]

    def validate(self, attrs):
        request = self.context.get("request")
        appointment = attrs.get("appointment")
        prescription = attrs.get("prescription")
        medicine = attrs.get("medicine")

        if request and request.user:
            patient_profile = getattr(request.user, "patient_profile", None) or Patient.objects.filter(user=request.user).first()
            if appointment and patient_profile and appointment.patient != patient_profile:
                raise PermissionDenied("You can only submit queries regarding your own consultations.")
            if prescription and patient_profile and prescription.patient != patient_profile:
                raise PermissionDenied("Prescription does not belong to your medical record.")

        # If medicine object provided, fill medicine_name automatically if blank
        if medicine and not attrs.get("medicine_name"):
            attrs["medicine_name"] = medicine.name

        return attrs


class MedicalQueryResponseSerializer(serializers.Serializer):
    doctor_response = serializers.CharField(required=True, min_length=5)
    recommend_follow_up = serializers.BooleanField(required=False, default=False)
    recommend_lab_tests = serializers.BooleanField(required=False, default=False)
    lab_test_recommendations = serializers.CharField(required=False, allow_blank=True, default="")
    mark_resolved = serializers.BooleanField(required=False, default=False)
