"""Handlers de escritura de accountability (settings, miembros, transacciones)."""

from __future__ import annotations

from datetime import date

from core.application.commands.pena_accountability_commands import (
    RecordTransactionCommand,
    RemoveMemberAccountCommand,
    RemoveTransactionCommand,
    UpdateAccountabilitySettingsCommand,
    UpsertMemberAccountCommand,
)
from core.application.models import PenaAccountabilityInfo
from core.application.policies import AmountSignPolicy
from core.application.ports.pena_accountability_port import PenaAccountabilityPort
from core.application.queries.pena_accountability_query_handlers import to_accountability_info
from core.domain.errors import InvalidPenaAccountabilityDataError

VISIBILITY_LEVELS = {"private", "summary", "full"}
TRANSACTION_TYPES = {"income", "expense"}


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
                fallback=current.opening_balance_cents,
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


class RecordTransactionHandler:
    def __init__(self, repository: PenaAccountabilityPort) -> None:
        self._repository = repository

    def handle(self, command: RecordTransactionCommand) -> PenaAccountabilityInfo:
        if not isinstance(command.occurred_on, date):
            raise InvalidPenaAccountabilityDataError()
        transaction_type = str(command.type or "").strip().lower()
        if transaction_type not in TRANSACTION_TYPES:
            raise InvalidPenaAccountabilityDataError()
        player_guid = _optional_text(command.player_guid, max_length=64)
        # A member link only makes sense for income (a member paying dues).
        if transaction_type != "income":
            player_guid = None
        result = self._repository.record_transaction_for_admin(
            pena_guid=command.pena_guid,
            admin_id=command.admin_id,
            type=transaction_type,
            amount_cents=_amount(
                command.amount_cents, fallback=0, sign_policy=AmountSignPolicy.REQUIRE_NON_NEGATIVE
            ),
            concept=_required_text(command.concept, max_length=160),
            occurred_on=command.occurred_on,
            entity=_optional_text(command.entity, max_length=160),
            category=_optional_text(command.category, max_length=80),
            note=_optional_text(command.note, max_length=255),
            player_guid=player_guid,
        )
        return to_accountability_info(result)


class RemoveTransactionHandler:
    def __init__(self, repository: PenaAccountabilityPort) -> None:
        self._repository = repository

    def handle(self, command: RemoveTransactionCommand) -> PenaAccountabilityInfo:
        result = self._repository.delete_transaction_for_admin(
            pena_guid=command.pena_guid,
            admin_id=command.admin_id,
            transaction_guid=_required_text(command.transaction_guid, max_length=64),
        )
        return to_accountability_info(result)
