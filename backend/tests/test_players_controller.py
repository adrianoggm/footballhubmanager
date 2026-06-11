import pytest
from api.interface.controller.v1 import players_controller
from api.interface.controller.v1.model.request.players_request import PlayerUpdateRequest
from auth.dependencies import require_user
from auth.session import SessionData
from core.application.commands.player_profile_commands import (
    UpdatePlayerProfileByAccountIdCommand,
)
from core.application.models import PenaInfo, PlayerProfile
from core.application.queries.player_profile_queries import (
    GetPlayerProfileByAccountIdQuery,
    GetPlayerProfileByGuidQuery,
)
from core.domain.errors import (
    InvalidPlayerNationalityError,
    InvalidPlayerUpdateDataError,
    InvalidProfileImageError,
)
from fastapi import HTTPException


def _session(*, user_type: str, user_id: int = 5) -> SessionData:
    return SessionData(
        token="tok",
        user_id=user_id,
        user_guid="guid",
        user_type=user_type,
        expires_at=9999999999,
    )


def _profile(guid: str = "player-1") -> PlayerProfile:
    return PlayerProfile(
        guid=guid,
        name="Ana",
        surname1="Lopez",
        surname2=None,
        nationality="ES",
        penas=[PenaInfo(guid="pena-1", name="Pena Uno")],
        image_url=None,
    )


def test_profile_or_404_returns_profile_when_present():
    profile = _profile()
    assert players_controller._profile_or_404(profile) == profile


def test_profile_or_404_raises_404_when_missing():
    with pytest.raises(HTTPException) as exc:
        players_controller._profile_or_404(None)
    assert exc.value.status_code == 404
    assert exc.value.detail == "Player not found"


def test_get_me_rejects_non_user_session():
    with pytest.raises(HTTPException) as exc:
        require_user(_session(user_type="admin"))
    assert exc.value.status_code == 403
    assert exc.value.detail == "User access required"


def test_get_me_returns_profile_for_user():
    class _QueryBus:
        def __init__(self):
            self.last_query = None

        def ask(self, query):
            self.last_query = query
            return _profile(guid="player-20")

    query_bus = _QueryBus()
    response = players_controller.get_me(
        session=_session(user_type="user", user_id=20),
        query_bus=query_bus,
    )

    assert query_bus.last_query == GetPlayerProfileByAccountIdQuery(account_id=20)
    assert response.guid == "player-20"
    assert response.name == "Ana"


def test_get_me_returns_404_when_profile_missing():
    class _QueryBus:
        def ask(self, _query):
            return None

    with pytest.raises(HTTPException) as exc:
        players_controller.get_me(session=_session(user_type="user"), query_bus=_QueryBus())
    assert exc.value.status_code == 404
    assert exc.value.detail == "Player not found"


def test_update_me_rejects_non_user_session():
    with pytest.raises(HTTPException) as exc:
        require_user(_session(user_type="admin"))
    assert exc.value.status_code == 403
    assert exc.value.detail == "User access required"


def test_update_me_success_dispatches_command_with_payload_fields():
    class _CommandBus:
        def __init__(self):
            self.last_command = None

        def dispatch(self, command):
            self.last_command = command
            return _profile(guid="player-updated")

    command_bus = _CommandBus()
    response = players_controller.update_me(
        PlayerUpdateRequest(
            name="Nora",
            surname1="Diaz",
            surname2="Lopez",
            nationality="ES",
            image_url="data:image/jpeg;base64,QQ==",
        ),
        session=_session(user_type="user", user_id=31),
        command_bus=command_bus,
    )

    assert command_bus.last_command == UpdatePlayerProfileByAccountIdCommand(
        account_id=31,
        name="Nora",
        surname1="Diaz",
        surname2="Lopez",
        nationality="ES",
        image_url="data:image/jpeg;base64,QQ==",
    )
    assert response.guid == "player-updated"


@pytest.mark.parametrize(
    ("error", "status_code", "detail"),
    [
        (InvalidPlayerNationalityError(), 400, "Invalid nationality"),
        (InvalidProfileImageError(), 400, "Invalid profile image"),
        (InvalidPlayerUpdateDataError(), 400, "Invalid player update data"),
    ],
)
def test_update_me_maps_validation_errors(error, status_code, detail):
    class _CommandBus:
        def dispatch(self, _command):
            raise error

    with pytest.raises(HTTPException) as exc:
        players_controller.update_me(
            PlayerUpdateRequest(name="Nora"),
            session=_session(user_type="user"),
            command_bus=_CommandBus(),
        )
    assert exc.value.status_code == status_code
    assert exc.value.detail == detail


def test_update_me_returns_404_when_command_bus_returns_none():
    class _CommandBus:
        def dispatch(self, _command):
            return None

    with pytest.raises(HTTPException) as exc:
        players_controller.update_me(
            PlayerUpdateRequest(name="Nora"),
            session=_session(user_type="user"),
            command_bus=_CommandBus(),
        )
    assert exc.value.status_code == 404
    assert exc.value.detail == "Player not found"


def test_get_player_returns_profile():
    class _QueryBus:
        def __init__(self):
            self.last_query = None

        def ask(self, query):
            self.last_query = query
            return _profile(guid="player-7")

    query_bus = _QueryBus()
    response = players_controller.get_player(
        "player-7",
        _session=object(),
        query_bus=query_bus,
    )

    assert query_bus.last_query == GetPlayerProfileByGuidQuery(player_guid="player-7")
    assert response.guid == "player-7"
    assert response.nationality == "ES"


def test_get_player_returns_404_when_profile_is_missing():
    class _QueryBus:
        def ask(self, _query):
            return None

    with pytest.raises(HTTPException) as exc:
        players_controller.get_player("missing", _session=object(), query_bus=_QueryBus())
    assert exc.value.status_code == 404
    assert exc.value.detail == "Player not found"
