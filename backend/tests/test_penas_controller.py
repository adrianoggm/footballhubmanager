from dataclasses import dataclass
from datetime import date, datetime

import pytest
from api.dependencies import use_cases as use_case_dependencies
from api.interface.controller.v1 import penas_controller
from api.interface.controller.v1.model.request.pena_accountability_request import (
    CreatePenaExpenseRequest,
    UpdatePenaAccountabilityRequest,
    UpsertPenaMemberAccountRequest,
)
from api.interface.controller.v1.model.request.pena_labels_request import UpdatePenaLabelsRequest
from api.interface.controller.v1.model.request.penas_request import (
    ConsumeLinkTokenRequest,
    UpdatePenaProfileRequest,
)
from auth.dependencies import require_user
from auth.session import SessionData
from core.application.commands.pena_labels_command import UpdatePenaLabelsCommand
from core.application.models import (
    PenaAccountabilityExpenseCreate,
    PenaAccountabilityExpenseInfo,
    PenaAccountabilityInfo,
    PenaAccountabilityMemberAccountInfo,
    PenaAccountabilityMemberAccountUpsert,
    PenaInfo,
    PenaLabelsInfo,
    PenaLinkToken,
    PenaProfileInfo,
    PenasPage,
    PenasPageResult,
)
from core.application.queries.pena_labels_query import GetPenaLabelsQuery
from core.application.queries.pena_queries import (
    GetPenaByGuidQuery,
    ListPenasForAdminQuery,
    ListPenasForUserQuery,
)
from core.application.use_cases.generate_pena_link_token_usecase import (
    PenaAccessDeniedError,
)
from core.application.use_cases.link_user_to_pena_usecase import (
    InvalidLinkTokenError,
    UserAlreadyLinkedError,
    UserProfileNotFoundError,
)
from core.application.use_cases.manage_pena_accountability_usecase import (
    InvalidPenaAccountabilityDataError,
    PenaAccountabilityAccessDeniedError,
    PenaAccountabilityExpenseNotFoundError,
    PenaAccountabilityMemberNotFoundError,
    PenaAccountabilityPenaNotFoundError,
)
from core.domain.errors import (
    InvalidPenaLabelsDataError,
    InvalidProfileImageError,
    PenaLabelsAccessDeniedError,
    PenaLabelsPenaNotFoundError,
    PenaProfileAccessDeniedError,
    PenaProfileNotFoundError,
)
from fastapi import HTTPException


def _session(*, user_type: str, user_id: int = 7) -> SessionData:
    return SessionData(
        token="tok",
        user_id=user_id,
        user_guid=f"{user_type}-guid",
        user_type=user_type,
        expires_at=9999999999,
    )


def _penas_page(*, total: int, page: int = 1, page_size: int = 20) -> PenasPage:
    return PenasPage(
        items=[PenaInfo(guid="pena-1", name="Pena Uno")],
        page=page,
        page_size=page_size,
        total=total,
    )


def _labels_info() -> PenaLabelsInfo:
    return PenaLabelsInfo(
        role_labels=["Capitan", "Titular"],
        position_labels=["POR", "DEF"],
        role_colors={"Capitan": "#FF0000", "Titular": "#00FF00"},
        position_colors={"POR": "#111111", "DEF": "#222222"},
    )


def _accountability_info() -> PenaAccountabilityInfo:
    return PenaAccountabilityInfo(
        currency="EUR",
        balance_cents=20_000,
        reserve_cents=4_000,
        budget_visibility="summary",
        expenses_visibility="full",
        member_accounts=[
            PenaAccountabilityMemberAccountInfo(
                player_guid="player-1",
                player_name="Ana",
                debt_cents=1200,
                contribution_cents=800,
                note=None,
                updated_at=datetime(2026, 3, 1, 10, 0, 0),
            )
        ],
        expenses=[
            PenaAccountabilityExpenseInfo(
                guid="expense-1",
                title="Balls",
                category="equipment",
                amount_cents=2500,
                occurred_on=date(2026, 3, 1),
                note=None,
                created_at=datetime(2026, 3, 1, 8, 0, 0),
                updated_at=datetime(2026, 3, 1, 9, 0, 0),
            )
        ],
        updated_at=datetime(2026, 3, 1, 11, 0, 0),
        total_debt_cents=1200,
        total_contribution_cents=800,
        total_expenses_cents=2500,
        current_cash_cents=18300,
        projected_balance_cents=19500,
        expense_entries=1,
    )


