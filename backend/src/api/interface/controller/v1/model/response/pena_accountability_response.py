from datetime import date, datetime

from pydantic import BaseModel


class PenaAccountabilityMemberAccountResponse(BaseModel):
    player_guid: str
    player_name: str
    debt_cents: int
    contribution_cents: int
    note: str | None
    updated_at: datetime | None


class PenaExpenseResponse(BaseModel):
    guid: str
    title: str
    category: str | None
    amount_cents: int
    occurred_on: date
    note: str | None
    created_at: datetime | None
    updated_at: datetime | None


class PenaAccountabilityResponse(BaseModel):
    currency: str
    balance_cents: int | None
    reserve_cents: int | None
    budget_visibility: str
    expenses_visibility: str
    member_accounts: list[PenaAccountabilityMemberAccountResponse]
    my_account: PenaAccountabilityMemberAccountResponse | None = None
    expenses: list[PenaExpenseResponse]
    total_debt_cents: int | None
    total_contribution_cents: int | None
    total_expenses_cents: int | None
    current_cash_cents: int | None
    projected_balance_cents: int | None
    expense_entries: int | None
    updated_at: datetime | None
