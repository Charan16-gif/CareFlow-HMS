from rest_framework import viewsets, permissions
from rest_framework.exceptions import PermissionDenied, ValidationError
from drf_spectacular.utils import extend_schema, extend_schema_view
from accounts.models import UserRole
from accounts.permissions import get_user_role, IsSelfPatientOrStaff
from .models import Appointment, AppointmentStatus
from .serializers import AppointmentSerializer


from rest_framework.decorators import action
from rest_framework.response import Response
from datetime import datetime, time, timedelta
from django.db import transaction
from django.utils import timezone
from staff.models import Doctor
from patients.models import Patient
from accounts.emails import send_appointment_confirmation_email_async


@extend_schema_view(
    list=extend_schema(summary="List appointments"),
    retrieve=extend_schema(summary="Retrieve specific appointment"),
    create=extend_schema(summary="Schedule appointment (Receptionist or Patient)"),
    update=extend_schema(summary="Update appointment details or status"),
    partial_update=extend_schema(summary="Partial update appointment"),
    destroy=extend_schema(summary="Cancel appointment"),
)
class AppointmentViewSet(viewsets.ModelViewSet):
    """
    CareFlow HMS Appointment Lifecycle.
    Enforces role-based permissions:
    - Receptionist: Full appointment scheduling and management.
    - Doctor: View their appointments; record clinical notes; mark completed.
    - Patient: View their appointments; book appointments; cancel scheduled slots. Cannot modify notes or status.
    - Admin: Oversight and administrative auditing.
    """
    queryset = Appointment.objects.all()
    serializer_class = AppointmentSerializer
    permission_classes = [permissions.IsAuthenticated, IsSelfPatientOrStaff]
    filterset_fields = ["status", "appointment_date", "doctor", "patient", "is_checked_in"]
    search_fields = ["appointment_id", "patient__first_name", "patient__last_name", "doctor__first_name", "doctor__last_name", "reason_for_visit"]
    ordering_fields = ["appointment_date", "appointment_time"]

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

    def perform_create(self, serializer):
        user = self.request.user
        role = get_user_role(user)

        with transaction.atomic():
            appointment_date = serializer.validated_data.get("appointment_date")
            appointment_time = serializer.validated_data.get("appointment_time")
            doctor = serializer.validated_data.get("doctor")

            if appointment_date and appointment_time:
                now_local = timezone.localtime(timezone.now())
                today = now_local.date()
                now_time = now_local.time()

                if appointment_date < today:
                    raise ValidationError({"appointment_date": "Cannot book an appointment for a past date."})
                if appointment_date == today and appointment_time <= now_time:
                    raise ValidationError({"appointment_time": "Cannot book an appointment for a past time slot."})

            if doctor and appointment_date and appointment_time:
                conflicts = Appointment.objects.select_for_update().filter(
                    doctor=doctor,
                    appointment_date=appointment_date,
                    appointment_time=appointment_time
                ).exclude(status=AppointmentStatus.CANCELLED)
                if conflicts.exists():
                    raise ValidationError({"appointment_time": "The selected doctor already has an active appointment in this time slot."})

            if role == UserRole.PATIENT:
                # Patient can only book for themselves
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

                appointment = serializer.save(
                    created_by=user,
                    patient=patient_inst,
                    status=AppointmentStatus.SCHEDULED
                )
                send_appointment_confirmation_email_async(appointment=appointment)
                return

            elif role not in (UserRole.RECEPTIONIST, UserRole.ADMIN) and not user.is_superuser:
                raise PermissionDenied("You do not have permission to schedule clinical appointments.")

            appointment = serializer.save(created_by=user)
            send_appointment_confirmation_email_async(appointment=appointment)

    @action(detail=False, methods=["get"], url_path="available-slots")
    def available_slots(self, request):
        doctor_id = request.query_params.get("doctor")
        date_str = request.query_params.get("date")

        if not doctor_id or not date_str:
            return Response(
                {"error": "Both 'doctor' and 'date' query parameters are required."},
                status=400
            )

        try:
            doctor = Doctor.objects.get(id=doctor_id)
        except (Doctor.DoesNotExist, ValueError):
            return Response({"error": "Doctor not found."}, status=404)

        try:
            target_date = datetime.strptime(date_str, "%Y-%m-%d").date()
        except ValueError:
            return Response({"error": "Invalid date format. Use YYYY-MM-DD."}, status=400)

        # Server authoritative reference date and time
        now_local = timezone.localtime(timezone.now())
        today = now_local.date()
        now_time = now_local.time()

        # Past date: return no slots
        if target_date < today:
            return Response({
                "doctor": doctor.full_name,
                "date": date_str,
                "is_available_day": False,
                "message": "No available appointment slots. Please choose another date or doctor.",
                "available_slots": []
            })

        # Check day of week
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

        # Generate 30-minute slots between doctor start_time and end_time
        start_t = doctor.start_time or time(9, 0)
        end_t = doctor.end_time or time(17, 0)

        slots = []
        curr = datetime.combine(target_date, start_t)
        end_dt = datetime.combine(target_date, end_t)

        while curr < end_dt:
            slot_time = curr.time()
            # If target date is today, slot start time must strictly be in the future
            if target_date > today or slot_time > now_time:
                slots.append(slot_time.strftime("%H:%M:%S"))
            curr += timedelta(minutes=30)

        # Exclude booked active slots (excludes COMPLETED, SCHEDULED, CONFIRMED, IN_PROGRESS)
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

    @action(detail=True, methods=["post"], url_path="check-in")
    def check_in(self, request, pk=None):
        """
        Check in patient upon arrival at the hospital front desk.
        Enforces:
        - Only Receptionist or Admin can check in patients.
        - Appointment must not be cancelled, completed, or no-show.
        - Prevents duplicate check-in.
        - Records exact check_in_time and transitions SCHEDULED to CONFIRMED.
        """
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
        """
        Reverts an accidental check-in.
        """
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
        """
        Cancels appointment with confirmation and records cancellation reason.
        Preserves appointment record instead of permanently deleting.
        """
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

        serializer = self.get_serializer(appointment)
        return Response({
            "message": "Appointment cancelled successfully.",
            "appointment": serializer.data
        })

    @action(detail=True, methods=["post"], url_path="complete-consultation")
    def complete_consultation(self, request, pk=None):
        """
        Completes the consultation and automatically checks out the patient.
        Accessible by Doctor (for their assigned appointments), Receptionist, or Admin.
        """
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
        """
        Direct check-out action alias.
        """
        return self.complete_consultation(request, pk)

    @action(detail=False, methods=["get"], url_path="receptionist-stats")
    def receptionist_stats(self, request):
        """
        Real-time backend statistics for the Receptionist Overview dashboard:
        - Today's Appointments
        - Upcoming Appointments
        - Registered Patients
        - Checked-in Patients Today
        - Patients Waiting Today
        - Completed Today
        - Cancelled Today
        """
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

    def perform_update(self, serializer):
        user = self.request.user
        role = get_user_role(user)
        instance = serializer.instance

        if role == UserRole.PATIENT:
            # Patient can only cancel their own appointment if not checked in
            new_status = self.request.data.get("status")
            if new_status and new_status == AppointmentStatus.CANCELLED:
                if instance.is_checked_in:
                    raise PermissionDenied("Checked-in appointments cannot be cancelled by the patient. Please consult reception.")
                serializer.save(status=AppointmentStatus.CANCELLED)
                return
            raise PermissionDenied("Patients cannot alter consultation notes or reschedule appointments directly.")

        new_status = self.request.data.get("status") or serializer.validated_data.get("status")
        extra_kwargs = {}
        if new_status in (AppointmentStatus.COMPLETED, getattr(AppointmentStatus, "CHECKED_OUT", "CHECKED_OUT")):
            extra_kwargs["is_checked_in"] = False
            extra_kwargs["check_out_time"] = timezone.now()

        if role == UserRole.DOCTOR:
            # Doctor can update authorized clinical notes and status to IN_PROGRESS or COMPLETED
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
