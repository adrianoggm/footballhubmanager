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


# --- Pena labels ---


class InvalidPenaLabelsDataError(DomainError):
    code = "invalid_pena_labels_data"


class PenaLabelsPenaNotFoundError(DomainError):
    code = "pena_labels_pena_not_found"


class PenaLabelsAccessDeniedError(DomainError):
    code = "pena_labels_access_denied"


# --- Player profile ---


class InvalidPlayerUpdateDataError(DomainError):
    code = "invalid_player_update_data"


class InvalidPlayerNationalityError(DomainError):
    code = "invalid_player_nationality"


# --- Pena link tokens ---


class PenaLinkAccessDeniedError(DomainError):
    code = "pena_link_access_denied"


class InvalidLinkTokenError(DomainError):
    code = "invalid_link_token"


class UserAlreadyLinkedError(DomainError):
    code = "user_already_linked"


class UserProfileNotFoundError(DomainError):
    code = "user_profile_not_found"


class PlayerNotClaimableError(DomainError):
    """The target player of a claim token is not a guest player of the pena."""

    code = "player_not_claimable"


class PlayerAlreadyClaimedError(DomainError):
    """The target guest player has already been linked to an account."""

    code = "player_already_claimed"


# --- Registration ---


class InvalidAdminRegistrationDataError(DomainError):
    code = "invalid_admin_registration_data"


class InvalidRegistrationDataError(DomainError):
    code = "invalid_registration_data"


class AdminUsernameExistsError(DomainError):
    code = "admin_username_exists"


class UserUsernameExistsError(DomainError):
    code = "user_username_exists"


class UserInvalidNationalityError(DomainError):
    code = "user_invalid_nationality"


# --- Pena accountability ---


class InvalidPenaAccountabilityDataError(DomainError):
    code = "invalid_pena_accountability_data"


class PenaAccountabilityPenaNotFoundError(DomainError):
    code = "pena_accountability_pena_not_found"


class PenaAccountabilityAccessDeniedError(DomainError):
    code = "pena_accountability_access_denied"


class PenaAccountabilityMemberNotFoundError(DomainError):
    code = "pena_accountability_member_not_found"


class PenaAccountabilityExpenseNotFoundError(DomainError):
    code = "pena_accountability_expense_not_found"


# --- Pena membership ---


class PenaMembershipPenaNotFoundError(DomainError):
    code = "pena_membership_pena_not_found"


class PenaMembershipAccessDeniedError(DomainError):
    code = "pena_membership_access_denied"


class PenaMembershipNotFoundError(DomainError):
    code = "pena_membership_not_found"


class PenaMembershipPlayerNotFoundError(DomainError):
    code = "pena_membership_player_not_found"


class PenaMembershipUserProfileNotFoundError(DomainError):
    code = "pena_membership_user_profile_not_found"


class InvalidPenaMembershipUpdateDataError(DomainError):
    code = "invalid_pena_membership_update_data"


class InvalidPenaGuestPlayerDataError(DomainError):
    code = "invalid_pena_guest_player_data"


class PenaMembershipInvalidNationalityError(DomainError):
    code = "pena_membership_invalid_nationality"


# --- Season match insights ---


class InvalidSeasonInsightsDataError(DomainError):
    code = "invalid_season_insights_data"
