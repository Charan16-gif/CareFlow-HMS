from django.contrib import admin
from .models import Bill, BillItem, Payment


class BillItemInline(admin.TabularInline):
    model = BillItem
    extra = 1


class PaymentInline(admin.TabularInline):
    model = Payment
    extra = 0
    readonly_fields = ("receipt_number", "payment_date", "received_by")


@admin.register(Bill)
class BillAdmin(admin.ModelAdmin):
    list_display = (
        "bill_number",
        "patient",
        "total_amount",
        "discount_amount",
        "net_amount",
        "paid_amount",
        "balance_due",
        "status",
        "created_at",
    )
    list_filter = ("status", "created_at")
    search_fields = (
        "bill_number",
        "patient__first_name",
        "patient__last_name",
        "patient__patient_id",
    )
    inlines = [BillItemInline, PaymentInline]
    readonly_fields = ("bill_number", "created_at", "updated_at")


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = (
        "receipt_number",
        "bill",
        "amount",
        "payment_method",
        "status",
        "transaction_reference",
        "received_by",
        "payment_date",
    )
    list_filter = ("payment_method", "status", "payment_date")
    search_fields = (
        "receipt_number",
        "bill__bill_number",
        "transaction_reference",
        "bill__patient__first_name",
        "bill__patient__last_name",
    )
    readonly_fields = ("receipt_number", "payment_date")
