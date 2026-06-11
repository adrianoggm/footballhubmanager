import pytest
from api.interface.controller.v1 import pena_players_controller
from api.interface.controller.v1.model.request.pena_players_request import (
    CreateGuestPlayerRequest,
    UpdatePenaMembershipRequest,
)
from auth.dependencies import require_user
from auth.session import SessionData
from core.application.commands.pena_membership_commands import (
    CreateGuestPlayerCommand,
    RemoveMembershipForAdminCommand,
    RemoveMembershipForUserCommand,
    UpdateMembershipForAdminCommand,
    UpdateMembershipForUserCommand,
)
from core.application.models import (
    PenaMembershipInfo,
    PenaPlayerInfo,
    PenaPlayersPage,
)
from core.application.policies import FieldUpdate
from core.application.queries.pena_membership_queries import (
    GetPenaMembershipForPlayerQuery,
    GetPenaMembershipForUserQuery,
)
from core.domain.errors import (
    InvalidPenaGuestPlayerDataError,
    InvalidPenaMembershipUpdateDataError,
    PenaMembershipAccessDeniedError,
    PenaMembershipInvalidNationalityError,
    PenaMembershipNotFoundError,
    PenaMembershipPenaNotFoundError,
    PenaMembershipPlayerNotFoundError,
    PenaMembershipUserProfileNotFoundError,
)
from fastapi import HTTPException


def _session(*, user_type: str, user_id: int) -> SessionData:
    return SessionData(
        token="tok",
        user_id=user_id,
        user_guid=f"{user_type}-guid",
        user_type=user_type,
        expires_at=9999999999,
    )


def _membership(player_guid: str = "player-1") -> PenaMembershipInfo:
    return PenaMembershipInfo(
        pena_guid="pena-1",
        player_guid=player_guid,
        name="Ana",
        surname1="Lopez",
        surname2=None,
        nationality="ES",
        nickname="Nani",
        position="MID",
        role="member",
    )


def _players_page(total: int, page: int = 1, page_size: int = 20) -> PenaPlayersPage:
    return PenaPlayersPage(
        items=[
            PenaPlayerInfo(
                guid="player-1",
                name="Ana",
                surname1="Lopez",
                surname2=None,
                nationality="ES",
                nickname="Nani",
                position="MID",
            )
        ],
        page=page,
        page_size=page_size,
        total=total,
    )


class _CommandBus:
    def __init__(self, result=None):
        self._result = result
        self.last_command = None

    def dispatch(self, command):
        self.last_command = command
        return self._result


class _QueryBus:
    def __init__(self, result=None):
        self._result = result
        self.last_query = None

    def ask(self, query):
        self.last_query = query
        return self._result


class _RaisingCommandBus:
    def __init__(self, error):
        self._error = error

    def dispatch(self, _command):
        raise self._error


class _RaisingQueryBus:
    def __init__(self, error):
        self._error = error

    def ask(self, _query):
        raise self._error


def test_clean_handles_none_blank_and_trimmed_values():
    assert pena_players_controller._clean(None) is None
    assert pena_players_controller._clean("   ") is None
    assert pena_players_controller._clean("  text  ") == "text"


def test_create_guest_player_for_admin_success():
    bus = _CommandBus(_membership("player-created"))
    response = pena_players_controller.create_guest_player_for_admin(
        "pena-1",
        payload=CreateGuestPlayerRequest(
            name="Ana",
            surname1="Lopez",
            surname2=None,
            nationality="ES",
            nickname="Nani",
            position="MID",
        ),
        admin_session=_session(user_type="admin", user_id=5),
        command_bus=bus,
    )

    assert response.player_guid == "player-created"
    command = bus.last_command
    assert isinstance(command, CreateGuestPlayerCommand)
    assert command.pena_guid == "pena-1"
    assert command.admin_id == 5
    assert command.name == "Ana"


@pytest.mark.parametrize(
    ("error", "status_code", "detail"),
    [
        (InvalidPenaGuestPlayerDataError(), 400, "Invalid guest player data"),
        (PenaMembershipPenaNotFoundError(), 404, "Pena not found"),
        (PenaMembershipAccessDeniedError(), 403, "Admin does not manage this pena"),
        (PenaMembershipInvalidNationalityError(), 400, "Invalid nationality"),
    ],
)
def test_create_guest_player_for_admin_maps_errors(error, status_code, detail):
    with pytest.raises(HTTPException) as exc:
        pena_players_controller.create_guest_player_for_admin(
            "pena-1",
            payload=CreateGuestPlayerRequest(name="Ana", surname1="Lopez", nationality="ES"),
            admin_session=_session(user_type="admin", user_id=5),
            command_bus=_RaisingCommandBus(error),
        )
    assert exc.value.status_code == status_code
    assert exc.value.detail == detail


