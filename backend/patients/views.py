from django.db import models
from rest_framework import viewsets, permissions, status
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from drf_spectacular.utils import extend_schema, extend_schema_view
from accounts.models import UserRole
from accounts.permissions import get_user_role, IsSelfPatientOrStaff
from .models import Patient
from .serializers import PatientSerializer


@extend_schema_view(
    list=extend_schema(summary="List patient records"),
    retrieve=extend_schema(summary="Retrieve specific patient record"),
    create=extend_schema(summary="Register a new patient (Receptionist only)"),
    update=extend_schema(summary="Update patient record (Receptionist only)"),
    partial_update=extend_schema(summary="Partial update patient record (Receptionist only)"),
    destroy=extend_schema(summary="Deactivate patient record (Receptionist or Admin only)"),
)
class PatientViewSet(viewsets.ModelViewSet):
    """
    CareFlow HMS Patient Management ViewSet.
    Enforces strict role-based and object-level permissions:
    - Receptionist: Registers and manages patient records.
    - Admin: View/update administrative records, but CANNOT perform receptionist intake.
    - Doctor: View authorized patient clinical records (connected via appointments or treatment).
    - Patient: View their own record only. Cannot modify medical history, allergies, or delete records.
    """
    queryset = Patient.objects.all()
    serializer_class = PatientSerializer
    permission_classes = [permissions.IsAuthenticated, IsSelfPatientOrStaff]
    filterset_fields = ["gender", "blood_group", "is_active", "registration_date"]
    search_fields = ["patient_id", "first_name", "last_name", "phone_number", "email"]
    ordering_fields = ["registration_date", "last_name", "created_at"]

    def get_queryset(self):
        user = self.request.user
        role = get_user_role(user)

        if role in (UserRole.ADMIN, UserRole.RECEPTIONIST, UserRole.PHARMACIST) or user.is_superuser:
            qs = Patient.objects.all()
            if role == UserRole.ADMIN:
                qs = qs.exclude(
                    models.Q(patient_id="CF-WALKIN") |
                    models.Q(first_name__icontains="Walk-in") |
                    models.Q(last_name__icontains="Walk-in") |
                    models.Q(first_name__icontains="Walkin") |
                    models.Q(last_name__icontains="Walkin")
                )
            eligible_param = self.request.query_params.get("eligible_for_billing")
            if eligible_param in ("true", "1", "True"):
                qs = qs.filter(
                    appointments__isnull=False,
                    prescriptions__isnull=False
                ).exclude(appointments__status="CANCELLED").exclude(prescriptions__status="CANCELLED").distinct()
            return qs
        elif role == UserRole.DOCTOR:
            checked_in_param = self.request.query_params.get("checked_in") or self.request.query_params.get("checked_in_only")
            if checked_in_param in ("true", "1", "True"):
                return Patient.objects.filter(
                    appointments__doctor__user=user,
                    appointments__is_checked_in=True
                ).exclude(appointments__status__in=["CANCELLED", "COMPLETED", "CHECKED_OUT", "NO_SHOW"]).distinct()

            return Patient.objects.filter(
                models.Q(appointments__doctor__user=user) |
                models.Q(prescriptions__doctor__user=user)
            ).distinct()
        elif role == UserRole.PATIENT:
            return Patient.objects.filter(user=user)
        return Patient.objects.none()

    @action(detail=False, methods=["get"], url_path="checked-in")
    def checked_in_patients(self, request):
        """
        List patients assigned to the authenticated doctor who are currently checked in and not checked out.
        """
        user = request.user
        role = get_user_role(user)
        if role != UserRole.DOCTOR and not user.is_superuser:
            raise PermissionDenied("Only doctors can access their checked-in assigned patients list.")

        doctor = getattr(user, "doctor_profile", None)
        if not doctor:
            return Response([])

        from appointments.models import Appointment, AppointmentStatus
        terminal_statuses = [
            AppointmentStatus.CANCELLED,
            AppointmentStatus.COMPLETED,
            AppointmentStatus.NO_SHOW,
        ]
        if hasattr(AppointmentStatus, "CHECKED_OUT"):
            terminal_statuses.append(AppointmentStatus.CHECKED_OUT)

        appointments = Appointment.objects.filter(
            doctor=doctor,
            is_checked_in=True
        ).exclude(status__in=terminal_statuses).select_related("patient").order_by("-appointment_date", "-appointment_time")

        search_query = request.query_params.get("search", "").strip().lower()
        for_type = request.query_params.get("for_type", "").strip().lower()

        seen_patients = set()
        results = []
        for apt in appointments:
            has_rx = apt.prescriptions.exclude(status="CANCELLED").exists()
            has_lab = apt.lab_orders.exclude(status="CANCELLED").exists()

            if for_type == "prescription" and has_rx:
                continue
            if for_type == "lab_test" and has_lab:
                continue

            p = apt.patient
            if p.id not in seen_patients:
                if search_query:
                    match_name = search_query in p.first_name.lower() or search_query in p.last_name.lower()
                    match_id = search_query in p.patient_id.lower()
                    if not (match_name or match_id):
                        continue
                seen_patients.add(p.id)
                results.append({
                    "id": p.id,
                    "patient_id": p.patient_id,
                    "first_name": p.first_name,
                    "last_name": p.last_name,
                    "full_name": p.full_name,
                    "gender": p.gender,
                    "date_of_birth": p.date_of_birth,
                    "phone_number": p.phone_number,
                    "appointment_id": apt.id,
                    "appointment_code": apt.appointment_id,
                    "appointment_date": str(apt.appointment_date),
                    "appointment_time": str(apt.appointment_time),
                    "reason_for_visit": apt.reason_for_visit,
                    "is_checked_in": True,
                    "has_prescription": has_rx,
                    "has_lab_test": has_lab,
                })

        return Response(results)

    def perform_create(self, serializer):
        user = self.request.user
        role = get_user_role(user)

        if role not in (UserRole.RECEPTIONIST, UserRole.ADMIN) and not user.is_superuser:
            raise PermissionDenied("Only Receptionists and Administrators can register new patients.")

        serializer.save()

    def perform_update(self, serializer):
        user = self.request.user
        role = get_user_role(user)

        if role == UserRole.PATIENT:
            raise PermissionDenied("Patients cannot modify clinical records, allergies, or medical history directly.")

        if role not in (UserRole.RECEPTIONIST, UserRole.ADMIN) and not user.is_superuser:
            raise PermissionDenied("Only Receptionists or Administrators can modify patient details.")

        serializer.save()

    def perform_destroy(self, instance):
        user = self.request.user
        role = get_user_role(user)

        if role not in (UserRole.RECEPTIONIST, UserRole.ADMIN) and not user.is_superuser:
            raise PermissionDenied("Only Receptionists or Administrators can remove or deactivate patient records.")

        instance.is_active = False
        instance.save(update_fields=["is_active"])
