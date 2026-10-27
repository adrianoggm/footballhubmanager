"""What each viewer may see of a pena's accountability.

Admins see everything. Members see what the pena's transparency settings expose:

* budget ``summary`` -> income totals, fees, dues, opening balance, reserve.
* budget ``full`` -> plus the per-member breakdown and income ledger rows.
* expenses ``summary`` -> expense totals (overall and per month).
* expenses ``full`` -> plus expense ledger rows.

Anything that lets a hidden figure be derived is hidden too: the balance
(opening + income - expenses) and its trend need both budget and expense totals,
otherwise ``balance - income`` would reveal private expenses. Admin notes are
internal and never reach members.
"""

from __future__ import annotations

from dataclasses import dataclass
from enum import Enum

TRANSACTION_TYPES = ("income", "expense")
SUMMARY_LEVELS = frozenset({"summary", "full"})


class AccountabilityViewer(str, Enum):
    ADMIN = "admin"
    MEMBER = "member"


class TransactionTypeScope(str, Enum):
    """Which ledger rows a listing returns."""

    ALL = "all"
    INCOME = "income"
    EXPENSE = "expense"
    NONE = "none"

    @property
    def type_filter(self) -> str | None:
        """Repository filter for this scope (None = every type). Not valid for NONE."""
        if self is TransactionTypeScope.NONE:
            raise ValueError("TransactionTypeScope.NONE lists nothing; skip the query")
        return None if self is TransactionTypeScope.ALL else self.value


@dataclass(frozen=True)
class AccountabilityAccess:
    budget_summary: bool
    budget_details: bool
    expenses_summary: bool
    expenses_details: bool
    admin_notes: bool

    @classmethod
    def for_viewer(
        cls,
        viewer: AccountabilityViewer,
        *,
        budget_visibility: str,
        expenses_visibility: str,
    ) -> AccountabilityAccess:
        if viewer is AccountabilityViewer.ADMIN:
            return cls(
                budget_summary=True,
                budget_details=True,
                expenses_summary=True,
                expenses_details=True,
                admin_notes=True,
            )
        return cls(
            budget_summary=budget_visibility in SUMMARY_LEVELS,
            budget_details=budget_visibility == "full",
            expenses_summary=expenses_visibility in SUMMARY_LEVELS,
            expenses_details=expenses_visibility == "full",
            admin_notes=False,
        )

    @property
    def balance(self) -> bool:
        """Balance/trend combine income and expenses, so both must be visible."""
        return self.budget_summary and self.expenses_summary

    @property
    def cashflow(self) -> bool:
        return self.budget_summary or self.expenses_summary

    def transaction_scope(self, requested_type: str | None) -> TransactionTypeScope:
        """Ledger scope for a listing request.

        No (or an unknown) requested type lists every visible type. A specific
        type the viewer may not see lists nothing instead of silently returning
        a different type.
        """
        visible = {
            "income": self.budget_details,
            "expense": self.expenses_details,
        }
        if requested_type in TRANSACTION_TYPES:
            return (
                TransactionTypeScope(requested_type)
                if visible[requested_type]
                else TransactionTypeScope.NONE
            )
        if visible["income"] and visible["expense"]:
            return TransactionTypeScope.ALL
        if visible["income"]:
            return TransactionTypeScope.INCOME
        if visible["expense"]:
            return TransactionTypeScope.EXPENSE
        return TransactionTypeScope.NONE
