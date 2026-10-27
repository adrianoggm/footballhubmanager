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
    repository._reverse_income_from_member(
        pena_id=1, player_id=2, amount_cents=1_000, debt_applied_cents=1_000
    )

    assert account.contribution_cents == 0
    assert account.debt_cents == 1_000


def _repository_over(account):
    session = Mock()
    lookup = Mock()
    lookup.scalar_one_or_none.return_value = account
    session.execute.return_value = lookup
    return SqlAlchemyPenaAccountabilityRepository(session), session


def test_overpayment_then_delete_does_not_create_phantom_debt():
    """MO-02: owes 60, pays 50 then 30 (clamped to 0), deleting the 30 leaves 10 owed."""
    account = SimpleNamespace(debt_cents=6_000, contribution_cents=0)
    repository, _session = _repository_over(account)

    first = repository._apply_income_to_member(pena_id=1, player_id=2, amount_cents=5_000)
    second = repository._apply_income_to_member(pena_id=1, player_id=2, amount_cents=3_000)
    assert (first, second) == (5_000, 1_000)
    assert account.debt_cents == 0
    assert account.contribution_cents == 8_000

    repository._reverse_income_from_member(
        pena_id=1, player_id=2, amount_cents=3_000, debt_applied_cents=second
    )

    assert account.debt_cents == 1_000
    assert account.contribution_cents == 5_000


def test_record_transaction_stores_debt_actually_applied():
    session = Mock()
    repository = SqlAlchemyPenaAccountabilityRepository(session)
    repository._lock_pena = lambda _pena_guid: SimpleNamespace(id=1, id_admin=10)
    repository._get_member_player_for_pena = lambda **_kw: SimpleNamespace(id=2)
    repository._apply_income_to_member = lambda **_kw: 1_000
    repository._build_result = lambda **_kw: "result"

    repository.record_transaction_for_admin(
        pena_guid="pena-1",
        admin_id=10,
        type="income",
        amount_cents=3_000,
        concept="Fee",
        occurred_on=date(2026, 1, 1),
        entity=None,
        category=None,
        note=None,
        player_guid="player-1",
    )

    transaction = session.add.call_args.args[0]
    assert transaction.debt_applied_cents == 1_000


def test_delete_transaction_reverses_only_the_applied_debt():
    session = Mock()
    transaction = SimpleNamespace(
        type="income", id_player=2, amount_cents=3_000, debt_applied_cents=1_000
    )
    lookup = Mock()
    lookup.scalar_one_or_none.return_value = transaction
    session.execute.return_value = lookup
    repository = SqlAlchemyPenaAccountabilityRepository(session)
    repository._lock_pena = lambda _pena_guid: SimpleNamespace(id=1, id_admin=10)
    repository._build_result = lambda **_kw: "result"
    calls = []
    repository._reverse_income_from_member = lambda **kwargs: calls.append(kwargs)

    repository.delete_transaction_for_admin(pena_guid="pena-1", admin_id=10, transaction_guid="tx")

    assert calls == [
        {"pena_id": 1, "player_id": 2, "amount_cents": 3_000, "debt_applied_cents": 1_000}
    ]


def test_get_player_guid_by_account_returns_scalar():
    session = Mock()
    scalar_result = Mock()
    scalar_result.scalar_one_or_none.return_value = "player-guid"
    session.execute.return_value = scalar_result

    repository = SqlAlchemyPenaAccountabilityRepository(session)
    assert repository.get_player_guid_by_account(account_id=7) == "player-guid"
