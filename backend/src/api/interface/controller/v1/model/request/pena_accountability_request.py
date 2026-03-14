from datetime import date

from pydantic import BaseModel


class UpdatePenaAccountabilityRequest(BaseModel):
    currency: str | None = None
    balance_cents: int | None = None
    reserve_cents: int | None = None
    budget_visibility: str | None = None
    expenses_visibility: str | None = None


class UpsertPenaMemberAccountRequest(BaseModel):
    debt_cents: int
    contribution_cents: int
    note: str | None = None


class CreatePenaExpenseRequest(BaseModel):
    title: str
    category: str | None = None
    amount_cents: int
    occurred_on: date
    note: str | None = None
