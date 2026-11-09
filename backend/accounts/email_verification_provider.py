import json
import logging
import urllib.error
import urllib.parse
import urllib.request
from abc import ABC, abstractmethod
from typing import Any, Dict, Optional

from django.conf import settings

logger = logging.getLogger(__name__)


class BaseEmailVerificationProvider(ABC):
    """
    Abstract base class for third-party email verification providers.
    All providers must implement a uniform interface returning normalized deliverability states:
    - 'DELIVERABLE': Mailbox exists and can receive email.
    - 'UNDELIVERABLE': Mailbox does not exist (rejected by remote MTA).
    - 'UNKNOWN': Inconclusive (greylisting, catch-all, timeout, rate limit, unconfigured).
    """

    def __init__(self, api_key: str = "", timeout: int = 5):
        self.api_key = api_key or getattr(settings, "EMAIL_VERIFICATION_API_KEY", "")
        self.timeout = timeout or getattr(settings, "EMAIL_VERIFICATION_TIMEOUT", 5)

    @property
    @abstractmethod
    def name(self) -> str:
        pass

    def is_configured(self) -> bool:
        return bool(self.api_key and self.api_key.strip())

    @abstractmethod
    def verify(self, email: str) -> Dict[str, Any]:
        pass


class AbstractAPIProvider(BaseEmailVerificationProvider):
    """
    Integration with Abstract API Email Validation:
    Docs: https://www.abstractapi.com/api/email-verification-validation-api
    Endpoint: https://emailvalidation.abstractapi.com/v1/
    """

    @property
    def name(self) -> str:
        return "abstractapi"

    def verify(self, email: str) -> Dict[str, Any]:
        if not self.is_configured():
            logger.info("Abstract API key not configured; mailbox verification is inconclusive.")
            return {
                "provider": self.name,
                "configured": False,
                "deliverability": "UNKNOWN",
                "is_smtp_valid": None,
                "autocorrect": "",
                "error": "Provider API key not configured.",
                "raw": {},
            }

        url = (
            f"https://emailvalidation.abstractapi.com/v1/?"
            f"api_key={urllib.parse.quote(self.api_key)}&"
            f"email={urllib.parse.quote(email.strip())}"
        )
        headers = {
            "User-Agent": "CareFlow-HMS-EmailVerifier/1.0",
            "Accept": "application/json",
        }

        req = urllib.request.Request(url, headers=headers)
        try:
            with urllib.request.urlopen(req, timeout=self.timeout) as response:
                if response.status == 200:
                    payload = json.loads(response.read().decode("utf-8"))
                    deliverability_raw = str(payload.get("deliverability", "")).upper()
                    autocorrect = payload.get("autocorrect", "") or ""

                    # Extract smtp check
                    is_smtp_dict = payload.get("is_smtp_valid", {})
                    is_smtp_valid = is_smtp_dict.get("value") if isinstance(is_smtp_dict, dict) else None

                    if deliverability_raw == "DELIVERABLE":
                        deliverability = "DELIVERABLE"
                    elif deliverability_raw == "UNDELIVERABLE":
                        deliverability = "UNDELIVERABLE"
                    else:
                        deliverability = "UNKNOWN"

                    # If SMTP is explicitly invalid, classify as UNDELIVERABLE
                    if is_smtp_valid is False:
                        deliverability = "UNDELIVERABLE"

                    return {
                        "provider": self.name,
                        "configured": True,
                        "deliverability": deliverability,
                        "is_smtp_valid": is_smtp_valid,
                        "autocorrect": autocorrect.strip(),
                        "error": None,
                        "raw": payload,
                    }
                else:
                    return {
                        "provider": self.name,
                        "configured": True,
                        "deliverability": "UNKNOWN",
                        "is_smtp_valid": None,
                        "autocorrect": "",
                        "error": f"HTTP status {response.status}",
                        "raw": {},
                    }

        except urllib.error.HTTPError as exc:
            logger.warning(f"Abstract API HTTPError {exc.code} for email {email}: {exc.reason}")
            # Handle rate limits (429) or unauthorized (401) gracefully
            return {
                "provider": self.name,
                "configured": True,
                "deliverability": "UNKNOWN",
                "is_smtp_valid": None,
                "autocorrect": "",
                "error": f"HTTP {exc.code}: {exc.reason}",
                "raw": {},
            }
        except urllib.error.URLError as exc:
            logger.warning(f"Abstract API URLError / network timeout for email {email}: {exc}")
            return {
                "provider": self.name,
                "configured": True,
                "deliverability": "UNKNOWN",
                "is_smtp_valid": None,
                "autocorrect": "",
                "error": f"Network error or timeout: {exc}",
                "raw": {},
            }
        except Exception as exc:
            logger.error(f"Unexpected error in Abstract API verification for {email}: {exc}")
            return {
                "provider": self.name,
                "configured": True,
                "deliverability": "UNKNOWN",
                "is_smtp_valid": None,
                "autocorrect": "",
                "error": str(exc),
                "raw": {},
            }


