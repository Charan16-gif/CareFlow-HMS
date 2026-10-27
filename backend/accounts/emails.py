import logging
from django.conf import settings
from django.core.mail import EmailMultiAlternatives
from django.utils.html import strip_tags

logger = logging.getLogger(__name__)


def send_otp_email(email: str, otp_code: str, user_name: str = "Valued Patient", purpose: str = "registration") -> dict:
    """
    Sends a beautifully styled HTML email with a 6-digit OTP verification code.
    Reads SMTP configurations from Django settings (settings.EMAIL_HOST_USER, etc.).
    Returns dict: {"success": bool, "message": str, "error": Optional[str]}
    """
    clean_email = email.strip().lower()
    host_user = getattr(settings, "EMAIL_HOST_USER", "").strip()
    default_from = getattr(settings, "DEFAULT_FROM_EMAIL", "").strip()
    if default_from and "<" in default_from:
        from_email = default_from
    elif host_user:
        from_email = f"CareFlow-HMS <{host_user}>"
    else:
        from_email = "CareFlow-HMS <noreply@careflow-hms.com>"

    purpose_titles = {
        "registration": "Confirm Your Email Address",
        "login": "Two-Factor Verification Code",
        "password_reset": "Password Reset Verification Code",
    }
    purpose_title = purpose_titles.get(purpose, "Email Verification Code")

    subject = f"Your CareFlow-HMS Verification Code: {otp_code}"

    # Formatted OTP representation (e.g. 3 digits - 3 digits or spaced)
    formatted_otp = f"{otp_code[:3]} {otp_code[3:]}"

    html_content = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{purpose_title}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0b1120; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #f1f5f9;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #0b1120; padding: 40px 15px;">
    <tr>
      <td align="center">
        <!-- Main Card Container -->
        <table role="presentation" width="100%" style="max-width: 560px; background: #131d33; border: 1px solid rgba(34, 211, 238, 0.2); border-radius: 16px; overflow: hidden; box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5);" cellspacing="0" cellpadding="0" border="0">
          
          <!-- Header Banner -->
          <tr>
            <td style="background: linear-gradient(135deg, #0f172a 0%, #162444 100%); padding: 32px 30px; border-bottom: 1px solid rgba(255, 255, 255, 0.08); text-align: center;">
              <!-- Brand Badge -->
              <div style="display: inline-block; padding: 6px 14px; background: rgba(34, 211, 238, 0.12); border: 1px solid rgba(34, 211, 238, 0.35); border-radius: 9999px; margin-bottom: 12px;">
                <span style="color: #22d3ee; font-size: 13px; font-weight: 600; letter-spacing: 0.5px; text-transform: uppercase;">
                  CareFlow-HMS &bull; Healthcare Portal
                </span>
              </div>
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 700; letter-spacing: -0.5px;">
                {purpose_title}
              </h1>
            </td>
          </tr>

          <!-- Body Content -->
          <tr>
            <td style="padding: 36px 32px;">
              <p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.6; color: #e2e8f0;">
                Hello <strong style="color: #38bdf8;">{user_name}</strong>,
              </p>
              <p style="margin: 0 0 24px 0; font-size: 15px; line-height: 1.6; color: #94a3b8;">
                Thank you for choosing CareFlow Hospital Management System. Use the one-time verification code below to verify your email address and securely complete your authentication:
              </p>

              <!-- OTP Box -->
              <div style="text-align: center; margin: 30px 0;">
                <div style="display: inline-block; background: #0b1329; border: 2px dashed #06b6d4; border-radius: 12px; padding: 20px 36px;">
                  <span style="font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace; font-size: 38px; font-weight: 800; letter-spacing: 8px; color: #22d3ee; display: block; text-shadow: 0 0 12px rgba(34, 211, 238, 0.4);">
                    {otp_code}
                  </span>
                  <span style="display: block; font-size: 12px; color: #64748b; margin-top: 6px; letter-spacing: 1px; text-transform: uppercase;">
                    Valid for 10 minutes
                  </span>
                </div>
              </div>

              <!-- Important Guidance Box -->
              <table role="presentation" width="100%" style="background: rgba(30, 41, 59, 0.6); border: 1px solid rgba(148, 163, 184, 0.15); border-radius: 10px; margin: 24px 0 16px 0; padding: 14px 18px;" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td>
                    <p style="margin: 0; font-size: 13px; line-height: 1.5; color: #cbd5e1;">
                      <strong style="color: #f59e0b;">Security Alert:</strong> Never share this OTP with anyone, including hospital staff. CareFlow administrators will never ask for your verification code.
                    </p>
                  </td>
                </tr>
              </table>

              <p style="margin: 20px 0 0 0; font-size: 13px; line-height: 1.5; color: #64748b;">
                If you didn't request this verification code, please ignore this email or review your account security settings.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #0c1424; padding: 20px 30px; text-align: center; border-top: 1px solid rgba(255, 255, 255, 0.05);">
              <p style="margin: 0 0 6px 0; font-size: 12px; color: #64748b;">
                CareFlow Hospital Management System &bull; Secure Clinical & Patient Portal
              </p>
              <p style="margin: 0; font-size: 11px; color: #475569;">
                &copy; {settings.TIME_ZONE} CareFlow-HMS. All rights reserved.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>"""

    text_content = f"""CareFlow-HMS - {purpose_title}
==================================================

Hello {user_name},

Thank you for choosing CareFlow Hospital Management System.
Your one-time verification code is:

    {otp_code}

This code is valid for 10 minutes.
For your security, do not share this code with anyone.

If you did not request this email, please ignore it.

