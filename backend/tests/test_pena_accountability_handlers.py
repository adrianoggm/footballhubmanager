from dataclasses import dataclass
from datetime import date, datetime

import pytest
from core.application.commands.pena_accountability_command_handlers import (
    CreateExpenseHandler,
    RemoveExpenseHandler,
    RemoveMemberAccountHandler,
    UpdateAccountabilitySettingsHandler,
    UpsertMemberAccountHandler,
)
from core.application.commands.pena_accountability_commands import (
    CreateExpenseCommand,
    RemoveExpenseCommand,
    RemoveMemberAccountCommand,
    UpdateAccountabilitySettingsCommand,
    UpsertMemberAccountCommand,
)
from core.application.ports.pena_accountability_port import (
    PenaAccountabilityExpenseResult,
    PenaAccountabilityMemberAccountResult,
    PenaAccountabilityResult,
)
from core.application.queries.pena_accountability_queries import (
    GetPenaAccountabilityQuery,
    GetPlayerGuidForAccountQuery,
)
from core.application.queries.pena_accountability_query_handlers import (
    GetPenaAccountabilityHandler,
    GetPlayerGuidForAccountHandler,
)
from core.domain.errors import (
    InvalidPenaAccountabilityDataError,
    PenaAccountabilityAccessDeniedError,
    PenaAccountabilityExpenseNotFoundError,
    PenaAccountabilityMemberNotFoundError,
    PenaAccountabilityPenaNotFoundError,
)


@dataclass
class _FakeRepo:
    should_raise_not_found: bool = False
    should_raise_access_denied: bool = False
    should_raise_member_not_found: bool = False
    should_raise_expense_not_found: bool = False
    last_call: dict | None = None

    @staticmethod
    def _sample_result() -> PenaAccountabilityResult:
        return PenaAccountabilityResult(
            currency="EUR",
            balance_cents=10_000,
            reserve_cents=5_000,
            budget_visibility="summary",
            expenses_visibility="full",
            member_accounts=[
                PenaAccountabilityMemberAccountResult(
                    player_guid="player-1",
                    player_name="Ana",
                    debt_cents=3_000,
                    contribution_cents=2_000,
                    note="first",
                    updated_at=datetime(2026, 1, 1, 10, 0, 0),
                ),
                PenaAccountabilityMemberAccountResult(
                    player_guid="player-2",
                    player_name="Luis",
                    debt_cents=1_000,
                    contribution_cents=500,
                    note=None,
                    updated_at=datetime(2026, 1, 2, 12, 0, 0),
                ),
            ],
            expenses=[
                PenaAccountabilityExpenseResult(
                    guid="exp-1",
                    title="Balls",
                    category="equipment",
                    amount_cents=1_200,
                    occurred_on=date(2026, 1, 4),
                    note=None,
                    created_at=datetime(2026, 1, 4, 10, 0, 0),
                    updated_at=datetime(2026, 1, 4, 10, 0, 0),
                )
            ],
            updated_at=datetime(2026, 1, 5, 9, 0, 0),
        )

    def get_for_pena(self, *, pena_guid: str) -> PenaAccountabilityResult:
        if self.should_raise_not_found:
            raise PenaAccountabilityPenaNotFoundError()
        return self._sample_result()

    def get_player_guid_by_account(self, *, account_id: int) -> str | None:
        return "player-1" if account_id == 77 else None

    def save_settings_for_admin(self, **kwargs) -> PenaAccountabilityResult:
        if self.should_raise_not_found:
            raise PenaAccountabilityPenaNotFoundError()
        if self.should_raise_access_denied:
            raise PenaAccountabilityAccessDeniedError()
        self.last_call = kwargs
        return self._sample_result()

    def upsert_member_account_for_admin(self, **kwargs) -> PenaAccountabilityResult:
        if self.should_raise_not_found:
            raise PenaAccountabilityPenaNotFoundError()
        if self.should_raise_access_denied:
            raise PenaAccountabilityAccessDeniedError()
        if self.should_raise_member_not_found:
            raise PenaAccountabilityMemberNotFoundError()
        self.last_call = kwargs
        return self._sample_result()

    def delete_member_account_for_admin(self, **kwargs) -> PenaAccountabilityResult:
        if self.should_raise_not_found:
            raise PenaAccountabilityPenaNotFoundError()
        if self.should_raise_access_denied:
            raise PenaAccountabilityAccessDeniedError()
        if self.should_raise_member_not_found:
            raise PenaAccountabilityMemberNotFoundError()
        self.last_call = kwargs
        return self._sample_result()

    def create_expense_for_admin(self, **kwargs) -> PenaAccountabilityResult:
        if self.should_raise_not_found:
            raise PenaAccountabilityPenaNotFoundError()
        if self.should_raise_access_denied:
            raise PenaAccountabilityAccessDeniedError()
        self.last_call = kwargs
        return self._sample_result()

    def delete_expense_for_admin(self, **kwargs) -> PenaAccountabilityResult:
        if self.should_raise_not_found:
            raise PenaAccountabilityPenaNotFoundError()
        if self.should_raise_access_denied:
            raise PenaAccountabilityAccessDeniedError()
        if self.should_raise_expense_not_found:
            raise PenaAccountabilityExpenseNotFoundError()
        self.last_call = kwargs
        return self._sample_result()


