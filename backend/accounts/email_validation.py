import re
import socket
import subprocess
import logging
from typing import Tuple

logger = logging.getLogger(__name__)

# Standard user-facing error messages required by CareFlow specification
MSG_CHECKING = "Checking email address..."
MSG_CONFIRMED_VALID = "Email address looks valid."
MSG_INVALID_FORMAT = "Please enter a valid email address."
MSG_INVALID_EMAIL_FORMAT = MSG_INVALID_FORMAT
MSG_MAILBOX_NOT_FOUND = "This email address does not exist."
MSG_INVALID_DOMAIN = "This email domain cannot receive emails."
MSG_DISPOSABLE = "Temporary email addresses are not allowed."
MSG_UNKNOWN = "We couldn't verify this email address. Please try again."

MSG_SMTP_IMMEDIATE_REJECTION = "Email could not be sent. Please check your email address."
MSG_SMTP_CONNECTION_FAILURE = "Unable to send verification email. Please try again later."
MSG_EMAIL_ACCEPTED_BY_SMTP = "Verification email sending initiated. Please check your inbox."
MSG_OTP_INCORRECT = "Incorrect OTP. Please try again."
MSG_OTP_EXPIRED = "OTP expired. Please request a new OTP."
MSG_OTP_RESENT = "A new OTP sending request has been processed."
MSG_OTP_VERIFIED = "Email verified successfully."
MSG_DELIVERY_BOUNCE = "Email delivery failed. Please correct your email address."
MSG_ALREADY_REGISTERED = "This email address is already registered. Please use another email."

# Backwards-compatibility aliases
WRONG_EMAIL_ERROR = MSG_INVALID_EMAIL_FORMAT
ALREADY_REGISTERED_ERROR = MSG_ALREADY_REGISTERED
SERVICE_UNAVAILABLE_ERROR = MSG_SMTP_CONNECTION_FAILURE

# RFC 5322 compliant regex for strict email syntax validation
EMAIL_FORMAT_REGEX = re.compile(
    r"^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$"
)

# Legitimate, high-reputation email providers that are guaranteed to have valid mail servers
KNOWN_LEGITIMATE_DOMAINS = {
    "gmail.com",
    "googlemail.com",
    "google.com",
    "outlook.com",
    "hotmail.com",
    "live.com",
    "msn.com",
    "yahoo.com",
    "yahoo.co.in",
    "yahoo.co.uk",
    "ymail.com",
    "icloud.com",
    "me.com",
    "mac.com",
    "proton.me",
    "protonmail.com",
    "zoho.com",
    "aol.com",
    "gmx.com",
    "mail.com",
    "example.com",
    "careflow.com",
}

# Extensive catalog of known disposable, temporary, and 10-minute burner email domains
DISPOSABLE_EMAIL_DOMAINS = {
    "10minutemail.com",
    "10minutemail.net",
    "10minutemail.org",
    "10minutemail.co.uk",
    "tempmail.com",
    "temp-mail.org",
    "temp-mail.io",
    "tempmail.net",
    "tempmailaddress.com",
    "mailinator.com",
    "mailinator.net",
    "mailinator2.com",
    "guerrillamail.com",
    "guerrillamail.net",
    "guerrillamail.org",
    "guerrillamail.biz",
    "guerrillamailblock.com",
    "sharklasers.com",
    "grr.la",
    "spam4.me",
    "throwawaymail.com",
    "yopmail.com",
    "yopmail.fr",
    "yopmail.net",
    "dispostable.com",
    "getnada.com",
    "nada.ltd",
    "trashmail.com",
    "trashmail.net",
    "trashmail.me",
    "trashmail.org",
    "inboxkitten.com",
    "fakemailgenerator.com",
    "mytemp.email",
    "generator.email",
    "mohmal.com",
    "crazymailing.com",
    "dropmail.me",
    "burnermail.io",
    "luxusmail.com",
    "fakeinbox.com",
    "emailondeck.com",
    "maildrop.cc",
    "harakirimail.com",
    "discard.email",
    "mailnesia.com",
    "getairmail.com",
    "emailfake.com",
    "fakemail.net",
    "tempinbox.com",
    "crazymail.com",
    "mintemail.com",
    "jetable.org",
    "spamgourmet.com",
    "mytempemail.com",
    "mytrashmail.com",
    "spambox.us",
    "trashmail.net",
    "shortmail.com",
    "meltmail.com",
    "deadaddress.com",
    "disposablemail.com",
    "temporarymail.com",
    "trash-mail.at",
    "trash-mail.com",
    "trashmail.at",
    "wegwerfmail.de",
    "wegwerfmail.net",
    "guerrillamail.de",
    "binkmail.com",
    "bobmail.info",
    "chammy.info",
    "devnullmail.com",
    "letthemeatspam.com",
    "mailin8r.com",
    "mailinator.info",
    "suremail.info",
    "tradermail.info",
    "veryrealemail.com",
    "zippymail.info",
}