--
CareFlow Hospital Management System
Secure Clinical & Patient Portal
"""

    try:
        msg = EmailMultiAlternatives(
            subject=subject,
            body=text_content,
            from_email=from_email,
            to=[clean_email],
        )
        msg.attach_alternative(html_content, "text/html")
        msg.send(fail_silently=False)

        logger.info(f"Verification OTP email successfully sent to {clean_email}")
        return {
            "success": True,
            "message": f"Verification code sent to {clean_email}",
            "error": None,
        }
    except Exception as exc:
        err_msg = str(exc)
        logger.error(f"Failed to send OTP email to {clean_email}: {err_msg}", exc_info=True)
        return {
            "success": False,
            "message": f"Could not send email to {clean_email}. Please check SMTP configuration.",
            "error": err_msg,
        }


def send_password_reset_link_email(email: str, reset_url: str, user_name: str = "Valued User") -> dict:
    """
    Sends a beautifully styled HTML email with a secure password reset link.
    Returns dict: {"success": bool, "message": str, "error": Optional[str]}
    """
    clean_email = email.strip().lower()
    host_user = getattr(settings, "EMAIL_HOST_USER", "").strip()
    default_from = getattr(settings, "DEFAULT_FROM_EMAIL", "").strip()
    if default_from and "<" in default_from:
        from_email = default_from
    elif host_user:
        from_email = f"CareFlow-HMS <{host_user}>"
    else:
        from_email = "CareFlow-HMS <noreply@careflow-hms.com>"

    subject = "CareFlow-HMS: Password Reset Request"

    html_content = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset Your Password</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0b1120; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #f1f5f9;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #0b1120; padding: 40px 15px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 560px; background: #131d33; border: 1px solid rgba(34, 211, 238, 0.2); border-radius: 16px; overflow: hidden; box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5);" cellspacing="0" cellpadding="0" border="0">
          <tr>
            <td style="background: linear-gradient(135deg, #0f172a 0%, #162444 100%); padding: 32px 30px; border-bottom: 1px solid rgba(255, 255, 255, 0.08); text-align: center;">
              <div style="display: inline-block; padding: 6px 14px; background: rgba(34, 211, 238, 0.12); border: 1px solid rgba(34, 211, 238, 0.35); border-radius: 9999px; margin-bottom: 12px;">
                <span style="color: #22d3ee; font-size: 13px; font-weight: 600; letter-spacing: 0.5px; text-transform: uppercase;">
                  CareFlow-HMS &bull; Security
                </span>
              </div>
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 700; letter-spacing: -0.5px;">
                Password Reset Request
              </h1>
            </td>
          </tr>

          <tr>
            <td style="padding: 36px 32px;">
              <p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.6; color: #e2e8f0;">
                Hello <strong style="color: #38bdf8;">{user_name}</strong>,
              </p>
              <p style="margin: 0 0 24px 0; font-size: 15px; line-height: 1.6; color: #94a3b8;">
                We received a request to reset the password for your CareFlow Hospital Management System account. Click the button below to choose a new secure password:
              </p>

              <!-- CTA Button -->
              <div style="text-align: center; margin: 32px 0;">
                <a href="{reset_url}" target="_blank" style="display: inline-block; background: linear-gradient(135deg, #06b6d4 0%, #0d9488 100%); color: #ffffff; font-size: 16px; font-weight: 700; text-decoration: none; padding: 14px 34px; border-radius: 10px; box-shadow: 0 4px 14px rgba(6, 182, 212, 0.35); letter-spacing: 0.3px;">
                  Reset Password Now
                </a>
              </div>

              <p style="margin: 24px 0 8px 0; font-size: 13px; line-height: 1.5; color: #94a3b8;">
                Or copy and paste this link into your browser:
              </p>
              <p style="margin: 0 0 24px 0; font-size: 12px; line-height: 1.5; word-break: break-all; color: #22d3ee; background: #0b1329; padding: 10px 14px; border-radius: 6px; border: 1px solid rgba(34, 211, 238, 0.2);">
                {reset_url}
              </p>

              <!-- Security Notice -->
              <table role="presentation" width="100%" style="background: rgba(30, 41, 59, 0.6); border: 1px solid rgba(148, 163, 184, 0.15); border-radius: 10px; margin: 24px 0 16px 0; padding: 14px 18px;" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td>
                    <p style="margin: 0; font-size: 13px; line-height: 1.5; color: #cbd5e1;">
                      <strong style="color: #f59e0b;">Security Alert:</strong> This password reset link is valid for 24 hours. If you did not initiate this request, no action is needed — your account remains completely secure.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style="background-color: #0c1424; padding: 20px 30px; text-align: center; border-top: 1px solid rgba(255, 255, 255, 0.05);">
              <p style="margin: 0 0 6px 0; font-size: 12px; color: #64748b;">
                CareFlow Hospital Management System &bull; Secure Clinical & Patient Portal
              </p>
              <p style="margin: 0; font-size: 11px; color: #475569;">
                &copy; {settings.TIME_ZONE} CareFlow-HMS. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>"""

    text_content = f"""CareFlow-HMS - Password Reset Request
==================================================

Hello {user_name},

We received a request to reset your password for your CareFlow-HMS account.
Please visit the following link to choose a new password:

{reset_url}

This link is valid for 24 hours.
If you did not request this password reset, please ignore this email.

--
CareFlow Hospital Management System
Secure Clinical & Patient Portal
"""

    try:
        msg = EmailMultiAlternatives(
            subject=subject,
            body=text_content,
            from_email=from_email,
            to=[clean_email],
        )
        msg.attach_alternative(html_content, "text/html")
        msg.send(fail_silently=False)

        logger.info(f"Password reset link email successfully sent to {clean_email}")
        return {
            "success": True,
            "message": f"Password reset link sent to {clean_email}",
            "error": None,
        }
    except Exception as exc:
        err_msg = str(exc)
        logger.error(f"Failed to send password reset email to {clean_email}: {err_msg}", exc_info=True)
        return {
            "success": False,
            "message": f"Could not send password reset email to {clean_email}.",
            "error": err_msg,
        }


import threading


def send_user_welcome_credentials_email(
    email: str,
    user_name: str,
    username: str,
    password: str = None,
    role_display: str = "User",
    account_id: str = None,
    login_url: str = None,
) -> dict:
    """
    Sends a beautifully styled HTML onboarding email to a newly created user (Doctor, Patient, Staff)
    containing their portal credentials, assigned role, ID, and login link.
    """
    clean_email = email.strip().lower()
    host_user = getattr(settings, "EMAIL_HOST_USER", "").strip()
    default_from = getattr(settings, "DEFAULT_FROM_EMAIL", "").strip()
    if default_from and "<" in default_from:
        from_email = default_from
    elif host_user:
        from_email = f"CareFlow-HMS <{host_user}>"
    else:
        from_email = "CareFlow-HMS <noreply@careflow-hms.com>"

    portal_url = login_url or "http://localhost:3000/login"
    subject = f"Welcome to CareFlow-HMS: Your {role_display} Account Credentials"

    password_row = ""
    password_text = ""
    if password:
        password_row = f"""
                <tr>
                  <td style="padding: 12px 16px; border-bottom: 1px solid rgba(255, 255, 255, 0.08); color: #94a3b8; font-size: 13px;">Temporary Password</td>
                  <td style="padding: 12px 16px; border-bottom: 1px solid rgba(255, 255, 255, 0.08); color: #22d3ee; font-family: monospace; font-size: 15px; font-weight: 700;">{password}</td>
                </tr>
        """
        password_text = f"Temporary Password: {password}\n"

    account_id_row = ""
    account_id_text = ""
    if account_id:
        account_id_row = f"""
                <tr>
                  <td style="padding: 12px 16px; border-bottom: 1px solid rgba(255, 255, 255, 0.08); color: #94a3b8; font-size: 13px;">Healthcare ID</td>
                  <td style="padding: 12px 16px; border-bottom: 1px solid rgba(255, 255, 255, 0.08); color: #38bdf8; font-family: monospace; font-size: 14px; font-weight: 700;">{account_id}</td>
                </tr>
        """
        account_id_text = f"Healthcare ID: {account_id}\n"

    html_content = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to CareFlow-HMS</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0b1120; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #f1f5f9;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #0b1120; padding: 40px 15px;">
    <tr>
      <td align="center">
        <!-- Main Card Container -->
        <table role="presentation" width="100%" style="max-width: 580px; background: #131d33; border: 1px solid rgba(34, 211, 238, 0.25); border-radius: 16px; overflow: hidden; box-shadow: 0 20px 40px rgba(0, 0, 0, 0.55);" cellspacing="0" cellpadding="0" border="0">
          
          <!-- Header Banner -->
          <tr>
            <td style="background: linear-gradient(135deg, #0f172a 0%, #162444 100%); padding: 32px 30px; border-bottom: 1px solid rgba(255, 255, 255, 0.08); text-align: center;">
              <div style="display: inline-block; padding: 6px 14px; background: rgba(34, 211, 238, 0.12); border: 1px solid rgba(34, 211, 238, 0.35); border-radius: 9999px; margin-bottom: 12px;">
                <span style="color: #22d3ee; font-size: 13px; font-weight: 600; letter-spacing: 0.5px; text-transform: uppercase;">
                  CareFlow-HMS &bull; Hospital Management Portal
                </span>
              </div>
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 700; letter-spacing: -0.5px;">
                Welcome to CareFlow Hospital Portal
              </h1>
            </td>
          </tr>

          <!-- Body Content -->
          <tr>
            <td style="padding: 36px 32px;">
              <p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.6; color: #e2e8f0;">
                Hello <strong style="color: #38bdf8;">{user_name}</strong>,
              </p>
              <p style="margin: 0 0 24px 0; font-size: 15px; line-height: 1.6; color: #94a3b8;">
                Your account has been officially registered in the CareFlow Hospital Management System by the hospital administration. Below are your official login credentials to access the portal:
              </p>

              <!-- Credentials Table Box -->
              <table role="presentation" width="100%" style="background: #0b1329; border: 1px solid rgba(34, 211, 238, 0.2); border-radius: 12px; margin: 20px 0; border-collapse: collapse;" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="padding: 12px 16px; border-bottom: 1px solid rgba(255, 255, 255, 0.08); color: #94a3b8; font-size: 13px; width: 38%;">Assigned Role</td>
                  <td style="padding: 12px 16px; border-bottom: 1px solid rgba(255, 255, 255, 0.08); color: #10b981; font-weight: 700; font-size: 14px;">{role_display}</td>
                </tr>
                {account_id_row}
                <tr>
                  <td style="padding: 12px 16px; border-bottom: 1px solid rgba(255, 255, 255, 0.08); color: #94a3b8; font-size: 13px;">Username / Login</td>
                  <td style="padding: 12px 16px; border-bottom: 1px solid rgba(255, 255, 255, 0.08); color: #ffffff; font-family: monospace; font-size: 15px; font-weight: 700;">{username}</td>
                </tr>
                {password_row}
                <tr>
                  <td style="padding: 12px 16px; color: #94a3b8; font-size: 13px;">Registered Email</td>
                  <td style="padding: 12px 16px; color: #e2e8f0; font-size: 14px;">{clean_email}</td>
                </tr>
              </table>

              <!-- CTA Button -->
              <div style="text-align: center; margin: 30px 0 20px 0;">
                <a href="{portal_url}" target="_blank" style="display: inline-block; background: linear-gradient(135deg, #06b6d4 0%, #0d9488 100%); color: #ffffff; font-size: 16px; font-weight: 700; text-decoration: none; padding: 14px 36px; border-radius: 10px; box-shadow: 0 4px 16px rgba(6, 182, 212, 0.35); letter-spacing: 0.3px;">
                  Sign In to CareFlow Portal
                </a>
              </div>

              <!-- Security Advice Box -->
              <table role="presentation" width="100%" style="background: rgba(30, 41, 59, 0.6); border: 1px solid rgba(148, 163, 184, 0.15); border-radius: 10px; margin: 24px 0 16px 0; padding: 14px 18px;" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td>
                    <p style="margin: 0; font-size: 13px; line-height: 1.5; color: #cbd5e1;">
                      <strong style="color: #f59e0b;">Security Notice:</strong> Please sign in and change your temporary password under your account profile. Never disclose your credentials to anyone. CareFlow administrators will never ask for your password.
                    </p>
                  </td>
                </tr>
              </table>

              <p style="margin: 18px 0 0 0; font-size: 13px; line-height: 1.5; color: #64748b;">
                Portal Access Link: <a href="{portal_url}" style="color: #22d3ee; text-decoration: underline;">{portal_url}</a>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #0c1424; padding: 20px 30px; text-align: center; border-top: 1px solid rgba(255, 255, 255, 0.05);">
              <p style="margin: 0 0 6px 0; font-size: 12px; color: #64748b;">
                CareFlow Hospital Management System &bull; Secure Clinical & Staff Portal
              </p>
              <p style="margin: 0; font-size: 11px; color: #475569;">
                &copy; {settings.TIME_ZONE} CareFlow-HMS. All rights reserved.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>"""

    text_content = f"""CareFlow-HMS - Welcome to CareFlow Hospital Portal
