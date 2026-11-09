from datetime import datetime, time, timedelta
from django.db import transaction
from django.db.models import Avg, Count, Q, F
from django.utils import timezone
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.response import Response
from drf_spectacular.utils import extend_schema, extend_schema_view

from accounts.models import UserRole
from accounts.permissions import get_user_role, IsSelfPatientOrStaff
from staff.models import Doctor, DoctorStatus
from patients.models import Patient
from accounts.emails import send_appointment_confirmation_email_async
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
from .serializers import (
    AppointmentSerializer,
    PatientFeedbackSerializer,
    MedicalQuerySerializer,
    MedicalQueryResponseSerializer,
)
from .assignment import (
    HEALTH_PROBLEMS,
    HEALTH_PROBLEM_SPECIALIZATION_MAP,
    get_target_specialization,
    get_specialization_filter_q,
    assign_doctor_automatically,
    get_available_problem_slots,
)


@extend_schema_view(
    list=extend_schema(summary="List appointments"),
    retrieve=extend_schema(summary="Retrieve specific appointment"),
    create=extend_schema(summary="Schedule appointment (Receptionist or Patient with Auto-Assignment)"),
    update=extend_schema(summary="Update appointment details or status"),
    partial_update=extend_schema(summary="Partial update appointment"),
    destroy=extend_schema(summary="Cancel appointment"),
)
class AppointmentViewSet(viewsets.ModelViewSet):
    """
    CareFlow HMS Appointment Lifecycle.
    Enforces role-based permissions:
    - Receptionist: Full appointment scheduling, reassignment (specialization-validated), and check-in.
    - Doctor: View their appointments; record clinical notes; mark completed.
    - Patient: View their appointments; book appointments (with centralized automatic doctor assignment); cancel scheduled slots.
    - Admin: Oversight and administrative auditing.
    """
    queryset = Appointment.objects.all()
    serializer_class = AppointmentSerializer
    permission_classes = [permissions.IsAuthenticated, IsSelfPatientOrStaff]
    filterset_fields = ["status", "appointment_date", "doctor", "patient", "is_checked_in", "health_problem"]
    search_fields = [
        "appointment_id",
        "patient__first_name",
        "patient__last_name",
        "doctor__first_name",
        "doctor__last_name",
        "reason_for_visit",
        "health_problem",
        "problem_description",
    ]
    ordering_fields = ["appointment_date", "appointment_time", "created_at"]

    def get_queryset(self):
        user = self.request.user
        role = get_user_role(user)

        if role in (UserRole.ADMIN, UserRole.RECEPTIONIST) or user.is_superuser:
            return Appointment.objects.all()
        elif role == UserRole.DOCTOR:
            return Appointment.objects.filter(doctor__user=user)
        elif role == UserRole.PATIENT:
            return Appointment.objects.filter(patient__user=user)
        return Appointment.objects.none()

    @action(detail=False, methods=["get"], url_path="health-problems")
    def health_problems(self, request):
        """
        Returns the curated list of 12 health complaint categories with explanations
        and their target clinical specializations for patient appointment booking.
        """
        return Response(HEALTH_PROBLEMS)

    @action(detail=False, methods=["get"], url_path="available-slots")
    def available_slots(self, request):
        """
        Calculates available 30-minute appointment slots on a given date.
        Supports:
        1. Automatic routing by 'health_problem' (Patient flow).
        2. Specific doctor scheduling by 'doctor' ID (Receptionist flow).
        """
        health_problem = request.query_params.get("health_problem")
        doctor_id = request.query_params.get("doctor")
        date_str = request.query_params.get("date")

        if not date_str:
            return Response({"error": "Query parameter 'date' (YYYY-MM-DD) is required."}, status=400)

        try:
            target_date = datetime.strptime(date_str, "%Y-%m-%d").date()
        except ValueError:
            return Response({"error": "Invalid date format. Use YYYY-MM-DD."}, status=400)

        # 1. Routing by Health Problem (Patient Auto-Assignment Flow)
        if health_problem:
            slots_data = get_available_problem_slots(health_problem, target_date)
            return Response(slots_data)

        # 2. Specific Doctor Scheduling Flow
        if not doctor_id:
            return Response(
                {"error": "Either 'health_problem' or 'doctor' query parameter must be provided."},
                status=400
            )

        try:
            doctor = Doctor.objects.get(id=doctor_id)
        except (Doctor.DoesNotExist, ValueError):
            return Response({"error": "Doctor not found."}, status=404)

        now_local = timezone.localtime(timezone.now())
        today = now_local.date()
        now_time = now_local.time()

        if target_date < today:
            return Response({
                "doctor": doctor.full_name,
                "date": date_str,
                "is_available_day": False,
                "message": "No available appointment slots. Please choose another date or doctor.",
                "available_slots": []
            })

        weekday_name = target_date.strftime("%A")
        doc_days = [d.strip().lower() for d in (doctor.available_days or "").split(",") if d.strip()]
        if doc_days and weekday_name.lower() not in doc_days:
            return Response({
                "doctor": doctor.full_name,
                "date": date_str,
                "is_available_day": False,
                "message": f"{doctor.full_name} is not available on {weekday_name}s.",
                "available_slots": []
            })

        start_t = doctor.start_time or time(9, 0)
        end_t = doctor.end_time or time(17, 0)

        slots = []
        curr = datetime.combine(target_date, start_t)
        end_dt = datetime.combine(target_date, end_t)

        while curr < end_dt:
            slot_time = curr.time()
            if target_date > today or slot_time > now_time:
                slots.append(slot_time.strftime("%H:%M:%S"))
            curr += timedelta(minutes=30)

        booked_times = Appointment.objects.filter(
            doctor=doctor,
            appointment_date=target_date
        ).exclude(status=AppointmentStatus.CANCELLED).values_list("appointment_time", flat=True)

        booked_strings = {t.strftime("%H:%M:%S") for t in booked_times}
        available = [s for s in slots if s not in booked_strings]

        message = None
        if not available:
            message = "No available appointment slots. Please choose another date or doctor."

        return Response({
            "doctor": doctor.full_name,
            "date": date_str,
            "is_available_day": True,
            "message": message,
            "available_slots": available
        })

    def perform_create(self, serializer):
        user = self.request.user
        role = get_user_role(user)

        with transaction.atomic():
            appointment_date = serializer.validated_data.get("appointment_date")
            appointment_time = serializer.validated_data.get("appointment_time")
            health_problem = serializer.validated_data.get("health_problem") or "General Health Checkup"
            problem_description = (serializer.validated_data.get("problem_description") or "").strip()

            # Date/time past validation
            if appointment_date and appointment_time:
                now_local = timezone.localtime(timezone.now())
                today = now_local.date()
                now_time = now_local.time()

                if appointment_date < today:
                    raise ValidationError({"appointment_date": "Cannot book an appointment for a past date."})
                if appointment_date == today and appointment_time <= now_time:
                    raise ValidationError({"appointment_time": "Cannot book an appointment for a past time slot."})

            if role == UserRole.PATIENT:
                # Patient: Mandatory automatic doctor assignment
                if health_problem == "Other" and not problem_description:
                    raise ValidationError({"problem_description": "Please provide a description of your symptoms when selecting 'Other'."})

                # Centralized auto-assignment ignores client-submitted doctor
                assigned_doctor = assign_doctor_automatically(
                    health_problem=health_problem,
                    target_date=appointment_date,
                    target_time=appointment_time
                )
                serializer.validated_data["doctor"] = assigned_doctor
                serializer.validated_data["health_problem"] = health_problem
                serializer.validated_data["problem_description"] = problem_description

                # Auto-sync reason for visit
                if not serializer.validated_data.get("reason_for_visit") or serializer.validated_data.get("reason_for_visit") == "General Consultation":
                    serializer.validated_data["reason_for_visit"] = (
                        f"{health_problem}: {problem_description}" if problem_description else health_problem
                    )

                # Patient identity resolution
                patient_inst = serializer.validated_data.get("patient")
                if not patient_inst:
                    patient_inst = getattr(user, "patient_profile", None)
                    if not patient_inst:
                        patient_inst = Patient.objects.filter(user=user).first()
                    if not patient_inst:
                        patient_inst = Patient.objects.create(
                            user=user,
                            first_name=user.first_name or user.username,
                            last_name=user.last_name or "",
                            email=user.email or "",
                            phone_number=getattr(getattr(user, "profile", None), "phone_number", "") or "0000000000",
                        )
                elif patient_inst.user != user:
                    raise PermissionDenied("Patients can only book appointments for their own profile.")

                # Row-level locking to prevent race condition
                conflicts = Appointment.objects.select_for_update().filter(
                    doctor=assigned_doctor,
                    appointment_date=appointment_date,
                    appointment_time=appointment_time
                ).exclude(status=AppointmentStatus.CANCELLED)
                if conflicts.exists():
                    raise ValidationError({
                        "detail": "No suitable doctor is available for your selected problem and appointment time. Please choose another date or time."
                    })

                appointment = serializer.save(
                    created_by=user,
                    patient=patient_inst,
                    doctor=assigned_doctor,
                    status=AppointmentStatus.SCHEDULED
                )
                send_appointment_confirmation_email_async(appointment=appointment)

                try:
                    from notifications.services import create_notification, notify_role
                    from notifications.models import NotificationType
                    # Notify assigned Doctor
                    if assigned_doctor and assigned_doctor.user:
                        create_notification(
                            recipient=assigned_doctor.user,
                            title="New Appointment Scheduled",
                            message=f"New appointment {appointment.appointment_id} scheduled with patient {patient_inst.full_name} on {appointment.appointment_date} at {appointment.appointment_time}.",
                            notification_type=NotificationType.APPOINTMENT,
                            action_url="/doctor/appointments",
                            reference_id=appointment.appointment_id,
                        )
                    # Notify Receptionists
                    notify_role(
                        role=UserRole.RECEPTIONIST,
                        title="New Appointment Booking",
                        message=f"New appointment {appointment.appointment_id} booked for {patient_inst.full_name} with Dr. {assigned_doctor.full_name}.",
                        notification_type=NotificationType.APPOINTMENT,
                        action_url="/receptionist/appointments",
                        reference_id=appointment.appointment_id,
                    )
                    # Notify Patient
                    create_notification(
                        recipient=user,
                        title="Appointment Scheduled",
                        message=f"Your appointment ({appointment.appointment_id}) with Dr. {assigned_doctor.full_name} is scheduled for {appointment.appointment_date} at {appointment.appointment_time}.",
                        notification_type=NotificationType.APPOINTMENT,
                        action_url="/patient/appointments",
                        reference_id=appointment.appointment_id,
                    )
                except Exception as notif_err:
                    logger.error("Failed to send appointment creation notifications: %s", notif_err)

                return

            elif role in (UserRole.RECEPTIONIST, UserRole.ADMIN) or user.is_superuser:
                # Receptionist/Admin: If doctor not provided, auto-assign. If provided, validate specialization.
                doc = serializer.validated_data.get("doctor")
                if not doc and health_problem:
                    doc = assign_doctor_automatically(
                        health_problem=health_problem,
                        target_date=appointment_date,
                        target_time=appointment_time
                    )
                    serializer.validated_data["doctor"] = doc
                elif doc and health_problem:
                    target_spec = get_target_specialization(health_problem)
                    spec_q = get_specialization_filter_q(target_spec)
                    if not Doctor.objects.filter(id=doc.id).filter(spec_q).exists():
                        raise ValidationError({
                            "doctor": f"Selected doctor specialization ({doc.specialization}) does not match the required clinical specialization ({target_spec}) for {health_problem}."
                        })

                # Check conflict
                if doc:
                    conflicts = Appointment.objects.select_for_update().filter(
                        doctor=doc,
                        appointment_date=appointment_date,
                        appointment_time=appointment_time
                    ).exclude(status=AppointmentStatus.CANCELLED)
                    if conflicts.exists():
                        raise ValidationError({"appointment_time": "The selected doctor already has an active appointment in this time slot."})

                appointment = serializer.save(created_by=user)
                send_appointment_confirmation_email_async(appointment=appointment)

                try:
                    from notifications.services import create_notification
                    from notifications.models import NotificationType
                    if appointment.doctor and appointment.doctor.user:
                        create_notification(
                            recipient=appointment.doctor.user,
                            title="New Appointment Scheduled",
                            message=f"Appointment {appointment.appointment_id} scheduled with patient {appointment.patient.full_name} for {appointment.appointment_date}.",
                            notification_type=NotificationType.APPOINTMENT,
                            action_url="/doctor/appointments",
                            reference_id=appointment.appointment_id,
                        )
                    if appointment.patient and appointment.patient.user:
                        create_notification(
                            recipient=appointment.patient.user,
                            title="Appointment Scheduled",
                            message=f"An appointment ({appointment.appointment_id}) has been scheduled for you on {appointment.appointment_date}.",
                            notification_type=NotificationType.APPOINTMENT,
                            action_url="/patient/appointments",
                            reference_id=appointment.appointment_id,
                        )
                except Exception as notif_err:
                    logger.error("Failed to send receptionist appointment notifications: %s", notif_err)

                return

            raise PermissionDenied("You do not have permission to schedule clinical appointments.")

    def perform_update(self, serializer):
        user = self.request.user
        role = get_user_role(user)
        instance = serializer.instance

        if role == UserRole.PATIENT:
            new_status = self.request.data.get("status")
            if new_status and new_status == AppointmentStatus.CANCELLED:
                if instance.is_checked_in:
                    raise PermissionDenied("Checked-in appointments cannot be cancelled by the patient. Please consult reception.")
                serializer.save(status=AppointmentStatus.CANCELLED)
                return
            raise PermissionDenied("Patients cannot alter consultation details directly.")

        # Reassignment validation for Receptionist / Admin
        new_doctor = serializer.validated_data.get("doctor")
        if new_doctor and new_doctor != instance.doctor:
            ref_problem = instance.health_problem or "General Health Checkup"
            target_spec = get_target_specialization(ref_problem)
            spec_q = get_specialization_filter_q(target_spec)
            if not Doctor.objects.filter(id=new_doctor.id).filter(spec_q).exists():
                raise ValidationError({
                    "doctor": f"Cannot reassign appointment to Dr. {new_doctor.full_name} ({new_doctor.specialization}). The clinical complaint requires a {target_spec}."
                })

            target_date = serializer.validated_data.get("appointment_date") or instance.appointment_date
            target_time = serializer.validated_data.get("appointment_time") or instance.appointment_time
            conflicts = Appointment.objects.filter(
                doctor=new_doctor,
                appointment_date=target_date,
                appointment_time=target_time
            ).exclude(pk=instance.pk).exclude(status=AppointmentStatus.CANCELLED)
            if conflicts.exists():
                raise ValidationError({"doctor": f"Dr. {new_doctor.full_name} is not available in the specified time slot."})

        new_status = self.request.data.get("status") or serializer.validated_data.get("status")
        extra_kwargs = {}
        if new_status in (AppointmentStatus.COMPLETED, getattr(AppointmentStatus, "CHECKED_OUT", "CHECKED_OUT")):
            extra_kwargs["is_checked_in"] = False
            extra_kwargs["check_out_time"] = timezone.now()

        if role == UserRole.DOCTOR:
            if instance.doctor.user != user:
                raise PermissionDenied("Doctors can only update notes for their assigned appointments.")
            serializer.save(**extra_kwargs)
            return

        if role in (UserRole.RECEPTIONIST, UserRole.ADMIN) or user.is_superuser:
            serializer.save(**extra_kwargs)
            return

        raise PermissionDenied("You do not have permission to modify this appointment.")

    def perform_destroy(self, instance):
        user = self.request.user
        role = get_user_role(user)

        if role in (UserRole.RECEPTIONIST, UserRole.ADMIN) or user.is_superuser:
            instance.status = AppointmentStatus.CANCELLED
            instance.save(update_fields=["status"])
        elif role == UserRole.PATIENT and instance.patient.user == user:
            if instance.is_checked_in:
                raise PermissionDenied("Checked-in appointments cannot be cancelled by the patient. Please consult reception.")
            instance.status = AppointmentStatus.CANCELLED
            instance.save(update_fields=["status"])
        elif role == UserRole.DOCTOR and instance.doctor.user == user:
            instance.status = AppointmentStatus.CANCELLED
            instance.save(update_fields=["status"])
        else:
            raise PermissionDenied("You do not have permission to cancel this appointment.")

    @action(detail=True, methods=["post"], url_path="check-in")
    def check_in(self, request, pk=None):
        user = request.user
        role = get_user_role(user)
        if role not in (UserRole.RECEPTIONIST, UserRole.ADMIN) and not user.is_superuser:
            raise PermissionDenied("Only Receptionists and Administrators can check in patients.")

        appointment = self.get_object()
        if appointment.status in (AppointmentStatus.CANCELLED, AppointmentStatus.COMPLETED, AppointmentStatus.NO_SHOW):
            return Response(
                {"error": f"Cannot check in an appointment with status {appointment.status}."},
                status=400
            )

        if appointment.is_checked_in:
            return Response(
                {"error": "Patient has already been checked in for this appointment.", "check_in_time": appointment.check_in_time},
                status=400
            )

        appointment.is_checked_in = True
        appointment.check_in_time = timezone.now()
        if appointment.status == AppointmentStatus.SCHEDULED:
            appointment.status = AppointmentStatus.CONFIRMED
        appointment.save(update_fields=["is_checked_in", "check_in_time", "status", "updated_at"])

        serializer = self.get_serializer(appointment)
        return Response({
            "message": f"Patient {appointment.patient.full_name} checked in successfully.",
            "appointment": serializer.data
        })

    @action(detail=True, methods=["post"], url_path="undo-check-in")
    def undo_check_in(self, request, pk=None):
        user = request.user
        role = get_user_role(user)
        if role not in (UserRole.RECEPTIONIST, UserRole.ADMIN) and not user.is_superuser:
            raise PermissionDenied("Only Receptionists and Administrators can modify check-in status.")

        appointment = self.get_object()
        if not appointment.is_checked_in:
            return Response({"error": "Appointment is not currently marked as checked in."}, status=400)

        appointment.is_checked_in = False
        appointment.check_in_time = None
        appointment.save(update_fields=["is_checked_in", "check_in_time", "updated_at"])

        serializer = self.get_serializer(appointment)
        return Response({
            "message": "Check-in reverted successfully.",
            "appointment": serializer.data
        })

    @action(detail=True, methods=["post"], url_path="cancel-appointment")
    def cancel_appointment(self, request, pk=None):
        user = request.user
        role = get_user_role(user)
        appointment = self.get_object()

        if role == UserRole.PATIENT:
            if appointment.patient.user != user:
                raise PermissionDenied("Patients can only cancel their own appointments.")
            if appointment.is_checked_in:
                return Response(
                    {"error": "Checked-in appointments cannot be cancelled by the patient. Please consult the hospital reception desk."},
                    status=400
                )
        elif role == UserRole.DOCTOR and appointment.doctor.user != user:
            raise PermissionDenied("Doctors can only cancel appointments assigned to them.")
        elif role not in (UserRole.RECEPTIONIST, UserRole.ADMIN, UserRole.DOCTOR, UserRole.PATIENT) and not user.is_superuser:
            raise PermissionDenied("You do not have permission to cancel this appointment.")

        if appointment.status == AppointmentStatus.CANCELLED:
            return Response({"error": "This appointment has already been cancelled."}, status=400)
        if appointment.status == AppointmentStatus.COMPLETED:
            return Response({"error": "Completed clinical appointments cannot be cancelled."}, status=400)

        reason = request.data.get("cancellation_reason", "").strip() or "Cancelled at reception desk."
        appointment.status = AppointmentStatus.CANCELLED
        appointment.cancellation_reason = reason
        appointment.is_checked_in = False
        appointment.save(update_fields=["status", "cancellation_reason", "is_checked_in", "updated_at"])

        try:
            from notifications.services import create_notification, notify_role
            from notifications.models import NotificationType
            # Notify Patient if canceller is not the patient
            if appointment.patient and appointment.patient.user and appointment.patient.user != user:
                create_notification(
                    recipient=appointment.patient.user,
                    title="Appointment Cancelled",
                    message=f"Your appointment ({appointment.appointment_id}) has been cancelled.",
                    notification_type=NotificationType.APPOINTMENT,
                    action_url="/patient/appointments",
                    reference_id=appointment.appointment_id,
                )
            # Notify Doctor if canceller is not the doctor
            if appointment.doctor and appointment.doctor.user and appointment.doctor.user != user:
                create_notification(
                    recipient=appointment.doctor.user,
                    title="Appointment Cancelled",
                    message=f"Appointment {appointment.appointment_id} for patient {appointment.patient.full_name} has been cancelled.",
                    notification_type=NotificationType.APPOINTMENT,
                    action_url="/doctor/appointments",
                    reference_id=appointment.appointment_id,
                )
            # Notify Receptionist if canceller is not receptionist
            if role != UserRole.RECEPTIONIST:
                notify_role(
                    role=UserRole.RECEPTIONIST,
                    title="Appointment Cancelled",
                    message=f"Appointment {appointment.appointment_id} has been cancelled.",
                    notification_type=NotificationType.APPOINTMENT,
                    action_url="/receptionist/appointments",
                    reference_id=appointment.appointment_id,
                )
        except Exception as notif_err:
            logger.error("Failed to send appointment cancellation notifications: %s", notif_err)

        serializer = self.get_serializer(appointment)
        return Response({
            "message": "Appointment cancelled successfully.",
            "appointment": serializer.data
        })

    @action(detail=True, methods=["post"], url_path="complete-consultation")
    def complete_consultation(self, request, pk=None):
        user = request.user
        role = get_user_role(user)
        appointment = self.get_object()

        if role == UserRole.DOCTOR and appointment.doctor.user != user:
            raise PermissionDenied("Doctors can only complete consultations for their assigned appointments.")
        elif role not in (UserRole.DOCTOR, UserRole.RECEPTIONIST, UserRole.ADMIN) and not user.is_superuser:
            raise PermissionDenied("You do not have permission to complete consultations.")

        if appointment.status == AppointmentStatus.CANCELLED:
            return Response({"error": "Cannot complete a cancelled appointment."}, status=400)

        notes = request.data.get("authorized_notes") or request.data.get("notes")
        update_fields = ["status", "is_checked_in", "check_out_time", "updated_at"]
        if notes:
            appointment.authorized_notes = notes
            update_fields.append("authorized_notes")

        appointment.status = AppointmentStatus.COMPLETED
        appointment.is_checked_in = False
        appointment.check_out_time = timezone.now()
        appointment.save(update_fields=update_fields)

        serializer = self.get_serializer(appointment)
        return Response({
            "message": f"Consultation for patient {appointment.patient.full_name} completed and patient checked out successfully.",
            "appointment": serializer.data
        })

    @action(detail=True, methods=["post"], url_path="check-out")
    def check_out(self, request, pk=None):
        return self.complete_consultation(request, pk)

    @action(detail=False, methods=["get"], url_path="receptionist-stats")
    def receptionist_stats(self, request):
        user = request.user
        role = get_user_role(user)
        if role not in (UserRole.RECEPTIONIST, UserRole.ADMIN) and not user.is_superuser:
            raise PermissionDenied("Only Receptionists and Administrators can access reception metrics.")

        today = timezone.localdate()
        today_qs = Appointment.objects.filter(appointment_date=today)
        today_total = today_qs.count()
        checked_in_today = today_qs.filter(is_checked_in=True).count()
        waiting_today = today_qs.filter(
            is_checked_in=True,
            status__in=[AppointmentStatus.SCHEDULED, AppointmentStatus.CONFIRMED]
        ).count()
        completed_today = today_qs.filter(status=AppointmentStatus.COMPLETED).count()
        cancelled_today = today_qs.filter(status=AppointmentStatus.CANCELLED).count()

        upcoming_total = Appointment.objects.filter(
            appointment_date__gt=today
        ).exclude(status=AppointmentStatus.CANCELLED).count()

        registered_patients = Patient.objects.filter(is_active=True).count()

        return Response({
            "today_appointments": today_total,
            "upcoming_appointments": upcoming_total,
            "registered_patients": registered_patients,
            "checked_in_today": checked_in_today,
            "waiting_patients": waiting_today,
            "completed_today": completed_today,
            "cancelled_today": cancelled_today,
            "date": str(today),
        })