def validate_email_syntax(email: str) -> Tuple[bool, str]:
    """
    Validates structural email format according to RFC specifications:
    - Length constraints (total <= 254, local <= 64, domain <= 253)
    - Presence of '@' symbol with exactly one separator
    - Non-empty local-part and domain-part
    - No leading/trailing dots or consecutive dots
    - Domain contains valid dot-separated labels with valid TLD (>= 2 chars)
    """
    if not email or not isinstance(email, str):
        return False, "Email address cannot be empty."

    email = email.strip()
    if len(email) > 254:
        return False, "Email address exceeds maximum length of 254 characters."

    if "@" not in email:
        return False, "Missing '@' symbol."

    parts = email.split("@")
    if len(parts) != 2:
        return False, "Email contains multiple '@' symbols."

    local_part, domain_part = parts[0], parts[1]

    if not local_part:
        return False, "Missing username/local part before '@'."
    if not domain_part:
        return False, "Missing domain name after '@'."

    if len(local_part) > 64:
        return False, "Username/local part exceeds 64 characters."

    if local_part.startswith(".") or local_part.endswith("."):
        return False, "Local part cannot begin or end with a period."

    if ".." in local_part or ".." in domain_part:
        return False, "Consecutive periods are not permitted."

    if "." not in domain_part:
        return False, "Domain part must contain a top-level domain."

    domain_labels = domain_part.split(".")
    tld = domain_labels[-1]
    if len(tld) < 2 or not tld.isalpha():
        return False, "Invalid top-level domain."

    for label in domain_labels:
        if not label:
            return False, "Empty domain label."
        if label.startswith("-") or label.endswith("-"):
            return False, "Domain labels cannot begin or end with a hyphen."
        if not re.match(r"^[a-zA-Z0-9-]+$", label):
            return False, "Domain contains invalid characters."

    if not EMAIL_FORMAT_REGEX.match(email):
        return False, "Malformed email format."

    return True, ""


def is_disposable_email(email: str) -> bool:
    """
    Detects if the email's domain or any parent domain belongs to known disposable
    or temporary email services. Never flags recognized legitimate providers.
    """
    if not email or "@" not in email:
        return False

    domain = email.split("@")[1].strip().lower()

    if domain in KNOWN_LEGITIMATE_DOMAINS:
        return False

    # Check exact domain or parent domain matches (e.g. sub.mailinator.com)
    domain_parts = domain.split(".")
    for i in range(len(domain_parts) - 1):
        test_domain = ".".join(domain_parts[i:])
        if test_domain in DISPOSABLE_EMAIL_DOMAINS:
            return True

    return False


def validate_email_domain_dns(email: str, timeout_seconds: float = 2.5) -> Tuple[bool, str]:
    """
    Verifies that the email domain exists in DNS and possesses active mail routing (MX records).
    Safety Rules:
    - Known trusted domains (Gmail, Outlook, etc.) bypass external DNS queries to prevent false negatives.
    - Nonexistent domains (NXDOMAIN / host not found) are strictly rejected.
    - Transient DNS timeouts safely pass to prevent blocking valid users due to local network latency.
    """
    if not email or "@" not in email:
        return False, "Invalid email format."

    domain = email.split("@")[1].strip().lower()

    # Fast-path for verified, high-volume providers
    if domain in KNOWN_LEGITIMATE_DOMAINS:
        return True, ""

    # 1. First probe: socket host resolution (detects NXDOMAIN / nonexistent domains)
    try:
        socket.gethostbyname(domain)
    except socket.gaierror as exc:
        err_code = getattr(exc, "errno", None)
        err_str = str(exc).lower()
        # [Errno 11001] getaddrinfo failed on Windows, -2 on POSIX
        if err_code in (11001, -2) or "not known" in err_str or "no address" in err_str or "failed" in err_str:
            logger.warning(f"Email domain '{domain}' failed host resolution: {exc}")
            return False, "Nonexistent domain."
    except Exception as exc:
        logger.warning(f"Unexpected socket resolution error for '{domain}': {exc}")
        # Proceed to MX lookup fallback

    # 2. Second probe: nslookup for MX (Mail Exchanger) records
    try:
        res = subprocess.run(
            ["nslookup", "-type=mx", domain],
            capture_output=True,
            text=True,
            timeout=timeout_seconds,
        )
        combined_output = (res.stdout + "\n" + res.stderr).lower()

        # Explicit non-existence
        if "non-existent domain" in combined_output or "server can't find" in combined_output or "can't find" in combined_output and "non-existent" in combined_output:
            logger.warning(f"nslookup confirms nonexistent domain for '{domain}'")
            return False, "Nonexistent domain."

        # Check for confirmed MX records
        if "mail exchanger" in combined_output or "mx preference" in combined_output:
            return True, ""

        # If domain has no MX record and explicitly states no answer
        if "no mx" in combined_output or "no mail exchanger" in combined_output:
            # Check if domain has an A record fallback
            try:
                socket.getaddrinfo(domain, 25)
                return True, ""
            except Exception:
                return False, "Domain does not have valid mail server configuration."

    except subprocess.TimeoutExpired:
        # Timeout occurred: as required by spec, do not block valid domains due to temporary DNS delay
        logger.info(f"DNS lookup timed out for domain '{domain}'; passing safely.")
        return True, ""
    except Exception as exc:
        logger.warning(f"nslookup MX query encountered exception for '{domain}': {exc}")
        # Pass safely on OS-level command execution issues
        return True, ""

    return True, ""


