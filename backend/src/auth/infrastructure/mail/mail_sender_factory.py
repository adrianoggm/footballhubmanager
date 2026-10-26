"""Selects the mail adapter configured by ``MAIL_BACKEND``."""

from __future__ import annotations

from enum import Enum

from auth.domain.ports.mail_sender_port import MailSenderPort
from auth.infrastructure.mail.console_mail_sender import ConsoleMailSender
from auth.infrastructure.mail.smtp_mail_sender import SmtpMailSender, SmtpSettings


class MailBackend(str, Enum):
    CONSOLE = "console"
    SMTP = "smtp"


def build_mail_sender(backend: MailBackend, smtp_settings: SmtpSettings | None) -> MailSenderPort:
    if backend is MailBackend.SMTP:
        if smtp_settings is None:
            raise ValueError("SMTP mail backend selected without SMTP settings")
        return SmtpMailSender(smtp_settings)
    return ConsoleMailSender()
