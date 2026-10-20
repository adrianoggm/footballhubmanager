"""Builds the plain-text verification and password-reset emails (ES/EN)."""

from __future__ import annotations

import math
from dataclasses import dataclass

from auth.domain.models.mail_language import MailLanguage
from auth.domain.models.outgoing_email import OutgoingEmail

# Frontend routes that consume the emailed tokens (see router/AppRouter.jsx).
VERIFY_EMAIL_PATH = "/verify-email/"
RESET_PASSWORD_PATH = "/reset-password/"

_APP_NAME = "PeñaHub"


@dataclass(frozen=True)
class _Template:
    subject: str
    body: str


_VERIFICATION = {
    MailLanguage.ES: _Template(
        subject=f"{_APP_NAME}: confirma tu email",
        body=(
            "Hola {username},\n\n"
            "Confirma tu dirección de email abriendo este enlace:\n\n{link}\n\n"
            "El enlace caduca en {ttl}. Si no has sido tú, ignora este mensaje.\n"
        ),
    ),
    MailLanguage.EN: _Template(
        subject=f"{_APP_NAME}: confirm your email",
        body=(
            "Hi {username},\n\n"
            "Confirm your email address by opening this link:\n\n{link}\n\n"
            "The link expires in {ttl}. If this wasn't you, ignore this message.\n"
        ),
    ),
}

_PASSWORD_RESET = {
    MailLanguage.ES: _Template(
        subject=f"{_APP_NAME}: restablece tu contraseña",
        body=(
            "Hola {username},\n\n"
            "Hemos recibido una solicitud para restablecer la contraseña de tu cuenta "
            "({account_type}). Ábrela aquí:\n\n{link}\n\n"
            "El enlace caduca en {ttl} y solo puede usarse una vez. Si no lo has "
            "pedido tú, ignora este mensaje: tu contraseña no cambiará.\n"
        ),
    ),
    MailLanguage.EN: _Template(
        subject=f"{_APP_NAME}: reset your password",
        body=(
            "Hi {username},\n\n"
            "We received a request to reset the password of your {account_type} "
            "account. Open this link:\n\n{link}\n\n"
            "The link expires in {ttl} and works only once. If you didn't ask for "
            "it, ignore this message: your password will not change.\n"
        ),
    ),
}

_ACCOUNT_TYPE_LABELS = {
    MailLanguage.ES: {"user": "usuario", "admin": "administrador"},
    MailLanguage.EN: {"user": "user", "admin": "admin"},
}


# (singular, plural) per language for hours and minutes.
_UNITS = {
    MailLanguage.ES: {"hour": ("hora", "horas"), "minute": ("minuto", "minutos")},
    MailLanguage.EN: {"hour": ("hour", "hours"), "minute": ("minute", "minutes")},
}


def _format_ttl(seconds: int, lang: MailLanguage) -> str:
    if seconds % 3600 == 0:
        amount, unit = seconds // 3600, "hour"
    else:
        amount, unit = math.ceil(seconds / 60), "minute"
    singular, plural = _UNITS[lang][unit]
    return f"{amount} {singular if amount == 1 else plural}"


class AccountEmailComposer:
    def __init__(self, public_url: str) -> None:
        self._public_url = public_url.rstrip("/")

    def email_verification(
        self, *, to: str, username: str, token: str, ttl_seconds: int, lang: MailLanguage
    ) -> OutgoingEmail:
        template = _VERIFICATION[lang]
        body = template.body.format(
            username=username,
            link=f"{self._public_url}{VERIFY_EMAIL_PATH}{token}",
            ttl=_format_ttl(ttl_seconds, lang),
        )
        return OutgoingEmail(to=to, subject=template.subject, body=body)

    def password_reset(
        self,
        *,
        to: str,
        username: str,
        account_type: str,
        token: str,
        ttl_seconds: int,
        lang: MailLanguage,
    ) -> OutgoingEmail:
        template = _PASSWORD_RESET[lang]
        body = template.body.format(
            username=username,
            account_type=_ACCOUNT_TYPE_LABELS[lang].get(account_type, account_type),
            link=f"{self._public_url}{RESET_PASSWORD_PATH}{token}",
            ttl=_format_ttl(ttl_seconds, lang),
        )
        return OutgoingEmail(to=to, subject=template.subject, body=body)