==================================================

Hello {user_name},

Your account has been officially registered in the CareFlow Hospital Management System.
Below are your official credentials:

Role: {role_display}
{account_id_text}Username: {username}
{password_text}Registered Email: {clean_email}

Login Portal: {portal_url}

SECURITY NOTICE:
Please sign in and change your temporary password under your account profile.
Do not share your password with anyone.

--
CareFlow Hospital Management System
Secure Clinical & Staff Portal
"""

    try:
        msg = EmailMultiAlternatives(
            subject=subject,
            body=text_content,
            from_email=from_email,
            to=[clean_email],
        )
        msg.attach_alternative(html_content, "text/html")
        msg.send(fail_silently=False)

        logger.info(f"Welcome credentials email successfully sent to {clean_email}")
        return {
            "success": True,
            "message": f"Welcome credentials email sent to {clean_email}",
            "error": None,
        }
    except Exception as exc:
        err_msg = str(exc)
        logger.error(f"Failed to send welcome credentials email to {clean_email}: {err_msg}", exc_info=True)
        return {
            "success": False,
            "message": f"Could not send email to {clean_email}.",
            "error": err_msg,
        }


def send_user_welcome_credentials_email_async(**kwargs):
    """
    Dispatches the welcome credentials email asynchronously in a background thread
    so API requests return instantly without blocking on SMTP network round-trips.
    """
    thread = threading.Thread(
        target=send_user_welcome_credentials_email,
        kwargs=kwargs,
        daemon=True
    )
    thread.start()
    return thread


def send_patient_welcome_email(user, email: str = None) -> dict:
    """
    Sends an official CareFlow Healthcare Portal welcome email to a patient
    after successful registration/verification.
    """
    clean_email = (email or getattr(user, "email", "")).strip().lower()
    if not clean_email:
        return {"success": False, "message": "No email provided for patient welcome.", "error": "Missing email"}

    user_name = f"{getattr(user, 'first_name', '')} {getattr(user, 'last_name', '')}".strip() or getattr(user, 'username', 'Valued Patient')
    host_user = getattr(settings, "EMAIL_HOST_USER", "").strip()
    default_from = getattr(settings, "DEFAULT_FROM_EMAIL", "").strip()
    if default_from and "<" in default_from:
        from_email = default_from
    elif host_user:
        from_email = f"CareFlow-HMS <{host_user}>"
    else:
        from_email = "CareFlow-HMS <noreply@careflow-hms.com>"

    subject = "Welcome to CareFlow-HMS: Your Patient Healthcare Portal is Ready"
    portal_url = "http://localhost:3000/login"

    html_content = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to CareFlow Healthcare</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0b1120; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #f1f5f9;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #0b1120; padding: 40px 15px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 580px; background: #131d33; border: 1px solid rgba(34, 211, 238, 0.25); border-radius: 16px; overflow: hidden; box-shadow: 0 20px 40px rgba(0, 0, 0, 0.55);" cellspacing="0" cellpadding="0" border="0">
          <tr>
            <td style="background: linear-gradient(135deg, #0f172a 0%, #162444 100%); padding: 32px 30px; border-bottom: 1px solid rgba(255, 255, 255, 0.08); text-align: center;">
              <div style="display: inline-block; padding: 6px 14px; background: rgba(34, 211, 238, 0.12); border: 1px solid rgba(34, 211, 238, 0.35); border-radius: 9999px; margin-bottom: 12px;">
                <span style="color: #22d3ee; font-size: 13px; font-weight: 600; letter-spacing: 0.5px; text-transform: uppercase;">
                  CareFlow-HMS &bull; Patient Care Portal
                </span>
              </div>
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 700; letter-spacing: -0.5px;">
                Welcome to CareFlow Healthcare
              </h1>
            </td>
          </tr>

          <tr>
            <td style="padding: 36px 32px;">
              <p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.6; color: #e2e8f0;">
                Hello <strong style="color: #38bdf8;">{user_name}</strong>,
              </p>
              <p style="margin: 0 0 20px 0; font-size: 15px; line-height: 1.6; color: #94a3b8;">
                Your CareFlow account has been verified and is ready for use. We're excited to partner with you in managing your healthcare seamlessly:
              </p>

              <div style="background: #0b1329; border: 1px solid rgba(34, 211, 238, 0.2); border-radius: 12px; padding: 20px; margin: 24px 0;">
                <h4 style="margin: 0 0 12px 0; color: #22d3ee; font-size: 15px;">What you can do in your CareFlow Portal:</h4>
                <ul style="margin: 0; padding-left: 20px; color: #cbd5e1; font-size: 14px; line-height: 1.8;">
                  <li>Book and manage doctor appointments in real-time</li>
                  <li>Access diagnostic test orders and download lab reports</li>
                  <li>Review prescriptions and order prescribed medications</li>
                  <li>View clinical summaries and billing receipts</li>
                </ul>
              </div>

              <div style="text-align: center; margin: 32px 0 24px 0;">
                <a href="{portal_url}" target="_blank" style="display: inline-block; background: linear-gradient(135deg, #06b6d4 0%, #0d9488 100%); color: #ffffff; font-size: 16px; font-weight: 700; text-decoration: none; padding: 14px 36px; border-radius: 10px; box-shadow: 0 4px 16px rgba(6, 182, 212, 0.35); letter-spacing: 0.3px;">
                  Access Patient Portal
                </a>
              </div>

              <p style="margin: 20px 0 0 0; font-size: 13px; line-height: 1.5; color: #64748b; text-align: center;">
                Need help? Contact our clinical reception desk or email support anytime.
              </p>
            </td>
          </tr>

          <tr>
            <td style="background-color: #0c1424; padding: 20px 30px; text-align: center; border-top: 1px solid rgba(255, 255, 255, 0.05);">
              <p style="margin: 0; font-size: 11px; color: #475569;">
                &copy; CareFlow-HMS Healthcare Systems. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>"""

    text_content = f"""Welcome to CareFlow Healthcare
==============================

Hello {user_name},

Your CareFlow account has been verified and is ready for use.
Sign in to your patient portal to book doctor appointments, view prescriptions, and download lab test reports:

{portal_url}

Thank you for choosing CareFlow-HMS.
"""

    try:
        msg = EmailMultiAlternatives(
            subject=subject,
            body=text_content,
            from_email=from_email,
            to=[clean_email],
        )
        msg.attach_alternative(html_content, "text/html")
        msg.send(fail_silently=False)

        logger.info(f"Patient welcome email successfully sent to {clean_email}")
        return {"success": True, "message": f"Welcome email sent to {clean_email}", "error": None}
    except Exception as exc:
        err_msg = str(exc)
        logger.error(f"Failed to send patient welcome email to {clean_email}: {err_msg}", exc_info=True)
        return {"success": False, "message": f"Could not send email to {clean_email}.", "error": err_msg}