# ═════════════════════════════════════════════════════════════════════════════
# PART 3: PATIENT FEEDBACK VIEWSET
# ═════════════════════════════════════════════════════════════════════════════
@extend_schema_view(
    list=extend_schema(summary="List patient feedback"),
    retrieve=extend_schema(summary="Retrieve specific consultation feedback"),
    create=extend_schema(summary="Submit consultation feedback (Patient only)"),
)
class PatientFeedbackViewSet(viewsets.ModelViewSet):
    """
    CareFlow HMS Patient Feedback API.
    - Patients: Submit ratings and experience feedback for eligible completed consultations; view their own feedback history.
    - Doctors: View patient feedback strictly for their own consultations; read-only (cannot edit or delete).
    - Admins: View feedback and access real database feedback analytics.
    """
    queryset = PatientFeedback.objects.all()
    serializer_class = PatientFeedbackSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ["doctor", "appointment", "doctor_rating", "overall_satisfaction"]
    search_fields = ["doctor__first_name", "doctor__last_name", "patient__first_name", "patient__last_name", "comments"]
    ordering_fields = ["created_at", "doctor_rating"]

    def get_queryset(self):
        user = self.request.user
        role = get_user_role(user)

        if role == UserRole.ADMIN or user.is_superuser:
            return PatientFeedback.objects.all().select_related("appointment", "patient", "doctor")
        elif role == UserRole.DOCTOR:
            return PatientFeedback.objects.filter(doctor__user=user).select_related("appointment", "patient", "doctor")
        elif role == UserRole.PATIENT:
            return PatientFeedback.objects.filter(patient__user=user).select_related("appointment", "patient", "doctor")
        return PatientFeedback.objects.none()

    def perform_create(self, serializer):
        user = self.request.user
        role = get_user_role(user)
        if role != UserRole.PATIENT:
            raise PermissionDenied("Only registered patients can submit consultation feedback.")

        appointment = serializer.validated_data.get("appointment")
        patient_inst = getattr(user, "patient_profile", None) or Patient.objects.filter(user=user).first()
        if not patient_inst or appointment.patient != patient_inst:
            raise PermissionDenied("You can only submit feedback for consultations tied to your patient account.")

        if hasattr(appointment, "feedback"):
            raise ValidationError({"appointment": "Feedback has already been submitted for this consultation."})

        valid_statuses = [AppointmentStatus.COMPLETED, getattr(AppointmentStatus, "CHECKED_OUT", "CHECKED_OUT")]
        if appointment.status not in valid_statuses:
            raise ValidationError({"appointment": "Feedback can only be submitted for completed consultations."})

        serializer.save(
            patient=patient_inst,
            doctor=appointment.doctor
        )

    def perform_update(self, serializer):
        raise PermissionDenied("Submitted patient feedback records cannot be modified.")

    def perform_destroy(self, instance):
        user = self.request.user
        if not (user.is_superuser or get_user_role(user) == UserRole.ADMIN):
            raise PermissionDenied("Feedback records are immutable and cannot be deleted by clinical practitioners or patients.")
        instance.delete()

    @action(detail=False, methods=["get"], url_path="eligible-appointments")
    def eligible_appointments(self, request):
        """
        Returns completed appointments for the authenticated patient that do not have feedback yet.
        """
        user = request.user
        role = get_user_role(user)
        if role != UserRole.PATIENT:
            raise PermissionDenied("Only patients can query eligible completed appointments for feedback.")

        patient_inst = getattr(user, "patient_profile", None) or Patient.objects.filter(user=user).first()
        if not patient_inst:
            return Response([])

        valid_statuses = [AppointmentStatus.COMPLETED, getattr(AppointmentStatus, "CHECKED_OUT", "CHECKED_OUT")]
        completed_apts = Appointment.objects.filter(
            patient=patient_inst,
            status__in=valid_statuses
        ).filter(feedback__isnull=True).select_related("doctor")

        data = [
            {
                "id": a.id,
                "appointment_id": a.appointment_id,
                "appointment_date": a.appointment_date,
                "appointment_time": a.appointment_time,
                "doctor_name": a.doctor.full_name,
                "doctor_specialization": a.doctor.specialization,
                "reason_for_visit": a.reason_for_visit,
                "health_problem": a.health_problem,
                "status": a.status,
                "is_completed": a.status in valid_statuses,
            }
            for a in completed_apts
        ]
        return Response(data)

    @action(detail=False, methods=["get"], url_path="analytics")
    def analytics(self, request):
        """
        Aggregated feedback analytics derived from real PostgreSQL database records.
        Restricted to Administrators only.
        """
        user = request.user
        role = get_user_role(user)
        if role != UserRole.ADMIN and not user.is_superuser:
            raise PermissionDenied("Administrative credentials required to access patient feedback analytics.")

        total = PatientFeedback.objects.count()
        if total == 0:
            return Response({
                "total_feedbacks": 0,
                "average_doctor_rating": 0.0,
                "positive_count": 0,
                "negative_count": 0,
                "neutral_count": 0,
                "satisfaction_percentage": 0.0,
                "experience_breakdown": {
                    "EXCELLENT": 0,
                    "GOOD": 0,
                    "AVERAGE": 0,
                    "POOR": 0,
                },
                "communication_breakdown": {
                    "EXCELLENT": 0,
                    "GOOD": 0,
                    "POOR": 0,
                },
                "doctor_summaries": [],
            })

        avg_rating = PatientFeedback.objects.aggregate(avg=Avg("doctor_rating"))["avg"] or 0.0
        positive_count = PatientFeedback.objects.filter(doctor_rating__gte=4).count()
        negative_count = PatientFeedback.objects.filter(doctor_rating__lte=2).count()
        neutral_count = PatientFeedback.objects.filter(doctor_rating=3).count()

        satisfied_count = PatientFeedback.objects.filter(overall_satisfaction=OverallSatisfaction.SATISFIED).count()
        satisfaction_pct = round((satisfied_count / total) * 100, 1)

        exp_counts = {
            c[0]: PatientFeedback.objects.filter(consultation_experience=c[0]).count()
            for c in ConsultationExperience.choices
        }
        comm_counts = {
            c[0]: PatientFeedback.objects.filter(doctor_communication=c[0]).count()
            for c in DoctorCommunication.choices
        }

        # Doctor-wise feedback summary
        doctor_data = (
            PatientFeedback.objects.values(
                "doctor__id",
                "doctor__doctor_id",
                "doctor__first_name",
                "doctor__last_name",
                "doctor__specialization"
            )
            .annotate(
                total_reviews=Count("id"),
                avg_rating=Avg("doctor_rating"),
                positive_reviews=Count("id", filter=Q(doctor_rating__gte=4)),
                negative_reviews=Count("id", filter=Q(doctor_rating__lte=2)),
            )
            .order_by("-total_reviews")
        )

        doctor_summaries = [
            {
                "doctor_id": d["doctor__doctor_id"],
                "doctor_name": f"Dr. {d['doctor__first_name']} {d['doctor__last_name']}".strip(),
                "specialization": d["doctor__specialization"],
                "total_reviews": d["total_reviews"],
                "avg_rating": round(d["avg_rating"] or 0.0, 1),
                "positive_reviews": d["positive_reviews"],
                "negative_reviews": d["negative_reviews"],
            }
            for d in doctor_data
        ]

        return Response({
            "total_feedbacks": total,
            "average_doctor_rating": round(avg_rating, 2),
            "positive_count": positive_count,
            "negative_count": negative_count,
            "neutral_count": neutral_count,
            "satisfaction_percentage": satisfaction_pct,
            "experience_breakdown": exp_counts,
            "communication_breakdown": comm_counts,
            "doctor_summaries": doctor_summaries,
        })


