from dataclasses import dataclass
from datetime import date, datetime

import pytest
from api.dependencies import use_cases as use_case_dependencies
from api.interface.controller.v1 import penas_controller
from api.interface.controller.v1.model.request.pena_accountability_request import (
    RecordPenaTransactionRequest,
    UpdatePenaAccountabilityRequest,
    UpsertPenaMemberAccountRequest,
)
from api.interface.controller.v1.model.request.pena_labels_request import UpdatePenaLabelsRequest
from api.interface.controller.v1.model.request.penas_request import (
    ConsumeLinkTokenRequest,
    RegisterAndClaimRequest,
    UpdatePenaProfileRequest,
)
from auth.dependencies import require_user
from auth.session import SessionData
from core.application.commands.pena_accountability_commands import (
    RecordTransactionCommand,
    UpdateAccountabilitySettingsCommand,
    UpsertMemberAccountCommand,
)
from core.application.commands.pena_labels_command import UpdatePenaLabelsCommand
from core.application.commands.pena_link_commands import (
    GeneratePenaClaimTokenCommand,
    GeneratePenaLinkTokenCommand,
    LinkExistingAccountToClaimCommand,
    LinkUserToPenaCommand,
    RegisterAndClaimPlayerCommand,
)
from core.application.models import (
    ClaimLink,
    ClaimRegistration,
    ClaimTokenInfo,
    PenaAccountabilityInfo,
    PenaAccountabilityMemberAccountInfo,
    PenaInfo,
    PenaLabelsInfo,
    PenaLinkToken,
    PenaMonthlyCashflowInfo,
    PenaProfileInfo,
    PenasPage,
    PenasPageResult,
    PenaTransactionInfo,
    PenaTransactionPage,
)
from core.application.queries.pena_accountability_queries import (
    GetPenaAccountabilityQuery,
    GetPlayerGuidForAccountQuery,
    ListPenaTransactionsQuery,
)
from core.application.queries.pena_labels_query import GetPenaLabelsQuery
from core.application.queries.pena_link_queries import InspectClaimTokenQuery
from core.application.queries.pena_queries import (
    GetPenaByGuidQuery,
    ListPenasForAdminQuery,
    ListPenasForUserQuery,
)
from core.domain.errors import (
    InvalidLinkTokenError,
    InvalidPenaAccountabilityDataError,
    InvalidPenaLabelsDataError,
    InvalidProfileImageError,
    PenaAccountabilityAccessDeniedError,
    PenaAccountabilityMemberNotFoundError,
    PenaAccountabilityPenaNotFoundError,
    PenaAccountabilityTransactionNotFoundError,
    PenaLabelsAccessDeniedError,
    PenaLabelsPenaNotFoundError,
    PenaLinkAccessDeniedError,
    PenaProfileAccessDeniedError,
    PenaProfileNotFoundError,
    PlayerAlreadyClaimedError,
    PlayerNotClaimableError,
    UserAlreadyLinkedError,
    UserProfileNotFoundError,
)
from fastapi import HTTPException, Response


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
        opening_balance_cents=20_000,
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
        monthly_cashflow=[
            PenaMonthlyCashflowInfo(year=2026, month=2, income_cents=1000, expense_cents=500),
            PenaMonthlyCashflowInfo(year=2026, month=3, income_cents=800, expense_cents=2500),
        ],
        updated_at=datetime(2026, 3, 1, 11, 0, 0),
        total_income_cents=1800,
        total_expense_cents=3000,
        total_balance_cents=18_800,
        balance_trend_pct=-330.0,
        total_debt_cents=1200,
        total_contribution_cents=800,
        membership_fees_cents=800,
        membership_collected_pct=40.0,
        expenses_this_month_count=1,
        members_pending_count=1,
    )


