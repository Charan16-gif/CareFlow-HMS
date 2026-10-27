from django.contrib import admin
from .models import UserProfile, EmailOTPVerification


@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display = ("user", "role", "phone_number", "is_email_verified", "created_at")
    list_filter = ("role", "is_email_verified", "created_at")
    search_fields = ("user__username", "user__email", "phone_number")


@admin.register(EmailOTPVerification)
class EmailOTPVerificationAdmin(admin.ModelAdmin):
    list_display = ("email", "otp_code", "purpose", "is_verified", "attempts", "expires_at", "created_at")
    list_filter = ("purpose", "is_verified", "created_at")
    search_fields = ("email", "otp_code")
    readonly_fields = ("created_at",)
