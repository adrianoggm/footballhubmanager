from types import SimpleNamespace
from unittest.mock import Mock

import pytest
from core.domain.errors import (
    PenaAccountabilityAccessDeniedError,
    PenaAccountabilityExpenseNotFoundError,
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


def test_delete_expense_for_admin_maps_missing_expense():
    session = Mock()
    no_expense = Mock()
    no_expense.scalar_one_or_none.return_value = None
    session.execute.return_value = no_expense

    repository = SqlAlchemyPenaAccountabilityRepository(session)
    repository._lock_pena = lambda _pena_guid: SimpleNamespace(id=1, id_admin=10)

    with pytest.raises(PenaAccountabilityExpenseNotFoundError):
        repository.delete_expense_for_admin(
            pena_guid="pena-1",
            admin_id=10,
            expense_guid="expense-1",
        )

    session.rollback.assert_called_once()


def test_get_player_guid_by_account_returns_scalar():
    session = Mock()
    scalar_result = Mock()
    scalar_result.scalar_one_or_none.return_value = "player-guid"
    session.execute.return_value = scalar_result

    repository = SqlAlchemyPenaAccountabilityRepository(session)
    assert repository.get_player_guid_by_account(account_id=7) == "player-guid"