def test_get_handler_computes_totals():
    result = GetPenaAccountabilityHandler(_FakeRepo()).handle(
        GetPenaAccountabilityQuery(pena_guid="pena-guid")
    )

    assert result.total_debt_cents == 4_000
    assert result.total_contribution_cents == 2_500
    assert result.total_expenses_cents == 1_200
    assert result.current_cash_cents == 11_300
    assert result.projected_balance_cents == 15_300
    assert result.expense_entries == 1


def test_get_handler_propagates_not_found():
    with pytest.raises(PenaAccountabilityPenaNotFoundError):
        GetPenaAccountabilityHandler(_FakeRepo(should_raise_not_found=True)).handle(
            GetPenaAccountabilityQuery(pena_guid="pena-guid")
        )


def test_get_player_guid_handler_handles_non_positive_ids():
    handler = GetPlayerGuidForAccountHandler(_FakeRepo())
    assert handler.handle(GetPlayerGuidForAccountQuery(account_id=0)) is None
    assert handler.handle(GetPlayerGuidForAccountQuery(account_id=-3)) is None
    assert handler.handle(GetPlayerGuidForAccountQuery(account_id=77)) == "player-1"


def test_update_settings_normalizes_currency_and_visibility():
    repo = _FakeRepo()
    UpdateAccountabilitySettingsHandler(repo).handle(
        UpdateAccountabilitySettingsCommand(
            pena_guid="pena-guid",
            admin_id=3,
            currency=" usd ",
            balance_cents=777,
            reserve_cents=0,
            budget_visibility="full",
            expenses_visibility="summary",
        )
    )

    assert repo.last_call["currency"] == "USD"
    assert repo.last_call["budget_visibility"] == "full"
    assert repo.last_call["expenses_visibility"] == "summary"
    assert repo.last_call["balance_cents"] == 777


def test_update_settings_allows_negative_balance():
    repo = _FakeRepo()
    UpdateAccountabilitySettingsHandler(repo).handle(
        UpdateAccountabilitySettingsCommand(pena_guid="pena-guid", admin_id=3, balance_cents=-250)
    )
    assert repo.last_call["balance_cents"] == -250


def test_update_settings_rejects_negative_reserve():
    with pytest.raises(InvalidPenaAccountabilityDataError):
        UpdateAccountabilitySettingsHandler(_FakeRepo()).handle(
            UpdateAccountabilitySettingsCommand(pena_guid="pena-guid", admin_id=3, reserve_cents=-1)
        )


def test_update_settings_uses_current_values_as_fallbacks():
    repo = _FakeRepo()
    UpdateAccountabilitySettingsHandler(repo).handle(
        UpdateAccountabilitySettingsCommand(
            pena_guid="pena-guid",
            admin_id=3,
            currency=" ",
            budget_visibility=" ",
            expenses_visibility=None,
        )
    )

    assert repo.last_call["currency"] == "EUR"
    assert repo.last_call["budget_visibility"] == "summary"
    assert repo.last_call["expenses_visibility"] == "full"
    assert repo.last_call["balance_cents"] == 10_000
    assert repo.last_call["reserve_cents"] == 5_000


def test_update_settings_propagates_not_found_and_denied():
    with pytest.raises(PenaAccountabilityPenaNotFoundError):
        UpdateAccountabilitySettingsHandler(_FakeRepo(should_raise_not_found=True)).handle(
            UpdateAccountabilitySettingsCommand(pena_guid="pena-guid", admin_id=1, balance_cents=1)
        )
    with pytest.raises(PenaAccountabilityAccessDeniedError):
        UpdateAccountabilitySettingsHandler(_FakeRepo(should_raise_access_denied=True)).handle(
            UpdateAccountabilitySettingsCommand(pena_guid="pena-guid", admin_id=1, balance_cents=1)
        )


