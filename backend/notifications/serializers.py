from rest_framework import serializers
from .models import Notification


class NotificationSerializer(serializers.ModelSerializer):
    recipient_username = serializers.CharField(source="recipient.username", read_only=True)
    recipient_role = serializers.CharField(source="recipient.profile.role", default="", read_only=True)

    class Meta:
        model = Notification
        fields = [
            "id",
            "notification_id",
            "title",
            "message",
            "notification_type",
            "action_url",
            "reference_id",
            "is_read",
            "read_at",
            "created_at",
            "recipient_username",
            "recipient_role",
        ]
        read_only_fields = [
            "id",
            "notification_id",
            "title",
            "message",
            "notification_type",
            "action_url",
            "reference_id",
            "read_at",
            "created_at",
            "recipient_username",
            "recipient_role",
        ]


class NotificationCountSerializer(serializers.Serializer):
    unread_count = serializers.IntegerField(min_value=0)


class NotificationActionResponseSerializer(serializers.Serializer):
    success = serializers.BooleanField(default=True)
    message = serializers.CharField()
    unread_count = serializers.IntegerField(min_value=0)
