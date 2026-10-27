"""Single-use account token (email verification or password reset)."""

from __future__ import annotations

from dataclasses import dataclass
from enum import Enum

from auth.domain.models.account_email import AccountRef


class AccountTokenPurpose(str, Enum):
    EMAIL_VERIFICATION = "EMAIL_VERIFICATION"
    PASSWORD_RESET = "PASSWORD_RESET"


@dataclass(frozen=True)
class AccountToken:
    """Only the sha256 hex digest of the token is ever modelled or stored."""

    token_hash: str
    purpose: AccountTokenPurpose
    ref: AccountRef
    expires_at: int
    created_at: int
    # Address being verified. Only set for EMAIL_VERIFICATION tokens.
    email: str | None = None

    def is_expired(self, now: int) -> bool:
        return self.expires_at <= now

    def is_for_email(self, current_email: str | None) -> bool:
        """A verification link only counts for the address it was sent to.

        If the account changed its email after the link was issued, the old link must
        not verify the new address.
        """
        return current_email is not None and self.email == current_email
