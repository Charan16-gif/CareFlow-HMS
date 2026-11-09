from django.contrib import admin
from django.urls import path, include
from django.db import connection
from rest_framework import status, serializers
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework_simplejwt.views import (
    TokenRefreshView,
    TokenVerifyView,
    TokenBlacklistView,
)
from accounts.views import CareFlowTokenObtainPairView
from accounts.backup_views import FrontendErrorLogView
from drf_spectacular.views import (
    SpectacularAPIView,
    SpectacularSwaggerView,
    SpectacularRedocView,
)


from appointments.views import PatientFeedbackViewSet, MedicalQueryViewSet
from drf_spectacular.utils import extend_schema, inline_serializer


@extend_schema(
    summary="Health check",
    description="Returns backend health and database dependency status",
    responses={
        200: inline_serializer(
            name="HealthCheckResponse",
            fields={
                "status": serializers.CharField(),
                "service": serializers.CharField(),
                "version": serializers.CharField(),
                "database": serializers.CharField(),
                "api_documentation": serializers.CharField(),
            },
        )
    },
)
@api_view(["GET"])
@permission_classes([AllowAny])
def health_check(request):
    """
    CareFlow-HMS System Health Check Endpoint.
    Verifies API availability and active PostgreSQL database connectivity.
    """
    db_status = "connected"
    http_status = status.HTTP_200_OK
    try:
        connection.ensure_connection()
    except Exception:
        db_status = "disconnected"
        http_status = status.HTTP_503_SERVICE_UNAVAILABLE

    return Response(
        {
            "status": "healthy" if db_status == "connected" else "degraded",
            "service": "CareFlow-HMS Backend",
            "version": "1.0.0",
            "database": db_status,
            "api_documentation": "/api/docs/",
        },
        status=http_status,
    )


urlpatterns = [
    # Admin
    path("admin/", admin.site.urls),

    # Health check
    path("api/health/", health_check, name="api-health-check"),

    # Client-side Error Logging
    path("api/logs/frontend/", FrontendErrorLogView.as_view(), name="log-frontend-error"),

    # OpenAPI 3 Schema & Swagger UI
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    path("api/docs/", SpectacularSwaggerView.as_view(url_name="schema"), name="swagger-ui"),
    path("api/redoc/", SpectacularRedocView.as_view(url_name="schema"), name="redoc"),

    # Authentication & Accounts (Registration, OTP verification, JWT)
    path("api/auth/", include("accounts.urls")),
    path("api/auth/token/", CareFlowTokenObtainPairView.as_view(), name="token-obtain-pair"),
    path("api/auth/token/refresh/", TokenRefreshView.as_view(), name="token-refresh"),
    path("api/auth/token/verify/", TokenVerifyView.as_view(), name="token-verify"),
    path("api/auth/token/blacklist/", TokenBlacklistView.as_view(), name="token-blacklist"),

    # Database Backup & Disaster Recovery (Admin Only)
    path("api/admin/backups/", include("accounts.backup_urls")),

    # CareFlow Clinical & Administrative Modules
    path("api/patients/", include("patients.urls")),
    path("api/staff/", include("staff.urls")),
    path("api/appointments/", include("appointments.urls")),
    path("api/pharmacy/", include("pharmacy.urls")),
    path("api/laboratory/", include("laboratory.urls")),
    path("api/billing/", include("billing.urls")),
    path("api/notifications/", include("notifications.urls")),

    # Patient Feedback & Consultation Satisfaction
    path("api/feedback/", include([
        path("", PatientFeedbackViewSet.as_view({"get": "list", "post": "create"}), name="feedback-list"),
        path("<int:pk>/", PatientFeedbackViewSet.as_view({"get": "retrieve", "put": "update", "patch": "partial_update", "delete": "destroy"}), name="feedback-detail"),
        path("analytics/", PatientFeedbackViewSet.as_view({"get": "analytics"}), name="feedback-analytics"),
        path("eligible-appointments/", PatientFeedbackViewSet.as_view({"get": "eligible_appointments"}), name="feedback-eligible-appointments"),
    ])),

    # Contact Doctor & Post-Consultation Medical Queries
    path("api/medical-queries/", include([
        path("", MedicalQueryViewSet.as_view({"get": "list", "post": "create"}), name="medical-query-list"),
        path("<int:pk>/", MedicalQueryViewSet.as_view({"get": "retrieve", "put": "update", "patch": "partial_update", "delete": "destroy"}), name="medical-query-detail"),
        path("<int:pk>/respond/", MedicalQueryViewSet.as_view({"post": "respond_to_query"}), name="medical-query-respond"),
        path("<int:pk>/status/", MedicalQueryViewSet.as_view({"patch": "update_status"}), name="medical-query-status"),
        path("eligible-records/", MedicalQueryViewSet.as_view({"get": "eligible_records"}), name="medical-query-eligible-records"),
    ])),
]

from django.conf import settings
from django.conf.urls.static import static

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
