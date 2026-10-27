from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class InspectPasswordResetTokenQuery:
    token: str


@dataclass(frozen=True)
class PasswordResetTokenInfoResult:
    username: str
    account_type: str
    expires_at: int
