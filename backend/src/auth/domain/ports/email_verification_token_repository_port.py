"""Port for EMAIL_VERIFICATION tokens."""

from __future__ import annotations

from typing import Protocol

from auth.domain.models.account_email import AccountRef
from auth.domain.models.account_token import AccountToken


class EmailVerificationTokenRepositoryPort(Protocol):
    def replace_token(self, token: AccountToken) -> None:
        """Store ``token`` and drop every previous verification token of the account."""
        ...

    def last_issued_at(self, ref: AccountRef) -> int | None: ...

    def find(self, token_hash: str) -> AccountToken | None: ...

    def discard(self, token_hash: str) -> None: ...

    def confirm_email(self, token: AccountToken, verified_at: int) -> bool:
        """Atomically consume ``token`` and mark its email verified.

        Returns False when the token was already consumed or the account email no
        longer matches (lost a race); nothing is changed in that case.
        """
        ...
