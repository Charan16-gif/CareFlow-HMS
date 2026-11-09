from django.utils import timezone
from drf_spectacular.utils import extend_schema, OpenApiParameter
from rest_framework import status, permissions, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from .models import Notification
from .serializers import (
    NotificationSerializer,
    NotificationCountSerializer,
    NotificationActionResponseSerializer,
)


class NotificationViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Centralized, Role-Based Notification ViewSet.
    Enforces that users can only view, read, and manage their own notifications.
    """
    serializer_class = NotificationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        # Strict user isolation: only return notifications belonging to the logged-in user
        user = self.request.user
        qs = Notification.objects.filter(recipient=user, is_cleared=False)
        unread_only = self.request.query_params.get("unread_only", "").lower() in ["true", "1"]
        if unread_only:
            qs = qs.filter(is_read=False)
        return qs.order_by("-created_at")

    @extend_schema(
        summary="List user notifications",
        description="Returns notification history for the authenticated user",
        parameters=[
            OpenApiParameter(name="unread_only", description="Filter for unread notifications only", required=False, type=bool)
        ]
    )
    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        # Non-paginated default: return recent notifications (limit 50)
        notifications = queryset[:50]
        serializer = self.get_serializer(notifications, many=True)
        unread_count = Notification.objects.filter(
            recipient=request.user, is_cleared=False, is_read=False
        ).count()
        return Response({
            "results": serializer.data,
            "count": queryset.count(),
            "unread_count": unread_count,
        })

    @extend_schema(
        summary="Get unread notification count",
        description="Returns the unread notification count for the authenticated user",
        responses={200: NotificationCountSerializer},
    )
    @action(detail=False, methods=["get"], url_path="unread-count")
    def unread_count(self, request):
        count = Notification.objects.filter(
            recipient=request.user, is_cleared=False, is_read=False
        ).count()
        return Response({"unread_count": count})

    @extend_schema(
        summary="Mark notification as read",
        description="Marks a single notification as read",
        responses={200: NotificationActionResponseSerializer},
    )
    @action(detail=True, methods=["post", "patch"], url_path="read")
    def mark_as_read(self, request, pk=None):
        notification = self.get_object()
        if not notification.is_read:
            notification.is_read = True
            notification.read_at = timezone.now()
            notification.save(update_fields=["is_read", "read_at", "updated_at"])

        unread_count = Notification.objects.filter(
            recipient=request.user, is_cleared=False, is_read=False
        ).count()

        return Response({
            "success": True,
            "message": "Notification marked as read.",
            "unread_count": unread_count,
            "notification": NotificationSerializer(notification).data,
        })

    @extend_schema(
        summary="Mark all notifications as read",
        description="Marks all unread notifications for the authenticated user as read",
        responses={200: NotificationActionResponseSerializer},
    )
    @action(detail=False, methods=["post"], url_path="mark-all-read")
    def mark_all_as_read(self, request):
        updated_count = Notification.objects.filter(
            recipient=request.user, is_cleared=False, is_read=False
        ).update(is_read=True, read_at=timezone.now(), updated_at=timezone.now())

        return Response({
            "success": True,
            "message": f"All {updated_count} unread notifications marked as read.",
            "unread_count": 0,
        })

    @extend_schema(
        summary="Clear all notifications",
        description="Clears all active notifications from the user's notification panel",
        responses={200: NotificationActionResponseSerializer},
    )
    @action(detail=False, methods=["post", "delete"], url_path="clear")
    def clear_all(self, request):
        cleared_count = Notification.objects.filter(
            recipient=request.user, is_cleared=False
        ).update(is_cleared=True, updated_at=timezone.now())

        return Response({
            "success": True,
            "message": f"{cleared_count} notifications cleared.",
            "unread_count": 0,
        })

    @extend_schema(
        summary="Delete or dismiss a single notification",
        description="Removes a specific notification from the user's list",
    )
    def destroy(self, request, *args, **kwargs):
        notification = self.get_object()
        notification.is_cleared = True
        notification.save(update_fields=["is_cleared", "updated_at"])
        unread_count = Notification.objects.filter(
            recipient=request.user, is_cleared=False, is_read=False
        ).count()
        return Response({
            "success": True,
            "message": "Notification dismissed.",
            "unread_count": unread_count,
        })

