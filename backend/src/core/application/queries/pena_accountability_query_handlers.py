"""Handlers de lectura de accountability + ensamblado del read-model con totales."""

from __future__ import annotations

from core.application.models import (
    PenaAccountabilityExpenseInfo,
    PenaAccountabilityInfo,
    PenaAccountabilityMemberAccountInfo,
)
from core.application.ports.pena_accountability_port import (
    PenaAccountabilityPort,
    PenaAccountabilityResult,
)
from core.application.queries.pena_accountability_queries import (
    GetPenaAccountabilityQuery,
    GetPlayerGuidForAccountQuery,
)


def to_accountability_info(result: PenaAccountabilityResult) -> PenaAccountabilityInfo:
    members = [
        PenaAccountabilityMemberAccountInfo(
            player_guid=item.player_guid,
            player_name=item.player_name,
            debt_cents=int(item.debt_cents),
            contribution_cents=int(item.contribution_cents),
            note=item.note,
            updated_at=item.updated_at,
        )
        for item in result.member_accounts
    ]
    expenses = [
        PenaAccountabilityExpenseInfo(
            guid=item.guid,
            title=item.title,
            category=item.category,
            amount_cents=int(item.amount_cents),
            occurred_on=item.occurred_on,
            note=item.note,
            created_at=item.created_at,
            updated_at=item.updated_at,
        )
        for item in result.expenses
    ]

    total_debt_cents = sum(item.debt_cents for item in members)
    total_contribution_cents = sum(item.contribution_cents for item in members)
    total_expenses_cents = sum(item.amount_cents for item in expenses)
    current_cash_cents = int(result.balance_cents) + total_contribution_cents - total_expenses_cents
    projected_balance_cents = current_cash_cents + total_debt_cents

    return PenaAccountabilityInfo(
        currency=result.currency,
        balance_cents=int(result.balance_cents),
        reserve_cents=int(result.reserve_cents),
        budget_visibility=result.budget_visibility,
        expenses_visibility=result.expenses_visibility,
        member_accounts=members,
        expenses=expenses,
        updated_at=result.updated_at,
        total_debt_cents=total_debt_cents,
        total_contribution_cents=total_contribution_cents,
        total_expenses_cents=total_expenses_cents,
        current_cash_cents=current_cash_cents,
        projected_balance_cents=projected_balance_cents,
        expense_entries=len(expenses),
    )


class GetPenaAccountabilityHandler:
    def __init__(self, repository: PenaAccountabilityPort) -> None:
        self._repository = repository

    def handle(self, query: GetPenaAccountabilityQuery) -> PenaAccountabilityInfo:
        return to_accountability_info(self._repository.get_for_pena(pena_guid=query.pena_guid))


class GetPlayerGuidForAccountHandler:
    def __init__(self, repository: PenaAccountabilityPort) -> None:
        self._repository = repository

    def handle(self, query: GetPlayerGuidForAccountQuery) -> str | None:
        if query.account_id <= 0:
            return None
        return self._repository.get_player_guid_by_account(account_id=query.account_id)
