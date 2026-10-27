from django.contrib import admin
from .models import (
    Medicine,
    StockMovement,
    Prescription,
    PrescriptionItem,
    MedicineDispense,
    DispenseItem,
)


class PrescriptionItemInline(admin.TabularInline):
    model = PrescriptionItem
    extra = 1


class DispenseItemInline(admin.TabularInline):
    model = DispenseItem
    extra = 1


@admin.register(Medicine)
class MedicineAdmin(admin.ModelAdmin):
    list_display = (
        "medicine_code",
        "name",
        "dosage_form",
        "strength",
        "unit_price",
        "stock_quantity",
        "reorder_level",
        "is_active",
    )
    list_filter = ("dosage_form", "is_active")
    search_fields = ("medicine_code", "name", "generic_name", "brand_name")
    readonly_fields = ("medicine_code", "created_at", "updated_at")


@admin.register(StockMovement)
class StockMovementAdmin(admin.ModelAdmin):
    list_display = (
        "movement_id",
        "medicine",
        "movement_type",
        "quantity",
        "previous_stock",
        "new_stock",
        "performed_by",
        "created_at",
    )
    list_filter = ("movement_type", "created_at")
    search_fields = ("movement_id", "medicine__name", "reference_note")
    readonly_fields = ("movement_id", "created_at")


@admin.register(Prescription)
class PrescriptionAdmin(admin.ModelAdmin):
    list_display = (
        "prescription_id",
        "patient",
        "doctor",
        "status",
        "created_at",
    )
    list_filter = ("status", "created_at")
    search_fields = (
        "prescription_id",
        "patient__first_name",
        "patient__last_name",
        "doctor__first_name",
        "doctor__last_name",
        "diagnosis",
    )
    inlines = [PrescriptionItemInline]
    readonly_fields = ("prescription_id", "created_at", "updated_at")


@admin.register(MedicineDispense)
class MedicineDispenseAdmin(admin.ModelAdmin):
    list_display = (
        "dispense_id",
        "prescription",
        "patient",
        "dispensed_by",
        "total_amount",
        "dispensed_at",
    )
    search_fields = ("dispense_id", "prescription__prescription_id", "patient__first_name", "patient__last_name")
    inlines = [DispenseItemInline]
    readonly_fields = ("dispense_id", "dispensed_at")
