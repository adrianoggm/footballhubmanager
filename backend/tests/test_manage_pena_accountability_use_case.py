from dataclasses import dataclass
from datetime import date, datetime

import pytest
from core.application.models import (
    PenaAccountabilityExpenseCreate,
    PenaAccountabilityMemberAccountUpsert,
    PenaAccountabilitySettingsUpdate,
)
from core.application.ports.pena_accountability_port import (
    PenaAccountabilityExpenseResult,
    PenaAccountabilityMemberAccountResult,
    PenaAccountabilityResult,
    PenaExpenseNotFoundError,
    PenaMemberNotFoundError,
    PenaNotFoundError,
    PenaNotManagedByAdminError,
)
from core.application.use_cases.manage_pena_accountability_usecase import (
    InvalidPenaAccountabilityDataError,
    ManagePenaAccountabilityUseCase,
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
            raise PenaNotFoundError()
        return self._sample_result()

    def get_player_guid_by_account(self, *, account_id: int) -> str | None:
        return "player-1" if account_id == 77 else None

    def save_settings_for_admin(self, **kwargs) -> PenaAccountabilityResult:
        if self.should_raise_not_found:
            raise PenaNotFoundError()
        if self.should_raise_access_denied:
            raise PenaNotManagedByAdminError()
        self.last_call = kwargs
        return self._sample_result()

    def upsert_member_account_for_admin(self, **kwargs) -> PenaAccountabilityResult:
        if self.should_raise_not_found:
            raise PenaNotFoundError()
        if self.should_raise_access_denied:
            raise PenaNotManagedByAdminError()
        if self.should_raise_member_not_found:
            raise PenaMemberNotFoundError()
        self.last_call = kwargs
        return self._sample_result()

    def delete_member_account_for_admin(self, **kwargs) -> PenaAccountabilityResult:
        if self.should_raise_not_found:
            raise PenaNotFoundError()
        if self.should_raise_access_denied:
            raise PenaNotManagedByAdminError()
        if self.should_raise_member_not_found:
            raise PenaMemberNotFoundError()
        self.last_call = kwargs
        return self._sample_result()

    def create_expense_for_admin(self, **kwargs) -> PenaAccountabilityResult:
        if self.should_raise_not_found:
            raise PenaNotFoundError()
        if self.should_raise_access_denied:
            raise PenaNotManagedByAdminError()
        self.last_call = kwargs
        return self._sample_result()

    def delete_expense_for_admin(self, **kwargs) -> PenaAccountabilityResult:
        if self.should_raise_not_found:
            raise PenaNotFoundError()
        if self.should_raise_access_denied:
            raise PenaNotManagedByAdminError()
        if self.should_raise_expense_not_found:
            raise PenaExpenseNotFoundError()
        self.last_call = kwargs
        return self._sample_result()


def test_get_for_pena_computes_totals():
    use_case = ManagePenaAccountabilityUseCase(_FakeRepo())

    result = use_case.get_for_pena(pena_guid="pena-guid")

    assert result.total_debt_cents == 4_000
    assert result.total_contribution_cents == 2_500
    assert result.total_expenses_cents == 1_200
    assert result.current_cash_cents == 11_300
    assert result.projected_balance_cents == 15_300
    assert result.expense_entries == 1


def test_get_player_guid_for_account_returns_none_for_non_positive_ids():
    use_case = ManagePenaAccountabilityUseCase(_FakeRepo())

    assert use_case.get_player_guid_for_account(account_id=0) is None
    assert use_case.get_player_guid_for_account(account_id=-3) is None
    assert use_case.get_player_guid_for_account(account_id=77) == "player-1"


def test_update_settings_for_admin_normalizes_currency_and_visibility():
    repo = _FakeRepo()
    use_case = ManagePenaAccountabilityUseCase(repo)

    use_case.update_settings_for_admin(
        pena_guid="pena-guid",
        admin_id=3,
        update=PenaAccountabilitySettingsUpdate(
            currency=" usd ",
            balance_cents=777,
            reserve_cents=0,
            budget_visibility="full",
            expenses_visibility="summary",
        ),
    )

    assert repo.last_call is not None
    assert repo.last_call["currency"] == "USD"
    assert repo.last_call["budget_visibility"] == "full"
    assert repo.last_call["expenses_visibility"] == "summary"
    assert repo.last_call["balance_cents"] == 777


def test_update_settings_for_admin_allows_negative_balance():
    repo = _FakeRepo()
    use_case = ManagePenaAccountabilityUseCase(repo)

    use_case.update_settings_for_admin(
        pena_guid="pena-guid",
        admin_id=3,
        update=PenaAccountabilitySettingsUpdate(balance_cents=-250),
    )

    assert repo.last_call is not None
    assert repo.last_call["balance_cents"] == -250


def test_update_settings_for_admin_rejects_negative_reserve():
    use_case = ManagePenaAccountabilityUseCase(_FakeRepo())

    with pytest.raises(InvalidPenaAccountabilityDataError):
        use_case.update_settings_for_admin(
            pena_guid="pena-guid",
            admin_id=3,
            update=PenaAccountabilitySettingsUpdate(reserve_cents=-1),
        )


def test_update_settings_for_admin_uses_current_values_as_fallbacks():
    repo = _FakeRepo()
    use_case = ManagePenaAccountabilityUseCase(repo)

    use_case.update_settings_for_admin(
        pena_guid="pena-guid",
        admin_id=3,
        update=PenaAccountabilitySettingsUpdate(
            currency=" ",
            budget_visibility=" ",
            expenses_visibility=None,
        ),
    )

    assert repo.last_call is not None
    assert repo.last_call["currency"] == "EUR"
    assert repo.last_call["budget_visibility"] == "summary"
    assert repo.last_call["expenses_visibility"] == "full"
    assert repo.last_call["balance_cents"] == 10_000
    assert repo.last_call["reserve_cents"] == 5_000


def test_upsert_member_account_for_admin_rejects_negative_amounts():
    use_case = ManagePenaAccountabilityUseCase(_FakeRepo())

    with pytest.raises(InvalidPenaAccountabilityDataError):
        use_case.upsert_member_account_for_admin(
            pena_guid="pena-guid",
            admin_id=1,
            data=PenaAccountabilityMemberAccountUpsert(
                player_guid="player-1",
                debt_cents=-1,
                contribution_cents=0,
            ),
        )


@pytest.mark.parametrize(
    ("repo", "expected_error"),
    [
        (_FakeRepo(should_raise_not_found=True), PenaAccountabilityPenaNotFoundError),
        (_FakeRepo(should_raise_access_denied=True), PenaAccountabilityAccessDeniedError),
        (_FakeRepo(should_raise_member_not_found=True), PenaAccountabilityMemberNotFoundError),
    ],
)
def test_upsert_member_account_for_admin_maps_expected_errors(repo, expected_error):
    use_case = ManagePenaAccountabilityUseCase(repo)

    with pytest.raises(expected_error):
        use_case.upsert_member_account_for_admin(
            pena_guid="pena-guid",
            admin_id=1,
            data=PenaAccountabilityMemberAccountUpsert(
                player_guid="player-1",
                debt_cents=0,
                contribution_cents=0,
            ),
        )


def test_upsert_member_account_for_admin_normalizes_payload():
    repo = _FakeRepo()
    use_case = ManagePenaAccountabilityUseCase(repo)

    use_case.upsert_member_account_for_admin(
        pena_guid="pena-guid",
        admin_id=1,
        data=PenaAccountabilityMemberAccountUpsert(
            player_guid=" player-1 ",
            debt_cents=10,
            contribution_cents=20,
            note="  monthly payment  ",
        ),
    )

    assert repo.last_call == {
        "pena_guid": "pena-guid",
        "admin_id": 1,
        "player_guid": "player-1",
        "debt_cents": 10,
        "contribution_cents": 20,
        "note": "monthly payment",
    }


def test_create_expense_for_admin_rejects_blank_title():
    use_case = ManagePenaAccountabilityUseCase(_FakeRepo())

    with pytest.raises(InvalidPenaAccountabilityDataError):
        use_case.create_expense_for_admin(
            pena_guid="pena-guid",
            admin_id=1,
            data=PenaAccountabilityExpenseCreate(
                title=" ",
                category="misc",
                amount_cents=100,
                occurred_on=date(2026, 1, 1),
                note=None,
            ),
        )


def test_create_expense_for_admin_rejects_non_date_occurred_on():
    use_case = ManagePenaAccountabilityUseCase(_FakeRepo())

    with pytest.raises(InvalidPenaAccountabilityDataError):
        use_case.create_expense_for_admin(
            pena_guid="pena-guid",
            admin_id=1,
            data=PenaAccountabilityExpenseCreate(
                title="Balls",
                category="misc",
                amount_cents=100,
                occurred_on="2026-01-01",  # type: ignore[arg-type]
                note=None,
            ),
        )


@pytest.mark.parametrize(
    ("repo", "expected_error"),
    [
        (_FakeRepo(should_raise_not_found=True), PenaAccountabilityPenaNotFoundError),
        (_FakeRepo(should_raise_access_denied=True), PenaAccountabilityAccessDeniedError),
    ],
)
def test_create_expense_for_admin_maps_expected_errors(repo, expected_error):
    use_case = ManagePenaAccountabilityUseCase(repo)

    with pytest.raises(expected_error):
        use_case.create_expense_for_admin(
            pena_guid="pena-guid",
            admin_id=1,
            data=PenaAccountabilityExpenseCreate(
                title="Balls",
                category=" equipment ",
                amount_cents=100,
                occurred_on=date(2026, 1, 1),
                note=" note ",
            ),
        )


def test_create_expense_for_admin_normalizes_payload():
    repo = _FakeRepo()
    use_case = ManagePenaAccountabilityUseCase(repo)

    use_case.create_expense_for_admin(
        pena_guid="pena-guid",
        admin_id=1,
        data=PenaAccountabilityExpenseCreate(
            title="  Balls  ",
            category=" equipment ",
            amount_cents=100,
            occurred_on=date(2026, 1, 1),
            note=" note ",
        ),
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


def test_update_settings_for_admin_maps_not_found_and_denied():
    with pytest.raises(PenaAccountabilityPenaNotFoundError):
        ManagePenaAccountabilityUseCase(
            _FakeRepo(should_raise_not_found=True)
        ).update_settings_for_admin(
            pena_guid="pena-guid",
            admin_id=1,
            update=PenaAccountabilitySettingsUpdate(balance_cents=1),
        )

    with pytest.raises(PenaAccountabilityAccessDeniedError):
        ManagePenaAccountabilityUseCase(
            _FakeRepo(should_raise_access_denied=True)
        ).update_settings_for_admin(
            pena_guid="pena-guid",
            admin_id=1,
            update=PenaAccountabilitySettingsUpdate(balance_cents=1),
        )


def test_remove_members_and_expenses_map_not_found_errors():
    with pytest.raises(PenaAccountabilityMemberNotFoundError):
        ManagePenaAccountabilityUseCase(
            _FakeRepo(should_raise_member_not_found=True)
        ).remove_member_account_for_admin(
            pena_guid="pena-guid",
            admin_id=1,
            player_guid="player-x",
        )

    with pytest.raises(PenaAccountabilityExpenseNotFoundError):
        ManagePenaAccountabilityUseCase(
            _FakeRepo(should_raise_expense_not_found=True)
        ).remove_expense_for_admin(
            pena_guid="pena-guid",
            admin_id=1,
            expense_guid="exp-x",
        )


@pytest.mark.parametrize(
    ("repo", "expected_error"),
    [
        (_FakeRepo(should_raise_not_found=True), PenaAccountabilityPenaNotFoundError),
        (_FakeRepo(should_raise_access_denied=True), PenaAccountabilityAccessDeniedError),
    ],
)
def test_remove_member_account_for_admin_maps_pena_and_access_errors(repo, expected_error):
    use_case = ManagePenaAccountabilityUseCase(repo)

    with pytest.raises(expected_error):
        use_case.remove_member_account_for_admin(
            pena_guid="pena-guid",
            admin_id=1,
            player_guid="player-1",
        )


def test_remove_member_account_for_admin_rejects_blank_player_guid():
    use_case = ManagePenaAccountabilityUseCase(_FakeRepo())

    with pytest.raises(InvalidPenaAccountabilityDataError):
        use_case.remove_member_account_for_admin(
            pena_guid="pena-guid",
            admin_id=1,
            player_guid=" ",
        )


@pytest.mark.parametrize(
    ("repo", "expected_error"),
    [
        (_FakeRepo(should_raise_not_found=True), PenaAccountabilityPenaNotFoundError),
        (_FakeRepo(should_raise_access_denied=True), PenaAccountabilityAccessDeniedError),
    ],
)
def test_remove_expense_for_admin_maps_pena_and_access_errors(repo, expected_error):
    use_case = ManagePenaAccountabilityUseCase(repo)

    with pytest.raises(expected_error):
        use_case.remove_expense_for_admin(
            pena_guid="pena-guid",
            admin_id=1,
            expense_guid="exp-1",
        )


def test_remove_expense_for_admin_rejects_blank_expense_guid():
    use_case = ManagePenaAccountabilityUseCase(_FakeRepo())

    with pytest.raises(InvalidPenaAccountabilityDataError):
        use_case.remove_expense_for_admin(
            pena_guid="pena-guid",
            admin_id=1,
            expense_guid=" ",
        )
