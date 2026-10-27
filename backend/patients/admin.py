from django.contrib import admin
from .models import Patient


@admin.register(Patient)
class PatientAdmin(admin.ModelAdmin):
    list_display = (
        "patient_id",
        "first_name",
        "last_name",
        "gender",
        "blood_group",
        "phone_number",
        "registration_date",
        "is_active",
    )
    list_filter = ("gender", "blood_group", "is_active", "registration_date")
    search_fields = ("patient_id", "first_name", "last_name", "phone_number", "email")
    readonly_fields = ("patient_id", "created_at", "updated_at")