def send_patient_welcome_email_async(**kwargs):
    thread = threading.Thread(target=send_patient_welcome_email, kwargs=kwargs, daemon=True)
    thread.start()
    return thread


def get_patient_email(patient, recipient_email: str = None) -> str:
    """
    Safely retrieves the email address for a patient, handling cases where
    patient.user is None or raises User.DoesNotExist.
    """
    if recipient_email:
        return recipient_email.strip().lower()
    email = getattr(patient, "email", "")
    if email:
        return email.strip().lower()
    try:
        if getattr(patient, "user_id", None):
            user = getattr(patient, "user", None)
            if user and getattr(user, "email", None):
                return user.email.strip().lower()
    except Exception:
        pass
    return ""


def send_lab_report_email(order, recipient_email: str = None) -> dict:
    """
    Sends a beautifully formatted diagnostic test report email to the patient,
    including test results, doctor notes, and attaches the report file if available.
    """
    import os
    import mimetypes

    patient = order.patient
    clean_email = get_patient_email(patient, recipient_email)

    if not clean_email:
        return {"success": False, "message": "No email address found for patient.", "error": "Missing recipient email"}

    patient_name = f"{getattr(patient, 'first_name', '')} {getattr(patient, 'last_name', '')}".strip() or "Valued Patient"
    test_name = getattr(order.test, "test_name", "Diagnostic Test")
    test_code = getattr(order.test, "test_code", "")
    doctor = order.doctor
    doctor_name = f"Dr. {doctor.first_name} {doctor.last_name}" if doctor else "Attending Physician"
    order_id = order.order_id
    status_display = order.get_status_display()
    result_val = order.result_value or "Report Document Available (See Attached)"
    result_notes = order.result_notes or "Results have been reviewed and validated by CareFlow Diagnostic Pathology."
    completed_date = order.completed_at.strftime("%B %d, %Y at %I:%M %p") if order.completed_at else "Recently Completed"

    host_user = getattr(settings, "EMAIL_HOST_USER", "").strip()
    default_from = getattr(settings, "DEFAULT_FROM_EMAIL", "").strip()
    if default_from and "<" in default_from:
        from_email = default_from
    elif host_user:
        from_email = f"CareFlow Laboratory <{host_user}>"
    else:
        from_email = "CareFlow Laboratory <noreply@careflow-hms.com>"

    subject = f"Diagnostic Test Report Ready: {test_name} ({order_id})"
    portal_url = "http://localhost:3000/patient/lab-tests"

    html_content = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Diagnostic Report Ready</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0b1120; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #f1f5f9;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #0b1120; padding: 40px 15px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 580px; background: #131d33; border: 1px solid rgba(34, 211, 238, 0.25); border-radius: 16px; overflow: hidden; box-shadow: 0 20px 40px rgba(0, 0, 0, 0.55);" cellspacing="0" cellpadding="0" border="0">
          <tr>
            <td style="background: linear-gradient(135deg, #0f172a 0%, #162444 100%); padding: 32px 30px; border-bottom: 1px solid rgba(255, 255, 255, 0.08); text-align: center;">
              <div style="display: inline-block; padding: 6px 14px; background: rgba(16, 185, 129, 0.15); border: 1px solid rgba(16, 185, 129, 0.35); border-radius: 9999px; margin-bottom: 12px;">
                <span style="color: #10b981; font-size: 13px; font-weight: 600; letter-spacing: 0.5px; text-transform: uppercase;">
                  Diagnostic Pathology Report &bull; Verified
                </span>
              </div>
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 700; letter-spacing: -0.5px;">
                Your Lab Report is Ready
              </h1>
            </td>
          </tr>

          <tr>
            <td style="padding: 36px 32px;">
              <p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.6; color: #e2e8f0;">
                Dear <strong style="color: #38bdf8;">{patient_name}</strong>,
              </p>
              <p style="margin: 0 0 20px 0; font-size: 15px; line-height: 1.6; color: #94a3b8;">
                Your laboratory diagnostic test ordered by <strong>{doctor_name}</strong> has been processed, verified, and is ready for your review:
              </p>

              <table role="presentation" width="100%" style="background: #0b1329; border: 1px solid rgba(34, 211, 238, 0.2); border-radius: 12px; margin: 20px 0; border-collapse: collapse;" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="padding: 12px 16px; border-bottom: 1px solid rgba(255, 255, 255, 0.08); color: #94a3b8; font-size: 13px; width: 38%;">Diagnostic Test</td>
                  <td style="padding: 12px 16px; border-bottom: 1px solid rgba(255, 255, 255, 0.08); color: #22d3ee; font-weight: 700; font-size: 14px;">{test_name} ({test_code})</td>
                </tr>
                <tr>
                  <td style="padding: 12px 16px; border-bottom: 1px solid rgba(255, 255, 255, 0.08); color: #94a3b8; font-size: 13px;">Order Identifier</td>
                  <td style="padding: 12px 16px; border-bottom: 1px solid rgba(255, 255, 255, 0.08); color: #ffffff; font-family: monospace; font-size: 14px;">{order_id}</td>
                </tr>
                <tr>
                  <td style="padding: 12px 16px; border-bottom: 1px solid rgba(255, 255, 255, 0.08); color: #94a3b8; font-size: 13px;">Ordering Doctor</td>
                  <td style="padding: 12px 16px; border-bottom: 1px solid rgba(255, 255, 255, 0.08); color: #e2e8f0; font-size: 14px;">{doctor_name}</td>
                </tr>
                <tr>
                  <td style="padding: 12px 16px; border-bottom: 1px solid rgba(255, 255, 255, 0.08); color: #94a3b8; font-size: 13px;">Completion Date</td>
                  <td style="padding: 12px 16px; border-bottom: 1px solid rgba(255, 255, 255, 0.08); color: #e2e8f0; font-size: 13px;">{completed_date}</td>
                </tr>
                <tr>
                  <td style="padding: 12px 16px; border-bottom: 1px solid rgba(255, 255, 255, 0.08); color: #94a3b8; font-size: 13px;">Result Summary</td>
                  <td style="padding: 12px 16px; border-bottom: 1px solid rgba(255, 255, 255, 0.08); color: #10b981; font-weight: 700; font-size: 14px;">{result_val}</td>
                </tr>
                <tr>
                  <td style="padding: 12px 16px; color: #94a3b8; font-size: 13px;">Pathology Notes</td>
                  <td style="padding: 12px 16px; color: #cbd5e1; font-size: 13px; line-height: 1.5;">{result_notes}</td>
                </tr>
              </table>

              <div style="text-align: center; margin: 30px 0 20px 0;">
                <a href="{portal_url}" target="_blank" style="display: inline-block; background: linear-gradient(135deg, #06b6d4 0%, #0d9488 100%); color: #ffffff; font-size: 16px; font-weight: 700; text-decoration: none; padding: 14px 36px; border-radius: 10px; box-shadow: 0 4px 16px rgba(6, 182, 212, 0.35); letter-spacing: 0.3px;">
                  View & Download in Portal
                </a>
              </div>

              <p style="margin: 20px 0 0 0; font-size: 13px; line-height: 1.5; color: #64748b;">
                Please discuss these findings with your physician during your next scheduled consultation.
              </p>
            </td>
          </tr>

          <tr>
            <td style="background-color: #0c1424; padding: 20px 30px; text-align: center; border-top: 1px solid rgba(255, 255, 255, 0.05);">
              <p style="margin: 0; font-size: 11px; color: #475569;">
                CareFlow Hospital Management System &bull; Confidential Clinical Medical Record
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>"""

    text_content = f"""Diagnostic Test Report Ready: {test_name}
