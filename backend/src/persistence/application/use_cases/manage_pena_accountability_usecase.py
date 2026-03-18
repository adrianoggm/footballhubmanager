from dataclasses import dataclass
from datetime import date, datetime

from persistence.application.ports.pena_accountability_port import (
    PenaAccountabilityPort,
    PenaAccountabilityResult,
)
from persistence.application.ports.pena_accountability_port import (
    PenaExpenseNotFoundError as RepositoryPenaExpenseNotFoundError,
)
from persistence.application.ports.pena_accountability_port import (
    PenaMemberNotFoundError as RepositoryPenaMemberNotFoundError,
)
from persistence.application.ports.pena_accountability_port import (
    PenaNotFoundError as RepositoryPenaNotFoundError,
)
from persistence.application.ports.pena_accountability_port import (
    PenaNotManagedByAdminError as RepositoryPenaNotManagedByAdminError,
)

VISIBILITY_LEVELS = {"private", "summary", "full"}
DEFAULT_VISIBILITY = "summary"
DEFAULT_CURRENCY = "EUR"


@dataclass(frozen=True)
class PenaAccountabilityMemberAccountInfo:
    player_guid: str
    player_name: str
    debt_cents: int
    contribution_cents: int
    note: str | None
    updated_at: datetime | None


@dataclass(frozen=True)
class PenaAccountabilityExpenseInfo:
    guid: str
    title: str
    category: str | None
    amount_cents: int
    occurred_on: date
    note: str | None
    created_at: datetime | None
    updated_at: datetime | None


@dataclass(frozen=True)
class PenaAccountabilityInfo:
    currency: str
    balance_cents: int
    reserve_cents: int
    budget_visibility: str
    expenses_visibility: str
    member_accounts: list[PenaAccountabilityMemberAccountInfo]
    expenses: list[PenaAccountabilityExpenseInfo]
    updated_at: datetime | None
    total_debt_cents: int
    total_contribution_cents: int
    total_expenses_cents: int
    current_cash_cents: int
    projected_balance_cents: int
    expense_entries: int


@dataclass(frozen=True)
class PenaAccountabilitySettingsUpdate:
    currency: str | None = None
    balance_cents: int | None = None
    reserve_cents: int | None = None
    budget_visibility: str | None = None
    expenses_visibility: str | None = None


@dataclass(frozen=True)
class PenaAccountabilityMemberAccountUpsert:
    player_guid: str
    debt_cents: int
    contribution_cents: int
    note: str | None = None


@dataclass(frozen=True)
class PenaAccountabilityExpenseCreate:
    title: str
    category: str | None
    amount_cents: int
    occurred_on: date
    note: str | None = None


class PenaAccountabilityPenaNotFoundError(Exception):
    pass


class PenaAccountabilityAccessDeniedError(Exception):
    pass


class PenaAccountabilityMemberNotFoundError(Exception):
    pass


class PenaAccountabilityExpenseNotFoundError(Exception):
    pass


class InvalidPenaAccountabilityDataError(Exception):
    pass