class HunterProvider(BaseEmailVerificationProvider):
    """
    Integration with Hunter.io Email Verifier:
    Docs: https://hunter.io/api/email-verifier
    Endpoint: https://api.hunter.io/v2/email-verifier
    """

    @property
    def name(self) -> str:
        return "hunter"

    def verify(self, email: str) -> Dict[str, Any]:
        if not self.is_configured():
            return {
                "provider": self.name,
                "configured": False,
                "deliverability": "UNKNOWN",
                "is_smtp_valid": None,
                "autocorrect": "",
                "error": "Hunter.io API key not configured.",
                "raw": {},
            }

        url = (
            f"https://api.hunter.io/v2/email-verifier?"
            f"email={urllib.parse.quote(email.strip())}&"
            f"api_key={urllib.parse.quote(self.api_key)}"
        )
        headers = {
            "User-Agent": "CareFlow-HMS-EmailVerifier/1.0",
            "Accept": "application/json",
        }

        req = urllib.request.Request(url, headers=headers)
        try:
            with urllib.request.urlopen(req, timeout=self.timeout) as response:
                if response.status == 200:
                    payload = json.loads(response.read().decode("utf-8"))
                    data = payload.get("data", {})
                    result = str(data.get("result", "")).lower()
                    smtp_check = data.get("smtp_check")

                    if result == "deliverable":
                        deliverability = "DELIVERABLE"
                    elif result == "undeliverable":
                        deliverability = "UNDELIVERABLE"
                    else:
                        deliverability = "UNKNOWN"

                    return {
                        "provider": self.name,
                        "configured": True,
                        "deliverability": deliverability,
                        "is_smtp_valid": smtp_check,
                        "autocorrect": "",
                        "error": None,
                        "raw": payload,
                    }
                else:
                    return {
                        "provider": self.name,
                        "configured": True,
                        "deliverability": "UNKNOWN",
                        "is_smtp_valid": None,
                        "autocorrect": "",
                        "error": f"HTTP status {response.status}",
                        "raw": {},
                    }
        except Exception as exc:
            logger.warning(f"Hunter.io verification error for {email}: {exc}")
            return {
                "provider": self.name,
                "configured": True,
                "deliverability": "UNKNOWN",
                "is_smtp_valid": None,
                "autocorrect": "",
                "error": str(exc),
                "raw": {},
            }


