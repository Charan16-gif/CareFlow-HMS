from rest_framework.permissions import BasePermission, SAFE_METHODS
from .models import UserRole


def get_user_role(user):
    if not user or not user.is_authenticated:
        return None
    from .models import UserProfile
    role = UserProfile.objects.filter(user=user).values_list("role", flat=True).first()
    if role:
        return role
    if user.is_superuser:
        return UserRole.ADMIN
    return None


class ReadOnly(BasePermission):
    def has_permission(self, request, view):
        return request.method in SAFE_METHODS


class IsAdminUserRole(BasePermission):
    """Allows access only to CareFlow system administrator."""
    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False
        role = get_user_role(request.user)
        return role == UserRole.ADMIN or request.user.is_superuser


class IsDoctorRole(BasePermission):
    """Allows access only to Doctors. Excludes Admin from clinical treatment workflows."""
    def has_permission(self, request, view):
        return get_user_role(request.user) == UserRole.DOCTOR


class IsReceptionistRole(BasePermission):
    """Allows access to Receptionists. Excludes Admin from receptionist-only intake."""
    def has_permission(self, request, view):
        return get_user_role(request.user) == UserRole.RECEPTIONIST


class IsLabStaffRole(BasePermission):
    """Allows access to Laboratory Staff."""
    def has_permission(self, request, view):
        return get_user_role(request.user) == UserRole.LAB_STAFF


class IsPharmacistRole(BasePermission):
    """Allows access to Pharmacists."""
    def has_permission(self, request, view):
        return get_user_role(request.user) == UserRole.PHARMACIST


class IsPatientRole(BasePermission):
    """Allows access to Patients."""
    def has_permission(self, request, view):
        return get_user_role(request.user) == UserRole.PATIENT


class IsAdminOrDoctor(BasePermission):
    def has_permission(self, request, view):
        role = get_user_role(request.user)
        return role in (UserRole.ADMIN, UserRole.DOCTOR) or bool(request.user and request.user.is_superuser)


class IsAdminOrReceptionist(BasePermission):
    def has_permission(self, request, view):
        role = get_user_role(request.user)
        return role in (UserRole.ADMIN, UserRole.RECEPTIONIST) or bool(request.user and request.user.is_superuser)


class IsAdminOrPharmacist(BasePermission):
    def has_permission(self, request, view):
        role = get_user_role(request.user)
        return role in (UserRole.ADMIN, UserRole.PHARMACIST) or bool(request.user and request.user.is_superuser)


class IsAdminOrLabStaff(BasePermission):
    def has_permission(self, request, view):
        role = get_user_role(request.user)
        return role in (UserRole.ADMIN, UserRole.LAB_STAFF) or bool(request.user and request.user.is_superuser)


class IsClinicalStaff(BasePermission):
    def has_permission(self, request, view):
        role = get_user_role(request.user)
        return role in (
            UserRole.ADMIN,
            UserRole.DOCTOR,
            UserRole.RECEPTIONIST,
            UserRole.LAB_STAFF,
            UserRole.PHARMACIST,
        ) or bool(request.user and request.user.is_superuser)


class IsSelfPatientOrStaff(BasePermission):
    """
    Object-level permission allowing a patient to view their own record,
    while hospital staff have full clinical access.
    """
    def has_object_permission(self, request, view, obj):
        if not (request.user and request.user.is_authenticated):
            return False
        role = get_user_role(request.user)
        if role in (UserRole.ADMIN, UserRole.DOCTOR, UserRole.RECEPTIONIST, UserRole.LAB_STAFF, UserRole.PHARMACIST) or request.user.is_superuser:
            return True
        if role == UserRole.PATIENT:
            # Check user association
            patient_user = getattr(obj, "user", None) or getattr(getattr(obj, "patient", None), "user", None)
            return patient_user == request.user
        return False
