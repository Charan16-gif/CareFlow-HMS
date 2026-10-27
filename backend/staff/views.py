from rest_framework import viewsets, permissions
from rest_framework.exceptions import PermissionDenied
from drf_spectacular.utils import extend_schema, extend_schema_view
from accounts.models import UserRole
from accounts.permissions import get_user_role
from .models import Doctor, StaffProfile
from .serializers import DoctorSerializer, StaffProfileSerializer


@extend_schema_view(
    list=extend_schema(summary="List doctors"),
    retrieve=extend_schema(summary="Retrieve doctor profile"),
    create=extend_schema(summary="Add new doctor profile (Admin or Receptionist)"),
    update=extend_schema(summary="Update doctor profile (Admin or Receptionist)"),
    partial_update=extend_schema(summary="Partial update doctor profile (Admin or Receptionist)"),
    destroy=extend_schema(summary="Deactivate doctor profile (Admin only)"),
)
class DoctorViewSet(viewsets.ModelViewSet):
    """
    CareFlow HMS Doctor Directory and Management.
    - Admin & Receptionist: Manage doctor profiles.
    - Doctor & Staff: Full directory view.
    - Patient: View active doctors for scheduling consultations. Cannot modify doctors.
    """
    queryset = Doctor.objects.all()
    serializer_class = DoctorSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ["specialization", "department", "status"]
    search_fields = ["doctor_id", "first_name", "last_name", "specialization", "license_number"]
    ordering_fields = ["last_name", "consultation_fee"]

    def get_queryset(self):
        user = self.request.user
        role = get_user_role(user)
        if role == UserRole.PATIENT:
            return Doctor.objects.filter(status="ACTIVE")
        return Doctor.objects.all()

    def perform_create(self, serializer):
        user = self.request.user
        role = get_user_role(user)
        if role not in (UserRole.ADMIN, UserRole.RECEPTIONIST) and not user.is_superuser:
            raise PermissionDenied("Only Administrators and Receptionists can register doctor profiles.")
        serializer.save()

    def perform_update(self, serializer):
        user = self.request.user
        role = get_user_role(user)
        instance = serializer.instance
        if role in (UserRole.ADMIN, UserRole.RECEPTIONIST) or user.is_superuser:
            serializer.save()
        elif role == UserRole.DOCTOR and instance.user == user:
            # Doctor can update their own schedule and phone, but not license or status
            serializer.save()
        else:
            raise PermissionDenied("You do not have permission to modify this doctor profile.")

    def perform_destroy(self, instance):
        user = self.request.user
        role = get_user_role(user)
        if role != UserRole.ADMIN and not user.is_superuser:
            raise PermissionDenied("Only Administrators can deactivate doctor accounts.")
        instance.status = "INACTIVE"
        instance.save(update_fields=["status"])


@extend_schema_view(
    list=extend_schema(summary="List staff profiles"),
    retrieve=extend_schema(summary="Retrieve staff profile"),
    create=extend_schema(summary="Add staff profile (Admin or Receptionist, non-admin only)"),
    update=extend_schema(summary="Update staff profile (Admin or Receptionist)"),
    partial_update=extend_schema(summary="Partial update staff profile"),
    destroy=extend_schema(summary="Deactivate staff profile (Admin only)"),
)
class StaffProfileViewSet(viewsets.ModelViewSet):
    """
    CareFlow HMS Staff Profiles (Receptionist, Lab Staff, Pharmacist).
    - Enforces: Neither Admin nor Receptionist can create additional Administrator accounts.
    - Patients cannot view or modify internal staff profiles.
    """
    queryset = StaffProfile.objects.all()
    serializer_class = StaffProfileSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ["role", "department", "status"]
    search_fields = ["staff_id", "first_name", "last_name", "email", "department"]

    def get_queryset(self):
        user = self.request.user
        role = get_user_role(user)
        if role in (UserRole.ADMIN, UserRole.RECEPTIONIST) or user.is_superuser:
            return StaffProfile.objects.all()
        elif role in (UserRole.LAB_STAFF, UserRole.PHARMACIST):
            return StaffProfile.objects.filter(user=user)
        return StaffProfile.objects.none()

    def perform_create(self, serializer):
        user = self.request.user
        role = get_user_role(user)
        if role not in (UserRole.ADMIN, UserRole.RECEPTIONIST) and not user.is_superuser:
            raise PermissionDenied("Only Administrators and Receptionists can create staff profiles.")
        serializer.save()

    def perform_update(self, serializer):
        user = self.request.user
        role = get_user_role(user)
        instance = serializer.instance
        if role in (UserRole.ADMIN, UserRole.RECEPTIONIST) or user.is_superuser:
            serializer.save()
        elif instance.user == user:
            # Self-update contact
            serializer.save()
        else:
            raise PermissionDenied("You do not have permission to modify this staff profile.")

    def perform_destroy(self, instance):
        user = self.request.user
        role = get_user_role(user)
        if role != UserRole.ADMIN and not user.is_superuser:
            raise PermissionDenied("Only Administrators can deactivate staff accounts.")
        instance.status = "INACTIVE"
        instance.save(update_fields=["status"])
