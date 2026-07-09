from datetime import date, datetime

from pydantic import BaseModel


class PenaAccountabilityMemberAccountResponse(BaseModel):
    player_guid: str
    player_name: str
    debt_cents: int
    contribution_cents: int
    note: str | None
    updated_at: datetime | None


class PenaMonthlyCashflowResponse(BaseModel):
    year: int
    month: int
    income_cents: int
    expense_cents: int


class PenaTransactionResponse(BaseModel):
    guid: str
    type: str
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


class PenaAccountabilityResponse(BaseModel):
    currency: str
    opening_balance_cents: int | None
    reserve_cents: int | None
    budget_visibility: str
    expenses_visibility: str
    member_accounts: list[PenaAccountabilityMemberAccountResponse]
    my_account: PenaAccountabilityMemberAccountResponse | None = None
    monthly_cashflow: list[PenaMonthlyCashflowResponse]
    # KPIs (nulled out when the viewer is not allowed to see them).
    total_balance_cents: int | None
    balance_trend_pct: float | None
    total_income_cents: int | None
    total_expense_cents: int | None
    expenses_this_month_count: int | None
    membership_fees_cents: int | None
    membership_collected_pct: float | None
    outstanding_dues_cents: int | None
    members_pending_count: int | None
    updated_at: datetime | None


class PenaTransactionPageResponse(BaseModel):
    items: list[PenaTransactionResponse]
    page: int
    page_size: int
    total: int
    total_pages: int
