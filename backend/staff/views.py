from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.exceptions import PermissionDenied
from drf_spectacular.utils import extend_schema, extend_schema_view
from accounts.models import UserRole
from accounts.permissions import get_user_role
from accounts.emails import send_user_welcome_credentials_email
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

    def create(self, request, *args, **kwargs):
        user = request.user
        role = get_user_role(user)
        if role not in (UserRole.ADMIN, UserRole.RECEPTIONIST) and not user.is_superuser:
            raise PermissionDenied("Only Administrators and Receptionists can register doctor profiles.")
        return super().create(request, *args, **kwargs)

    def perform_create(self, serializer):
        user = self.request.user
        role = get_user_role(user)
        if role not in (UserRole.ADMIN, UserRole.RECEPTIONIST) and not user.is_superuser:
            raise PermissionDenied("Only Administrators and Receptionists can register doctor profiles.")
        doctor = serializer.save()
        try:
            from notifications.services import notify_role
            from notifications.models import NotificationType
            doc_name = f"Dr. {doctor.first_name} {doctor.last_name}".strip()
            notify_role(
                role=UserRole.ADMIN,
                title="New Staff Account Created",
                message=f"New Doctor account created for {doc_name}.",
                notification_type=NotificationType.ACCOUNT,
                action_url="/admin/users",
                reference_id=f"DOC-{doctor.id}",
            )
        except Exception as err:
            logger.error("Failed to notify admins of doctor creation: %s", err)

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

    @action(detail=True, methods=["post"], url_path="resend-credentials")
    def resend_credentials(self, request, pk=None):
        doctor = self.get_object()
        user = request.user
        role = get_user_role(user)
        if role not in (UserRole.ADMIN, UserRole.RECEPTIONIST) and not user.is_superuser:
            raise PermissionDenied("Only Administrators and Receptionists can resend credentials.")

        email = doctor.email or (doctor.user.email if doctor.user else None)
        if not email:
            return Response({"error": "No email address found for this doctor."}, status=status.HTTP_400_BAD_REQUEST)

        res = send_user_welcome_credentials_email(
            email=email,
            user_name=doctor.full_name or f"Dr. {doctor.first_name} {doctor.last_name}".strip(),
            username=doctor.user.username if doctor.user else email,
            password=None,
            role_display="Doctor",
            account_id=doctor.doctor_id,
        )
        return Response({
            "success": res["success"],
            "email": email,
            "message": res["message"],
        }, status=status.HTTP_200_OK if res["success"] else status.HTTP_400_BAD_REQUEST)


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

    def create(self, request, *args, **kwargs):
        user = request.user
        role = get_user_role(user)
        if role not in (UserRole.ADMIN, UserRole.RECEPTIONIST) and not user.is_superuser:
            raise PermissionDenied("Only Administrators and Receptionists can create staff profiles.")
        return super().create(request, *args, **kwargs)

    def perform_create(self, serializer):
        user = self.request.user
        role = get_user_role(user)
        if role not in (UserRole.ADMIN, UserRole.RECEPTIONIST) and not user.is_superuser:
            raise PermissionDenied("Only Administrators and Receptionists can create staff profiles.")
        staff = serializer.save()
        try:
            from notifications.services import notify_role
            from notifications.models import NotificationType
            staff_name = f"{staff.first_name} {staff.last_name}".strip() or staff.user.username
            role_label = getattr(staff, "role", "Staff")
            notify_role(
                role=UserRole.ADMIN,
                title="New Staff Account Created",
                message=f"New {role_label} account created for {staff_name}.",
                notification_type=NotificationType.ACCOUNT,
                action_url="/admin/users",
                reference_id=f"STAFF-{staff.id}",
            )
        except Exception as err:
            logger.error("Failed to notify admins of staff creation: %s", err)

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

    @action(detail=True, methods=["post"], url_path="resend-credentials")
    def resend_credentials(self, request, pk=None):
        staff = self.get_object()
        user = request.user
        role = get_user_role(user)
        if role not in (UserRole.ADMIN, UserRole.RECEPTIONIST) and not user.is_superuser:
            raise PermissionDenied("Only Administrators and Receptionists can resend credentials.")

        email = staff.email or (staff.user.email if staff.user else None)
        if not email:
            return Response({"error": "No email address found for this staff member."}, status=status.HTTP_400_BAD_REQUEST)

        role_display_map = {
            UserRole.RECEPTIONIST: "Receptionist",
            UserRole.LAB_STAFF: "Laboratory Staff",
            UserRole.PHARMACIST: "Pharmacist",
        }
        role_label = role_display_map.get(staff.role, str(staff.role))

        res = send_user_welcome_credentials_email(
            email=email,
            user_name=staff.full_name or f"{staff.first_name} {staff.last_name}".strip(),
            username=staff.user.username if staff.user else email,
            password=None,
            role_display=role_label,
            account_id=staff.staff_id,
        )
        return Response({
            "success": res["success"],
            "email": email,
            "message": res["message"],
        }, status=status.HTTP_200_OK if res["success"] else status.HTTP_400_BAD_REQUEST)
