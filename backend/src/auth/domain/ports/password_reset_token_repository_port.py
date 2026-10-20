"""Port for PASSWORD_RESET tokens."""

from __future__ import annotations

from typing import Protocol

from auth.domain.models.account_email import AccountRef
from auth.domain.models.account_token import AccountToken


class PasswordResetTokenRepositoryPort(Protocol):
    def replace_token(self, token: AccountToken) -> None:
        """Store ``token`` and invalidate every previous reset token of the account."""
        ...

    def last_issued_at(self, ref: AccountRef) -> int | None: ...

    def find(self, token_hash: str) -> AccountToken | None: ...

    def discard(self, token_hash: str) -> None: ...

    def reset_password(self, token: AccountToken, password_hash: str) -> bool:
        """In one transaction: consume ``token``, store ``password_hash``, delete every
        reset token and every session of the account.

        Returns False (and changes nothing) when the token was already consumed.
        """
        ...
