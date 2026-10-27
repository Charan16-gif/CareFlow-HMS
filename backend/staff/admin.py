from django.contrib import admin
from .models import Doctor, StaffProfile


@admin.register(Doctor)
class DoctorAdmin(admin.ModelAdmin):
    list_display = (
        "doctor_id",
        "full_name",
        "specialization",
        "department",
        "phone_number",
        "consultation_fee",
        "status",
    )
    list_filter = ("specialization", "department", "status")
    search_fields = ("doctor_id", "first_name", "last_name", "license_number", "email")
    readonly_fields = ("doctor_id", "created_at", "updated_at")


@admin.register(StaffProfile)
class StaffProfileAdmin(admin.ModelAdmin):
    list_display = (
        "staff_id",
        "full_name",
        "role",
        "department",
        "phone_number",
        "status",
    )
    list_filter = ("role", "department", "status")
    search_fields = ("staff_id", "first_name", "last_name", "email")
    readonly_fields = ("staff_id", "created_at", "updated_at")
