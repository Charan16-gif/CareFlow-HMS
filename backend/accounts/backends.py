import logging
from django.contrib.auth.backends import ModelBackend
from django.contrib.auth.models import User
from django.db.models import Q

logger = logging.getLogger(__name__)


class EmailOrUsernameModelBackend(ModelBackend):
    """
    CareFlow HMS Custom Authentication Backend.
    Allows users to authenticate seamlessly using either their username OR their registered email.
    """
    def authenticate(self, request, username=None, password=None, **kwargs):
        if username is None:
            username = kwargs.get("email")

        if not username or not password:
            return None

        clean_identifier = str(username).strip()

        try:
            # Match either username or email (case-insensitive)
            user = User.objects.filter(
                Q(username__iexact=clean_identifier) | Q(email__iexact=clean_identifier)
            ).order_by("-is_active", "-date_joined").first()

            if user and user.check_password(password):
                return user
        except Exception as e:
            logger.error(f"Error during authentication: {e}", exc_info=True)
            return None

        return None