==================================================

Dear {patient_name},

Your diagnostic laboratory test results are ready:

Test: {test_name} ({test_code})
Order ID: {order_id}
Ordering Doctor: {doctor_name}
Completed: {completed_date}
Result: {result_val}
Notes: {result_notes}

Sign in to the CareFlow portal to view or download your verified clinical report:
{portal_url}

--
CareFlow Hospital Management System
"""

    try:
        msg = EmailMultiAlternatives(
            subject=subject,
            body=text_content,
            from_email=from_email,
            to=[clean_email],
        )
        msg.attach_alternative(html_content, "text/html")

        # Attach report file if available on disk
        if order.report_file:
            try:
                order.report_file.open("rb")
                file_content = order.report_file.read()
                filename = os.path.basename(order.report_file.name)
                mime_type, _ = mimetypes.guess_type(filename)
                msg.attach(filename, file_content, mime_type or "application/octet-stream")
            except Exception as file_err:
                logger.warning(f"Could not attach report file to email: {file_err}")

        msg.send(fail_silently=False)
        logger.info(f"Lab report email successfully sent to {clean_email} for order {order_id}")
        return {"success": True, "message": f"Diagnostic report sent to {clean_email}", "error": None}
    except Exception as exc:
        err_msg = str(exc)
        logger.error(f"Failed to send lab report email to {clean_email}: {err_msg}", exc_info=True)
        return {"success": False, "message": f"Could not send email to {clean_email}.", "error": err_msg}


def send_lab_report_email_async(**kwargs):
    thread = threading.Thread(target=send_lab_report_email, kwargs=kwargs, daemon=True)
    thread.start()
    return thread


def send_appointment_confirmation_email(appointment, recipient_email: str = None) -> dict:
    """
    Sends a patient appointment confirmation / reminder email with doctor details,
    scheduled time, and hospital consultation guidelines.
    """
    patient = appointment.patient
    clean_email = get_patient_email(patient, recipient_email)

    if not clean_email:
        return {"success": False, "message": "No email address found for appointment patient.", "error": "Missing email"}

    patient_name = f"{getattr(patient, 'first_name', '')} {getattr(patient, 'last_name', '')}".strip() or "Valued Patient"
    doctor = appointment.doctor
    doctor_name = f"Dr. {doctor.first_name} {doctor.last_name}" if doctor else "Assigned Physician"
    specialization = getattr(doctor, "specialization", "General Medicine")
    apt_id = appointment.appointment_id
    apt_date = appointment.appointment_date.strftime("%A, %B %d, %Y") if hasattr(appointment.appointment_date, "strftime") else str(appointment.appointment_date)
    apt_time = appointment.appointment_time.strftime("%I:%M %p") if hasattr(appointment.appointment_time, "strftime") else str(appointment.appointment_time)
    reason = appointment.reason_for_visit or "Standard Consultation"

    host_user = getattr(settings, "EMAIL_HOST_USER", "").strip()
    default_from = getattr(settings, "DEFAULT_FROM_EMAIL", "").strip()
    if default_from and "<" in default_from:
        from_email = default_from
    elif host_user:
        from_email = f"CareFlow Appointments <{host_user}>"
    else:
        from_email = "CareFlow Appointments <noreply@careflow-hms.com>"

    subject = f"Appointment Confirmed with {doctor_name} on {apt_date} ({apt_id})"
    portal_url = "http://localhost:3000/patient/appointments"

    html_content = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Appointment Confirmed</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0b1120; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #f1f5f9;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #0b1120; padding: 40px 15px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 580px; background: #131d33; border: 1px solid rgba(34, 211, 238, 0.25); border-radius: 16px; overflow: hidden; box-shadow: 0 20px 40px rgba(0, 0, 0, 0.55);" cellspacing="0" cellpadding="0" border="0">
          <tr>
            <td style="background: linear-gradient(135deg, #0f172a 0%, #162444 100%); padding: 32px 30px; border-bottom: 1px solid rgba(255, 255, 255, 0.08); text-align: center;">
              <div style="display: inline-block; padding: 6px 14px; background: rgba(34, 211, 238, 0.12); border: 1px solid rgba(34, 211, 238, 0.35); border-radius: 9999px; margin-bottom: 12px;">
                <span style="color: #22d3ee; font-size: 13px; font-weight: 600; letter-spacing: 0.5px; text-transform: uppercase;">
                  CareFlow-HMS &bull; Clinical Appointment
                </span>
              </div>
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 700; letter-spacing: -0.5px;">
                Appointment Confirmed
              </h1>
            </td>
          </tr>

          <tr>
            <td style="padding: 36px 32px;">
              <p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.6; color: #e2e8f0;">
                Hello <strong style="color: #38bdf8;">{patient_name}</strong>,
              </p>
              <p style="margin: 0 0 20px 0; font-size: 15px; line-height: 1.6; color: #94a3b8;">
                Your appointment has been successfully scheduled with our clinical team. Here are your consultation details:
              </p>

              <table role="presentation" width="100%" style="background: #0b1329; border: 1px solid rgba(34, 211, 238, 0.2); border-radius: 12px; margin: 20px 0; border-collapse: collapse;" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="padding: 12px 16px; border-bottom: 1px solid rgba(255, 255, 255, 0.08); color: #94a3b8; font-size: 13px; width: 38%;">Consulting Doctor</td>
                  <td style="padding: 12px 16px; border-bottom: 1px solid rgba(255, 255, 255, 0.08); color: #22d3ee; font-weight: 700; font-size: 14px;">{doctor_name}</td>
                </tr>
                <tr>
                  <td style="padding: 12px 16px; border-bottom: 1px solid rgba(255, 255, 255, 0.08); color: #94a3b8; font-size: 13px;">Specialization</td>
                  <td style="padding: 12px 16px; border-bottom: 1px solid rgba(255, 255, 255, 0.08); color: #ffffff; font-size: 14px;">{specialization}</td>
                </tr>
                <tr>
                  <td style="padding: 12px 16px; border-bottom: 1px solid rgba(255, 255, 255, 0.08); color: #94a3b8; font-size: 13px;">Appointment Date</td>
                  <td style="padding: 12px 16px; border-bottom: 1px solid rgba(255, 255, 255, 0.08); color: #38bdf8; font-weight: 700; font-size: 14px;">{apt_date}</td>
                </tr>
                <tr>
                  <td style="padding: 12px 16px; border-bottom: 1px solid rgba(255, 255, 255, 0.08); color: #94a3b8; font-size: 13px;">Scheduled Time</td>
                  <td style="padding: 12px 16px; border-bottom: 1px solid rgba(255, 255, 255, 0.08); color: #10b981; font-weight: 700; font-size: 14px;">{apt_time}</td>
                </tr>
                <tr>
                  <td style="padding: 12px 16px; border-bottom: 1px solid rgba(255, 255, 255, 0.08); color: #94a3b8; font-size: 13px;">Reference ID</td>
                  <td style="padding: 12px 16px; border-bottom: 1px solid rgba(255, 255, 255, 0.08); color: #ffffff; font-family: monospace; font-size: 14px;">{apt_id}</td>
                </tr>
                <tr>
                  <td style="padding: 12px 16px; color: #94a3b8; font-size: 13px;">Reason for Visit</td>
                  <td style="padding: 12px 16px; color: #cbd5e1; font-size: 13px;">{reason}</td>
                </tr>
              </table>

              <div style="text-align: center; margin: 30px 0 20px 0;">
                <a href="{portal_url}" target="_blank" style="display: inline-block; background: linear-gradient(135deg, #06b6d4 0%, #0d9488 100%); color: #ffffff; font-size: 16px; font-weight: 700; text-decoration: none; padding: 14px 36px; border-radius: 10px; box-shadow: 0 4px 16px rgba(6, 182, 212, 0.35); letter-spacing: 0.3px;">
                  Manage Appointment in Portal
                </a>
              </div>

              <p style="margin: 20px 0 0 0; font-size: 13px; line-height: 1.5; color: #64748b;">
                Please arrive 10 minutes prior to your scheduled time. If you need to reschedule, please use the portal or contact hospital reception.
              </p>
            </td>
          </tr>

          <tr>
            <td style="background-color: #0c1424; padding: 20px 30px; text-align: center; border-top: 1px solid rgba(255, 255, 255, 0.05);">
              <p style="margin: 0; font-size: 11px; color: #475569;">
                CareFlow Hospital Management System &bull; Clinical Outpatient Department
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>"""

    text_content = f"""Appointment Confirmed with {doctor_name}
==================================================

Dear {patient_name},

Your appointment has been confirmed:

Doctor: {doctor_name} ({specialization})
Date: {apt_date}
Time: {apt_time}
Booking Reference: {apt_id}
Reason: {reason}

Manage your appointment in the portal:
{portal_url}

--
CareFlow Hospital Management System
"""

    try:
        msg = EmailMultiAlternatives(
            subject=subject,
            body=text_content,
            from_email=from_email,
            to=[clean_email],
        )
        msg.attach_alternative(html_content, "text/html")
        msg.send(fail_silently=False)

        logger.info(f"Appointment confirmation email successfully sent to {clean_email} for {apt_id}")
        return {"success": True, "message": f"Appointment confirmation sent to {clean_email}", "error": None}
    except Exception as exc:
        err_msg = str(exc)
        logger.error(f"Failed to send appointment confirmation email to {clean_email}: {err_msg}", exc_info=True)
        return {"success": False, "message": f"Could not send email to {clean_email}.", "error": err_msg}