# Popular email domains to check for typos
POPULAR_EMAIL_DOMAINS = [
    "gmail.com",
    "googlemail.com",
    "yahoo.com",
    "yahoo.co.in",
    "yahoo.co.uk",
    "hotmail.com",
    "outlook.com",
    "icloud.com",
    "live.com",
    "msn.com",
    "zoho.com",
    "proton.me",
    "protonmail.com",
    "aol.com",
]

# Explicit dictionary of frequent misspellings
COMMON_DOMAIN_TYPOS = {
    # Gmail
    "gmial.com": "gmail.com",
    "gamil.com": "gmail.com",
    "gmai.com": "gmail.com",
    "gmaill.com": "gmail.com",
    "gmai.co": "gmail.com",
    "gmaik.com": "gmail.com",
    "gmaul.com": "gmail.com",
    "gmail.con": "gmail.com",
    "gmail.co": "gmail.com",
    "gmail.cm": "gmail.com",
    "gemail.com": "gmail.com",
    # Yahoo
    "yaho.com": "yahoo.com",
    "yaoo.com": "yahoo.com",
    "yahooo.com": "yahoo.com",
    "yaho.co": "yahoo.com",
    "yaho.co.in": "yahoo.co.in",
    "yahoo.con": "yahoo.com",
    "yaho.cm": "yahoo.com",
    # Hotmail
    "hotmial.com": "hotmail.com",
    "hotmai.com": "hotmail.com",
    "hotmil.com": "hotmail.com",
    "hotmaill.com": "hotmail.com",
    "hotmail.con": "hotmail.com",
    # Outlook
    "outlok.com": "outlook.com",
    "outllok.com": "outlook.com",
    "outloo.com": "outlook.com",
    "outloook.com": "outlook.com",
    "outlook.con": "outlook.com",
    # iCloud
    "icoud.com": "icloud.com",
    "iclod.com": "icloud.com",
    "icloud.con": "icloud.com",
    # Zoho
    "zohomail.com": "zoho.com",
    "zooho.com": "zoho.com",
    # Proton
    "prton.me": "proton.me",
    "protonmai.com": "proton.me",
}


def _levenshtein_distance(s1: str, s2: str) -> int:
    """Computes Levenshtein distance between two strings."""
    if len(s1) < len(s2):
        return _levenshtein_distance(s2, s1)
    if len(s2) == 0:
        return len(s1)
    previous_row = range(len(s2) + 1)
    for i, c1 in enumerate(s1):
        current_row = [i + 1]
        for j, c2 in enumerate(s2):
            insertions = previous_row[j + 1] + 1
            deletions = current_row[j] + 1
            substitutions = previous_row[j] + (c1 != c2)
            current_row.append(min(insertions, deletions, substitutions))
        previous_row = current_row
    return previous_row[-1]


