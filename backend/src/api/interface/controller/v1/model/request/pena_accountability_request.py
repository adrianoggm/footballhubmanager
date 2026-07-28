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


class RecordPenaTransactionRequest(BaseModel):
    type: str
    amount_cents: int
    concept: str
    occurred_on: date
    entity: str | None = None
    category: str | None = None
    note: str | None = None
    player_guid: str | None = None