def test_page_response_handles_zero_total_pages():
    response = penas_controller._page_response(_penas_page(total=0))
    assert response.total_pages == 0
    assert response.total == 0


def test_page_response_rounds_up_total_pages():
    response = penas_controller._page_response(_penas_page(total=21, page_size=20))
    assert response.total_pages == 2


@dataclass
class _PenaQueryBusStub:
    page_result: PenasPage
    last_admin_call: dict | None = None
    last_user_call: dict | None = None

    def ask(self, query):
        if isinstance(query, ListPenasForAdminQuery):
            self.last_admin_call = {
                "admin_id": query.admin_id,
                "page": query.page,
                "page_size": query.page_size,
                "search": query.search,
            }
            return PenasPage(
                items=self.page_result.items,
                page=query.page,
                page_size=query.page_size,
                total=self.page_result.total,
            )
        if isinstance(query, ListPenasForUserQuery):
            self.last_user_call = {
                "account_id": query.account_id,
                "page": query.page,
                "page_size": query.page_size,
                "search": query.search,
            }
            return PenasPage(
                items=self.page_result.items,
                page=query.page,
                page_size=query.page_size,
                total=self.page_result.total,
            )
        if isinstance(query, GetPenaByGuidQuery):
            if query.pena_guid == "pena-missing":
                return None
            return PenaInfo(guid=query.pena_guid, name="Pena Found")
        raise AssertionError(f"unexpected query {type(query)!r}")


def test_list_penas_for_admin_returns_page_data():
    bus = _PenaQueryBusStub(page_result=_penas_page(total=21))

    response = penas_controller.list_penas(
        page=2,
        page_size=20,
        search=" madrid ",
        session=_session(user_type="admin", user_id=99),
        query_bus=bus,
    )

    assert response.total_pages == 2
    assert response.page == 2
    assert response.items[0].guid == "pena-1"
    assert bus.last_admin_call == {
        "admin_id": 99,
        "page": 2,
        "page_size": 20,
        "search": " madrid ",
    }


def test_list_penas_for_user_returns_page_data():
    bus = _PenaQueryBusStub(page_result=_penas_page(total=1))

    response = penas_controller.list_penas(
        page=1,
        page_size=20,
        search=None,
        session=_session(user_type="user", user_id=11),
        query_bus=bus,
    )

    assert response.total_pages == 1
    assert bus.last_user_call == {"account_id": 11, "page": 1, "page_size": 20, "search": None}


def test_list_penas_rejects_invalid_session_type():
    bus = _PenaQueryBusStub(page_result=_penas_page(total=1))

    with pytest.raises(HTTPException) as exc:
        penas_controller.list_penas(
            page=1,
            page_size=20,
            search=None,
            session=_session(user_type="service"),
            query_bus=bus,
        )
    assert exc.value.status_code == 403
    assert exc.value.detail == "Invalid session type"


def test_get_pena_returns_404_when_missing():
    bus = _PenaQueryBusStub(page_result=_penas_page(total=1))

    with pytest.raises(HTTPException) as exc:
        penas_controller.get_pena("pena-missing", _session=object(), query_bus=bus)
    assert exc.value.status_code == 404
    assert exc.value.detail == "Pena not found"


def test_get_pena_returns_pena_when_found():
    bus = _PenaQueryBusStub(page_result=_penas_page(total=1))

    response = penas_controller.get_pena("pena-xyz", _session=object(), query_bus=bus)

    assert response.guid == "pena-xyz"
    assert response.name == "Pena Found"


def test_update_pena_profile_success():
    class _Bus:
        def __init__(self):
            self.last_command = None

        def dispatch(self, command):
            self.last_command = command
            return PenaProfileInfo(
                guid=command.pena_guid,
                name="Pena Uno",
                image_url=command.image_url,
            )

    bus = _Bus()
    response = penas_controller.update_pena_profile(
        "pena-1",
        UpdatePenaProfileRequest(image_url="data:image/jpeg;base64,QQ=="),
        admin_session=_session(user_type="admin", user_id=99),
        command_bus=bus,
    )

    assert response.guid == "pena-1"
    assert response.image_url == "data:image/jpeg;base64,QQ=="
    assert bus.last_command.pena_guid == "pena-1"
    assert bus.last_command.admin_id == 99
    assert bus.last_command.image_url == "data:image/jpeg;base64,QQ=="


