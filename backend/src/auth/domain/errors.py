"""Errores de dominio del bounded context de autenticación/autorización."""

from __future__ import annotations

from shared.domain.errors import DomainError


class InvalidCredentialsError(DomainError):
    code = "invalid_credentials"


class AccessDeniedError(DomainError):
    code = "access_denied"


class InvalidSessionTypeError(DomainError):
    code = "invalid_session_type"
