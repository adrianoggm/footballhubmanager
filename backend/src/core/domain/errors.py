"""Errores de dominio del bounded context ``core``."""

from __future__ import annotations

from shared.domain.errors import DomainError


class InvalidProfileImageError(DomainError):
    code = "invalid_profile_image"


class PenaProfileNotFoundError(DomainError):
    code = "pena_profile_not_found"


class PenaProfileAccessDeniedError(DomainError):
    code = "pena_profile_access_denied"


# --- Pena seasons ---


class InvalidPenaSeasonDataError(DomainError):
    code = "invalid_pena_season_data"


class PenaSeasonPenaNotFoundError(DomainError):
    code = "pena_season_pena_not_found"


class PenaSeasonAccessDeniedError(DomainError):
    code = "pena_season_access_denied"


class PenaSeasonNotFoundError(DomainError):
    code = "pena_season_not_found"


class PenaSeasonDateOverlapError(DomainError):
    code = "pena_season_date_overlap"