# ═════════════════════════════════════════════════════════════════════════════
# PART 4: CONTACT DOCTOR (MEDICAL QUERIES) VIEWSET
# ═════════════════════════════════════════════════════════════════════════════
@extend_schema_view(
    list=extend_schema(summary="List medical queries"),
    retrieve=extend_schema(summary="Retrieve specific medical query"),
    create=extend_schema(summary="Submit a medical query to treating physician (Patient only)"),
)
class MedicalQueryViewSet(viewsets.ModelViewSet):
    """
    CareFlow HMS Contact Doctor API.
    Facilitates structured patient follow-up inquiries regarding symptoms, prescription side-effects,
    or medication queries directly with their verified consulting physician.
    """
    queryset = MedicalQuery.objects.all()
    serializer_class = MedicalQuerySerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ["status", "category", "severity", "doctor", "appointment"]
    search_fields = [
        "query_id",
        "description",
        "medicine_name",
        "doctor__first_name",
        "doctor__last_name",
        "patient__first_name",
        "patient__last_name",
        "appointment__appointment_id",
    ]
    ordering_fields = ["created_at", "status", "severity"]

    def get_queryset(self):
        user = self.request.user
        role = get_user_role(user)

        if role == UserRole.ADMIN or user.is_superuser:
            return MedicalQuery.objects.all().select_related("appointment", "patient", "doctor", "prescription", "medicine")
        elif role == UserRole.DOCTOR:
            if self.action in ["respond_to_query", "update_status"]:
                return MedicalQuery.objects.all().select_related("appointment", "patient", "doctor", "prescription", "medicine")
            return MedicalQuery.objects.filter(doctor__user=user).select_related("appointment", "patient", "doctor", "prescription", "medicine")
        elif role == UserRole.PATIENT:
            return MedicalQuery.objects.filter(patient__user=user).select_related("appointment", "patient", "doctor", "prescription", "medicine")
        return MedicalQuery.objects.none()

    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        if instance.status == MedicalQueryStatus.RESOLVED:
            return Response(
                {"error": "Resolved medical queries are finalized and cannot be modified."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return super().update(request, *args, **kwargs)

    def partial_update(self, request, *args, **kwargs):
        instance = self.get_object()
        if instance.status == MedicalQueryStatus.RESOLVED:
            return Response(
                {"error": "Resolved medical queries are finalized and cannot be modified."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return super().partial_update(request, *args, **kwargs)

    def perform_update(self, serializer):
        user = self.request.user
        if serializer.instance.status == MedicalQueryStatus.RESOLVED:
            raise ValidationError({"error": "Resolved medical queries are finalized and cannot be modified."})
        if not (user.is_superuser or get_user_role(user) == UserRole.ADMIN):
            raise PermissionDenied("Medical queries cannot be directly updated; use dedicated clinical response or status actions.")
        serializer.save()

    def perform_destroy(self, instance):
        user = self.request.user
        if not (user.is_superuser or get_user_role(user) == UserRole.ADMIN):
            raise PermissionDenied("Medical queries cannot be deleted.")
        instance.delete()

    def perform_create(self, serializer):
        user = self.request.user
        role = get_user_role(user)
        if role != UserRole.PATIENT:
            raise PermissionDenied("Only registered patients can submit medical queries to doctors.")

        appointment = serializer.validated_data.get("appointment")
        patient_inst = getattr(user, "patient_profile", None) or Patient.objects.filter(user=user).first()

        if not patient_inst or appointment.patient != patient_inst:
            raise PermissionDenied("You can only submit queries regarding your own medical consultations.")

        # Associate strictly with the appointment's consulting physician
        completed_statuses = [AppointmentStatus.COMPLETED]
        if hasattr(AppointmentStatus, "CHECKED_OUT"):
            completed_statuses.append(AppointmentStatus.CHECKED_OUT)
        if appointment.status not in completed_statuses and not getattr(appointment, "check_out_time", None):
            raise ValidationError({"appointment": "Medical inquiries can only be submitted for completed consultations."})

        treating_doctor = appointment.doctor
        prescription = serializer.validated_data.get("prescription")
        if prescription:
            if prescription.patient != patient_inst:
                raise ValidationError({"prescription": "The referenced prescription does not belong to your medical records."})
            if prescription.doctor:
                treating_doctor = prescription.doctor

        query = serializer.save(
            patient=patient_inst,
            doctor=treating_doctor,
            status=MedicalQueryStatus.PENDING_REVIEW
        )

        try:
            from notifications.services import create_notification
            from notifications.models import NotificationType
            if treating_doctor and treating_doctor.user:
                create_notification(
                    recipient=treating_doctor.user,
                    title="New Patient Medical Query",
                    message=f"Patient {patient_inst.full_name} submitted a medical inquiry ({query.query_id}).",
                    notification_type=NotificationType.MEDICAL_QUERY,
                    action_url="/doctor/medical-queries",
                    reference_id=query.query_id,
                )
        except Exception as notif_err:
            logger.error("Failed to notify doctor of medical query: %s", notif_err)

    @action(detail=True, methods=["post"], url_path="respond")
    def respond_to_query(self, request, pk=None):
        """
        Enables the consulting doctor to review the query and submit an authoritative clinical reply.
        Can optionally advise laboratory tests or in-person follow-up consultations.
        """
        user = request.user
        role = get_user_role(user)
        query = self.get_object()

        if query.status == MedicalQueryStatus.RESOLVED:
            return Response(
                {"error": "Resolved medical queries are finalized and cannot be modified."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if role != UserRole.DOCTOR and not (role == UserRole.ADMIN or user.is_superuser):
            raise PermissionDenied("Only the designated consulting doctor can respond to this clinical query.")

        if role == UserRole.DOCTOR and query.doctor.user != user:
            raise PermissionDenied("You can only respond to queries assigned to your clinical schedule.")

        response_serializer = MedicalQueryResponseSerializer(data=request.data)
        response_serializer.is_valid(raise_exception=True)
        vdata = response_serializer.validated_data

        query.doctor_response = vdata["doctor_response"]
        query.responded_at = timezone.now()
        query.recommend_follow_up = vdata.get("recommend_follow_up", False)
        query.recommend_lab_tests = vdata.get("recommend_lab_tests", False)
        query.lab_test_recommendations = vdata.get("lab_test_recommendations", "")

        if vdata.get("mark_resolved"):
            query.status = MedicalQueryStatus.RESOLVED
            query.resolved_at = timezone.now()
        elif query.recommend_follow_up:
            query.status = MedicalQueryStatus.FOLLOW_UP_REQUIRED
        else:
            query.status = MedicalQueryStatus.RESPONSE_SENT

        query.save()

        try:
            from notifications.services import create_notification
            from notifications.models import NotificationType
            if query.patient and query.patient.user:
                doc_name = f"Dr. {query.doctor.first_name} {query.doctor.last_name}".strip() if query.doctor else "Your Doctor"
                create_notification(
                    recipient=query.patient.user,
                    title="Doctor Response to Medical Query",
                    message=f"{doc_name} has responded to your medical inquiry ({query.query_id}).",
                    notification_type=NotificationType.MEDICAL_QUERY,
                    action_url="/patient/contact-doctor",
                    reference_id=query.query_id,
                )
        except Exception as notif_err:
            logger.error("Failed to notify patient of medical query response: %s", notif_err)

        serializer = self.get_serializer(query)
        return Response({
            "message": "Clinical response sent to patient successfully.",
            "query": serializer.data
        })

    @action(detail=True, methods=["patch"], url_path="status")
    def update_status(self, request, pk=None):
        """
        Allows doctor or admin to transition query status (e.g. Under Review, Resolved).
        """
        user = request.user
        role = get_user_role(user)
        query = self.get_object()

        if query.status == MedicalQueryStatus.RESOLVED:
            return Response(
                {"error": "Resolved medical queries are finalized and cannot be modified."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if role == UserRole.DOCTOR and query.doctor.user != user:
            raise PermissionDenied("You can only update status for queries assigned to you.")
        elif role not in (UserRole.DOCTOR, UserRole.ADMIN) and not user.is_superuser:
            raise PermissionDenied("You do not have permission to update query status.")

        new_status = request.data.get("status")
        valid_statuses = [s[0] for s in MedicalQueryStatus.choices]
        if not new_status or new_status not in valid_statuses:
            return Response({"error": f"Invalid status. Must be one of: {', '.join(valid_statuses)}"}, status=400)

        query.status = new_status
        update_fields = ["status", "updated_at"]
        if new_status == MedicalQueryStatus.UNDER_REVIEW and not query.reviewed_at:
            query.reviewed_at = timezone.now()
            update_fields.append("reviewed_at")
        elif new_status == MedicalQueryStatus.RESOLVED and not query.resolved_at:
            query.resolved_at = timezone.now()
            update_fields.append("resolved_at")

        query.save(update_fields=update_fields)
        serializer = self.get_serializer(query)
        return Response({
            "message": f"Query status updated to {query.get_status_display()}.",
            "query": serializer.data
        })

    @action(detail=False, methods=["get"], url_path="eligible-records")
    def eligible_records(self, request):
        """
        Returns the authenticated patient's consultations and associated prescriptions
        to populate the selection options in the Contact Doctor form.
        """
        user = request.user
        role = get_user_role(user)
        if role != UserRole.PATIENT:
            raise PermissionDenied("Only registered patients can query personal medical records.")

        patient_inst = getattr(user, "patient_profile", None) or Patient.objects.filter(user=user).first()
        if not patient_inst:
            return Response({"is_eligible": False, "appointments": [], "prescriptions": []})

        completed_filter = Q(status=AppointmentStatus.COMPLETED)
        if hasattr(AppointmentStatus, "CHECKED_OUT"):
            completed_filter |= Q(status=AppointmentStatus.CHECKED_OUT)
        completed_filter |= Q(check_out_time__isnull=False)

        appointments_qs = Appointment.objects.filter(patient=patient_inst).filter(
            completed_filter
        ).distinct().order_by("-appointment_date", "-appointment_time").select_related("doctor")

        is_eligible = appointments_qs.exists()

        appointments_data = [
            {
                "id": a.id,
                "appointment_id": a.appointment_id,
                "appointment_date": str(a.appointment_date),
                "appointment_time": str(a.appointment_time),
                "status": a.status,
                "doctor_id": a.doctor.id,
                "doctor_name": a.doctor.full_name,
                "doctor_specialization": a.doctor.specialization,
                "health_problem": a.health_problem,
            }
            for a in appointments_qs
        ]

        from pharmacy.models import Prescription
        prescriptions_qs = Prescription.objects.filter(patient=patient_inst).exclude(
            status="CANCELLED"
        ).order_by("-created_at").select_related("doctor", "appointment").prefetch_related("items", "items__medicine")

        prescriptions_data = [
            {
                "id": p.id,
                "prescription_id": p.prescription_id,
                "created_at": str(p.created_at) if p.created_at else None,
                "appointment_id": p.appointment_id,
                "doctor_name": p.doctor.full_name if p.doctor else "Hospital Practitioner",
                "medicines": [
                    {
                        "item_id": item.id,
                        "medicine_id": item.medicine_id,
                        "medicine_name": getattr(item.medicine, "name", "Medication"),
                        "dosage": item.dosage,
                        "frequency": item.frequency,
                    }
                    for item in p.items.all()
                ],
            }
            for p in prescriptions_qs
        ]

        return Response({
            "is_eligible": is_eligible,
            "appointments": appointments_data,
            "prescriptions": prescriptions_data,
        })
