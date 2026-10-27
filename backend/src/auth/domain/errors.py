"""Errores de dominio del bounded context de autenticación/autorización."""

from __future__ import annotations

from shared.domain.errors import DomainError


class InvalidCredentialsError(DomainError):
    code = "invalid_credentials"


class AccessDeniedError(DomainError):
    code = "access_denied"


class InvalidSessionTypeError(DomainError):
    code = "invalid_session_type"


# --- Account email / recovery ---


class MailDeliveryError(DomainError):
    code = "mail_delivery_failed"


class InvalidEmailError(DomainError):
    code = "invalid_email"


class AccountEmailInUseError(DomainError):
    code = "account_email_in_use"


class AccountEmailMissingError(DomainError):
    code = "account_email_missing"


class AccountEmailAlreadyVerifiedError(DomainError):
    code = "account_email_already_verified"


class AccountNotFoundError(DomainError):
    code = "account_not_found"


class AccountTokenCooldownError(DomainError):
    code = "account_token_cooldown"


class InvalidAccountTokenError(DomainError):
    code = "invalid_account_token"


class ExpiredAccountTokenError(DomainError):
    code = "expired_account_token"
