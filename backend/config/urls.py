from django.contrib import admin
from django.urls import path, include
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework_simplejwt.views import (
    TokenRefreshView,
    TokenVerifyView,
)
from accounts.views import CareFlowTokenObtainPairView
from drf_spectacular.views import (
    SpectacularAPIView,
    SpectacularSwaggerView,
    SpectacularRedocView,
)


from drf_spectacular.utils import extend_schema, inline_serializer
from rest_framework import serializers


@extend_schema(
    summary="Health check",
    description="Returns backend health and service status",
    responses={
        200: inline_serializer(
            name="HealthCheckResponse",
            fields={
                "status": serializers.CharField(),
                "service": serializers.CharField(),
                "version": serializers.CharField(),
                "api_documentation": serializers.CharField(),
            },
        )
    },
)
@api_view(["GET"])
@permission_classes([AllowAny])
def health_check(request):
    """
    CareFlow-HMS Health Check Endpoint
    Returns system status, service name, and version.
    """
    return Response({
        "status": "healthy",
        "service": "CareFlow-HMS Backend",
        "version": "1.0.0",
        "api_documentation": "/api/docs/",
    })


urlpatterns = [
    # Admin
    path("admin/", admin.site.urls),

    # Health check
    path("api/health/", health_check, name="api-health-check"),

    # OpenAPI 3 Schema & Swagger UI
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    path("api/docs/", SpectacularSwaggerView.as_view(url_name="schema"), name="swagger-ui"),
    path("api/redoc/", SpectacularRedocView.as_view(url_name="schema"), name="redoc"),

    # Authentication & Accounts (Registration, OTP verification, JWT)
    path("api/auth/", include("accounts.urls")),
    path("api/auth/token/", CareFlowTokenObtainPairView.as_view(), name="token-obtain-pair"),
    path("api/auth/token/refresh/", TokenRefreshView.as_view(), name="token-refresh"),
    path("api/auth/token/verify/", TokenVerifyView.as_view(), name="token-verify"),

    # CareFlow Clinical & Administrative Modules
    path("api/patients/", include("patients.urls")),
    path("api/staff/", include("staff.urls")),
    path("api/appointments/", include("appointments.urls")),
    path("api/pharmacy/", include("pharmacy.urls")),
    path("api/laboratory/", include("laboratory.urls")),
    path("api/billing/", include("billing.urls")),
]

from django.conf import settings
from django.conf.urls.static import static

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