@pytest.mark.parametrize(
    ("error", "status_code", "detail"),
    [
        (PenaProfileNotFoundError(), 404, "Pena not found"),
        (PenaProfileAccessDeniedError(), 403, "Admin does not manage this pena"),
        (InvalidProfileImageError(), 400, "Invalid profile image"),
    ],
)
def test_update_pena_profile_maps_domain_errors(error, status_code, detail):
    class _Bus:
        def dispatch(self, _command):
            raise error

    with pytest.raises(HTTPException) as exc:
        penas_controller.update_pena_profile(
            "pena-1",
            UpdatePenaProfileRequest(image_url="data:image/jpeg;base64,QQ=="),
            admin_session=_session(user_type="admin", user_id=99),
            command_bus=_Bus(),
        )

    assert exc.value.status_code == status_code
    assert exc.value.detail == detail


class _RaisingQueryBus:
    def __init__(self, error):
        self._error = error

    def ask(self, _query):
        raise self._error


class _RaisingCommandBus:
    def __init__(self, error):
        self._error = error

    def dispatch(self, _command):
        raise self._error


class _LabelsQueryBus:
    def ask(self, query):
        assert isinstance(query, GetPenaLabelsQuery)
        assert query.pena_guid == "pena-1"
        return _labels_info()


class _LabelsCommandBus:
    def __init__(self):
        self.last_command = None

    def dispatch(self, command):
        self.last_command = command
        return _labels_info()


def test_get_pena_labels_returns_labels():
    response = penas_controller.get_pena_labels(
        "pena-1", _session=object(), query_bus=_LabelsQueryBus()
    )
    assert response.role_labels == ["Capitan", "Titular"]
    assert response.position_colors == {"POR": "#111111", "DEF": "#222222"}


def test_get_pena_labels_maps_not_found_error():
    bus = _RaisingQueryBus(PenaLabelsPenaNotFoundError())
    with pytest.raises(HTTPException) as exc:
        penas_controller.get_pena_labels("pena-1", _session=object(), query_bus=bus)
    assert exc.value.status_code == 404
    assert exc.value.detail == "Pena not found"


def test_update_pena_labels_success():
    bus = _LabelsCommandBus()
    response = penas_controller.update_pena_labels(
        "pena-1",
        payload=UpdatePenaLabelsRequest(
            role_labels=["Capitan", "Titular"],
            position_labels=["POR", "DEF"],
            role_colors={"Capitan": "#ff0000"},
            position_colors={"POR": "#111111"},
        ),
        admin_session=_session(user_type="admin", user_id=99),
        command_bus=bus,
    )

    assert response.role_labels == ["Capitan", "Titular"]
    command = bus.last_command
    assert isinstance(command, UpdatePenaLabelsCommand)
    assert command.pena_guid == "pena-1"
    assert command.admin_id == 99
    assert command.role_labels == ["Capitan", "Titular"]
    assert command.position_labels == ["POR", "DEF"]


@pytest.mark.parametrize(
    ("error", "status_code", "detail"),
    [
        (InvalidPenaLabelsDataError(), 400, "Invalid pena labels data"),
        (PenaLabelsPenaNotFoundError(), 404, "Pena not found"),
        (PenaLabelsAccessDeniedError(), 403, "Admin does not manage this pena"),
    ],
)
def test_update_pena_labels_maps_domain_errors(error, status_code, detail):
    with pytest.raises(HTTPException) as exc:
        penas_controller.update_pena_labels(
            "pena-1",
            payload=UpdatePenaLabelsRequest(
                role_labels=["Capitan"],
                position_labels=["POR"],
            ),
            admin_session=_session(user_type="admin", user_id=5),
            command_bus=_RaisingCommandBus(error),
        )

    assert exc.value.status_code == status_code
    assert exc.value.detail == detail


def test_create_link_token_success():
    class _UseCase:
        def __init__(self):
            self.last_call: dict | None = None

        def execute(self, *, admin_id: int, pena_guid: str, ttl_seconds: int) -> PenaLinkToken:
            self.last_call = {
                "admin_id": admin_id,
                "pena_guid": pena_guid,
                "ttl_seconds": ttl_seconds,
            }
            return PenaLinkToken(token="t-1", pena_guid=pena_guid, expires_at=12345)

    use_case = _UseCase()
    response = penas_controller.create_link_token(
        "pena-1",
        admin_session=_session(user_type="admin", user_id=5),
        use_case=use_case,
    )

    assert response.token == "t-1"
    assert response.pena_guid == "pena-1"
    assert response.expires_at == 12345
    assert use_case.last_call is not None
    assert use_case.last_call["ttl_seconds"] == penas_controller.app_config.LINK_TOKEN_TTL_SECONDS


