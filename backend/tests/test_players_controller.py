import pytest
from api.interface.controller.v1 import players_controller
from api.interface.controller.v1.model.request.players_request import PlayerUpdateRequest
from auth.dependencies import require_user
from auth.session import SessionData
from core.application.models import PenaInfo, PlayerProfile
from core.application.use_cases.update_player_profile_usecase import (
    InvalidNationalityError as PlayerInvalidNationalityError,
)
from core.application.use_cases.update_player_profile_usecase import (
    InvalidPlayerUpdateDataError,
)
from core.application.use_cases.update_player_profile_usecase import (
    InvalidProfileImageError as PlayerInvalidProfileImageError,
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
    class _UseCase:
        def __init__(self):
            self.last_account_id: int | None = None

        def execute_by_account_id(self, account_id: int):
            self.last_account_id = account_id
            return _profile(guid="player-20")

    use_case = _UseCase()
    response = players_controller.get_me(
        session=_session(user_type="user", user_id=20),
        use_case=use_case,
    )

    assert use_case.last_account_id == 20
    assert response.guid == "player-20"
    assert response.name == "Ana"


def test_get_me_returns_404_when_profile_missing():
    class _UseCase:
        def execute_by_account_id(self, _account_id: int):
            return None

    with pytest.raises(HTTPException) as exc:
        players_controller.get_me(session=_session(user_type="user"), use_case=_UseCase())
    assert exc.value.status_code == 404
    assert exc.value.detail == "Player not found"


def test_update_me_rejects_non_user_session():
    with pytest.raises(HTTPException) as exc:
        require_user(_session(user_type="admin"))
    assert exc.value.status_code == 403
    assert exc.value.detail == "User access required"


def test_update_me_success_calls_use_case_with_payload_fields():
    class _UseCase:
        def __init__(self):
            self.last_call: dict | None = None

        def execute_by_account_id(self, account_id: int, update):
            self.last_call = {
                "account_id": account_id,
                "name": update.name,
                "surname1": update.surname1,
                "surname2": update.surname2,
                "nationality": update.nationality,
                "image_url": update.image_url,
            }
            return _profile(guid="player-updated")

    use_case = _UseCase()
    response = players_controller.update_me(
        PlayerUpdateRequest(
            name="Nora",
            surname1="Diaz",
            surname2="Lopez",
            nationality="ES",
            image_url="data:image/jpeg;base64,QQ==",
        ),
        session=_session(user_type="user", user_id=31),
        use_case=use_case,
    )

    assert response.guid == "player-updated"
    assert use_case.last_call == {
        "account_id": 31,
        "name": "Nora",
        "surname1": "Diaz",
        "surname2": "Lopez",
        "nationality": "ES",
        "image_url": "data:image/jpeg;base64,QQ==",
    }


@pytest.mark.parametrize(
    ("error", "status_code", "detail"),
    [
        (PlayerInvalidNationalityError(), 400, "Invalid nationality"),
        (PlayerInvalidProfileImageError(), 400, "Invalid profile image"),
        (InvalidPlayerUpdateDataError(), 400, "Invalid player update data"),
    ],
)
def test_update_me_maps_validation_errors(error, status_code, detail):
    class _UseCase:
        def execute_by_account_id(self, _account_id: int, _update):
            raise error

    with pytest.raises(HTTPException) as exc:
        players_controller.update_me(
            PlayerUpdateRequest(name="Nora"),
            session=_session(user_type="user"),
            use_case=_UseCase(),
        )
    assert exc.value.status_code == status_code
    assert exc.value.detail == detail


def test_update_me_returns_404_when_use_case_returns_none():
    class _UseCase:
        def execute_by_account_id(self, _account_id: int, _update):
            return None

    with pytest.raises(HTTPException) as exc:
        players_controller.update_me(
            PlayerUpdateRequest(name="Nora"),
            session=_session(user_type="user"),
            use_case=_UseCase(),
        )
    assert exc.value.status_code == 404
    assert exc.value.detail == "Player not found"


def test_get_player_returns_profile():
    class _UseCase:
        def execute_by_guid(self, player_guid: str):
            return _profile(guid=player_guid)

    response = players_controller.get_player(
        "player-7",
        _session=object(),
        use_case=_UseCase(),
    )

    assert response.guid == "player-7"
    assert response.nationality == "ES"


def test_get_player_returns_404_when_profile_is_missing():
    class _UseCase:
        def execute_by_guid(self, _player_guid: str):
            return None

    with pytest.raises(HTTPException) as exc:
        players_controller.get_player("missing", _session=object(), use_case=_UseCase())
    assert exc.value.status_code == 404
    assert exc.value.detail == "Player not found"
