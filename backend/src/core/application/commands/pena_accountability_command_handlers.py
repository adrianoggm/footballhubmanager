"""Handlers de escritura de accountability (settings, miembros, gastos)."""

from __future__ import annotations

from datetime import date

from core.application.commands.pena_accountability_commands import (
    CreateExpenseCommand,
    RemoveExpenseCommand,
    RemoveMemberAccountCommand,
    UpdateAccountabilitySettingsCommand,
    UpsertMemberAccountCommand,
)
from core.application.models import PenaAccountabilityInfo
from core.application.policies import AmountSignPolicy
from core.application.ports.pena_accountability_port import PenaAccountabilityPort
from core.application.queries.pena_accountability_query_handlers import to_accountability_info
from core.domain.errors import InvalidPenaAccountabilityDataError

VISIBILITY_LEVELS = {"private", "summary", "full"}


def _required_text(value: str | None, *, max_length: int) -> str:
    normalized = str(value or "").strip()
    if not normalized or len(normalized) > max_length:
        raise InvalidPenaAccountabilityDataError()
    return normalized


def _optional_text(value: str | None, *, max_length: int) -> str | None:
    if value is None:
        return None
    normalized = str(value).strip()
    if not normalized:
        return None
    if len(normalized) > max_length:
        raise InvalidPenaAccountabilityDataError()
    return normalized


def _currency(value: str | None, *, fallback: str) -> str:
    if value is None:
        return fallback
    normalized = str(value).strip().upper()
    if not normalized:
        return fallback
    if len(normalized) > 12:
        raise InvalidPenaAccountabilityDataError()
    return normalized


def _visibility(value: str | None, *, fallback: str) -> str:
    if value is None:
        return fallback
    normalized = str(value).strip().lower()
    if not normalized:
        return fallback
    if normalized not in VISIBILITY_LEVELS:
        raise InvalidPenaAccountabilityDataError()
    return normalized


def _amount(value: int | None, *, fallback: int, sign_policy: AmountSignPolicy) -> int:
    if value is None:
        return int(fallback)
    if not isinstance(value, int):
        raise InvalidPenaAccountabilityDataError()
    if sign_policy is AmountSignPolicy.REQUIRE_NON_NEGATIVE and value < 0:
        raise InvalidPenaAccountabilityDataError()
    return value


class UpdateAccountabilitySettingsHandler:
    def __init__(self, repository: PenaAccountabilityPort) -> None:
        self._repository = repository

    def handle(self, command: UpdateAccountabilitySettingsCommand) -> PenaAccountabilityInfo:
        current = to_accountability_info(self._repository.get_for_pena(pena_guid=command.pena_guid))
        result = self._repository.save_settings_for_admin(
            pena_guid=command.pena_guid,
            admin_id=command.admin_id,
            currency=_currency(command.currency, fallback=current.currency),
            balance_cents=_amount(
                command.balance_cents,
                fallback=current.balance_cents,
                sign_policy=AmountSignPolicy.ALLOW_NEGATIVE,
            ),
            reserve_cents=_amount(
                command.reserve_cents,
                fallback=current.reserve_cents,
                sign_policy=AmountSignPolicy.REQUIRE_NON_NEGATIVE,
            ),
            budget_visibility=_visibility(
                command.budget_visibility, fallback=current.budget_visibility
            ),
            expenses_visibility=_visibility(
                command.expenses_visibility, fallback=current.expenses_visibility
            ),
        )
        return to_accountability_info(result)


class UpsertMemberAccountHandler:
    def __init__(self, repository: PenaAccountabilityPort) -> None:
        self._repository = repository

    def handle(self, command: UpsertMemberAccountCommand) -> PenaAccountabilityInfo:
        result = self._repository.upsert_member_account_for_admin(
            pena_guid=command.pena_guid,
            admin_id=command.admin_id,
            player_guid=_required_text(command.player_guid, max_length=64),
            debt_cents=_amount(
                command.debt_cents, fallback=0, sign_policy=AmountSignPolicy.REQUIRE_NON_NEGATIVE
            ),
            contribution_cents=_amount(
                command.contribution_cents,
                fallback=0,
                sign_policy=AmountSignPolicy.REQUIRE_NON_NEGATIVE,
            ),
            note=_optional_text(command.note, max_length=255),
        )
        return to_accountability_info(result)


class RemoveMemberAccountHandler:
    def __init__(self, repository: PenaAccountabilityPort) -> None:
        self._repository = repository

    def handle(self, command: RemoveMemberAccountCommand) -> PenaAccountabilityInfo:
        result = self._repository.delete_member_account_for_admin(
            pena_guid=command.pena_guid,
            admin_id=command.admin_id,
            player_guid=_required_text(command.player_guid, max_length=64),
        )
        return to_accountability_info(result)


class CreateExpenseHandler:
    def __init__(self, repository: PenaAccountabilityPort) -> None:
        self._repository = repository

    def handle(self, command: CreateExpenseCommand) -> PenaAccountabilityInfo:
        if not isinstance(command.occurred_on, date):
            raise InvalidPenaAccountabilityDataError()
        result = self._repository.create_expense_for_admin(
            pena_guid=command.pena_guid,
            admin_id=command.admin_id,
            title=_required_text(command.title, max_length=160),
            category=_optional_text(command.category, max_length=80),
            amount_cents=_amount(
                command.amount_cents, fallback=0, sign_policy=AmountSignPolicy.REQUIRE_NON_NEGATIVE
            ),
            occurred_on=command.occurred_on,
            note=_optional_text(command.note, max_length=255),
        )
        return to_accountability_info(result)


class RemoveExpenseHandler:
    def __init__(self, repository: PenaAccountabilityPort) -> None:
        self._repository = repository

    def handle(self, command: RemoveExpenseCommand) -> PenaAccountabilityInfo:
        result = self._repository.delete_expense_for_admin(
            pena_guid=command.pena_guid,
            admin_id=command.admin_id,
            expense_guid=_required_text(command.expense_guid, max_length=64),
        )
        return to_accountability_info(result)
