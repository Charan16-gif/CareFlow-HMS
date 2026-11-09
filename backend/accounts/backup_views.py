from pathlib import Path
from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.exceptions import PermissionDenied, ValidationError
from django.http import FileResponse, Http404
from drf_spectacular.utils import extend_schema, extend_schema_view

from accounts.models import DatabaseBackupRecord
from accounts.permissions import IsAdminUserRole
from accounts.serializers import (
    DatabaseBackupRecordSerializer,
    DatabaseRestoreRequestSerializer,
)
from config.backup_manager import (
    create_database_backup,
    restore_database_backup,
)
import logging

logger = logging.getLogger("backups")
frontend_logger = logging.getLogger("frontend")


@extend_schema_view(
    list=extend_schema(summary="List database backups", description="Admin only: View historical PostgreSQL backups"),
    retrieve=extend_schema(summary="Retrieve database backup details", description="Admin only"),
)
class DatabaseBackupViewSet(viewsets.ModelViewSet):
    """
    CareFlow HMS Database Backup & Disaster Recovery Management.
    Restricted strictly to the single Hospital Administrator.
    Provides verified manual backup triggering, integrity audits,
    secure file downloads, and safeguarded database restoration.
    """
    queryset = DatabaseBackupRecord.objects.all().order_by("-created_at")
    serializer_class = DatabaseBackupRecordSerializer
    permission_classes = [permissions.IsAuthenticated, IsAdminUserRole]
    filterset_fields = ["status", "is_automated"]
    search_fields = ["filename", "notes"]
    ordering_fields = ["created_at", "file_size_bytes"]

    @extend_schema(
        summary="Create database backup now",
        description="Admin only: Triggers an immediate full PostgreSQL database backup with TOC integrity check.",
        request={"application/json": {"type": "object", "properties": {"notes": {"type": "string"}}}},
        responses={201: DatabaseBackupRecordSerializer, 500: {"type": "object"}},
    )
    @action(detail=False, methods=["post"], url_path="create-backup")
    def trigger_backup(self, request):
        notes = request.data.get("notes", "").strip() or "Manual backup initiated by Administrator from Dashboard"
        logger.info(f"Administrator {request.user.username} triggered manual backup: '{notes}'")

        success, message, record = create_database_backup(
            user=request.user,
            is_automated=False,
            notes=notes,
        )

        if not success:
            return Response(
                {"detail": message, "error": message, "record": DatabaseBackupRecordSerializer(record).data},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        try:
            from notifications.services import notify_role
            from notifications.models import NotificationType
            from accounts.models import UserRole
            notify_role(
                role=UserRole.ADMIN,
                title="System Backup Created",
                message=f"System database backup completed successfully ({record.filename}).",
                notification_type=NotificationType.SYSTEM,
                action_url="/admin",
                reference_id=f"BACKUP-{record.id}",
            )
        except Exception:
            pass

        return Response(DatabaseBackupRecordSerializer(record).data, status=status.HTTP_201_CREATED)

    @extend_schema(
        summary="Restore database backup",
        description="Admin only: Restores database from a verified backup with mandatory confirmation phrase.",
        request=DatabaseRestoreRequestSerializer,
        responses={200: {"type": "object"}, 400: {"type": "object"}},
    )
    @action(detail=True, methods=["post"], url_path="restore")
    def restore_backup(self, request, pk=None):
        backup = self.get_object()
        serializer = DatabaseRestoreRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        confirmation_phrase = serializer.validated_data["confirmation_phrase"].strip()
        expected = f"RESTORE-CONFIRM-{backup.filename}"

        if confirmation_phrase != expected:
            raise ValidationError({
                "confirmation_phrase": f"Incorrect confirmation phrase. You must enter exactly: '{expected}'"
            })

        logger.warning(
            f"ADMIN {request.user.username} confirmed RESTORE of backup #{backup.id} ({backup.filename})!"
        )

        success, message = restore_database_backup(
            backup_record_or_id=backup,
            user=request.user,
            confirmation_phrase=confirmation_phrase,
        )

        if not success:
            return Response(
                {"detail": message, "error": message},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response({
            "success": True,
            "message": message,
            "backup": DatabaseBackupRecordSerializer(backup).data,
        }, status=status.HTTP_200_OK)

    @extend_schema(
        summary="Download database backup file",
        description="Admin only: Stream the raw .dump backup archive securely.",
        responses={200: {"type": "string", "format": "binary"}},
    )
    @action(detail=True, methods=["get"], url_path="download")
    def download_backup(self, request, pk=None):
        backup = self.get_object()
        file_path = Path(backup.file_path)

        if not file_path.is_file():
            raise Http404(f"Backup file '{backup.filename}' does not exist on disk.")

        logger.info(f"Admin {request.user.username} downloaded backup {backup.filename}")
        response = FileResponse(
            open(file_path, "rb"),
            as_attachment=True,
            filename=backup.filename,
            content_type="application/octet-stream",
        )
        response["Content-Length"] = file_path.stat().st_size
        return response

    def perform_destroy(self, instance):
        """
        Delete backup file from disk and remove its database audit record.
        """
        logger.info(f"Admin {self.request.user.username} deleted backup #{instance.id} ({instance.filename})")
        try:
            p = Path(instance.file_path)
            if p.is_file():
                p.unlink()
        except Exception as e:
            logger.warning(f"Could not remove physical backup file {instance.file_path}: {e}")
        instance.delete()


class FrontendErrorLogView(APIView):
    """
    Ingests frontend client-side errors and logs them into backend logs/errors.log.
    """
    permission_classes = [permissions.AllowAny]

    @extend_schema(
        summary="Log frontend client error",
        description="Receives client-side React errors and uncaught exceptions for centralized logging.",
        request={"application/json": {"type": "object"}},
        responses={200: {"type": "object"}},
    )
    def post(self, request):
        data = request.data or {}
        msg = data.get("message", "Unknown frontend error")
        stack = data.get("stack", "")
        url = data.get("url", "")
        user_agent = request.META.get("HTTP_USER_AGENT", "Unknown UA")

        user_info = f"User: {request.user.username}" if request.user and request.user.is_authenticated else "Unauthenticated"
        frontend_logger.warning(
            f"Client Error [{user_info} | {url}]: {msg}\nStack: {stack}\nUser-Agent: {user_agent}"
        )
        return Response({"success": True}, status=status.HTTP_200_OK)

