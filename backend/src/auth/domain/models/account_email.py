"""Email state of an authenticable account (user or admin)."""

from __future__ import annotations

from dataclasses import dataclass
from enum import Enum


class AccountType(str, Enum):
    """Account table an id belongs to. Values match ``user_session.user_type``."""

    USER = "user"
    ADMIN = "admin"


@dataclass(frozen=True)
class AccountRef:
    account_type: AccountType
    account_id: int


@dataclass(frozen=True)
class AccountEmail:
    ref: AccountRef
    guid: str
    username: str
    email: str | None
    email_verified_at: int | None

    @property
    def is_verified(self) -> bool:
        return self.email is not None and self.email_verified_at is not None

    def has_verified_email(self, email: str) -> bool:
        """True when ``email`` is already this account's verified address (no-op change)."""
        return self.is_verified and self.email == email
