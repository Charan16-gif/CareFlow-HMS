from django.contrib import admin
from .models import LabTest, LabOrder


@admin.register(LabTest)
class LabTestAdmin(admin.ModelAdmin):
    list_display = (
        "test_code",
        "test_name",
        "category",
        "price",
        "reference_range",
        "unit",
        "is_active",
    )
    list_filter = ("category", "is_active")
    search_fields = ("test_code", "test_name", "description")
    readonly_fields = ("test_code", "created_at", "updated_at")


@admin.register(LabOrder)
class LabOrderAdmin(admin.ModelAdmin):
    list_display = (
        "order_id",
        "test",
        "patient",
        "doctor",
        "status",
        "assigned_staff",
        "ordered_at",
        "completed_at",
    )
    list_filter = ("status", "ordered_at")
    search_fields = (
        "order_id",
        "test__test_name",
        "patient__first_name",
        "patient__last_name",
        "doctor__first_name",
        "doctor__last_name",
    )
    readonly_fields = ("order_id", "ordered_at", "updated_at")
