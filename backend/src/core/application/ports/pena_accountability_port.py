from dataclasses import dataclass
from datetime import date, datetime
from typing import Protocol


@dataclass(frozen=True)
class PenaAccountabilityMemberAccountResult:
    player_guid: str
    player_name: str
    debt_cents: int
    contribution_cents: int
    note: str | None
    updated_at: datetime | None


@dataclass(frozen=True)
class PenaMonthlyCashflowResult:
    year: int
    month: int
    income_cents: int
    expense_cents: int


@dataclass(frozen=True)
class PenaAccountabilityResult:
    currency: str
    opening_balance_cents: int
    reserve_cents: int
    budget_visibility: str
    expenses_visibility: str
    member_accounts: list[PenaAccountabilityMemberAccountResult]
    total_income_cents: int
    total_expense_cents: int
    expenses_this_month_count: int
    monthly_cashflow: list[PenaMonthlyCashflowResult]
    updated_at: datetime | None


@dataclass(frozen=True)
class PenaTransactionResult:
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


@dataclass(frozen=True)
class PenaTransactionPageResult:
    items: list[PenaTransactionResult]
    total: int


class PenaAccountabilityPort(Protocol):
    def get_for_pena(self, *, pena_guid: str) -> PenaAccountabilityResult: ...

    def list_transactions_for_pena(
        self,
        *,
        pena_guid: str,
        page: int,
        page_size: int,
        type_filter: str | None,
    ) -> PenaTransactionPageResult: ...

    def save_settings_for_admin(
        self,
        *,
        pena_guid: str,
        admin_id: int,
        currency: str,
        balance_cents: int,
        reserve_cents: int,
        budget_visibility: str,
        expenses_visibility: str,
    ) -> PenaAccountabilityResult: ...

    def upsert_member_account_for_admin(
        self,
        *,
        pena_guid: str,
        admin_id: int,
        player_guid: str,
        debt_cents: int,
        contribution_cents: int,
        note: str | None,
    ) -> PenaAccountabilityResult: ...

    def delete_member_account_for_admin(
        self,
        *,
        pena_guid: str,
        admin_id: int,
        player_guid: str,
    ) -> PenaAccountabilityResult: ...

    def record_transaction_for_admin(
        self,
        *,
        pena_guid: str,
        admin_id: int,
        type: str,
        amount_cents: int,
        concept: str,
        occurred_on: date,
        entity: str | None,
        category: str | None,
        note: str | None,
        player_guid: str | None,
    ) -> PenaAccountabilityResult: ...

    def delete_transaction_for_admin(
        self,
        *,
        pena_guid: str,
        admin_id: int,
        transaction_guid: str,
    ) -> PenaAccountabilityResult: ...

    def get_player_guid_by_account(self, *, account_id: int) -> str | None: ...