def test_create_link_token_maps_access_denied_to_403():
    class _UseCase:
        def execute(self, **_kwargs):
            raise PenaAccessDeniedError()

    with pytest.raises(HTTPException) as exc:
        penas_controller.create_link_token(
            "pena-1",
            admin_session=_session(user_type="admin", user_id=5),
            use_case=_UseCase(),
        )
    assert exc.value.status_code == 403
    assert exc.value.detail == "Admin does not manage this pena"


def test_consume_link_token_rejects_non_user_sessions():
    with pytest.raises(HTTPException) as exc:
        require_user(_session(user_type="admin"))
    assert exc.value.status_code == 403
    assert exc.value.detail == "User access required"


def test_consume_link_token_success():
    class _UseCase:
        def __init__(self):
            self.last_call: dict | None = None

        def execute(
            self,
            *,
            token: str,
            account_id: int,
            nickname: str | None,
            position: str | None,
        ):
            self.last_call = {
                "token": token,
                "account_id": account_id,
                "nickname": nickname,
                "position": position,
            }

    use_case = _UseCase()
    payload = ConsumeLinkTokenRequest(token="tok-1", nickname="nick", position="mid")
    response = penas_controller.consume_link_token(
        payload,
        session=_session(user_type="user", user_id=88),
        use_case=use_case,
    )

    assert response == {"status": "ok"}
    assert use_case.last_call == {
        "token": "tok-1",
        "account_id": 88,
        "nickname": "nick",
        "position": "mid",
    }


@pytest.mark.parametrize(
    ("error", "status_code", "detail"),
    [
        (InvalidLinkTokenError(), 400, "Invalid or expired link token"),
        (UserAlreadyLinkedError(), 409, "User is already linked to this pena"),
        (UserProfileNotFoundError(), 404, "User player profile not found"),
    ],
)
def test_consume_link_token_maps_domain_errors_to_http(error, status_code, detail):
    class _UseCase:
        def execute(self, **_kwargs):
            raise error

    with pytest.raises(HTTPException) as exc:
        penas_controller.consume_link_token(
            ConsumeLinkTokenRequest(token="tok-1", nickname=None, position=None),
            session=_session(user_type="user", user_id=88),
            use_case=_UseCase(),
        )

    assert exc.value.status_code == status_code
    assert exc.value.detail == detail


def test_get_pena_query_bus_builds_expected_dependencies(monkeypatch):
    from shared.application.bus.buses import QueryBus

    captured: dict[str, object] = {}

    class _Repo:
        def __init__(self, db):
            captured["db"] = db

        def find_for_admin(self, admin_id, *, page, page_size, search):
            return PenasPageResult(items=[], page=page, page_size=page_size, total=0)

        def find_for_user(self, account_id, *, page, page_size, search):
            return PenasPageResult(items=[], page=page, page_size=page_size, total=0)

        def find_by_guid(self, pena_guid):
            return None

    monkeypatch.setattr(use_case_dependencies, "SqlAlchemyPenaQueryRepository", _Repo)

    bus = penas_controller.get_pena_query_bus(db="db-session")
    assert isinstance(bus, QueryBus)
    assert captured["db"] == "db-session"
    # Las tres queries de lectura están registradas y enrutan al handler.
    assert bus.ask(ListPenasForAdminQuery(admin_id=1)).total == 0
    assert bus.ask(ListPenasForUserQuery(account_id=1)).total == 0
    assert bus.ask(GetPenaByGuidQuery(pena_guid="x")) is None


def test_get_generate_pena_link_token_use_case_builds_expected_dependencies(monkeypatch):
    captured: dict[str, object] = {}

    class _Repo:
        def __init__(self, db):
            captured["db"] = db

    class _UseCase:
        def __init__(self, repo):
            captured["repo_type"] = type(repo)
            self.repo = repo

    monkeypatch.setattr(use_case_dependencies, "SqlAlchemyPenaLinkRepository", _Repo)
    monkeypatch.setattr(use_case_dependencies, "GeneratePenaLinkTokenUseCase", _UseCase)

    use_case = penas_controller.get_generate_pena_link_token_use_case(db="db-session")
    assert isinstance(use_case, _UseCase)
    assert captured["db"] == "db-session"
    assert captured["repo_type"] is _Repo