def send_appointment_confirmation_email_async(**kwargs):
    thread = threading.Thread(target=send_appointment_confirmation_email, kwargs=kwargs, daemon=True)
    thread.start()
    return thread


def send_prescription_notification_email(prescription, recipient_email: str = None) -> dict:
    """
    Sends a patient prescription notification email detailing prescribed medicines,
    dosages, course duration, and consulting physician instructions.
    """
    try:
        try:
            patient = getattr(prescription, "patient", None)
        except Exception:
            patient = None

        clean_email = get_patient_email(patient, recipient_email)
        if not clean_email:
            return {"success": False, "message": "No email address found for patient.", "error": "Missing email"}

        patient_name = f"{getattr(patient, 'first_name', '')} {getattr(patient, 'last_name', '')}".strip() or "Valued Patient"
        try:
            doctor = getattr(prescription, "doctor", None)
            doctor_name = f"Dr. {doctor.first_name} {doctor.last_name}" if doctor else "Attending Physician"
        except Exception:
            doctor_name = "Attending Physician"

        rx_id = getattr(prescription, "prescription_id", "RX-PENDING")
        diagnosis = getattr(prescription, "diagnosis", None) or "Clinical Consultation"
        instructions = getattr(prescription, "instructions", None) or "Take medications strictly as instructed."
        portal_url = "http://localhost:3000/patient/prescriptions"

        host_user = getattr(settings, "EMAIL_HOST_USER", "").strip()
        default_from = getattr(settings, "DEFAULT_FROM_EMAIL", "").strip()
        if default_from and "<" in default_from:
            from_email = default_from
        elif host_user:
            from_email = f"CareFlow Pharmacy <{host_user}>"
        else:
            from_email = "CareFlow Pharmacy <noreply@careflow-hms.com>"

        subject = f"New Medical Prescription Issued: {rx_id} by {doctor_name}"

        # Build items HTML table rows
        rows_html = ""
        rows_text = ""
        try:
            items = prescription.items.all()
            for itm in items:
                med_name = itm.medicine.name if (hasattr(itm, "medicine") and itm.medicine) else "Medication"
                rows_html += f"""
                <tr>
                  <td style="padding: 10px 14px; border-bottom: 1px solid rgba(255,255,255,0.06); color: #22d3ee; font-weight: 600;">{med_name}</td>
                  <td style="padding: 10px 14px; border-bottom: 1px solid rgba(255,255,255,0.06); color: #e2e8f0;">{itm.dosage or '—'}</td>
                  <td style="padding: 10px 14px; border-bottom: 1px solid rgba(255,255,255,0.06); color: #e2e8f0;">{itm.frequency or '—'}</td>
                  <td style="padding: 10px 14px; border-bottom: 1px solid rgba(255,255,255,0.06); color: #10b981;">{itm.duration_days or '—'} days</td>
                  <td style="padding: 10px 14px; border-bottom: 1px solid rgba(255,255,255,0.06); color: #cbd5e1; font-family: monospace;">Qty: {itm.quantity_prescribed}</td>
                </tr>
                """
                rows_text += f"- {med_name} | Dose: {itm.dosage} | Freq: {itm.frequency} | Duration: {itm.duration_days} days | Qty: {itm.quantity_prescribed}\n"
        except Exception:
            rows_html = "<tr><td colspan='5' style='padding: 10px 14px; color: #94a3b8;'>Prescription details recorded.</td></tr>"
            rows_text = "Prescription details recorded.\n"

        html_content = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>New Prescription Issued</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0b1120; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #f1f5f9;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #0b1120; padding: 40px 15px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 600px; background: #131d33; border: 1px solid rgba(34, 211, 238, 0.25); border-radius: 16px; overflow: hidden; box-shadow: 0 20px 40px rgba(0, 0, 0, 0.55);" cellspacing="0" cellpadding="0" border="0">
          <tr>
            <td style="background: linear-gradient(135deg, #0f172a 0%, #162444 100%); padding: 30px; border-bottom: 1px solid rgba(255, 255, 255, 0.08); text-align: center;">
              <div style="display: inline-block; padding: 5px 12px; background: rgba(34, 211, 238, 0.12); border: 1px solid rgba(34, 211, 238, 0.35); border-radius: 9999px; margin-bottom: 10px;">
                <span style="color: #22d3ee; font-size: 12px; font-weight: 600; text-transform: uppercase;">CareFlow-HMS &bull; Digital Prescription</span>
              </div>
              <h1 style="margin: 0; color: #ffffff; font-size: 22px; font-weight: 700;">Prescription Issued: {rx_id}</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 30px;">
              <p style="margin: 0 0 14px 0; font-size: 16px; color: #e2e8f0;">Hello <strong style="color: #38bdf8;">{patient_name}</strong>,</p>
              <p style="margin: 0 0 18px 0; font-size: 14px; line-height: 1.6; color: #94a3b8;">
                {doctor_name} has generated an official medical prescription following your consultation. Below is the prescribed medication regimen:
              </p>
              <table role="presentation" width="100%" style="background: #0b1329; border: 1px solid rgba(34, 211, 238, 0.2); border-radius: 10px; margin: 18px 0; border-collapse: collapse; font-size: 13px;" cellspacing="0" cellpadding="0">
                <thead>
                  <tr style="background: rgba(255,255,255,0.03); color: #94a3b8; text-align: left;">
                    <th style="padding: 10px 14px;">Medication</th>
                    <th style="padding: 10px 14px;">Dosage</th>
                    <th style="padding: 10px 14px;">Frequency</th>
                    <th style="padding: 10px 14px;">Duration</th>
                    <th style="padding: 10px 14px;">Quantity</th>
                  </tr>
                </thead>
                <tbody>
                  {rows_html}
                </tbody>
              </table>
              <div style="background: rgba(30, 41, 59, 0.6); border: 1px solid rgba(148, 163, 184, 0.15); border-radius: 8px; padding: 12px 16px; margin: 18px 0;">
                <span style="color: #94a3b8; font-size: 12px; text-transform: uppercase; font-weight: 600;">Physician Notes & Instructions:</span>
                <p style="margin: 4px 0 0 0; color: #cbd5e1; font-size: 13px;">{instructions}</p>
              </div>
              <div style="text-align: center; margin: 26px 0 16px 0;">
                <a href="{portal_url}" target="_blank" style="display: inline-block; background: linear-gradient(135deg, #06b6d4 0%, #0d9488 100%); color: #ffffff; font-size: 15px; font-weight: 700; text-decoration: none; padding: 12px 32px; border-radius: 8px; box-shadow: 0 4px 14px rgba(6, 182, 212, 0.35);">
                  View Prescription & Order Tablets
                </a>
              </div>
            </td>
          </tr>
          <tr>
            <td style="background-color: #0c1424; padding: 16px 30px; text-align: center; border-top: 1px solid rgba(255, 255, 255, 0.05); font-size: 11px; color: #475569;">
              CareFlow Hospital Management System &bull; Clinical Outpatient Pharmacy
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>"""

        text_content = f"""New Medical Prescription: {rx_id}
