"""Errores de dominio del bounded context ``core``."""

from __future__ import annotations

from shared.domain.errors import DomainError


class InvalidProfileImageError(DomainError):
    code = "invalid_profile_image"


class PenaProfileNotFoundError(DomainError):
    code = "pena_profile_not_found"


class PenaProfileAccessDeniedError(DomainError):
    code = "pena_profile_access_denied"
