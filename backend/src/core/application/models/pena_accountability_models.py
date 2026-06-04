from dataclasses import dataclass
from datetime import date, datetime


@dataclass(frozen=True)
class PenaAccountabilityMemberAccountInfo:
    player_guid: str
    player_name: str
    debt_cents: int
    contribution_cents: int
    note: str | None
    updated_at: datetime | None


@dataclass(frozen=True)
class PenaAccountabilityExpenseInfo:
    guid: str
    title: str
    category: str | None
    amount_cents: int
    occurred_on: date
    note: str | None
    created_at: datetime | None
    updated_at: datetime | None


@dataclass(frozen=True)
class PenaAccountabilityInfo:
    currency: str
    balance_cents: int
    reserve_cents: int
    budget_visibility: str
    expenses_visibility: str
    member_accounts: list[PenaAccountabilityMemberAccountInfo]
    expenses: list[PenaAccountabilityExpenseInfo]
    updated_at: datetime | None
    total_debt_cents: int
    total_contribution_cents: int
    total_expenses_cents: int
    current_cash_cents: int
    projected_balance_cents: int
    expense_entries: int


@dataclass(frozen=True)
class PenaAccountabilitySettingsUpdate:
    currency: str | None = None
    balance_cents: int | None = None
    reserve_cents: int | None = None
    budget_visibility: str | None = None
    expenses_visibility: str | None = None


@dataclass(frozen=True)
class PenaAccountabilityMemberAccountUpsert:
    player_guid: str
    debt_cents: int
    contribution_cents: int
    note: str | None = None


@dataclass(frozen=True)
class PenaAccountabilityExpenseCreate:
    title: str
    category: str | None
    amount_cents: int
    occurred_on: date
    note: str | None = None
