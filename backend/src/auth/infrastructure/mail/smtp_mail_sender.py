"""SMTP mail adapter built on the standard library (``smtplib`` + ``email.message``)."""

from __future__ import annotations

import logging
import smtplib
import ssl
from dataclasses import dataclass
from email.message import EmailMessage
from enum import Enum

from auth.domain.errors import MailDeliveryError
from auth.domain.models.outgoing_email import OutgoingEmail
from auth.domain.ports.mail_sender_port import MailSenderPort

logger = logging.getLogger(__name__)

_SMTP_TIMEOUT_SECONDS = 15


class SmtpSecurity(str, Enum):
    STARTTLS = "starttls"
    SSL = "ssl"
    NONE = "none"


@dataclass(frozen=True)
class SmtpSettings:
    host: str
    port: int
    sender: str
    security: SmtpSecurity
    username: str | None = None
    password: str | None = None


class SmtpMailSender(MailSenderPort):
    def __init__(self, settings: SmtpSettings) -> None:
        self._settings = settings

    def send(self, email: OutgoingEmail) -> None:
        message = EmailMessage()
        message["From"] = self._settings.sender
        message["To"] = email.to
        message["Subject"] = email.subject
        message.set_content(email.body)
        try:
            with self._connect() as client:
                if self._settings.username:
                    client.login(self._settings.username, self._settings.password or "")
                client.send_message(message)
        except (smtplib.SMTPException, OSError) as exc:
            logger.error(
                "❌ SMTP delivery failed via %s:%s: %s",
                self._settings.host,
                self._settings.port,
                exc.__class__.__name__,
            )
            raise MailDeliveryError() from exc
        logger.info("📤 Email sent via SMTP: %s", email.subject)

    def _connect(self) -> smtplib.SMTP:
        settings = self._settings
        if settings.security is SmtpSecurity.SSL:
            return smtplib.SMTP_SSL(
                settings.host,
                settings.port,
                timeout=_SMTP_TIMEOUT_SECONDS,
                context=ssl.create_default_context(),
            )
        client = smtplib.SMTP(settings.host, settings.port, timeout=_SMTP_TIMEOUT_SECONDS)
        if settings.security is SmtpSecurity.STARTTLS:
            client.starttls(context=ssl.create_default_context())
        return client
