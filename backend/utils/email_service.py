import logging
from django.core.mail import EmailMultiAlternatives
from django.template.loader import render_to_string
from django.conf import settings

logger = logging.getLogger(__name__)

def send_html_email(subject, to_email, template_prefix, context):
    """
    Utility function to render templates (HTML and text) and dispatch using Django SMTP.
    Returns True on success, False on failure.
    """
    try:
        html_content = render_to_string(f'emails/{template_prefix}.html', context)
        text_content = render_to_string(f'emails/{template_prefix}.txt', context)

        from_email = getattr(settings, 'DEFAULT_FROM_EMAIL', 'noreply@carpool.org')
        
        email_message = EmailMultiAlternatives(
            subject=subject,
            body=text_content,
            from_email=from_email,
            to=[to_email]
        )
        email_message.attach_alternative(html_content, "text/html")
        email_message.send(fail_silently=False)
        return True
    except Exception as e:
        logger.error(f"SMTP error sending email to {to_email} using template {template_prefix}: {e}", exc_info=True)
        return False

def send_otp_email(email, otp):
    """
    Dispatches a 6-digit OTP verification code to the target email.
    """
    subject = "Your Carpool OTP Verification Code"
    return send_html_email(subject, email, 'otp', {'otp': otp})

def send_verification_email(email, verification_link):
    """
    Dispatches an account verification link to the target email.
    """
    subject = "Verify Your Carpool Account"
    return send_html_email(subject, email, 'verification', {'verification_link': verification_link})

def send_password_reset_email(email, reset_link):
    """
    Dispatches a password reset link to the target email.
    """
    subject = "Reset Your Carpool Password"
    return send_html_email(subject, email, 'password_reset', {'reset_link': reset_link})