=======================================
Doctor: {doctor_name}
Patient: {patient_name}
Diagnosis: {diagnosis}

Prescribed Medications:
{rows_text}

Instructions:
{instructions}

View and order medications in the patient portal:
{portal_url}
"""

        msg = EmailMultiAlternatives(subject=subject, body=text_content, from_email=from_email, to=[clean_email])
        msg.attach_alternative(html_content, "text/html")
        msg.send(fail_silently=False)
        logger.info(f"Prescription notification email sent to {clean_email} for {rx_id}")
        return {"success": True, "message": f"Prescription notification sent to {clean_email}", "error": None}
    except Exception as exc:
        err_msg = str(exc)
        logger.error(f"Failed to send prescription notification: {err_msg}", exc_info=True)
        return {"success": False, "message": "Could not send email.", "error": err_msg}


def send_prescription_notification_email_async(**kwargs):
    thread = threading.Thread(target=send_prescription_notification_email, kwargs=kwargs, daemon=True)
    thread.start()
    return thread


def send_medicine_dispense_email(dispense, recipient_email: str = None) -> dict:
    """
    Sends a confirmation email when medications are dispensed to a patient.
    """
    try:
        try:
            patient = getattr(dispense, "patient", None)
        except Exception:
            patient = None

        clean_email = get_patient_email(patient, recipient_email)
        if not clean_email:
            return {"success": False, "message": "No email address found for patient.", "error": "Missing email"}

        patient_name = f"{getattr(patient, 'first_name', '')} {getattr(patient, 'last_name', '')}".strip() or "Valued Patient"
        dispense_id = getattr(dispense, "dispense_id", "DSP-PENDING")
        total_amt = f"₹{float(getattr(dispense, 'total_amount', 0) or 0):.2f}"
        host_user = getattr(settings, "EMAIL_HOST_USER", "").strip()
        from_email = f"CareFlow Pharmacy <{host_user}>" if host_user else "CareFlow Pharmacy <noreply@careflow-hms.com>"

        subject = f"Medications Dispensed Successfully — Ref #{dispense_id}"

        items_summary = ""
        try:
            for itm in dispense.items.all():
                med_name = itm.medicine.name if (hasattr(itm, "medicine") and itm.medicine) else "Medication"
                items_summary += f"• {med_name} x {itm.quantity} units (₹{float(itm.unit_price):.2f} ea) = ₹{float(itm.subtotal):.2f}\n"
        except Exception:
            items_summary = "Medications dispensed as prescribed.\n"

        text_content = f"""CareFlow-HMS Pharmacy Dispensation Receipt
============================================
Dispense ID: {dispense_id}
Patient: {patient_name}
Total Amount: {total_amt}

Dispensed Medications:
{items_summary}

