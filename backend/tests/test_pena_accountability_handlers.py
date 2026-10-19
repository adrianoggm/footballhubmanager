from dataclasses import dataclass, field
from datetime import date, datetime

import pytest
from core.application.commands.pena_accountability_command_handlers import (
    RecordTransactionHandler,
    RemoveMemberAccountHandler,
    RemoveTransactionHandler,
    UpdateAccountabilitySettingsHandler,
    UpsertMemberAccountHandler,
)
from core.application.commands.pena_accountability_commands import (
    RecordTransactionCommand,
    RemoveMemberAccountCommand,
    RemoveTransactionCommand,
    UpdateAccountabilitySettingsCommand,
    UpsertMemberAccountCommand,
)
from core.application.ports.pena_accountability_port import (
    PenaAccountabilityMemberAccountResult,
    PenaAccountabilityResult,
    PenaMonthlyCashflowResult,
    PenaTransactionPageResult,
    PenaTransactionResult,
)
from core.application.queries.pena_accountability_queries import (
    GetPenaAccountabilityQuery,
    GetPlayerGuidForAccountQuery,
    ListPenaTransactionsQuery,
)
from core.application.queries.pena_accountability_query_handlers import (
    GetPenaAccountabilityHandler,
    GetPlayerGuidForAccountHandler,
    ListPenaTransactionsHandler,
)
from core.domain.errors import (
    InvalidPenaAccountabilityDataError,
    PenaAccountabilityAccessDeniedError,
    PenaAccountabilityMemberNotFoundError,
    PenaAccountabilityPenaNotFoundError,
    PenaAccountabilityTransactionNotFoundError,
)


@dataclass
class _FakeRepo:
    should_raise_not_found: bool = False
    should_raise_access_denied: bool = False
    should_raise_member_not_found: bool = False
    should_raise_transaction_not_found: bool = False
    last_call: dict | None = None
    list_calls: list = field(default_factory=list)

    @staticmethod
    def _sample_result() -> PenaAccountabilityResult:
        return PenaAccountabilityResult(
            currency="EUR",
            opening_balance_cents=10_000,
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
            total_income_cents=2_500,
            total_expense_cents=1_200,
            expenses_this_month_count=1,
            monthly_cashflow=[
                PenaMonthlyCashflowResult(
                    year=2025, month=12, income_cents=1_000, expense_cents=400
                ),
                PenaMonthlyCashflowResult(
                    year=2026, month=1, income_cents=1_500, expense_cents=800
                ),
            ],
            updated_at=datetime(2026, 1, 5, 9, 0, 0),
        )

    def get_for_pena(self, *, pena_guid: str) -> PenaAccountabilityResult:
        if self.should_raise_not_found:
            raise PenaAccountabilityPenaNotFoundError()
        return self._sample_result()

    def list_transactions_for_pena(self, **kwargs) -> PenaTransactionPageResult:
        self.list_calls.append(kwargs)
        return PenaTransactionPageResult(
            items=[
                PenaTransactionResult(
                    guid="tx-1",
                    type="income",
                    amount_cents=5_000,
                    entity="Antonio Conte",
                    concept="Monthly Membership Fee",
                    category="membership",
                    note="Membership #442",
                    occurred_on=date(2026, 1, 4),
                    player_guid="player-1",
                    player_name="Ana",
                    created_at=datetime(2026, 1, 4, 10, 0, 0),
                    updated_at=datetime(2026, 1, 4, 10, 0, 0),
                )
            ],
            total=1,
        )

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

    def record_transaction_for_admin(self, **kwargs) -> PenaAccountabilityResult:
        if self.should_raise_not_found:
            raise PenaAccountabilityPenaNotFoundError()
        if self.should_raise_access_denied:
            raise PenaAccountabilityAccessDeniedError()
        if self.should_raise_member_not_found:
            raise PenaAccountabilityMemberNotFoundError()
        self.last_call = kwargs
        return self._sample_result()

    def delete_transaction_for_admin(self, **kwargs) -> PenaAccountabilityResult:
        if self.should_raise_not_found:
            raise PenaAccountabilityPenaNotFoundError()
        if self.should_raise_access_denied:
            raise PenaAccountabilityAccessDeniedError()
        if self.should_raise_transaction_not_found:
            raise PenaAccountabilityTransactionNotFoundError()
        self.last_call = kwargs
        return self._sample_result()


def test_get_handler_computes_kpis():
    result = GetPenaAccountabilityHandler(_FakeRepo()).handle(
        GetPenaAccountabilityQuery(pena_guid="pena-guid")
    )

    assert result.total_debt_cents == 4_000
    assert result.total_contribution_cents == 2_500
    assert result.total_income_cents == 2_500
    assert result.total_expense_cents == 1_200
    # opening 10_000 + income 2_500 - expense 1_200
    assert result.total_balance_cents == 11_300
    assert result.membership_fees_cents == 2_500
    # 2_500 / (2_500 + 4_000) * 100 == 38.5 (rounded)
    assert result.membership_collected_pct == 38.5
    assert result.members_pending_count == 2
    assert result.expenses_this_month_count == 1
    # net this month 700 vs prev 600 -> +16.7%
    assert result.balance_trend_pct == 16.7