def test_upsert_member_normalizes_payload():
    repo = _FakeRepo()
    UpsertMemberAccountHandler(repo).handle(
        UpsertMemberAccountCommand(
            pena_guid="pena-guid",
            admin_id=1,
            player_guid=" player-1 ",
            debt_cents=10,
            contribution_cents=20,
            note="  monthly payment  ",
        )
    )

    assert repo.last_call == {
        "pena_guid": "pena-guid",
        "admin_id": 1,
        "player_guid": "player-1",
        "debt_cents": 10,
        "contribution_cents": 20,
        "note": "monthly payment",
    }


def test_upsert_member_rejects_negative_amounts():
    with pytest.raises(InvalidPenaAccountabilityDataError):
        UpsertMemberAccountHandler(_FakeRepo()).handle(
            UpsertMemberAccountCommand(
                pena_guid="pena-guid", admin_id=1, player_guid="player-1", debt_cents=-1
            )
        )


@pytest.mark.parametrize(
    ("repo", "expected_error"),
    [
        (_FakeRepo(should_raise_not_found=True), PenaAccountabilityPenaNotFoundError),
        (_FakeRepo(should_raise_access_denied=True), PenaAccountabilityAccessDeniedError),
        (_FakeRepo(should_raise_member_not_found=True), PenaAccountabilityMemberNotFoundError),
    ],
)
def test_upsert_member_propagates_errors(repo, expected_error):
    with pytest.raises(expected_error):
        UpsertMemberAccountHandler(repo).handle(
            UpsertMemberAccountCommand(
                pena_guid="pena-guid", admin_id=1, player_guid="player-1", debt_cents=0
            )
        )


def test_create_expense_normalizes_payload():
    repo = _FakeRepo()
    CreateExpenseHandler(repo).handle(
        CreateExpenseCommand(
            pena_guid="pena-guid",
            admin_id=1,
            title="  Balls  ",
            category=" equipment ",
            amount_cents=100,
            occurred_on=date(2026, 1, 1),
            note=" note ",
        )
    )

    assert repo.last_call == {
        "pena_guid": "pena-guid",
        "admin_id": 1,
        "title": "Balls",
        "category": "equipment",
        "amount_cents": 100,
        "occurred_on": date(2026, 1, 1),
        "note": "note",
    }


def test_create_expense_rejects_blank_title():
    with pytest.raises(InvalidPenaAccountabilityDataError):
        CreateExpenseHandler(_FakeRepo()).handle(
            CreateExpenseCommand(
                pena_guid="pena-guid",
                admin_id=1,
                title=" ",
                amount_cents=100,
                occurred_on=date(2026, 1, 1),
            )
        )


def test_create_expense_rejects_non_date_occurred_on():
    with pytest.raises(InvalidPenaAccountabilityDataError):
        CreateExpenseHandler(_FakeRepo()).handle(
            CreateExpenseCommand(
                pena_guid="pena-guid",
                admin_id=1,
                title="Balls",
                amount_cents=100,
                occurred_on="2026-01-01",  # type: ignore[arg-type]
            )
        )


def test_remove_member_rejects_blank_player_guid():
    with pytest.raises(InvalidPenaAccountabilityDataError):
        RemoveMemberAccountHandler(_FakeRepo()).handle(
            RemoveMemberAccountCommand(pena_guid="pena-guid", admin_id=1, player_guid=" ")
        )


def test_remove_member_propagates_member_not_found():
    with pytest.raises(PenaAccountabilityMemberNotFoundError):
        RemoveMemberAccountHandler(_FakeRepo(should_raise_member_not_found=True)).handle(
            RemoveMemberAccountCommand(pena_guid="pena-guid", admin_id=1, player_guid="player-x")
        )


def test_remove_expense_rejects_blank_guid():
    with pytest.raises(InvalidPenaAccountabilityDataError):
        RemoveExpenseHandler(_FakeRepo()).handle(
            RemoveExpenseCommand(pena_guid="pena-guid", admin_id=1, expense_guid=" ")
        )


def test_remove_expense_propagates_expense_not_found():
    with pytest.raises(PenaAccountabilityExpenseNotFoundError):
        RemoveExpenseHandler(_FakeRepo(should_raise_expense_not_found=True)).handle(
            RemoveExpenseCommand(pena_guid="pena-guid", admin_id=1, expense_guid="exp-x")
        )