def test_get_link_user_to_pena_use_case_builds_expected_dependencies(monkeypatch):
    captured: dict[str, object] = {}

    class _Repo:
        def __init__(self, db):
            captured["db"] = db

    class _UseCase:
        def __init__(self, repo):
            captured["repo_type"] = type(repo)
            self.repo = repo

    monkeypatch.setattr(use_case_dependencies, "SqlAlchemyPenaLinkRepository", _Repo)
    monkeypatch.setattr(use_case_dependencies, "LinkUserToPenaUseCase", _UseCase)

    use_case = penas_controller.get_link_user_to_pena_use_case(db="db-session")
    assert isinstance(use_case, _UseCase)
    assert captured["db"] == "db-session"
    assert captured["repo_type"] is _Repo


def test_get_pena_labels_buses_build_expected_dependencies(monkeypatch):
    from shared.application.bus.buses import CommandBus, QueryBus

    captured: dict[str, object] = {}

    class _Repo:
        def __init__(self, db):
            captured["db"] = db

    monkeypatch.setattr(use_case_dependencies, "SqlAlchemyPenaLabelsRepository", _Repo)

    command_bus = use_case_dependencies.get_pena_labels_command_bus(db="db-session")
    query_bus = use_case_dependencies.get_pena_labels_query_bus(db="db-session")

    assert isinstance(command_bus, CommandBus)
    assert isinstance(query_bus, QueryBus)
    assert captured["db"] == "db-session"
    assert UpdatePenaLabelsCommand in command_bus._handlers
    assert GetPenaLabelsQuery in query_bus._handlers


def test_get_pena_accountability_use_case_builds_expected_dependencies(monkeypatch):
    captured: dict[str, object] = {}

    class _Repo:
        def __init__(self, db):
            captured["db"] = db

    class _UseCase:
        def __init__(self, repo):
            captured["repo_type"] = type(repo)
            self.repo = repo

    monkeypatch.setattr(use_case_dependencies, "SqlAlchemyPenaAccountabilityRepository", _Repo)
    monkeypatch.setattr(use_case_dependencies, "ManagePenaAccountabilityUseCase", _UseCase)

    use_case = penas_controller.get_pena_accountability_use_case(db="db-session")
    assert isinstance(use_case, _UseCase)
    assert captured["db"] == "db-session"
    assert captured["repo_type"] is _Repo


def test_get_pena_accountability_for_admin_returns_full_payload():
    class _UseCase:
        def get_for_pena(self, *, pena_guid: str):
            assert pena_guid == "pena-1"
            return _accountability_info()

        def get_player_guid_for_account(self, *, account_id: int):
            raise AssertionError("must not be called for admin")

    response = penas_controller.get_pena_accountability(
        "pena-1",
        session=_session(user_type="admin", user_id=7),
        use_case=_UseCase(),
    )

    assert response.balance_cents == 20_000
    assert len(response.member_accounts) == 1
    assert len(response.expenses) == 1
    assert response.my_account is None


def test_get_pena_accountability_for_user_hides_data_by_transparency():
    info = _accountability_info()
    info = PenaAccountabilityInfo(
        **{
            **info.__dict__,
            "budget_visibility": "private",
            "expenses_visibility": "summary",
        }
    )

    class _UseCase:
        def get_for_pena(self, *, pena_guid: str):
            assert pena_guid == "pena-1"
            return info

        def get_player_guid_for_account(self, *, account_id: int):
            assert account_id == 9
            return "player-1"

    response = penas_controller.get_pena_accountability(
        "pena-1",
        session=_session(user_type="user", user_id=9),
        use_case=_UseCase(),
    )

    assert response.balance_cents is None
    assert response.total_debt_cents is None
    assert response.member_accounts == []
    assert response.expenses == []
    assert response.total_expenses_cents == 2500
    assert response.my_account is not None
    assert response.my_account.player_guid == "player-1"


def test_get_pena_accountability_maps_not_found_error():
    class _UseCase:
        def get_for_pena(self, **_kwargs):
            raise PenaAccountabilityPenaNotFoundError()

        def get_player_guid_for_account(self, **_kwargs):
            return None

    with pytest.raises(HTTPException) as exc:
        penas_controller.get_pena_accountability(
            "pena-missing",
            session=_session(user_type="admin", user_id=1),
            use_case=_UseCase(),
        )

    assert exc.value.status_code == 404
    assert exc.value.detail == "Pena not found"


