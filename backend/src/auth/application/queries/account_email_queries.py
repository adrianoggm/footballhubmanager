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
    # Set by an email change: False when the verification mail was deferred by the
    # resend cooldown (the address is saved anyway; the user resends it later).
    verification_email_sent: bool = False