Thank you for utilizing CareFlow Hospital Dispensary.
"""
        msg = EmailMultiAlternatives(subject=subject, body=text_content, from_email=from_email, to=[clean_email])
        msg.send(fail_silently=False)
        return {"success": True, "message": f"Dispense notification sent to {clean_email}", "error": None}
    except Exception as exc:
        err_msg = str(exc)
        logger.error(f"Failed to send dispense email: {err_msg}", exc_info=True)
        return {"success": False, "message": "Could not send email.", "error": err_msg}


def send_medicine_dispense_email_async(**kwargs):
    thread = threading.Thread(target=send_medicine_dispense_email, kwargs=kwargs, daemon=True)
    thread.start()
    return thread


def send_payment_receipt_email(payment, recipient_email: str = None) -> dict:
    """
    Sends a patient billing confirmation & payment receipt with invoice balance,
    breakdown, transaction reference, and CareFlow-HMS branding.
    """
    try:
        try:
            bill = getattr(payment, "bill", None)
        except Exception:
            bill = None

        if not bill:
            return {"success": False, "message": "No bill found on payment.", "error": "Missing bill"}

        try:
            patient = getattr(bill, "patient", None)
        except Exception:
            patient = None

        clean_email = get_patient_email(patient, recipient_email)
        if not clean_email:
            return {"success": False, "message": "No email address found for patient.", "error": "Missing email"}

        patient_name = f"{getattr(patient, 'first_name', '')} {getattr(patient, 'last_name', '')}".strip() or "Valued Patient"
        receipt_no = getattr(payment, "receipt_number", "REC-PENDING")
        bill_no = getattr(bill, "bill_number", "INV-PENDING")
        amount_paid = f"₹{float(getattr(payment, 'amount', 0) or 0):.2f}"
        balance_due = f"₹{float(getattr(bill, 'balance_due', 0) or 0):.2f}"
        total_bill = f"₹{float(getattr(bill, 'total_amount', 0) or 0):.2f}"
        method_display = payment.get_payment_method_display() if hasattr(payment, "get_payment_method_display") else getattr(payment, "payment_method", "CASH")
        txn_ref = getattr(payment, "transaction_reference", None) or "N/A"
        pay_date = payment.payment_date.strftime("%B %d, %Y at %I:%M %p") if hasattr(payment.payment_date, "strftime") else str(payment.payment_date)

        host_user = getattr(settings, "EMAIL_HOST_USER", "").strip()
        from_email = f"CareFlow Billing <{host_user}>" if host_user else "CareFlow Billing <noreply@careflow-hms.com>"

        subject = f"Official Payment Receipt: #{receipt_no} for Invoice #{bill_no}"
        portal_url = "http://localhost:3000/patient/bills"

        html_content = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Payment Receipt</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0b1120; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #f1f5f9;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #0b1120; padding: 40px 15px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 580px; background: #131d33; border: 1px solid rgba(34, 211, 238, 0.25); border-radius: 16px; overflow: hidden; box-shadow: 0 20px 40px rgba(0, 0, 0, 0.55);" cellspacing="0" cellpadding="0" border="0">
          <tr>
            <td style="background: linear-gradient(135deg, #0f172a 0%, #162444 100%); padding: 30px; border-bottom: 1px solid rgba(255, 255, 255, 0.08); text-align: center;">
              <div style="display: inline-block; padding: 5px 12px; background: rgba(16, 185, 129, 0.15); border: 1px solid rgba(16, 185, 129, 0.35); border-radius: 9999px; margin-bottom: 10px;">
                <span style="color: #10b981; font-size: 12px; font-weight: 600; text-transform: uppercase;">Payment Verified & Confirmed</span>
              </div>
              <h1 style="margin: 0; color: #ffffff; font-size: 22px; font-weight: 700;">Official Payment Receipt</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 30px;">
              <p style="margin: 0 0 14px 0; font-size: 16px; color: #e2e8f0;">Dear <strong style="color: #38bdf8;">{patient_name}</strong>,</p>
              <p style="margin: 0 0 18px 0; font-size: 14px; line-height: 1.6; color: #94a3b8;">
                We have successfully processed your payment for hospital medical services. Below are your official transaction and receipt details:
              </p>
              <table role="presentation" width="100%" style="background: #0b1329; border: 1px solid rgba(34, 211, 238, 0.2); border-radius: 10px; margin: 18px 0; border-collapse: collapse; font-size: 13px;" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="padding: 10px 14px; border-bottom: 1px solid rgba(255,255,255,0.06); color: #94a3b8;">Receipt Number</td>
                  <td style="padding: 10px 14px; border-bottom: 1px solid rgba(255,255,255,0.06); color: #ffffff; font-family: monospace; font-weight: 700;">{receipt_no}</td>
                </tr>
                <tr>
                  <td style="padding: 10px 14px; border-bottom: 1px solid rgba(255,255,255,0.06); color: #94a3b8;">Invoice Number</td>
                  <td style="padding: 10px 14px; border-bottom: 1px solid rgba(255,255,255,0.06); color: #22d3ee; font-family: monospace;">{bill_no}</td>
                </tr>
                <tr>
                  <td style="padding: 10px 14px; border-bottom: 1px solid rgba(255,255,255,0.06); color: #94a3b8;">Payment Date</td>
                  <td style="padding: 10px 14px; border-bottom: 1px solid rgba(255,255,255,0.06); color: #e2e8f0;">{pay_date}</td>
                </tr>
                <tr>
                  <td style="padding: 10px 14px; border-bottom: 1px solid rgba(255,255,255,0.06); color: #94a3b8;">Payment Method</td>
                  <td style="padding: 10px 14px; border-bottom: 1px solid rgba(255,255,255,0.06); color: #e2e8f0;">{method_display}</td>
                </tr>
                <tr>
                  <td style="padding: 10px 14px; border-bottom: 1px solid rgba(255,255,255,0.06); color: #94a3b8;">Amount Paid</td>
                  <td style="padding: 10px 14px; border-bottom: 1px solid rgba(255,255,255,0.06); color: #10b981; font-size: 15px; font-weight: 700;">{amount_paid}</td>
                </tr>
                <tr>
                  <td style="padding: 10px 14px; border-bottom: 1px solid rgba(255,255,255,0.06); color: #94a3b8;">Total Invoice Amount</td>
                  <td style="padding: 10px 14px; border-bottom: 1px solid rgba(255,255,255,0.06); color: #e2e8f0;">{total_bill}</td>
                </tr>
                <tr>
                  <td style="padding: 10px 14px; color: #94a3b8;">Remaining Balance Due</td>
                  <td style="padding: 10px 14px; color: #f59e0b; font-weight: 700;">{balance_due}</td>
                </tr>
              </table>
              <div style="text-align: center; margin: 26px 0 16px 0;">
                <a href="{portal_url}" target="_blank" style="display: inline-block; background: linear-gradient(135deg, #06b6d4 0%, #0d9488 100%); color: #ffffff; font-size: 15px; font-weight: 700; text-decoration: none; padding: 12px 32px; border-radius: 8px; box-shadow: 0 4px 14px rgba(6, 182, 212, 0.35);">
                  View Billing Statement in Portal
                </a>
              </div>
            </td>
          </tr>
          <tr>
            <td style="background-color: #0c1424; padding: 16px 30px; text-align: center; border-top: 1px solid rgba(255, 255, 255, 0.05); font-size: 11px; color: #475569;">
              CareFlow Hospital Management System &bull; Financial Administration & Cashier Desk
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>"""

        text_content = f"""CareFlow-HMS Payment Receipt #{receipt_no}
============================================
Patient: {patient_name}
Invoice Number: {bill_no}
Amount Paid: {amount_paid}
Payment Method: {method_display}
Transaction Reference: {txn_ref}
Remaining Balance Due: {balance_due}

Thank you for your payment.
View complete statement at: {portal_url}
"""

        msg = EmailMultiAlternatives(subject=subject, body=text_content, from_email=from_email, to=[clean_email])
        msg.attach_alternative(html_content, "text/html")
        msg.send(fail_silently=False)
        logger.info(f"Payment receipt email sent to {clean_email} for receipt {receipt_no}")
        return {"success": True, "message": f"Payment receipt sent to {clean_email}", "error": None}
    except Exception as exc:
        err_msg = str(exc)
        logger.error(f"Failed to send payment receipt: {err_msg}", exc_info=True)
        return {"success": False, "message": "Could not send email.", "error": err_msg}


def send_payment_receipt_email_async(**kwargs):
    thread = threading.Thread(target=send_payment_receipt_email, kwargs=kwargs, daemon=True)
    thread.start()
    return thread



