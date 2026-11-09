import logging
from django.conf import settings
from django.core.exceptions import PermissionDenied, ValidationError as DjangoValidationError
from django.http import Http404
from rest_framework.views import exception_handler
from rest_framework.response import Response
from rest_framework import status
from rest_framework.exceptions import (
    Throttled,
    AuthenticationFailed,
    NotAuthenticated,
    ValidationError as DRFValidationError,
)

logger = logging.getLogger("django.request")


def careflow_exception_handler(exc, context):
    """
    CareFlow HMS Custom Centralized Exception Handler.
    Standardizes error responses, provides friendly messages for throttling and auth errors,
    masks internal 500 errors in production, and logs full tracebacks to secure server logs.
    Preserves backwards compatibility with DRF field error dictionaries for existing forms.
    """
    # Call REST framework's default exception handler first to get the standard error response
    response = exception_handler(exc, context)

    # Handled exceptions (4xx)
    if response is not None:
        view = context.get("view")
        view_name = view.__class__.__name__ if view else "UnknownView"

        if isinstance(exc, Throttled):
            wait_seconds = int(exc.wait) if exc.wait is not None else 60
            response.data = {
                "detail": f"Request limit exceeded. Please slow down and try again in {wait_seconds} seconds.",
                "code": "throttled",
                "wait_seconds": wait_seconds,
                "status_code": status.HTTP_429_TOO_MANY_REQUESTS,
            }
            logger.warning(f"Rate limit exceeded on {view_name}: {exc}")

        elif isinstance(exc, (AuthenticationFailed, NotAuthenticated)):
            # Preserve existing custom code if present (e.g. incorrect_password, role_mismatch)
            if isinstance(response.data, dict) and "code" not in response.data:
                response.data["code"] = getattr(exc, "get_codes", lambda: "authentication_failed")()
            response.data["status_code"] = response.status_code

        elif isinstance(exc, PermissionDenied):
            if isinstance(response.data, dict):
                response.data["code"] = "permission_denied"
                response.data["status_code"] = status.HTTP_403_FORBIDDEN

        elif isinstance(exc, Http404):
            if isinstance(response.data, dict):
                response.data["code"] = "not_found"
                response.data["status_code"] = status.HTTP_404_NOT_FOUND

        return response

    # Unhandled exceptions (500 Internal Server Error)
    view = context.get("view")
    view_name = view.__class__.__name__ if view else "UnknownView"
    logger.error(
        f"Unhandled server exception in {view_name}: {exc}",
        exc_info=True,
        extra={"request": context.get("request")}
    )

    if settings.DEBUG:
        error_payload = {
            "detail": f"Server Error: {str(exc)}",
            "error": str(exc),
            "code": "internal_server_error",
            "status_code": status.HTTP_500_INTERNAL_SERVER_ERROR,
        }
    else:
        error_payload = {
            "detail": "An internal server error occurred. Our engineering team has been notified.",
            "code": "internal_server_error",
            "status_code": status.HTTP_500_INTERNAL_SERVER_ERROR,
        }

    return Response(error_payload, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

