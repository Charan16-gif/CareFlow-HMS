import datetime
import logging
import uuid
from django.utils import timezone
from accounts.models import User, UserRole
from .models import Notification, NotificationType

logger = logging.getLogger(__name__)


def create_notification(
    recipient,
    title,
    message,
    notification_type=NotificationType.SYSTEM,
    action_url="",
    reference_id="",
    dedup_window_seconds=30,
):
    """
    Creates a notification for an active user with deduplication protection.
    Returns the created Notification instance or None if invalid recipient or duplicate.
    """
    if not recipient or not getattr(recipient, "is_active", True):
        return None

    # Deduplication check: prevent duplicate notifications within recent window
    if reference_id and dedup_window_seconds:
        recent_threshold = timezone.now() - datetime.timedelta(seconds=dedup_window_seconds)
        existing = Notification.objects.filter(
            recipient=recipient,
            notification_type=notification_type,
            reference_id=str(reference_id),
            title=title,
            created_at__gte=recent_threshold,
        ).first()
        if existing:
            logger.info("Notification deduplicated for user %s (reference %s)", recipient.username, reference_id)
            return existing

    try:
        ntf_id = f"NTF-{uuid.uuid4().hex[:10].upper()}"
        notification = Notification.objects.create(
            notification_id=ntf_id,
            recipient=recipient,
            title=title,
            message=message,
            notification_type=notification_type,
            action_url=action_url or "",
            reference_id=str(reference_id or ""),
        )
        return notification
    except Exception as e:
        logger.error("Failed to create notification for user %s: %s", getattr(recipient, "username", "unknown"), e)
        return None


def notify_role(
    role,
    title,
    message,
    notification_type=NotificationType.SYSTEM,
    action_url="",
    reference_id="",
    exclude_user=None,
    dedup_window_seconds=30,
):
    """
    Sends a notification to all active users having the given role.
    Optionally excludes a specific user (e.g. the actor who initiated the change).
    """
    users = User.objects.filter(profile__role=role, is_active=True)
    if exclude_user:
        users = users.exclude(id=exclude_user.id)

    notifications = []
    for user in users:
        ntf = create_notification(
            recipient=user,
            title=title,
            message=message,
            notification_type=notification_type,
            action_url=action_url,
            reference_id=reference_id,
            dedup_window_seconds=dedup_window_seconds,
        )
        if ntf:
            notifications.append(ntf)

    return notifications


def notify_multiple_users(
    users,
    title,
    message,
    notification_type=NotificationType.SYSTEM,
    action_url="",
    reference_id="",
    dedup_window_seconds=30,
):
    """
    Sends a notification to an iterable of User instances.
    """
    notifications = []
    for user in users:
        ntf = create_notification(
            recipient=user,
            title=title,
            message=message,
            notification_type=notification_type,
            action_url=action_url,
            reference_id=reference_id,
            dedup_window_seconds=dedup_window_seconds,
        )
        if ntf:
            notifications.append(ntf)
    return notifications
