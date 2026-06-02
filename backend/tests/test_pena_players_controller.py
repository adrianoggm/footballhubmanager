import pytest
from api.interface.controller.v1 import pena_players_controller
from api.interface.controller.v1.model.request.pena_players_request import (
    CreateGuestPlayerRequest,
    UpdatePenaMembershipRequest,
)
from auth.dependencies import require_user
from auth.session import SessionData
from fastapi import HTTPException
from persistence.application.update_policies import FieldUpdate
from persistence.application.use_cases.get_pena_players_usecase import (
    PenaPlayerInfo,
    PenaPlayersPage,
)
from persistence.application.use_cases.manage_pena_membership_usecase import (
    InvalidPenaGuestPlayerDataError,
    InvalidPenaMembershipUpdateDataError,
    PenaMembershipAccessDeniedError,
    PenaMembershipInfo,
    PenaMembershipInvalidNationalityError,
    PenaMembershipNotFoundError,
    PenaMembershipPenaNotFoundError,
    PenaMembershipPlayerNotFoundError,
    PenaMembershipUserProfileNotFoundError,
)


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


def test_clean_handles_none_blank_and_trimmed_values():
    assert pena_players_controller._clean(None) is None
    assert pena_players_controller._clean("   ") is None
    assert pena_players_controller._clean("  text  ") == "text"


def test_create_guest_player_for_admin_success():
    class _UseCase:
        def __init__(self):
            self.last_call: dict | None = None

        def create_guest_for_admin(self, *, pena_guid: str, admin_id: int, data):
            self.last_call = {"pena_guid": pena_guid, "admin_id": admin_id, "data": data}
            return _membership("player-created")

    use_case = _UseCase()
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
        use_case=use_case,
    )

    assert response.player_guid == "player-created"
    assert use_case.last_call is not None
    assert use_case.last_call["pena_guid"] == "pena-1"
    assert use_case.last_call["admin_id"] == 5
    assert use_case.last_call["data"].name == "Ana"


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
    class _UseCase:
        def create_guest_for_admin(self, **_kwargs):
            raise error

    with pytest.raises(HTTPException) as exc:
        pena_players_controller.create_guest_player_for_admin(
            "pena-1",
            payload=CreateGuestPlayerRequest(
                name="Ana",
                surname1="Lopez",
                nationality="ES",
            ),
            admin_session=_session(user_type="admin", user_id=5),
            use_case=_UseCase(),
        )
    assert exc.value.status_code == status_code
    assert exc.value.detail == detail


def test_get_pena_players_builds_clean_filters_and_total_pages():
    class _UseCase:
        def __init__(self):
            self.last_call: dict | None = None

        def execute(self, pena_guid: str, *, filters, page: int, page_size: int):
            self.last_call = {
                "pena_guid": pena_guid,
                "filters": filters,
                "page": page,
                "page_size": page_size,
            }
            return _players_page(total=21, page=page, page_size=page_size)

    use_case = _UseCase()
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
        use_case=use_case,
        _session=object(),
    )

    assert response.page == 2
    assert response.total_pages == 2
    assert response.items[0].guid == "player-1"
    assert use_case.last_call is not None
    filters = use_case.last_call["filters"]
    assert filters.name == "Ana"
    assert filters.surname1 is None
    assert filters.nationality == "ES"
    assert filters.nickname == "Nani"
    assert filters.position == "MID"
    assert filters.search == "team"


def test_get_pena_player_membership_returns_membership():
    class _UseCase:
        def get_for_player(self, *, pena_guid: str, player_guid: str):
            assert pena_guid == "pena-1"
            assert player_guid == "player-1"
            return _membership(player_guid)

    response = pena_players_controller.get_pena_player_membership(
        "pena-1",
        "player-1",
        use_case=_UseCase(),
        _session=object(),
    )
    assert response.player_guid == "player-1"


@pytest.mark.parametrize(
    ("error", "status_code", "detail"),
    [
        (PenaMembershipPenaNotFoundError(), 404, "Pena not found"),
        (PenaMembershipPlayerNotFoundError(), 404, "Player not found"),
        (PenaMembershipNotFoundError(), 404, "Player is not linked to this pena"),
    ],
)
def test_get_pena_player_membership_maps_errors(error, status_code, detail):
    class _UseCase:
        def get_for_player(self, **_kwargs):
            raise error

    with pytest.raises(HTTPException) as exc:
        pena_players_controller.get_pena_player_membership(
            "pena-1",
            "player-1",
            use_case=_UseCase(),
            _session=object(),
        )
    assert exc.value.status_code == status_code
    assert exc.value.detail == detail


def test_get_my_pena_membership_requires_user_session():
    with pytest.raises(HTTPException) as exc:
        require_user(_session(user_type="admin", user_id=1))
    assert exc.value.status_code == 403
    assert exc.value.detail == "User access required"


def test_get_my_pena_membership_success():
    class _UseCase:
        def get_for_user(self, *, pena_guid: str, account_id: int):
            assert pena_guid == "pena-1"
            assert account_id == 22
            return _membership("player-22")

    response = pena_players_controller.get_my_pena_membership(
        "pena-1",
        session=_session(user_type="user", user_id=22),
        use_case=_UseCase(),
    )
    assert response.player_guid == "player-22"