def test_get_pena_players_builds_clean_filters_and_total_pages():
    bus = _QueryBus()

    def _ask(query):
        bus.last_query = query
        return _players_page(total=21, page=query.page, page_size=query.page_size)

    bus.ask = _ask
    response = pena_players_controller.get_pena_players(
        "pena-1",
        page=2,
        page_size=20,
        name=" Ana ",
        surname1="  ",
        surname2=None,
        nationality=" ES ",
        nickname=" Nani ",
        position=" MID ",
        search=" team ",
        query_bus=bus,
        _session=object(),
    )

    assert response.page == 2
    assert response.total_pages == 2
    assert response.items[0].guid == "player-1"
    assert bus.last_query.pena_guid == "pena-1"
    filters = bus.last_query.filters
    assert filters.name == "Ana"
    assert filters.surname1 is None
    assert filters.nationality == "ES"
    assert filters.nickname == "Nani"
    assert filters.position == "MID"
    assert filters.search == "team"


def test_get_pena_player_membership_returns_membership():
    bus = _QueryBus(_membership("player-1"))
    response = pena_players_controller.get_pena_player_membership(
        "pena-1", "player-1", query_bus=bus, _session=object()
    )
    assert response.player_guid == "player-1"
    assert isinstance(bus.last_query, GetPenaMembershipForPlayerQuery)
    assert bus.last_query.player_guid == "player-1"


@pytest.mark.parametrize(
    ("error", "status_code", "detail"),
    [
        (PenaMembershipPenaNotFoundError(), 404, "Pena not found"),
        (PenaMembershipPlayerNotFoundError(), 404, "Player not found"),
        (PenaMembershipNotFoundError(), 404, "Player is not linked to this pena"),
    ],
)
def test_get_pena_player_membership_maps_errors(error, status_code, detail):
    with pytest.raises(HTTPException) as exc:
        pena_players_controller.get_pena_player_membership(
            "pena-1", "player-1", query_bus=_RaisingQueryBus(error), _session=object()
        )
    assert exc.value.status_code == status_code
    assert exc.value.detail == detail


def test_get_my_pena_membership_requires_user_session():
    with pytest.raises(HTTPException) as exc:
        require_user(_session(user_type="admin", user_id=1))
    assert exc.value.status_code == 403
    assert exc.value.detail == "User access required"


def test_get_my_pena_membership_success():
    bus = _QueryBus(_membership("player-22"))
    response = pena_players_controller.get_my_pena_membership(
        "pena-1", session=_session(user_type="user", user_id=22), query_bus=bus
    )
    assert response.player_guid == "player-22"
    assert isinstance(bus.last_query, GetPenaMembershipForUserQuery)
    assert bus.last_query.account_id == 22


@pytest.mark.parametrize(
    ("error", "status_code", "detail"),
    [
        (PenaMembershipPenaNotFoundError(), 404, "Pena not found"),
        (PenaMembershipUserProfileNotFoundError(), 404, "User player profile not found"),
        (PenaMembershipAccessDeniedError(), 403, "User does not belong to this pena"),
    ],
)
def test_get_my_pena_membership_maps_errors(error, status_code, detail):
    with pytest.raises(HTTPException) as exc:
        pena_players_controller.get_my_pena_membership(
            "pena-1",
            session=_session(user_type="user", user_id=22),
            query_bus=_RaisingQueryBus(error),
        )
    assert exc.value.status_code == status_code
    assert exc.value.detail == detail


def test_update_my_pena_membership_sets_partial_flags():
    bus = _CommandBus(_membership("player-22"))
    response = pena_players_controller.update_my_pena_membership(
        "pena-1",
        payload=UpdatePenaMembershipRequest(nickname="Neo"),
        session=_session(user_type="user", user_id=22),
        command_bus=bus,
    )

    assert response.player_guid == "player-22"
    command = bus.last_command
    assert isinstance(command, UpdateMembershipForUserCommand)
    assert command.nickname == FieldUpdate.set("Neo")
    assert command.position == FieldUpdate.keep()


@pytest.mark.parametrize(
    ("error", "status_code", "detail"),
    [
        (InvalidPenaMembershipUpdateDataError(), 400, "Invalid membership update data"),
        (PenaMembershipPenaNotFoundError(), 404, "Pena not found"),
        (PenaMembershipUserProfileNotFoundError(), 404, "User player profile not found"),
        (PenaMembershipAccessDeniedError(), 403, "User does not belong to this pena"),
    ],
)
def test_update_my_pena_membership_maps_errors(error, status_code, detail):
    with pytest.raises(HTTPException) as exc:
        pena_players_controller.update_my_pena_membership(
            "pena-1",
            payload=UpdatePenaMembershipRequest(nickname="Neo"),
            session=_session(user_type="user", user_id=22),
            command_bus=_RaisingCommandBus(error),
        )
    assert exc.value.status_code == status_code
    assert exc.value.detail == detail


