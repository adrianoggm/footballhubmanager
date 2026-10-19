from __future__ import annotations

from dataclasses import dataclass
from datetime import date


@dataclass(frozen=True)
class UpdateAccountabilitySettingsCommand:
    pena_guid: str
    admin_id: int
    currency: str | None = None
    balance_cents: int | None = None
    reserve_cents: int | None = None
    budget_visibility: str | None = None
    expenses_visibility: str | None = None


@dataclass(frozen=True)
class UpsertMemberAccountCommand:
    pena_guid: str
    admin_id: int
    player_guid: str
    debt_cents: int | None = None
    contribution_cents: int | None = None
    note: str | None = None


@dataclass(frozen=True)
class RemoveMemberAccountCommand:
    pena_guid: str
    admin_id: int
    player_guid: str


@dataclass(frozen=True)
class RecordTransactionCommand:
    pena_guid: str
    admin_id: int
    type: str
    amount_cents: int | None
    concept: str
    occurred_on: date
    entity: str | None = None
    category: str | None = None
    note: str | None = None
    player_guid: str | None = None


@dataclass(frozen=True)
class RemoveTransactionCommand:
    pena_guid: str
    admin_id: int
    transaction_guid: str
