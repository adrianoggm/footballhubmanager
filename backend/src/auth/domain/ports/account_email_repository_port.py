"""Port for reading and changing the email of user/admin accounts."""

from __future__ import annotations

from typing import Protocol

from auth.domain.models.account_email import AccountEmail, AccountRef


class AccountEmailRepositoryPort(Protocol):
    def get_account_email(self, ref: AccountRef) -> AccountEmail | None: ...

    def find_verified_by_email(self, email: str) -> list[AccountEmail]:
        """Every account (one per account table at most) whose verified email is ``email``."""
        ...

    def set_unverified_email(self, ref: AccountRef, email: str) -> None:
        """Store ``email`` as unverified and drop pending password-reset tokens.

        Raises ``AccountNotFoundError`` or ``AccountEmailInUseError``.
        """
        ...