def test_remove_my_pena_membership_returns_204():
    bus = _CommandBus()
    response = pena_players_controller.remove_my_pena_membership(
        "pena-1", session=_session(user_type="user", user_id=22), command_bus=bus
    )

    assert response.status_code == 204
    command = bus.last_command
    assert isinstance(command, RemoveMembershipForUserCommand)
    assert command.pena_guid == "pena-1"
    assert command.account_id == 22


@pytest.mark.parametrize(
    ("error", "status_code", "detail"),
    [
        (PenaMembershipPenaNotFoundError(), 404, "Pena not found"),
        (PenaMembershipUserProfileNotFoundError(), 404, "User player profile not found"),
        (PenaMembershipAccessDeniedError(), 403, "User does not belong to this pena"),
    ],
)
def test_remove_my_pena_membership_maps_errors(error, status_code, detail):
    with pytest.raises(HTTPException) as exc:
        pena_players_controller.remove_my_pena_membership(
            "pena-1",
            session=_session(user_type="user", user_id=22),
            command_bus=_RaisingCommandBus(error),
        )
    assert exc.value.status_code == status_code
    assert exc.value.detail == detail


def test_update_pena_player_membership_as_admin_sets_partial_flags():
    bus = _CommandBus(_membership("player-9"))
    response = pena_players_controller.update_pena_player_membership_as_admin(
        "pena-1",
        "player-9",
        payload=UpdatePenaMembershipRequest(position="DEF"),
        admin_session=_session(user_type="admin", user_id=5),
        command_bus=bus,
    )

    assert response.player_guid == "player-9"
    command = bus.last_command
    assert isinstance(command, UpdateMembershipForAdminCommand)
    assert command.position == FieldUpdate.set("DEF")
    assert command.nickname == FieldUpdate.keep()


@pytest.mark.parametrize(
    ("error", "status_code", "detail"),
    [
        (InvalidPenaMembershipUpdateDataError(), 400, "Invalid membership update data"),
        (PenaMembershipPenaNotFoundError(), 404, "Pena not found"),
        (PenaMembershipAccessDeniedError(), 403, "Admin does not manage this pena"),
        (PenaMembershipPlayerNotFoundError(), 404, "Player not found"),
        (PenaMembershipNotFoundError(), 409, "Player is not linked to this pena"),
    ],
)
def test_update_pena_player_membership_as_admin_maps_errors(error, status_code, detail):
    with pytest.raises(HTTPException) as exc:
        pena_players_controller.update_pena_player_membership_as_admin(
            "pena-1",
            "player-9",
            payload=UpdatePenaMembershipRequest(position="DEF"),
            admin_session=_session(user_type="admin", user_id=5),
            command_bus=_RaisingCommandBus(error),
        )
    assert exc.value.status_code == status_code
    assert exc.value.detail == detail


def test_remove_pena_player_membership_as_admin_returns_204():
    bus = _CommandBus()
    response = pena_players_controller.remove_pena_player_membership_as_admin(
        "pena-1",
        "player-3",
        admin_session=_session(user_type="admin", user_id=1),
        command_bus=bus,
    )

    assert response.status_code == 204
    command = bus.last_command
    assert isinstance(command, RemoveMembershipForAdminCommand)
    assert command.pena_guid == "pena-1"
    assert command.admin_id == 1
    assert command.player_guid == "player-3"


@pytest.mark.parametrize(
    ("error", "status_code", "detail"),
    [
        (PenaMembershipPenaNotFoundError(), 404, "Pena not found"),
        (PenaMembershipAccessDeniedError(), 403, "Admin does not manage this pena"),
        (PenaMembershipPlayerNotFoundError(), 404, "Player not found"),
        (PenaMembershipNotFoundError(), 409, "Player is not linked to this pena"),
    ],
)
def test_remove_pena_player_membership_as_admin_maps_errors(error, status_code, detail):
    with pytest.raises(HTTPException) as exc:
        pena_players_controller.remove_pena_player_membership_as_admin(
            "pena-1",
            "player-3",
            admin_session=_session(user_type="admin", user_id=1),
            command_bus=_RaisingCommandBus(error),
        )
    assert exc.value.status_code == status_code
    assert exc.value.detail == detail
