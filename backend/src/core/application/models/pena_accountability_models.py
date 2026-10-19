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
class PenaTransactionInfo:
    guid: str
    type: str  # 'income' | 'expense'
    amount_cents: int
    entity: str | None
    concept: str
    category: str | None
    note: str | None
    occurred_on: date
    player_guid: str | None
    player_name: str | None
    created_at: datetime | None
    updated_at: datetime | None


@dataclass(frozen=True)
class PenaMonthlyCashflowInfo:
    year: int
    month: int
    income_cents: int
    expense_cents: int


@dataclass(frozen=True)
class PenaAccountabilityInfo:
    currency: str
    opening_balance_cents: int
    reserve_cents: int
    budget_visibility: str
    expenses_visibility: str
    member_accounts: list[PenaAccountabilityMemberAccountInfo]
    monthly_cashflow: list[PenaMonthlyCashflowInfo]
    updated_at: datetime | None
    # Derived KPIs (computed in the query handler from ledger aggregates).
    total_income_cents: int
    total_expense_cents: int
    total_balance_cents: int
    balance_trend_pct: float | None
    total_debt_cents: int
    total_contribution_cents: int
    membership_fees_cents: int
    membership_collected_pct: float | None
    expenses_this_month_count: int
    members_pending_count: int


@dataclass(frozen=True)
class PenaTransactionPage:
    items: list[PenaTransactionInfo]
    page: int
    page_size: int
    total: int


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
class PenaTransactionCreate:
    type: str
    amount_cents: int
    concept: str
    occurred_on: date
    entity: str | None = None
    category: str | None = None
    note: str | None = None
    player_guid: str | None = None
