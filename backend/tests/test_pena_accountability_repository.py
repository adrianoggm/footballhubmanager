from datetime import date
from types import SimpleNamespace
from unittest.mock import Mock

import pytest
from core.domain.errors import (
    PenaAccountabilityAccessDeniedError,
    PenaAccountabilityTransactionNotFoundError,
)
from persistence.infrastructure.repository.db.pena_accountability_repository import (
    SqlAlchemyPenaAccountabilityRepository,
)


def test_save_settings_for_admin_rejects_access_denied():
    session = Mock()
    repository = SqlAlchemyPenaAccountabilityRepository(session)
    repository._lock_pena = lambda _pena_guid: SimpleNamespace(id=1, id_admin=10)

    with pytest.raises(PenaAccountabilityAccessDeniedError):
        repository.save_settings_for_admin(
            pena_guid="pena-1",
            admin_id=99,
            currency="EUR",
            balance_cents=0,
            reserve_cents=0,
            budget_visibility="summary",
            expenses_visibility="summary",
        )

    session.rollback.assert_called_once()


def test_record_transaction_for_admin_rejects_access_denied():
    session = Mock()
    repository = SqlAlchemyPenaAccountabilityRepository(session)
    repository._lock_pena = lambda _pena_guid: SimpleNamespace(id=1, id_admin=10)

    with pytest.raises(PenaAccountabilityAccessDeniedError):
        repository.record_transaction_for_admin(
            pena_guid="pena-1",
            admin_id=99,
            type="income",
            amount_cents=1_000,
            concept="Fee",
            occurred_on=date(2026, 1, 1),
            entity=None,
            category=None,
            note=None,
            player_guid=None,
        )

    session.rollback.assert_called_once()


def test_delete_transaction_for_admin_maps_missing_transaction():
    session = Mock()
    no_transaction = Mock()
    no_transaction.scalar_one_or_none.return_value = None
    session.execute.return_value = no_transaction

    repository = SqlAlchemyPenaAccountabilityRepository(session)
    repository._lock_pena = lambda _pena_guid: SimpleNamespace(id=1, id_admin=10)

    with pytest.raises(PenaAccountabilityTransactionNotFoundError):
        repository.delete_transaction_for_admin(
            pena_guid="pena-1",
            admin_id=10,
            transaction_guid="tx-1",
        )

    session.rollback.assert_called_once()


def test_apply_income_to_member_reduces_debt_and_adds_contribution():
    session = Mock()
    account = SimpleNamespace(debt_cents=3_000, contribution_cents=2_000)
    lookup = Mock()
    lookup.scalar_one_or_none.return_value = account
    session.execute.return_value = lookup

    repository = SqlAlchemyPenaAccountabilityRepository(session)
    repository._apply_income_to_member(pena_id=1, player_id=2, amount_cents=1_000)

    assert account.contribution_cents == 3_000
    assert account.debt_cents == 2_000


def test_apply_income_to_member_floors_debt_at_zero():
    session = Mock()
    account = SimpleNamespace(debt_cents=500, contribution_cents=0)
    lookup = Mock()
    lookup.scalar_one_or_none.return_value = account
    session.execute.return_value = lookup

    repository = SqlAlchemyPenaAccountabilityRepository(session)
    repository._apply_income_to_member(pena_id=1, player_id=2, amount_cents=1_000)

    assert account.debt_cents == 0
    assert account.contribution_cents == 1_000


def test_reverse_income_from_member_restores_debt():
    session = Mock()
    account = SimpleNamespace(debt_cents=0, contribution_cents=1_000)
    lookup = Mock()
    lookup.scalar_one_or_none.return_value = account
    session.execute.return_value = lookup

    repository = SqlAlchemyPenaAccountabilityRepository(session)
    repository._reverse_income_from_member(pena_id=1, player_id=2, amount_cents=1_000)

    assert account.contribution_cents == 0
    assert account.debt_cents == 1_000


def test_get_player_guid_by_account_returns_scalar():
    session = Mock()
    scalar_result = Mock()
    scalar_result.scalar_one_or_none.return_value = "player-guid"
    session.execute.return_value = scalar_result

    repository = SqlAlchemyPenaAccountabilityRepository(session)
    assert repository.get_player_guid_by_account(account_id=7) == "player-guid"