def _transaction_page() -> PenaTransactionPage:
    return PenaTransactionPage(
        items=[
            PenaTransactionInfo(
                guid="tx-1",
                type="expense",
                amount_cents=2500,
                entity="Volt & Co.",
                concept="Stadium Lighting Repair",
                category="maintenance",
                note="Invoice #99",
                occurred_on=date(2026, 3, 1),
                player_guid=None,
                player_name=None,
                created_at=datetime(2026, 3, 1, 8, 0, 0),
                updated_at=datetime(2026, 3, 1, 9, 0, 0),
            )
        ],
        page=1,
        page_size=10,
        total=1,
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


class _LinkCommandBus:
    def __init__(self, result=None):
        self._result = result
        self.last_command = None

    def dispatch(self, command):
        self.last_command = command
        return self._result


def test_create_link_token_success():
    bus = _LinkCommandBus(PenaLinkToken(token="t-1", pena_guid="pena-1", expires_at=12345))
    response = penas_controller.create_link_token(
        "pena-1",
        admin_session=_session(user_type="admin", user_id=5),
        command_bus=bus,
    )

    assert response.token == "t-1"
    assert response.pena_guid == "pena-1"
    assert response.expires_at == 12345
    command = bus.last_command
    assert isinstance(command, GeneratePenaLinkTokenCommand)
    assert command.admin_id == 5
    assert command.pena_guid == "pena-1"
    assert command.ttl_seconds == penas_controller.app_config.LINK_TOKEN_TTL_SECONDS


def test_create_link_token_maps_access_denied_to_403():
    with pytest.raises(HTTPException) as exc:
        penas_controller.create_link_token(
            "pena-1",
            admin_session=_session(user_type="admin", user_id=5),
            command_bus=_RaisingCommandBus(PenaLinkAccessDeniedError()),
        )
    assert exc.value.status_code == 403
    assert exc.value.detail == "Admin does not manage this pena"


def test_consume_link_token_rejects_non_user_sessions():
    with pytest.raises(HTTPException) as exc:
        require_user(_session(user_type="admin"))
    assert exc.value.status_code == 403
    assert exc.value.detail == "User access required"


def test_consume_link_token_success():
    bus = _LinkCommandBus()
    payload = ConsumeLinkTokenRequest(token="tok-1", nickname="nick", position="mid")
    response = penas_controller.consume_link_token(
        payload,
        session=_session(user_type="user", user_id=88),
        command_bus=bus,
    )

    assert response == {"status": "ok"}
    command = bus.last_command
    assert isinstance(command, LinkUserToPenaCommand)
    assert command.token == "tok-1"
    assert command.account_id == 88
    assert command.nickname == "nick"
    assert command.position == "mid"


@pytest.mark.parametrize(
    ("error", "status_code", "detail"),
    [
        (InvalidLinkTokenError(), 400, "Invalid or expired link token"),
        (UserAlreadyLinkedError(), 409, "User is already linked to this pena"),
        (UserProfileNotFoundError(), 404, "User player profile not found"),
    ],
)
def test_consume_link_token_maps_domain_errors_to_http(error, status_code, detail):
    with pytest.raises(HTTPException) as exc:
        penas_controller.consume_link_token(
            ConsumeLinkTokenRequest(token="tok-1", nickname=None, position=None),
            session=_session(user_type="user", user_id=88),
            command_bus=_RaisingCommandBus(error),
        )

    assert exc.value.status_code == status_code
    assert exc.value.detail == detail


def test_create_player_claim_token_success():
    bus = _LinkCommandBus(
        PenaLinkToken(token="claim-1", pena_guid="pena-1", expires_at=12345, player_guid="player-9")
    )
    response = penas_controller.create_player_claim_token(
        "pena-1",
        "player-9",
        admin_session=_session(user_type="admin", user_id=5),
        command_bus=bus,
    )

    assert response.token == "claim-1"
    assert response.player_guid == "player-9"
    command = bus.last_command
    assert isinstance(command, GeneratePenaClaimTokenCommand)
    assert command.admin_id == 5
    assert command.pena_guid == "pena-1"
    assert command.player_guid == "player-9"
    assert command.ttl_seconds == penas_controller.app_config.LINK_TOKEN_TTL_SECONDS


@pytest.mark.parametrize(
    ("error", "status_code", "detail"),
    [
        (PenaLinkAccessDeniedError(), 403, "Admin does not manage this pena"),
        (PlayerNotClaimableError(), 404, "Player is not a claimable guest of this pena"),
        (PlayerAlreadyClaimedError(), 409, "Player has already been linked to an account"),
    ],
)
def test_create_player_claim_token_maps_domain_errors(error, status_code, detail):
    with pytest.raises(HTTPException) as exc:
        penas_controller.create_player_claim_token(
            "pena-1",
            "player-9",
            admin_session=_session(user_type="admin", user_id=5),
            command_bus=_RaisingCommandBus(error),
        )
    assert exc.value.status_code == status_code
    assert exc.value.detail == detail


def test_inspect_claim_token_returns_preview():
    class _Bus:
        def ask(self, query):
            assert isinstance(query, InspectClaimTokenQuery)
            assert query.token == "tok-claim"
            return ClaimTokenInfo(
                pena_guid="pena-1",
                pena_name="Los Amigos",
                player_guid="player-9",
                player_name="Ana",
                player_nickname="Nani",
                expires_at=999,
            )

    response = penas_controller.inspect_claim_token("tok-claim", query_bus=_Bus())

    assert response.pena_name == "Los Amigos"
    assert response.player_guid == "player-9"
    assert response.player_nickname == "Nani"


def test_inspect_claim_token_maps_invalid_token():
    with pytest.raises(HTTPException) as exc:
        penas_controller.inspect_claim_token(
            "missing", query_bus=_RaisingQueryBus(InvalidLinkTokenError())
        )
    assert exc.value.status_code == 400
    assert exc.value.detail == "Invalid or expired link token"


def test_register_and_claim_player_success(monkeypatch):
    bus = _LinkCommandBus(
        ClaimRegistration(
            account_id=7, account_guid="acc-7", player_guid="player-9", pena_guid="pena-1"
        )
    )

    def _fake_create_session(_db, *, user_id, user_guid, user_type):
        assert user_id == 7
        assert user_guid == "acc-7"
        assert user_type == "user"
        return SessionData(
            token="session-tok",
            user_id=user_id,
            user_guid=user_guid,
            user_type=user_type,
            expires_at=4242,
        )

    monkeypatch.setattr(penas_controller, "create_session", _fake_create_session)

    http_response = Response()
    response = penas_controller.register_and_claim_player(
        RegisterAndClaimRequest(token="tok-claim", username="ana", password="secret"),
        http_response,
        command_bus=bus,
        db=object(),
    )

    assert "session=session-tok" in http_response.headers.get("set-cookie", "")
    assert response.token == "session-tok"
    assert response.user_guid == "acc-7"
    assert response.expires_at == 4242
    command = bus.last_command
    assert isinstance(command, RegisterAndClaimPlayerCommand)
    assert command.token == "tok-claim"
    assert command.username == "ana"
    assert command.password == "secret"


@pytest.mark.parametrize(
    ("error", "status_code", "detail"),
    [
        (InvalidLinkTokenError(), 400, "Invalid or expired link token"),
        (PlayerAlreadyClaimedError(), 409, "Player has already been linked to an account"),
    ],
)
def test_register_and_claim_player_maps_domain_errors(error, status_code, detail):
    with pytest.raises(HTTPException) as exc:
        penas_controller.register_and_claim_player(
            RegisterAndClaimRequest(token="tok-claim", username="ana", password="secret"),
            Response(),
            command_bus=_RaisingCommandBus(error),
            db=object(),
        )
    assert exc.value.status_code == status_code
    assert exc.value.detail == detail


def test_attach_account_to_claim_success():
    bus = _LinkCommandBus(ClaimLink(player_guid="own-60", pena_guid="pena-1"))
    response = penas_controller.attach_account_to_claim(
        ConsumeLinkTokenRequest(token="tok-link"),
        session=_session(user_type="user", user_id=42),
        command_bus=bus,
    )

    assert response.pena_guid == "pena-1"
    assert response.player_guid == "own-60"
    command = bus.last_command
    assert isinstance(command, LinkExistingAccountToClaimCommand)
    assert command.token == "tok-link"
    assert command.account_id == 42


@pytest.mark.parametrize(
    ("error", "status_code", "detail"),
    [
        (InvalidLinkTokenError(), 400, "Invalid or expired link token"),
        (UserAlreadyLinkedError(), 409, "User is already linked to this pena"),
        (PlayerAlreadyClaimedError(), 409, "Player has already been linked to an account"),
    ],
)
def test_attach_account_to_claim_maps_domain_errors(error, status_code, detail):
    with pytest.raises(HTTPException) as exc:
        penas_controller.attach_account_to_claim(
            ConsumeLinkTokenRequest(token="tok-link"),
            session=_session(user_type="user", user_id=42),
            command_bus=_RaisingCommandBus(error),
        )
    assert exc.value.status_code == status_code
    assert exc.value.detail == detail


def test_get_pena_link_command_bus_registers_claim_handlers(monkeypatch):
    class _Repo:
        def __init__(self, db):
            pass

    monkeypatch.setattr(use_case_dependencies, "SqlAlchemyPenaLinkRepository", _Repo)

    command_bus = use_case_dependencies.get_pena_link_command_bus(db="db-session")
    query_bus = use_case_dependencies.get_pena_link_query_bus(db="db-session")

    assert GeneratePenaClaimTokenCommand in command_bus._handlers
    assert RegisterAndClaimPlayerCommand in command_bus._handlers
    assert LinkExistingAccountToClaimCommand in command_bus._handlers
    assert InspectClaimTokenQuery in query_bus._handlers


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


def test_get_pena_link_command_bus_builds_expected_dependencies(monkeypatch):
    from shared.application.bus.buses import CommandBus

    captured: dict[str, object] = {}

    class _Repo:
        def __init__(self, db):
            captured["db"] = db

    monkeypatch.setattr(use_case_dependencies, "SqlAlchemyPenaLinkRepository", _Repo)

    bus = penas_controller.get_pena_link_command_bus(db="db-session")
    assert isinstance(bus, CommandBus)
    assert captured["db"] == "db-session"
    assert GeneratePenaLinkTokenCommand in bus._handlers
    assert LinkUserToPenaCommand in bus._handlers


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


def test_get_pena_accountability_buses_build_expected_dependencies(monkeypatch):
    from shared.application.bus.buses import CommandBus, QueryBus

    captured: dict[str, object] = {}

    class _Repo:
        def __init__(self, db):
            captured["db"] = db

    monkeypatch.setattr(use_case_dependencies, "SqlAlchemyPenaAccountabilityRepository", _Repo)

    query_bus = penas_controller.get_pena_accountability_query_bus(db="db-session")
    command_bus = penas_controller.get_pena_accountability_command_bus(db="db-session")
    assert isinstance(query_bus, QueryBus)
    assert isinstance(command_bus, CommandBus)
    assert captured["db"] == "db-session"
    assert GetPenaAccountabilityQuery in query_bus._handlers
    assert ListPenaTransactionsQuery in query_bus._handlers
    assert UpdateAccountabilitySettingsCommand in command_bus._handlers
    assert RecordTransactionCommand in command_bus._handlers


class _AccountabilityQueryBus:
    def __init__(self, info, player_guid=None, transaction_page=None):
        self._info = info
        self._player_guid = player_guid
        self._transaction_page = transaction_page
        self.last_transactions_query = None

    def ask(self, query):
        if isinstance(query, GetPenaAccountabilityQuery):
            return self._info
        if isinstance(query, ListPenaTransactionsQuery):
            self.last_transactions_query = query
            return self._transaction_page
        if isinstance(query, GetPlayerGuidForAccountQuery):
            return self._player_guid
        raise AssertionError(f"unexpected query {type(query)!r}")


class _AccountabilityCommandBus:
    def __init__(self, info):
        self._info = info
        self.last_command = None

    def dispatch(self, command):
        self.last_command = command
        return self._info


def test_get_pena_accountability_for_admin_returns_full_payload():
    bus = _AccountabilityQueryBus(_accountability_info())
    response = penas_controller.get_pena_accountability(
        "pena-1",
        session=_session(user_type="admin", user_id=7),
        query_bus=bus,
    )

    assert response.total_balance_cents == 18_800
    assert response.opening_balance_cents == 20_000
    assert len(response.member_accounts) == 1
    assert len(response.monthly_cashflow) == 2
    assert response.outstanding_dues_cents == 1200
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
    bus = _AccountabilityQueryBus(info, player_guid="player-1")

    response = penas_controller.get_pena_accountability(
        "pena-1",
        session=_session(user_type="user", user_id=9),
        query_bus=bus,
    )

    assert response.total_balance_cents is None
    assert response.outstanding_dues_cents is None
    assert response.member_accounts == []
    assert response.monthly_cashflow == []
    # expenses_visibility=summary still exposes the expense total to users
    assert response.total_expense_cents == 3000
    assert response.my_account is not None
    assert response.my_account.player_guid == "player-1"


def test_list_pena_transactions_admin_uses_requested_filter():
    bus = _AccountabilityQueryBus(_accountability_info(), transaction_page=_transaction_page())
    response = penas_controller.list_pena_transactions(
        "pena-1",
        page=1,
        page_size=10,
        type="expense",
        session=_session(user_type="admin", user_id=7),
        query_bus=bus,
    )

    assert response.total == 1
    assert response.total_pages == 1
    assert response.items[0].concept == "Stadium Lighting Repair"
    assert bus.last_transactions_query.type_filter == "expense"


def test_list_pena_transactions_user_without_visibility_gets_empty_page():
    info = PenaAccountabilityInfo(
        **{
            **_accountability_info().__dict__,
            "budget_visibility": "summary",
            "expenses_visibility": "summary",
        }
    )
    bus = _AccountabilityQueryBus(info, transaction_page=_transaction_page())
    response = penas_controller.list_pena_transactions(
        "pena-1",
        page=1,
        page_size=10,
        type=None,
        session=_session(user_type="user", user_id=9),
        query_bus=bus,
    )

    assert response.total == 0
    assert response.items == []
    # no ledger query issued once visibility is denied
    assert bus.last_transactions_query is None


def test_get_pena_accountability_maps_not_found_error():
    with pytest.raises(HTTPException) as exc:
        penas_controller.get_pena_accountability(
            "pena-missing",
            session=_session(user_type="admin", user_id=1),
            query_bus=_RaisingQueryBus(PenaAccountabilityPenaNotFoundError()),
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
    with pytest.raises(HTTPException) as exc:
        penas_controller.update_pena_accountability(
            "pena-1",
            payload=UpdatePenaAccountabilityRequest(balance_cents=0),
            admin_session=_session(user_type="admin", user_id=3),
            command_bus=_RaisingCommandBus(error),
        )

    assert exc.value.status_code == status_code
    assert exc.value.detail == detail


def test_upsert_member_accountability_success_builds_command():
    bus = _AccountabilityCommandBus(_accountability_info())
    response = penas_controller.upsert_member_accountability(
        "pena-1",
        "player-1",
        payload=UpsertPenaMemberAccountRequest(debt_cents=400, contribution_cents=100, note="x"),
        admin_session=_session(user_type="admin", user_id=3),
        command_bus=bus,
    )

    assert response.member_accounts[0].player_guid == "player-1"
    command = bus.last_command
    assert isinstance(command, UpsertMemberAccountCommand)
    assert command.player_guid == "player-1"
    assert command.debt_cents == 400
    assert command.contribution_cents == 100
    assert command.note == "x"


def test_record_pena_transaction_success_builds_command():
    bus = _AccountabilityCommandBus(_accountability_info())
    response = penas_controller.record_pena_transaction(
        "pena-1",
        payload=RecordPenaTransactionRequest(
            type="income",
            amount_cents=5000,
            concept="Monthly Membership Fee",
            occurred_on=date(2026, 3, 2),
            entity="Antonio Conte",
            category="membership",
            note="Membership #442",
            player_guid="player-1",
        ),
        admin_session=_session(user_type="admin", user_id=3),
        command_bus=bus,
    )

    assert response.total_balance_cents == 18_800
    command = bus.last_command
    assert isinstance(command, RecordTransactionCommand)
    assert command.type == "income"
    assert command.amount_cents == 5000
    assert command.concept == "Monthly Membership Fee"
    assert command.occurred_on == date(2026, 3, 2)
    assert command.entity == "Antonio Conte"
    assert command.category == "membership"
    assert command.note == "Membership #442"
    assert command.player_guid == "player-1"


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
        (
            "delete_pena_transaction",
            PenaAccountabilityTransactionNotFoundError(),
            404,
            "Transaction not found",
        ),
    ],
)
def test_accountability_mutations_map_not_found_errors(fn_name, error, status_code, detail):
    bus = _RaisingCommandBus(error)
    with pytest.raises(HTTPException) as exc:
        if fn_name == "upsert_member_accountability":
            penas_controller.upsert_member_accountability(
                "pena-1",
                "player-1",
                payload=UpsertPenaMemberAccountRequest(debt_cents=0, contribution_cents=0),
                admin_session=_session(user_type="admin", user_id=1),
                command_bus=bus,
            )
        elif fn_name == "delete_member_accountability":
            penas_controller.delete_member_accountability(
                "pena-1",
                "player-1",
                admin_session=_session(user_type="admin", user_id=1),
                command_bus=bus,
            )
        else:
            penas_controller.delete_pena_transaction(
                "pena-1",
                "tx-1",
                admin_session=_session(user_type="admin", user_id=1),
                command_bus=bus,
            )

    assert exc.value.status_code == status_code
    assert exc.value.detail == detail
