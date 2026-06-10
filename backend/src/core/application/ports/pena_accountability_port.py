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
class PenaAccountabilityExpenseResult:
    guid: str
    title: str
    category: str | None
    amount_cents: int
    occurred_on: date
    note: str | None
    created_at: datetime | None
    updated_at: datetime | None


@dataclass(frozen=True)
class PenaAccountabilityResult:
    currency: str
    balance_cents: int
    reserve_cents: int
    budget_visibility: str
    expenses_visibility: str
    member_accounts: list[PenaAccountabilityMemberAccountResult]
    expenses: list[PenaAccountabilityExpenseResult]
    updated_at: datetime | None


class PenaAccountabilityPort(Protocol):
    def get_for_pena(self, *, pena_guid: str) -> PenaAccountabilityResult: ...

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

    def create_expense_for_admin(
        self,
        *,
        pena_guid: str,
        admin_id: int,
        title: str,
        category: str | None,
        amount_cents: int,
        occurred_on: date,
        note: str | None,
    ) -> PenaAccountabilityResult: ...

    def delete_expense_for_admin(
        self,
        *,
        pena_guid: str,
        admin_id: int,
        expense_guid: str,
    ) -> PenaAccountabilityResult: ...

    def get_player_guid_by_account(self, *, account_id: int) -> str | None: ...