class ManagePenaAccountabilityUseCase:
    def __init__(self, repository: PenaAccountabilityPort):
        self.repository = repository

    def get_for_pena(self, *, pena_guid: str) -> PenaAccountabilityInfo:
        try:
            result = self.repository.get_for_pena(pena_guid=pena_guid)
        except RepositoryPenaNotFoundError as exc:
            raise PenaAccountabilityPenaNotFoundError() from exc
        return self._to_info(result)

    def get_player_guid_for_account(self, *, account_id: int) -> str | None:
        if account_id <= 0:
            return None
        return self.repository.get_player_guid_by_account(account_id=account_id)

    def update_settings_for_admin(
        self,
        *,
        pena_guid: str,
        admin_id: int,
        update: PenaAccountabilitySettingsUpdate,
    ) -> PenaAccountabilityInfo:
        current = self.get_for_pena(pena_guid=pena_guid)
        currency = self._normalize_currency(update.currency, fallback=current.currency)
        balance_cents = self._normalize_amount(
            update.balance_cents,
            fallback=current.balance_cents,
            allow_negative=True,
        )
        reserve_cents = self._normalize_amount(
            update.reserve_cents,
            fallback=current.reserve_cents,
            allow_negative=False,
        )
        budget_visibility = self._normalize_visibility(
            update.budget_visibility,
            fallback=current.budget_visibility,
        )
        expenses_visibility = self._normalize_visibility(
            update.expenses_visibility,
            fallback=current.expenses_visibility,
        )
        try:
            result = self.repository.save_settings_for_admin(
                pena_guid=pena_guid,
                admin_id=admin_id,
                currency=currency,
                balance_cents=balance_cents,
                reserve_cents=reserve_cents,
                budget_visibility=budget_visibility,
                expenses_visibility=expenses_visibility,
            )
        except RepositoryPenaNotFoundError as exc:
            raise PenaAccountabilityPenaNotFoundError() from exc
        except RepositoryPenaNotManagedByAdminError as exc:
            raise PenaAccountabilityAccessDeniedError() from exc
        return self._to_info(result)

    def upsert_member_account_for_admin(
        self,
        *,
        pena_guid: str,
        admin_id: int,
        data: PenaAccountabilityMemberAccountUpsert,
    ) -> PenaAccountabilityInfo:
        player_guid = self._normalize_required_text(data.player_guid, max_length=64)
        debt_cents = self._normalize_amount(data.debt_cents, fallback=0, allow_negative=False)
        contribution_cents = self._normalize_amount(
            data.contribution_cents,
            fallback=0,
            allow_negative=False,
        )
        note = self._normalize_optional_text(data.note, max_length=255)
        try:
            result = self.repository.upsert_member_account_for_admin(
                pena_guid=pena_guid,
                admin_id=admin_id,
                player_guid=player_guid,
                debt_cents=debt_cents,
                contribution_cents=contribution_cents,
                note=note,
            )
        except RepositoryPenaNotFoundError as exc:
            raise PenaAccountabilityPenaNotFoundError() from exc
        except RepositoryPenaNotManagedByAdminError as exc:
            raise PenaAccountabilityAccessDeniedError() from exc
        except RepositoryPenaMemberNotFoundError as exc:
            raise PenaAccountabilityMemberNotFoundError() from exc
        return self._to_info(result)

    def remove_member_account_for_admin(
        self,
        *,
        pena_guid: str,
        admin_id: int,
        player_guid: str,
    ) -> PenaAccountabilityInfo:
        normalized_player_guid = self._normalize_required_text(player_guid, max_length=64)
        try:
            result = self.repository.delete_member_account_for_admin(
                pena_guid=pena_guid,
                admin_id=admin_id,
                player_guid=normalized_player_guid,
            )
        except RepositoryPenaNotFoundError as exc:
            raise PenaAccountabilityPenaNotFoundError() from exc
        except RepositoryPenaNotManagedByAdminError as exc:
            raise PenaAccountabilityAccessDeniedError() from exc
        except RepositoryPenaMemberNotFoundError as exc:
            raise PenaAccountabilityMemberNotFoundError() from exc
        return self._to_info(result)

    def create_expense_for_admin(
        self,
        *,
        pena_guid: str,
        admin_id: int,
        data: PenaAccountabilityExpenseCreate,
    ) -> PenaAccountabilityInfo:
        title = self._normalize_required_text(data.title, max_length=160)
        category = self._normalize_optional_text(data.category, max_length=80)
        amount_cents = self._normalize_amount(data.amount_cents, fallback=0, allow_negative=False)
        note = self._normalize_optional_text(data.note, max_length=255)
        if not isinstance(data.occurred_on, date):
            raise InvalidPenaAccountabilityDataError()
        try:
            result = self.repository.create_expense_for_admin(
                pena_guid=pena_guid,
                admin_id=admin_id,
                title=title,
                category=category,
                amount_cents=amount_cents,
                occurred_on=data.occurred_on,
                note=note,
            )
        except RepositoryPenaNotFoundError as exc:
            raise PenaAccountabilityPenaNotFoundError() from exc
        except RepositoryPenaNotManagedByAdminError as exc:
            raise PenaAccountabilityAccessDeniedError() from exc
        return self._to_info(result)

    def remove_expense_for_admin(
        self,
        *,
        pena_guid: str,
        admin_id: int,
        expense_guid: str,
    ) -> PenaAccountabilityInfo:
        normalized_expense_guid = self._normalize_required_text(expense_guid, max_length=64)
        try:
            result = self.repository.delete_expense_for_admin(
                pena_guid=pena_guid,
                admin_id=admin_id,
                expense_guid=normalized_expense_guid,
            )
        except RepositoryPenaNotFoundError as exc:
            raise PenaAccountabilityPenaNotFoundError() from exc
        except RepositoryPenaNotManagedByAdminError as exc:
            raise PenaAccountabilityAccessDeniedError() from exc
        except RepositoryPenaExpenseNotFoundError as exc:
            raise PenaAccountabilityExpenseNotFoundError() from exc
        return self._to_info(result)

    @staticmethod
    def _to_info(result: PenaAccountabilityResult) -> PenaAccountabilityInfo:
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
        current_cash_cents = (
            int(result.balance_cents) + total_contribution_cents - total_expenses_cents
        )
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

    @staticmethod
    def _normalize_required_text(value: str | None, *, max_length: int) -> str:
        normalized = str(value or "").strip()
        if not normalized or len(normalized) > max_length:
            raise InvalidPenaAccountabilityDataError()
        return normalized

    @staticmethod
    def _normalize_optional_text(value: str | None, *, max_length: int) -> str | None:
        if value is None:
            return None
        normalized = str(value).strip()
        if not normalized:
            return None
        if len(normalized) > max_length:
            raise InvalidPenaAccountabilityDataError()
        return normalized

    @staticmethod
    def _normalize_currency(value: str | None, *, fallback: str) -> str:
        if value is None:
            return fallback
        normalized = str(value).strip().upper()
        if not normalized:
            return fallback
        if len(normalized) > 12:
            raise InvalidPenaAccountabilityDataError()
        return normalized

    @staticmethod
    def _normalize_visibility(value: str | None, *, fallback: str) -> str:
        if value is None:
            return fallback
        normalized = str(value).strip().lower()
        if not normalized:
            return fallback
        if normalized not in VISIBILITY_LEVELS:
            raise InvalidPenaAccountabilityDataError()
        return normalized

    @staticmethod
    def _normalize_amount(
        value: int | None,
        *,
        fallback: int,
        allow_negative: bool,
    ) -> int:
        if value is None:
            return int(fallback)
        if not isinstance(value, int):
            raise InvalidPenaAccountabilityDataError()
        if not allow_negative and value < 0:
            raise InvalidPenaAccountabilityDataError()
        return value
