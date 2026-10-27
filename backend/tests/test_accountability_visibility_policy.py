import pytest
from core.application.policies.accountability_visibility_policy import (
    AccountabilityAccess,
    AccountabilityViewer,
    TransactionTypeScope,
)


def _member(budget: str, expenses: str) -> AccountabilityAccess:
    return AccountabilityAccess.for_viewer(
        AccountabilityViewer.MEMBER,
        budget_visibility=budget,
        expenses_visibility=expenses,
    )


def test_admin_sees_everything_regardless_of_settings():
    access = AccountabilityAccess.for_viewer(
        AccountabilityViewer.ADMIN,
        budget_visibility="private",
        expenses_visibility="private",
    )
    assert access.balance
    assert access.admin_notes
    assert access.transaction_scope(None) is TransactionTypeScope.ALL
    assert access.transaction_scope("expense") is TransactionTypeScope.EXPENSE


def test_member_never_sees_admin_notes():
    assert not _member("full", "full").admin_notes


@pytest.mark.parametrize(
    ("budget", "expenses", "balance_visible"),
    [
        ("full", "private", False),
        ("private", "full", False),
        ("summary", "summary", True),
        ("full", "full", True),
    ],
)
def test_balance_needs_both_income_and_expense_totals(budget, expenses, balance_visible):
    assert _member(budget, expenses).balance is balance_visible


def test_cashflow_visible_when_either_side_is_shared():
    assert _member("private", "summary").cashflow
    assert _member("summary", "private").cashflow
    assert not _member("private", "private").cashflow


@pytest.mark.parametrize(
    ("budget", "expenses", "requested", "expected"),
    [
        ("full", "full", None, TransactionTypeScope.ALL),
        ("full", "full", "expense", TransactionTypeScope.EXPENSE),
        ("full", "full", "bogus", TransactionTypeScope.ALL),
        ("full", "summary", None, TransactionTypeScope.INCOME),
        ("full", "summary", "expense", TransactionTypeScope.NONE),
        ("summary", "full", None, TransactionTypeScope.EXPENSE),
        ("summary", "full", "income", TransactionTypeScope.NONE),
        ("summary", "summary", None, TransactionTypeScope.NONE),
    ],
)
def test_member_transaction_scope(budget, expenses, requested, expected):
    assert _member(budget, expenses).transaction_scope(requested) is expected


def test_scope_type_filter():
    assert TransactionTypeScope.ALL.type_filter is None
    assert TransactionTypeScope.INCOME.type_filter == "income"
    with pytest.raises(ValueError):
        _ = TransactionTypeScope.NONE.type_filter
