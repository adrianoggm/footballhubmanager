from __future__ import annotations

from dataclasses import dataclass

from auth.domain.models.mail_language import MailLanguage


@dataclass(frozen=True)
class RequestPasswordResetCommand:
    email: str
    lang: MailLanguage


@dataclass(frozen=True)
class ResetPasswordCommand:
    token: str
    new_password: str