@pytest.mark.parametrize(
    ("error", "status_code", "detail"),
    [
        (InvalidPenaAccountabilityDataError(), 400, "Invalid accountability data"),
        (PenaAccountabilityPenaNotFoundError(), 404, "Pena not found"),
        (PenaAccountabilityAccessDeniedError(), 403, "Admin does not manage this pena"),
    ],
)
def test_update_pena_accountability_maps_errors(error, status_code, detail):
    class _UseCase:
        def update_settings_for_admin(self, **_kwargs):
            raise error

    with pytest.raises(HTTPException) as exc:
        penas_controller.update_pena_accountability(
            "pena-1",
            payload=UpdatePenaAccountabilityRequest(balance_cents=0),
            admin_session=_session(user_type="admin", user_id=3),
            use_case=_UseCase(),
        )

    assert exc.value.status_code == status_code
    assert exc.value.detail == detail


def test_upsert_member_accountability_success_builds_use_case_payload():
    class _UseCase:
        def __init__(self):
            self.last_call = None

        def upsert_member_account_for_admin(self, **kwargs):
            self.last_call = kwargs
            return _accountability_info()

    use_case = _UseCase()
    response = penas_controller.upsert_member_accountability(
        "pena-1",
        "player-1",
        payload=UpsertPenaMemberAccountRequest(debt_cents=400, contribution_cents=100, note="x"),
        admin_session=_session(user_type="admin", user_id=3),
        use_case=use_case,
    )

    assert response.member_accounts[0].player_guid == "player-1"
    assert use_case.last_call is not None
    data = use_case.last_call["data"]
    assert isinstance(data, PenaAccountabilityMemberAccountUpsert)
    assert data.player_guid == "player-1"
    assert data.debt_cents == 400
    assert data.contribution_cents == 100
    assert data.note == "x"


def test_create_pena_expense_success_builds_use_case_payload():
    class _UseCase:
        def __init__(self):
            self.last_call = None

        def create_expense_for_admin(self, **kwargs):
            self.last_call = kwargs
            return _accountability_info()

    use_case = _UseCase()
    response = penas_controller.create_pena_expense(
        "pena-1",
        payload=CreatePenaExpenseRequest(
            title="Travel",
            category="transport",
            amount_cents=2000,
            occurred_on=date(2026, 3, 2),
            note="bus",
        ),
        admin_session=_session(user_type="admin", user_id=3),
        use_case=use_case,
    )

    assert response.expenses[0].guid == "expense-1"
    data = use_case.last_call["data"]
    assert isinstance(data, PenaAccountabilityExpenseCreate)
    assert data.title == "Travel"
    assert data.category == "transport"
    assert data.amount_cents == 2000
    assert data.occurred_on == date(2026, 3, 2)
    assert data.note == "bus"


@pytest.mark.parametrize(
    ("fn_name", "error", "status_code", "detail"),
    [
        (
            "upsert_member_accountability",
            PenaAccountabilityMemberNotFoundError(),
            404,
            "Member not found",
        ),
        (
            "delete_member_accountability",
            PenaAccountabilityMemberNotFoundError(),
            404,
            "Member not found",
        ),
        ("delete_pena_expense", PenaAccountabilityExpenseNotFoundError(), 404, "Expense not found"),
    ],
)
def test_accountability_mutations_map_not_found_errors(fn_name, error, status_code, detail):
    class _UseCase:
        def upsert_member_account_for_admin(self, **_kwargs):
            raise error

        def remove_member_account_for_admin(self, **_kwargs):
            raise error

        def remove_expense_for_admin(self, **_kwargs):
            raise error

    with pytest.raises(HTTPException) as exc:
        if fn_name == "upsert_member_accountability":
            penas_controller.upsert_member_accountability(
                "pena-1",
                "player-1",
                payload=UpsertPenaMemberAccountRequest(debt_cents=0, contribution_cents=0),
                admin_session=_session(user_type="admin", user_id=1),
                use_case=_UseCase(),
            )
        elif fn_name == "delete_member_accountability":
            penas_controller.delete_member_accountability(
                "pena-1",
                "player-1",
                admin_session=_session(user_type="admin", user_id=1),
                use_case=_UseCase(),
            )
        else:
            penas_controller.delete_pena_expense(
                "pena-1",
                "expense-1",
                admin_session=_session(user_type="admin", user_id=1),
                use_case=_UseCase(),
            )

    assert exc.value.status_code == status_code
    assert exc.value.detail == detail