class ZeroBounceProvider(BaseEmailVerificationProvider):
    """
    Integration with ZeroBounce Email Validation:
    Docs: https://www.zerobounce.net/docs/email-validation-api-quickstart/
    Endpoint: https://api.zerobounce.net/v2/validate
    """

    @property
    def name(self) -> str:
        return "zerobounce"

    def verify(self, email: str) -> Dict[str, Any]:
        if not self.is_configured():
            return {
                "provider": self.name,
                "configured": False,
                "deliverability": "UNKNOWN",
                "is_smtp_valid": None,
                "autocorrect": "",
                "error": "ZeroBounce API key not configured.",
                "raw": {},
            }

        url = (
            f"https://api.zerobounce.net/v2/validate?"
            f"api_key={urllib.parse.quote(self.api_key)}&"
            f"email={urllib.parse.quote(email.strip())}"
        )
        headers = {
            "User-Agent": "CareFlow-HMS-EmailVerifier/1.0",
            "Accept": "application/json",
        }

        req = urllib.request.Request(url, headers=headers)
        try:
            with urllib.request.urlopen(req, timeout=self.timeout) as response:
                if response.status == 200:
                    payload = json.loads(response.read().decode("utf-8"))
                    status_raw = str(payload.get("status", "")).lower()
                    autocorrect = payload.get("did_you_mean", "") or ""

                    if status_raw == "valid":
                        deliverability = "DELIVERABLE"
                    elif status_raw in ("invalid", "spamtrap", "abuse", "do_not_mail"):
                        deliverability = "UNDELIVERABLE"
                    else:
                        deliverability = "UNKNOWN"

                    return {
                        "provider": self.name,
                        "configured": True,
                        "deliverability": deliverability,
                        "is_smtp_valid": (deliverability == "DELIVERABLE"),
                        "autocorrect": autocorrect.strip() if autocorrect != email else "",
                        "error": None,
                        "raw": payload,
                    }
                else:
                    return {
                        "provider": self.name,
                        "configured": True,
                        "deliverability": "UNKNOWN",
                        "is_smtp_valid": None,
                        "autocorrect": "",
                        "error": f"HTTP status {response.status}",
                        "raw": {},
                    }
        except Exception as exc:
            logger.warning(f"ZeroBounce verification error for {email}: {exc}")
            return {
                "provider": self.name,
                "configured": True,
                "deliverability": "UNKNOWN",
                "is_smtp_valid": None,
                "autocorrect": "",
                "error": str(exc),
                "raw": {},
            }


class UnconfiguredProvider(BaseEmailVerificationProvider):
    """
    Fallback provider when no third-party verification API key is configured.
    Honestly marks mailbox status as UNKNOWN / unconfigured instead of falsely pretending
    mailbox verification is working.
    """

    @property
    def name(self) -> str:
        return "unconfigured"

    def is_configured(self) -> bool:
        return False

    def verify(self, email: str) -> Dict[str, Any]:
        return {
            "provider": self.name,
            "configured": False,
            "deliverability": "UNKNOWN",
            "is_smtp_valid": None,
            "autocorrect": "",
            "error": "Mailbox-level verification requires EMAIL_VERIFICATION_API_KEY. Configure in backend/.env",
            "raw": {},
        }


def get_email_verification_provider(
    provider_name: Optional[str] = None,
    api_key: Optional[str] = None,
    timeout: Optional[int] = None
) -> BaseEmailVerificationProvider:
    """
    Factory function returning the configured email verification provider.
    Supported providers: 'abstractapi' (default), 'hunter', 'zerobounce'.
    """
    provider_choice = (
        provider_name or getattr(settings, "EMAIL_VERIFICATION_PROVIDER", "abstractapi") or "abstractapi"
    ).lower().strip()
    key = api_key if api_key is not None else getattr(settings, "EMAIL_VERIFICATION_API_KEY", "")
    to = timeout or getattr(settings, "EMAIL_VERIFICATION_TIMEOUT", 5)

    if not key:
        return UnconfiguredProvider(api_key="", timeout=to)

    if provider_choice == "hunter":
        return HunterProvider(api_key=key, timeout=to)
    elif provider_choice == "zerobounce":
        return ZeroBounceProvider(api_key=key, timeout=to)
    else:
        return AbstractAPIProvider(api_key=key, timeout=to)

