from __future__ import annotations

from dataclasses import dataclass

from auth.domain.models.account_email import AccountRef
from auth.domain.models.mail_language import MailLanguage


@dataclass(frozen=True)
class ChangeAccountEmailCommand:
    ref: AccountRef
    email: str
    lang: MailLanguage


@dataclass(frozen=True)
class ResendEmailVerificationCommand:
    ref: AccountRef
    lang: MailLanguage


@dataclass(frozen=True)
class SendRegistrationEmailVerificationCommand:
    """Best-effort verification email right after sign-up (never fails the sign-up)."""

    ref: AccountRef
    lang: MailLanguage


@dataclass(frozen=True)
class VerifyEmailCommand:
    token: str