def test_get_handler_trend_is_none_without_prior_month():
    repo = _FakeRepo()
    single_month = PenaAccountabilityResult(
        **{
            **repo._sample_result().__dict__,
            "monthly_cashflow": [
                PenaMonthlyCashflowResult(year=2026, month=1, income_cents=100, expense_cents=0)
            ],
        }
    )
    repo.get_for_pena = lambda *, pena_guid: single_month
    result = GetPenaAccountabilityHandler(repo).handle(
        GetPenaAccountabilityQuery(pena_guid="pena-guid")
    )
    assert result.balance_trend_pct is None


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


def test_list_transactions_clamps_paging_and_filters_type():
    repo = _FakeRepo()
    page = ListPenaTransactionsHandler(repo).handle(
        ListPenaTransactionsQuery(pena_guid="pena-guid", page=0, page_size=999, type_filter="bogus")
    )
    assert page.page == 1
    assert page.page_size == 50  # clamped to MAX_TRANSACTION_PAGE_SIZE
    assert repo.list_calls[0]["type_filter"] is None  # invalid filter dropped
    assert page.total == 1
    assert page.items[0].guid == "tx-1"
    assert page.items[0].player_name == "Ana"


def test_list_transactions_passes_valid_type():
    repo = _FakeRepo()
    ListPenaTransactionsHandler(repo).handle(
        ListPenaTransactionsQuery(pena_guid="pena-guid", type_filter="expense")
    )
    assert repo.list_calls[0]["type_filter"] == "expense"


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


def test_record_transaction_normalizes_payload():
    repo = _FakeRepo()
    RecordTransactionHandler(repo).handle(
        RecordTransactionCommand(
            pena_guid="pena-guid",
            admin_id=1,
            type=" INCOME ",
            amount_cents=5_000,
            concept="  Monthly Membership Fee  ",
            occurred_on=date(2026, 1, 4),
            entity="  Antonio Conte  ",
            category=" membership ",
            note=" Membership #442 ",
            player_guid=" player-1 ",
        )
    )

    assert repo.last_call == {
        "pena_guid": "pena-guid",
        "admin_id": 1,
        "type": "income",
        "amount_cents": 5_000,
        "concept": "Monthly Membership Fee",
        "occurred_on": date(2026, 1, 4),
        "entity": "Antonio Conte",
        "category": "membership",
        "note": "Membership #442",
        "player_guid": "player-1",
    }


def test_record_transaction_drops_member_link_for_expense():
    repo = _FakeRepo()
    RecordTransactionHandler(repo).handle(
        RecordTransactionCommand(
            pena_guid="pena-guid",
            admin_id=1,
            type="expense",
            amount_cents=4_200,
            concept="Stadium Lighting Repair",
            occurred_on=date(2026, 1, 4),
            player_guid="player-1",
        )
    )
    assert repo.last_call["player_guid"] is None


def test_record_transaction_rejects_invalid_type():
    with pytest.raises(InvalidPenaAccountabilityDataError):
        RecordTransactionHandler(_FakeRepo()).handle(
            RecordTransactionCommand(
                pena_guid="pena-guid",
                admin_id=1,
                type="refund",
                amount_cents=10,
                concept="X",
                occurred_on=date(2026, 1, 1),
            )
        )


def test_record_transaction_rejects_blank_concept():
    with pytest.raises(InvalidPenaAccountabilityDataError):
        RecordTransactionHandler(_FakeRepo()).handle(
            RecordTransactionCommand(
                pena_guid="pena-guid",
                admin_id=1,
                type="income",
                amount_cents=10,
                concept=" ",
                occurred_on=date(2026, 1, 1),
            )
        )


def test_record_transaction_rejects_negative_amount():
    with pytest.raises(InvalidPenaAccountabilityDataError):
        RecordTransactionHandler(_FakeRepo()).handle(
            RecordTransactionCommand(
                pena_guid="pena-guid",
                admin_id=1,
                type="income",
                amount_cents=-1,
                concept="X",
                occurred_on=date(2026, 1, 1),
            )
        )


def test_record_transaction_rejects_non_date_occurred_on():
    with pytest.raises(InvalidPenaAccountabilityDataError):
        RecordTransactionHandler(_FakeRepo()).handle(
            RecordTransactionCommand(
                pena_guid="pena-guid",
                admin_id=1,
                type="income",
                amount_cents=10,
                concept="X",
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


def test_remove_transaction_rejects_blank_guid():
    with pytest.raises(InvalidPenaAccountabilityDataError):
        RemoveTransactionHandler(_FakeRepo()).handle(
            RemoveTransactionCommand(pena_guid="pena-guid", admin_id=1, transaction_guid=" ")
        )


def test_remove_transaction_propagates_not_found():
    with pytest.raises(PenaAccountabilityTransactionNotFoundError):
        RemoveTransactionHandler(_FakeRepo(should_raise_transaction_not_found=True)).handle(
            RemoveTransactionCommand(pena_guid="pena-guid", admin_id=1, transaction_guid="tx-x")
        )