@pytest.mark.parametrize(
    ("error", "status_code", "detail"),
    [
        (PenaMembershipPenaNotFoundError(), 404, "Pena not found"),
        (PenaMembershipUserProfileNotFoundError(), 404, "User player profile not found"),
        (PenaMembershipAccessDeniedError(), 403, "User does not belong to this pena"),
    ],
)
def test_get_my_pena_membership_maps_errors(error, status_code, detail):
    class _UseCase:
        def get_for_user(self, **_kwargs):
            raise error

    with pytest.raises(HTTPException) as exc:
        pena_players_controller.get_my_pena_membership(
            "pena-1",
            session=_session(user_type="user", user_id=22),
            use_case=_UseCase(),
        )
    assert exc.value.status_code == status_code
    assert exc.value.detail == detail


def test_update_my_pena_membership_sets_partial_flags():
    class _UseCase:
        def __init__(self):
            self.last_call: dict | None = None

        def update_for_user(self, *, pena_guid: str, account_id: int, update):
            self.last_call = {"pena_guid": pena_guid, "account_id": account_id, "update": update}
            return _membership("player-22")

    use_case = _UseCase()
    payload = UpdatePenaMembershipRequest(nickname="Neo")
    response = pena_players_controller.update_my_pena_membership(
        "pena-1",
        payload=payload,
        session=_session(user_type="user", user_id=22),
        use_case=use_case,
    )

    assert response.player_guid == "player-22"
    update = use_case.last_call["update"]
    assert update.nickname == FieldUpdate.set("Neo")
    assert update.position == FieldUpdate.keep()


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
    class _UseCase:
        def update_for_user(self, **_kwargs):
            raise error

    with pytest.raises(HTTPException) as exc:
        pena_players_controller.update_my_pena_membership(
            "pena-1",
            payload=UpdatePenaMembershipRequest(nickname="Neo"),
            session=_session(user_type="user", user_id=22),
            use_case=_UseCase(),
        )
    assert exc.value.status_code == status_code
    assert exc.value.detail == detail


def test_remove_my_pena_membership_returns_204():
    class _UseCase:
        def __init__(self):
            self.last_call: dict | None = None

        def remove_for_user(self, *, pena_guid: str, account_id: int):
            self.last_call = {"pena_guid": pena_guid, "account_id": account_id}

    use_case = _UseCase()
    response = pena_players_controller.remove_my_pena_membership(
        "pena-1",
        session=_session(user_type="user", user_id=22),
        use_case=use_case,
    )

    assert response.status_code == 204
    assert use_case.last_call == {"pena_guid": "pena-1", "account_id": 22}


@pytest.mark.parametrize(
    ("error", "status_code", "detail"),
    [
        (PenaMembershipPenaNotFoundError(), 404, "Pena not found"),
        (PenaMembershipUserProfileNotFoundError(), 404, "User player profile not found"),
        (PenaMembershipAccessDeniedError(), 403, "User does not belong to this pena"),
    ],
)
def test_remove_my_pena_membership_maps_errors(error, status_code, detail):
    class _UseCase:
        def remove_for_user(self, **_kwargs):
            raise error

    with pytest.raises(HTTPException) as exc:
        pena_players_controller.remove_my_pena_membership(
            "pena-1",
            session=_session(user_type="user", user_id=22),
            use_case=_UseCase(),
        )
    assert exc.value.status_code == status_code
    assert exc.value.detail == detail


def test_update_pena_player_membership_as_admin_sets_partial_flags():
    class _UseCase:
        def __init__(self):
            self.last_call: dict | None = None

        def update_for_admin(self, *, pena_guid: str, admin_id: int, player_guid: str, update):
            self.last_call = {
                "pena_guid": pena_guid,
                "admin_id": admin_id,
                "player_guid": player_guid,
                "update": update,
            }
            return _membership(player_guid)

    use_case = _UseCase()
    payload = UpdatePenaMembershipRequest(position="DEF")
    response = pena_players_controller.update_pena_player_membership_as_admin(
        "pena-1",
        "player-9",
        payload=payload,
        admin_session=_session(user_type="admin", user_id=5),
        use_case=use_case,
    )

    assert response.player_guid == "player-9"
    update = use_case.last_call["update"]
    assert update.position == FieldUpdate.set("DEF")
    assert update.nickname == FieldUpdate.keep()


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
    class _UseCase:
        def update_for_admin(self, **_kwargs):
            raise error

    with pytest.raises(HTTPException) as exc:
        pena_players_controller.update_pena_player_membership_as_admin(
            "pena-1",
            "player-9",
            payload=UpdatePenaMembershipRequest(position="DEF"),
            admin_session=_session(user_type="admin", user_id=5),
            use_case=_UseCase(),
        )
    assert exc.value.status_code == status_code
    assert exc.value.detail == detail


def test_remove_pena_player_membership_as_admin_returns_204():
    class _UseCase:
        def __init__(self):
            self.last_call: dict | None = None

        def remove_for_admin(self, *, pena_guid: str, admin_id: int, player_guid: str):
            self.last_call = {
                "pena_guid": pena_guid,
                "admin_id": admin_id,
                "player_guid": player_guid,
            }

    use_case = _UseCase()
    response = pena_players_controller.remove_pena_player_membership_as_admin(
        "pena-1",
        "player-3",
        admin_session=_session(user_type="admin", user_id=1),
        use_case=use_case,
    )

    assert response.status_code == 204
    assert use_case.last_call == {"pena_guid": "pena-1", "admin_id": 1, "player_guid": "player-3"}


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
    class _UseCase:
        def remove_for_admin(self, **_kwargs):
            raise error

    with pytest.raises(HTTPException) as exc:
        pena_players_controller.remove_pena_player_membership_as_admin(
            "pena-1",
            "player-3",
            admin_session=_session(user_type="admin", user_id=1),
            use_case=_UseCase(),
        )
    assert exc.value.status_code == status_code
    assert exc.value.detail == detail
