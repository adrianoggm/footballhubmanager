"""Handlers de lectura de accountability + ensamblado del read-model con KPIs."""

from __future__ import annotations

from datetime import date

from core.application.models import (
    PenaAccountabilityInfo,
    PenaAccountabilityMemberAccountInfo,
    PenaMonthlyCashflowInfo,
    PenaTransactionInfo,
    PenaTransactionPage,
)
from core.application.ports.pena_accountability_port import (
    PenaAccountabilityPort,
    PenaAccountabilityResult,
)
from core.application.queries.pena_accountability_queries import (
    GetPenaAccountabilityQuery,
    GetPlayerGuidForAccountQuery,
    ListPenaTransactionsQuery,
)

MAX_TRANSACTION_PAGE_SIZE = 50
VALID_TYPE_FILTERS = {"income", "expense"}


def _balance_trend_pct(
    *, total_balance: int, monthly: list[PenaMonthlyCashflowInfo], today: date
) -> float | None:
    """Balance now vs balance at the end of last month, in percent.

    The previous balance is today's balance minus this calendar month's net flow.
    A non-positive previous balance has no meaningful percentage -> None.
    """
    this_month_net = sum(
        item.income_cents - item.expense_cents
        for item in monthly
        if item.year == today.year and item.month == today.month
    )
    previous_balance = total_balance - this_month_net
    if previous_balance <= 0:
        return None
    return round(this_month_net / previous_balance * 100, 1)


def to_accountability_info(
    result: PenaAccountabilityResult, *, today: date | None = None
) -> PenaAccountabilityInfo:
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
    monthly = [
        PenaMonthlyCashflowInfo(
            year=int(item.year),
            month=int(item.month),
            income_cents=int(item.income_cents),
            expense_cents=int(item.expense_cents),
        )
        for item in result.monthly_cashflow
    ]

    total_income = int(result.total_income_cents)
    total_expense = int(result.total_expense_cents)
    total_balance = int(result.opening_balance_cents) + total_income - total_expense

    total_debt = sum(item.debt_cents for item in members)
    total_contribution = sum(item.contribution_cents for item in members)

    balance_trend_pct = _balance_trend_pct(
        total_balance=total_balance, monthly=monthly, today=today or date.today()
    )

    collected_base = total_contribution + total_debt
    membership_collected_pct = (
        round(total_contribution / collected_base * 100, 1) if collected_base else None
    )

    members_pending_count = sum(1 for item in members if item.debt_cents > 0)

    return PenaAccountabilityInfo(
        currency=result.currency,
        opening_balance_cents=int(result.opening_balance_cents),
        reserve_cents=int(result.reserve_cents),
        budget_visibility=result.budget_visibility,
        expenses_visibility=result.expenses_visibility,
        member_accounts=members,
        monthly_cashflow=monthly,
        updated_at=result.updated_at,
        total_income_cents=total_income,
        total_expense_cents=total_expense,
        total_balance_cents=total_balance,
        balance_trend_pct=balance_trend_pct,
        total_debt_cents=total_debt,
        total_contribution_cents=total_contribution,
        membership_fees_cents=total_contribution,
        membership_collected_pct=membership_collected_pct,
        expenses_this_month_count=int(result.expenses_this_month_count),
        members_pending_count=members_pending_count,
    )


class GetPenaAccountabilityHandler:
    def __init__(self, repository: PenaAccountabilityPort) -> None:
        self._repository = repository

    def handle(self, query: GetPenaAccountabilityQuery) -> PenaAccountabilityInfo:
        return to_accountability_info(self._repository.get_for_pena(pena_guid=query.pena_guid))


class ListPenaTransactionsHandler:
    def __init__(self, repository: PenaAccountabilityPort) -> None:
        self._repository = repository

    def handle(self, query: ListPenaTransactionsQuery) -> PenaTransactionPage:
        page = max(int(query.page), 1)
        page_size = min(max(int(query.page_size), 1), MAX_TRANSACTION_PAGE_SIZE)
        type_filter = query.type_filter if query.type_filter in VALID_TYPE_FILTERS else None
        result = self._repository.list_transactions_for_pena(
            pena_guid=query.pena_guid,
            page=page,
            page_size=page_size,
            type_filter=type_filter,
        )
        items = [
            PenaTransactionInfo(
                guid=item.guid,
                type=item.type,
                amount_cents=int(item.amount_cents),
                entity=item.entity,
                concept=item.concept,
                category=item.category,
                note=item.note,
                occurred_on=item.occurred_on,
                player_guid=item.player_guid,
                player_name=item.player_name,
                created_at=item.created_at,
                updated_at=item.updated_at,
            )
            for item in result.items
        ]
        return PenaTransactionPage(
            items=items,
            page=page,
            page_size=page_size,
            total=int(result.total),
        )


class GetPlayerGuidForAccountHandler:
    def __init__(self, repository: PenaAccountabilityPort) -> None:
        self._repository = repository

    def handle(self, query: GetPlayerGuidForAccountQuery) -> str | None:
        if query.account_id <= 0:
            return None
        return self._repository.get_player_guid_by_account(account_id=query.account_id)
