"""Centralized exception-to-HTTP mapping for FastAPI controllers."""

from collections.abc import Callable, Mapping
from functools import wraps
from typing import Any

from auth.application.use_cases.login import InvalidCredentialsError
from core.application.use_cases import (
    InvalidSeasonInsightsDataError as CoreInvalidSeasonInsightsDataError,
)
from core.application.use_cases import (
    PenaSeasonNotFoundError as CoreCompetitionPenaSeasonNotFoundError,
)
from core.application.use_cases import (
    PenaSeasonPenaNotFoundError as CoreCompetitionPenaSeasonPenaNotFoundError,
)
from fastapi import HTTPException, status
from persistence.application.use_cases import (
    AdminUsernameExistsError,
    InvalidAdminRegistrationDataError,
    InvalidLinkTokenError,
    InvalidPenaAccountabilityDataError,
    InvalidPenaGuestPlayerDataError,
    InvalidPenaLabelsDataError,
    InvalidPenaMembershipUpdateDataError,
    InvalidPenaProfileImageError,
    InvalidPlayerUpdateDataError,
    InvalidRegistrationDataError,
    InvalidSeasonDataError,
    InvalidSeasonInsightsDataError,
    InvalidSeasonMatchDataError,
    InvalidSeasonPlayerBatchDataError,
    InvalidSeasonPlayerUpdateDataError,
    PenaAccessDeniedError,
    PenaAccountabilityAccessDeniedError,
    PenaAccountabilityExpenseNotFoundError,
    PenaAccountabilityMemberNotFoundError,
    PenaAccountabilityPenaNotFoundError,
    PenaLabelsAccessDeniedError,
    PenaLabelsPenaNotFoundError,
    PenaMembershipAccessDeniedError,
    PenaMembershipInvalidNationalityError,
    PenaMembershipNotFoundError,
    PenaMembershipPenaNotFoundError,
    PenaMembershipPlayerNotFoundError,
    PenaMembershipUserProfileNotFoundError,
    PenaProfileAccessDeniedError,
    PenaProfileNotFoundError,
    PlayerInvalidNationalityError,
    PlayerInvalidProfileImageError,
    SeasonMatchInvalidPlayersError,
    SeasonMatchLineupLockedError,
    SeasonMatchNotFoundError,
    SeasonMatchPlayersNotInSeasonError,
    SeasonMatchStatsMismatchError,
    SeasonPlayerAlreadyRegisteredError,
    SeasonPlayerInMatchError,
    SeasonPlayerNotFoundError,
    SeasonPlayerNotInPenaError,
    UserAlreadyLinkedError,
    UserInvalidNationalityError,
    UserProfileNotFoundError,
    UserUsernameExistsError,
)
from persistence.application.use_cases import (
    PenaSeasonAccessDeniedError as CompetitionPenaSeasonAccessDeniedError,
)
from persistence.application.use_cases import (
    PenaSeasonDateOverlapError as CompetitionPenaSeasonDateOverlapError,
)
from persistence.application.use_cases import (
    PenaSeasonNotFoundError as CompetitionPenaSeasonNotFoundError,
)
from persistence.application.use_cases import (
    PenaSeasonPenaNotFoundError as CompetitionPenaSeasonPenaNotFoundError,
)
from persistence.application.use_cases.manage_pena_seasons_usecase import (
    InvalidPenaSeasonDataError,
)
from persistence.application.use_cases.manage_pena_seasons_usecase import (
    PenaSeasonAccessDeniedError as PenaSeasonsAccessDeniedError,
)
from persistence.application.use_cases.manage_pena_seasons_usecase import (
    PenaSeasonDateOverlapError as PenaSeasonsDateOverlapError,
)
from persistence.application.use_cases.manage_pena_seasons_usecase import (
    PenaSeasonNotFoundError as PenaSeasonsNotFoundError,
)
from persistence.application.use_cases.manage_pena_seasons_usecase import (
    PenaSeasonPenaNotFoundError as PenaSeasonsPenaNotFoundError,
)

ExceptionStatus = tuple[int, str]
ExceptionStatusMap = Mapping[type[Exception], ExceptionStatus]


