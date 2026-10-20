from __future__ import annotations

from dataclasses import dataclass

from auth.domain.models.account_email import AccountRef


@dataclass(frozen=True)
class GetAccountEmailQuery:
    ref: AccountRef


@dataclass(frozen=True)
class AccountEmailStatusResult:
    email: str | None
    email_verified: bool