def detect_domain_typo(domain: str) -> Optional[str]:
    """
    Detects common domain typos for popular providers (e.g. gmial.com -> gmail.com).
    Returns suggested domain name or None if no typo detected.
    """
    if not domain or not isinstance(domain, str):
        return None
    d = domain.strip().lower()
    if d in POPULAR_EMAIL_DOMAINS or d in DISPOSABLE_EMAIL_DOMAINS:
        return None

    if d in COMMON_DOMAIN_TYPOS:
        return COMMON_DOMAIN_TYPOS[d]

    for target in POPULAR_EMAIL_DOMAINS:
        dist = _levenshtein_distance(d, target)
        if dist == 1 or (dist == 2 and len(d) >= 7):
            return target

    return None


def verify_email_comprehensive(email: str, check_mailbox: bool = True) -> Dict[str, Any]:
    """
    Performs complete, professional real-time email verification:
    1. Syntax & Format Validation
    2. Common Domain Typo Detection
    3. Disposable / Burner Email Detection
    4. Domain Existence & DNS MX Verification
    5. Cache Check (prevents repeated external API calls and rate-limiting)
    6. Third-Party Mailbox Verification (Abstract API / Hunter.io / ZeroBounce)
    """
    from django.conf import settings
    from django.core.cache import cache
    from .email_verification_provider import get_email_verification_provider

    if not email or not isinstance(email, str) or not email.strip():
        return {
            "email": "",
            "status": "INVALID_FORMAT",
            "is_valid": False,
            "message": MSG_INVALID_EMAIL_FORMAT,
            "suggested_email": None,
            "allow_continue": False,
            "details": {
                "syntax": False,
                "domain": False,
                "mx": False,
                "disposable": False,
                "mailbox": "UNKNOWN",
                "reason": "Email address cannot be empty.",
            },
        }

    clean_email = email.strip().lower()

    # Step 1: Syntax & Format Validation
    is_valid_format, format_err = validate_email_syntax(clean_email)
    if not is_valid_format:
        return {
            "email": clean_email,
            "status": "INVALID_FORMAT",
            "is_valid": False,
            "message": MSG_INVALID_EMAIL_FORMAT,
            "suggested_email": None,
            "allow_continue": False,
            "details": {
                "syntax": False,
                "domain": False,
                "mx": False,
                "disposable": False,
                "mailbox": "UNKNOWN",
                "reason": format_err,
            },
        }

    local_part, domain_part = clean_email.split("@")

    # Step 2: Domain Typo Detection (e.g. charan@gmial.com -> suggest charan@gmail.com)
    suggested_domain = detect_domain_typo(domain_part)
    if suggested_domain:
        suggested_email = f"{local_part}@{suggested_domain}"
        return {
            "email": clean_email,
            "status": "POSSIBLE_TYPO",
            "is_valid": False,
            "message": f"Did you mean {suggested_email}?",
            "suggested_email": suggested_email,
            "allow_continue": False,
            "details": {
                "syntax": True,
                "domain": False,
                "mx": False,
                "disposable": False,
                "mailbox": "UNKNOWN",
                "typo": True,
                "suggested_domain": suggested_domain,
            },
        }

    # Step 3: Disposable Burner Email Detection
    if is_disposable_email(clean_email):
        return {
            "email": clean_email,
            "status": "DISPOSABLE",
            "is_valid": False,
            "message": MSG_DISPOSABLE,
            "suggested_email": None,
            "allow_continue": False,
            "details": {
                "syntax": True,
                "domain": True,
                "mx": False,
                "disposable": True,
                "mailbox": "UNKNOWN",
            },
        }

    # Step 4: Domain Existence & DNS MX Verification
    has_valid_domain, domain_err = validate_email_domain_dns(clean_email)
    if not has_valid_domain:
        return {
            "email": clean_email,
            "status": "INVALID_DOMAIN",
            "is_valid": False,
            "message": MSG_INVALID_DOMAIN,
            "suggested_email": None,
            "allow_continue": False,
            "details": {
                "syntax": True,
                "domain": False,
                "mx": False,
                "disposable": False,
                "mailbox": "UNKNOWN",
                "reason": domain_err,
            },
        }

    # If mailbox verification is explicitly skipped (e.g. offline unit testing)
    if not check_mailbox:
        return {
            "email": clean_email,
            "status": "VALID",
            "is_valid": True,
            "message": MSG_CONFIRMED_VALID,
            "suggested_email": None,
            "allow_continue": True,
            "details": {
                "syntax": True,
                "domain": True,
                "mx": True,
                "disposable": False,
                "mailbox": "SKIPPED",
            },
        }

    # Step 5: Check Cache for Repeated Validations
    cache_key = f"careflow_email_val_{clean_email}"
    cached_val = cache.get(cache_key)
    if cached_val:
        cached_copy = dict(cached_val)
        cached_copy["details"] = dict(cached_copy.get("details", {}))
        cached_copy["details"]["cached"] = True
        return cached_copy

    # Step 6: Third-Party Email Verification Provider
    provider = get_email_verification_provider()
    provider_res = provider.verify(clean_email)

    # Check for provider autocorrect typo suggestion
    autocorrect = provider_res.get("autocorrect", "")
    if autocorrect and autocorrect.strip() != clean_email:
        res = {
            "email": clean_email,
            "status": "POSSIBLE_TYPO",
            "is_valid": False,
            "message": f"Did you mean {autocorrect.strip()}?",
            "suggested_email": autocorrect.strip(),
            "allow_continue": False,
            "details": {
                "syntax": True,
                "domain": True,
                "mx": True,
                "disposable": False,
                "mailbox": provider_res.get("deliverability", "UNKNOWN"),
                "provider": provider.name,
                "configured": provider.is_configured(),
            },
        }
        cache.set(cache_key, res, getattr(settings, "EMAIL_VERIFICATION_CACHE_TTL", 3600))
        return res

    deliverability = provider_res.get("deliverability", "UNKNOWN")
    is_smtp_valid = provider_res.get("is_smtp_valid")

    if deliverability == "UNDELIVERABLE" or is_smtp_valid is False:
        res = {
            "email": clean_email,
            "status": "MAILBOX_NOT_FOUND",
            "is_valid": False,
            "message": MSG_MAILBOX_NOT_FOUND,
            "suggested_email": None,
            "allow_continue": False,
            "details": {
                "syntax": True,
                "domain": True,
                "mx": True,
                "disposable": False,
                "mailbox": "UNDELIVERABLE",
                "provider": provider.name,
                "configured": provider.is_configured(),
            },
        }
        cache.set(cache_key, res, getattr(settings, "EMAIL_VERIFICATION_CACHE_TTL", 3600))
        return res

    elif deliverability == "DELIVERABLE" and (is_smtp_valid is True or is_smtp_valid is None):
        res = {
            "email": clean_email,
            "status": "VALID",
            "is_valid": True,
            "message": MSG_CONFIRMED_VALID,
            "suggested_email": None,
            "allow_continue": True,
            "details": {
                "syntax": True,
                "domain": True,
                "mx": True,
                "disposable": False,
                "mailbox": "DELIVERABLE",
                "provider": provider.name,
                "configured": provider.is_configured(),
            },
        }
        cache.set(cache_key, res, getattr(settings, "EMAIL_VERIFICATION_CACHE_TTL", 3600))
        return res

    else:
        # Inconclusive (UNKNOWN, timeout, rate limit, or unconfigured credentials)
        # If verification service is configured but unavailable, do not allow proceeding.
        is_svc_unavailable = provider.is_configured() and bool(provider_res.get("error"))
        res = {
            "email": clean_email,
            "status": "UNKNOWN",
            "is_valid": None,
            "message": MSG_UNKNOWN,
            "suggested_email": None,
            "allow_continue": False if is_svc_unavailable else True,
            "details": {
                "syntax": True,
                "domain": True,
                "mx": True,
                "disposable": False,
                "mailbox": "UNKNOWN",
                "provider": provider.name,
                "configured": provider.is_configured(),
                "reason": provider_res.get("error") or "Mailbox status inconclusive",
            },
        }
        cache.set(cache_key, res, min(300, getattr(settings, "EMAIL_VERIFICATION_CACHE_TTL", 3600)))
        return res


def validate_email_address_complete(email: str) -> str:
    """
    Executes the comprehensive validation pipeline and raises DRF ValidationError if invalid.
    Used by registration, staff creation, and email correction serializers to guarantee
    users cannot bypass validation.
    """
    from rest_framework.exceptions import ValidationError

    val_res = verify_email_comprehensive(email)
    if val_res["status"] in ("INVALID_FORMAT", "MAILBOX_NOT_FOUND", "INVALID_DOMAIN", "DISPOSABLE", "POSSIBLE_TYPO"):
        logger.warning(f"Registration email rejected ({val_res['status']}) for '{email}': {val_res['message']}")
        raise ValidationError(val_res["message"])

    if val_res["status"] == "UNKNOWN" and val_res.get("allow_continue") is False:
        logger.warning(f"Registration email blocked (UNKNOWN / service unavailable) for '{email}': {val_res['message']}")
        raise ValidationError(val_res["message"])

    return val_res["email"]