EXCEPTION_STATUS_MAP: dict[type[Exception], ExceptionStatus] = {
    InvalidCredentialsError: (status.HTTP_401_UNAUTHORIZED, "Invalid credentials"),
    UserUsernameExistsError: (status.HTTP_409_CONFLICT, "Username already exists"),
    AdminUsernameExistsError: (status.HTTP_409_CONFLICT, "Username already exists"),
    InvalidRegistrationDataError: (status.HTTP_400_BAD_REQUEST, "Invalid user registration data"),
    InvalidAdminRegistrationDataError: (
        status.HTTP_400_BAD_REQUEST,
        "Invalid admin registration data",
    ),
    UserInvalidNationalityError: (status.HTTP_400_BAD_REQUEST, "Invalid nationality"),
    PlayerInvalidNationalityError: (status.HTTP_400_BAD_REQUEST, "Invalid nationality"),
    InvalidPlayerUpdateDataError: (status.HTTP_400_BAD_REQUEST, "Invalid player update data"),
    PlayerInvalidProfileImageError: (status.HTTP_400_BAD_REQUEST, "Invalid profile image"),
    InvalidLinkTokenError: (status.HTTP_400_BAD_REQUEST, "Invalid or expired link token"),
    UserAlreadyLinkedError: (status.HTTP_409_CONFLICT, "User is already linked to this pena"),
    UserProfileNotFoundError: (status.HTTP_404_NOT_FOUND, "User player profile not found"),
    PenaAccessDeniedError: (status.HTTP_403_FORBIDDEN, "Admin does not manage this pena"),
    InvalidPenaLabelsDataError: (status.HTTP_400_BAD_REQUEST, "Invalid pena labels data"),
    InvalidPenaProfileImageError: (status.HTTP_400_BAD_REQUEST, "Invalid profile image"),
    PenaLabelsPenaNotFoundError: (status.HTTP_404_NOT_FOUND, "Pena not found"),
    PenaLabelsAccessDeniedError: (status.HTTP_403_FORBIDDEN, "Admin does not manage this pena"),
    PenaProfileNotFoundError: (status.HTTP_404_NOT_FOUND, "Pena not found"),
    PenaProfileAccessDeniedError: (status.HTTP_403_FORBIDDEN, "Admin does not manage this pena"),
    InvalidPenaAccountabilityDataError: (
        status.HTTP_400_BAD_REQUEST,
        "Invalid accountability data",
    ),
    PenaAccountabilityPenaNotFoundError: (status.HTTP_404_NOT_FOUND, "Pena not found"),
    PenaAccountabilityAccessDeniedError: (
        status.HTTP_403_FORBIDDEN,
        "Admin does not manage this pena",
    ),
    PenaAccountabilityMemberNotFoundError: (status.HTTP_404_NOT_FOUND, "Member not found"),
    PenaAccountabilityExpenseNotFoundError: (status.HTTP_404_NOT_FOUND, "Expense not found"),
    InvalidPenaGuestPlayerDataError: (status.HTTP_400_BAD_REQUEST, "Invalid guest player data"),
    InvalidPenaMembershipUpdateDataError: (
        status.HTTP_400_BAD_REQUEST,
        "Invalid membership update data",
    ),
    PenaMembershipPenaNotFoundError: (status.HTTP_404_NOT_FOUND, "Pena not found"),
    PenaMembershipPlayerNotFoundError: (status.HTTP_404_NOT_FOUND, "Player not found"),
    PenaMembershipUserProfileNotFoundError: (
        status.HTTP_404_NOT_FOUND,
        "User player profile not found",
    ),
    PenaMembershipAccessDeniedError: (status.HTTP_403_FORBIDDEN, "Access denied to this pena"),
    PenaMembershipInvalidNationalityError: (status.HTTP_400_BAD_REQUEST, "Invalid nationality"),
    PenaMembershipNotFoundError: (
        status.HTTP_404_NOT_FOUND,
        "Player is not linked to this pena",
    ),
    InvalidPenaSeasonDataError: (status.HTTP_400_BAD_REQUEST, "Invalid season data"),
    PenaSeasonsPenaNotFoundError: (status.HTTP_404_NOT_FOUND, "Pena not found"),
    PenaSeasonsAccessDeniedError: (
        status.HTTP_403_FORBIDDEN,
        "Admin does not manage this pena",
    ),
    PenaSeasonsNotFoundError: (status.HTTP_404_NOT_FOUND, "Season not found"),
    PenaSeasonsDateOverlapError: (
        status.HTTP_409_CONFLICT,
        "Season range overlaps an existing season",
    ),
    CompetitionPenaSeasonPenaNotFoundError: (status.HTTP_404_NOT_FOUND, "Pena not found"),
    CompetitionPenaSeasonAccessDeniedError: (
        status.HTTP_403_FORBIDDEN,
        "Admin does not manage this pena",
    ),
    CompetitionPenaSeasonNotFoundError: (status.HTTP_404_NOT_FOUND, "Season not found"),
    CompetitionPenaSeasonDateOverlapError: (
        status.HTTP_409_CONFLICT,
        "Season range overlaps an existing season",
    ),
    CoreCompetitionPenaSeasonPenaNotFoundError: (
        status.HTTP_404_NOT_FOUND,
        "Pena not found",
    ),
    CoreCompetitionPenaSeasonNotFoundError: (
        status.HTTP_404_NOT_FOUND,
        "Season not found",
    ),
    InvalidSeasonDataError: (status.HTTP_400_BAD_REQUEST, "Invalid season data"),
    InvalidSeasonInsightsDataError: (
        status.HTTP_400_BAD_REQUEST,
        "Invalid match insights request",
    ),
    CoreInvalidSeasonInsightsDataError: (
        status.HTTP_400_BAD_REQUEST,
        "Invalid match insights request",
    ),
    InvalidSeasonPlayerBatchDataError: (
        status.HTTP_400_BAD_REQUEST,
        "Invalid bulk player registration data",
    ),
    InvalidSeasonPlayerUpdateDataError: (
        status.HTTP_400_BAD_REQUEST,
        "Invalid season player update data",
    ),
    InvalidSeasonMatchDataError: (status.HTTP_400_BAD_REQUEST, "Invalid match data"),
    SeasonPlayerAlreadyRegisteredError: (
        status.HTTP_409_CONFLICT,
        "Player is already registered in this season",
    ),
    SeasonPlayerNotFoundError: (status.HTTP_404_NOT_FOUND, "Player not found"),
    SeasonPlayerNotInPenaError: (
        status.HTTP_409_CONFLICT,
        "Player is not linked to this pena",
    ),
    SeasonPlayerInMatchError: (
        status.HTTP_409_CONFLICT,
        "Player already has matches in this season",
    ),
    SeasonMatchNotFoundError: (status.HTTP_404_NOT_FOUND, "Match not found"),
    SeasonMatchPlayersNotInSeasonError: (
        status.HTTP_409_CONFLICT,
        "All called-up players must be registered in this season",
    ),
    SeasonMatchInvalidPlayersError: (
        status.HTTP_400_BAD_REQUEST,
        "A match cannot repeat players across lineups",
    ),
    SeasonMatchStatsMismatchError: (
        status.HTTP_409_CONFLICT,
        "Stats payload must match the exact match lineup",
    ),
    SeasonMatchLineupLockedError: (
        status.HTTP_409_CONFLICT,
        "Cannot update lineups after match stats have been recorded",
    ),
}


def _resolve_exception_status(
    error: Exception,
    overrides: ExceptionStatusMap | None = None,
) -> ExceptionStatus | None:
    mapping = dict(EXCEPTION_STATUS_MAP)
    if overrides:
        mapping.update(overrides)

    for error_type in type(error).__mro__:
        if error_type in mapping:
            return mapping[error_type]
    return None


def map_exceptions(
    func: Callable[..., Any] | None = None,
    *,
    overrides: ExceptionStatusMap | None = None,
) -> Callable[..., Any]:
    """Map domain exceptions to HTTPException, with optional endpoint overrides."""

    def decorator(target: Callable[..., Any]) -> Callable[..., Any]:
        @wraps(target)
        def wrapper(*args: Any, **kwargs: Any) -> Any:
            try:
                return target(*args, **kwargs)
            except HTTPException:
                raise
            except Exception as error:
                mapped = _resolve_exception_status(error, overrides=overrides)
                if mapped is None:
                    raise
                status_code, detail = mapped
                raise HTTPException(status_code=status_code, detail=detail) from error

        return wrapper

    if func is not None:
        return decorator(func)
    return decorator
