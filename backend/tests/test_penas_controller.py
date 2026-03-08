from dataclasses import dataclass

import pytest
from api.interface.controller.v1 import penas_controller
from api.interface.controller.v1.model.request.pena_labels_request import UpdatePenaLabelsRequest
from api.interface.controller.v1.model.request.penas_request import ConsumeLinkTokenRequest
from auth.session import SessionData
from fastapi import HTTPException
from persistence.application.use_cases.generate_pena_link_token_usecase import (
    PenaAccessDeniedError,
    PenaLinkToken,
)
from persistence.application.use_cases.get_penas_usecase import PenaInfo, PenasPage
from persistence.application.use_cases.link_user_to_pena_usecase import (
    InvalidLinkTokenError,
    UserAlreadyLinkedError,
    UserProfileNotFoundError,
)
from persistence.application.use_cases.manage_pena_labels_usecase import (
    InvalidPenaLabelsDataError,
    PenaLabelsAccessDeniedError,
    PenaLabelsInfo,
    PenaLabelsPenaNotFoundError,
)


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


def test_page_response_handles_zero_total_pages():
    response = penas_controller._page_response(_penas_page(total=0))
    assert response.total_pages == 0
    assert response.total == 0


def test_page_response_rounds_up_total_pages():
    response = penas_controller._page_response(_penas_page(total=21, page_size=20))
    assert response.total_pages == 2


@dataclass
class _GetPenasUseCaseStub:
    page_result: PenasPage
    last_admin_call: dict | None = None
    last_user_call: dict | None = None

    def execute_for_admin(self, admin_id: int, *, page: int, page_size: int, search: str | None):
        self.last_admin_call = {
            "admin_id": admin_id,
            "page": page,
            "page_size": page_size,
            "search": search,
        }
        return PenasPage(
            items=self.page_result.items,
            page=page,
            page_size=page_size,
            total=self.page_result.total,
        )

    def execute_for_user(self, account_id: int, *, page: int, page_size: int, search: str | None):
        self.last_user_call = {
            "account_id": account_id,
            "page": page,
            "page_size": page_size,
            "search": search,
        }
        return PenasPage(
            items=self.page_result.items,
            page=page,
            page_size=page_size,
            total=self.page_result.total,
        )

    def execute_by_guid(self, pena_guid: str):
        if pena_guid == "pena-missing":
            return None
        return PenaInfo(guid=pena_guid, name="Pena Found")


def test_list_penas_for_admin_returns_page_data():
    use_case = _GetPenasUseCaseStub(page_result=_penas_page(total=21))

    response = penas_controller.list_penas(
        page=2,
        page_size=20,
        search=" madrid ",
        session=_session(user_type="admin", user_id=99),
        use_case=use_case,
    )

    assert response.total_pages == 2
    assert response.page == 2
    assert response.items[0].guid == "pena-1"
    assert use_case.last_admin_call == {
        "admin_id": 99,
        "page": 2,
        "page_size": 20,
        "search": " madrid ",
    }


def test_list_penas_for_user_returns_page_data():
    use_case = _GetPenasUseCaseStub(page_result=_penas_page(total=1))

    response = penas_controller.list_penas(
        page=1,
        page_size=20,
        search=None,
        session=_session(user_type="user", user_id=11),
        use_case=use_case,
    )

    assert response.total_pages == 1
    assert use_case.last_user_call == {"account_id": 11, "page": 1, "page_size": 20, "search": None}


def test_list_penas_rejects_invalid_session_type():
    use_case = _GetPenasUseCaseStub(page_result=_penas_page(total=1))

    with pytest.raises(HTTPException) as exc:
        penas_controller.list_penas(
            page=1,
            page_size=20,
            search=None,
            session=_session(user_type="service"),
            use_case=use_case,
        )
    assert exc.value.status_code == 403
    assert exc.value.detail == "Invalid session type"


def test_get_pena_returns_404_when_missing():
    use_case = _GetPenasUseCaseStub(page_result=_penas_page(total=1))

    with pytest.raises(HTTPException) as exc:
        penas_controller.get_pena("pena-missing", _session=object(), use_case=use_case)
    assert exc.value.status_code == 404
    assert exc.value.detail == "Pena not found"


def test_get_pena_returns_pena_when_found():
    use_case = _GetPenasUseCaseStub(page_result=_penas_page(total=1))

    response = penas_controller.get_pena("pena-xyz", _session=object(), use_case=use_case)

    assert response.guid == "pena-xyz"
    assert response.name == "Pena Found"


def test_get_pena_labels_returns_labels():
    class _UseCase:
        def get_for_pena(self, *, pena_guid: str):
            assert pena_guid == "pena-1"
            return _labels_info()

    response = penas_controller.get_pena_labels(
        "pena-1",
        _session=object(),
        use_case=_UseCase(),
    )
    assert response.role_labels == ["Capitan", "Titular"]
    assert response.position_colors == {"POR": "#111111", "DEF": "#222222"}


