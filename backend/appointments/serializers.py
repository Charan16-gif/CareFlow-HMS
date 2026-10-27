from rest_framework import serializers
from django.utils import timezone
from .models import Appointment, AppointmentStatus
from patients.models import Patient


class AppointmentSerializer(serializers.ModelSerializer):
    patient = serializers.PrimaryKeyRelatedField(
        queryset=Patient.objects.all(),
        required=False
    )
    patient_name = serializers.CharField(source="patient.full_name", read_only=True)
    patient_id_code = serializers.CharField(source="patient.patient_id", read_only=True)
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
    reason_for_visit = serializers.CharField(required=False, default="General Consultation", allow_blank=True)
    has_prescription = serializers.SerializerMethodField()
    has_lab_test = serializers.SerializerMethodField()
    visit_status = serializers.SerializerMethodField()

    def get_has_prescription(self, obj):
        return obj.prescriptions.exclude(status="CANCELLED").exists()

    def get_has_lab_test(self, obj):
        return obj.lab_orders.exclude(status="CANCELLED").exists()

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
            "has_prescription",
            "has_lab_test",
            "is_checked_in",
            "check_in_time",
            "check_out_time",
            "cancellation_reason",
            "reason_for_visit",
            "authorized_notes",
            "created_by",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "appointment_id", "visit_status", "has_prescription", "has_lab_test", "patient_details", "doctor_details", "created_by", "created_at", "updated_at", "check_out_time"]