def test_get_pena_labels_maps_not_found_error():
    class _UseCase:
        def get_for_pena(self, **_kwargs):
            raise PenaLabelsPenaNotFoundError()

    with pytest.raises(HTTPException) as exc:
        penas_controller.get_pena_labels(
            "pena-1",
            _session=object(),
            use_case=_UseCase(),
        )
    assert exc.value.status_code == 404
    assert exc.value.detail == "Pena not found"


def test_update_pena_labels_success():
    class _UseCase:
        def __init__(self):
            self.last_call: dict | None = None

        def update_for_admin(self, *, pena_guid: str, admin_id: int, update):
            self.last_call = {
                "pena_guid": pena_guid,
                "admin_id": admin_id,
                "update": update,
            }
            return _labels_info()

    use_case = _UseCase()
    response = penas_controller.update_pena_labels(
        "pena-1",
        payload=UpdatePenaLabelsRequest(
            role_labels=["Capitan", "Titular"],
            position_labels=["POR", "DEF"],
            role_colors={"Capitan": "#ff0000"},
            position_colors={"POR": "#111111"},
        ),
        admin_session=_session(user_type="admin", user_id=99),
        use_case=use_case,
    )

    assert response.role_labels == ["Capitan", "Titular"]
    assert use_case.last_call is not None
    assert use_case.last_call["pena_guid"] == "pena-1"
    assert use_case.last_call["admin_id"] == 99
    assert use_case.last_call["update"].role_labels == ["Capitan", "Titular"]
    assert use_case.last_call["update"].position_labels == ["POR", "DEF"]


@pytest.mark.parametrize(
    ("error", "status_code", "detail"),
    [
        (InvalidPenaLabelsDataError(), 400, "Invalid pena labels data"),
        (PenaLabelsPenaNotFoundError(), 404, "Pena not found"),
        (PenaLabelsAccessDeniedError(), 403, "Admin does not manage this pena"),
    ],
)
def test_update_pena_labels_maps_domain_errors(error, status_code, detail):
    class _UseCase:
        def update_for_admin(self, **_kwargs):
            raise error

    with pytest.raises(HTTPException) as exc:
        penas_controller.update_pena_labels(
            "pena-1",
            payload=UpdatePenaLabelsRequest(
                role_labels=["Capitan"],
                position_labels=["POR"],
            ),
            admin_session=_session(user_type="admin", user_id=5),
            use_case=_UseCase(),
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
        penas_controller.consume_link_token(
            ConsumeLinkTokenRequest(token="abc"),
            session=_session(user_type="admin"),
            use_case=object(),
        )
    assert exc.value.status_code == 403
    assert exc.value.detail == "User access only"


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


def test_get_penas_use_case_builds_expected_dependencies(monkeypatch):
    captured: dict[str, object] = {}

    class _Repo:
        def __init__(self, db):
            captured["db"] = db

    class _UseCase:
        def __init__(self, repo):
            captured["repo_type"] = type(repo)
            self.repo = repo

    monkeypatch.setattr(penas_controller, "SqlAlchemyPenaQueryRepository", _Repo)
    monkeypatch.setattr(penas_controller, "GetPenasUseCase", _UseCase)

    use_case = penas_controller.get_penas_use_case(db="db-session")
    assert isinstance(use_case, _UseCase)
    assert captured["db"] == "db-session"
    assert captured["repo_type"] is _Repo


def test_get_generate_pena_link_token_use_case_builds_expected_dependencies(monkeypatch):
    captured: dict[str, object] = {}

    class _Repo:
        def __init__(self, db):
            captured["db"] = db

    class _UseCase:
        def __init__(self, repo):
            captured["repo_type"] = type(repo)
            self.repo = repo

    monkeypatch.setattr(penas_controller, "SqlAlchemyPenaLinkRepository", _Repo)
    monkeypatch.setattr(penas_controller, "GeneratePenaLinkTokenUseCase", _UseCase)

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

    monkeypatch.setattr(penas_controller, "SqlAlchemyPenaLinkRepository", _Repo)
    monkeypatch.setattr(penas_controller, "LinkUserToPenaUseCase", _UseCase)

    use_case = penas_controller.get_link_user_to_pena_use_case(db="db-session")
    assert isinstance(use_case, _UseCase)
    assert captured["db"] == "db-session"
    assert captured["repo_type"] is _Repo


def test_get_pena_labels_use_case_builds_expected_dependencies(monkeypatch):
    captured: dict[str, object] = {}

    class _Repo:
        def __init__(self, db):
            captured["db"] = db

    class _UseCase:
        def __init__(self, repo):
            captured["repo_type"] = type(repo)
            self.repo = repo

    monkeypatch.setattr(penas_controller, "SqlAlchemyPenaLabelsRepository", _Repo)
    monkeypatch.setattr(penas_controller, "ManagePenaLabelsUseCase", _UseCase)

    use_case = penas_controller.get_pena_labels_use_case(db="db-session")
    assert isinstance(use_case, _UseCase)
    assert captured["db"] == "db-session"
    assert captured["repo_type"] is _Repo
