import pytest
from api.dependencies import use_cases as use_case_dependencies
from api.interface.controller.v1 import auth_controller
from api.interface.controller.v1.model.request.auth_request import (
    LoginRequest,
    RegisterAdminRequest,
    RegisterUserRequest,
)
from auth.application.models import AuthAccount
from auth.application.use_cases.login import InvalidCredentialsError
from auth.session import SessionData
from fastapi import HTTPException
from persistence.application.use_cases.register_admin_usecase import (
    InvalidAdminRegistrationDataError,
    RegisteredAdmin,
)
from persistence.application.use_cases.register_admin_usecase import (
    UsernameAlreadyExistsError as AdminUsernameExistsError,
)
from persistence.application.use_cases.register_user_usecase import (
    InvalidNationalityError as UserInvalidNationalityError,
)
from persistence.application.use_cases.register_user_usecase import (
    InvalidRegistrationDataError,
    RegisteredUser,
)
from persistence.application.use_cases.register_user_usecase import (
    UsernameAlreadyExistsError as UserUsernameExistsError,
)


def _session(*, user_type: str, user_guid: str) -> SessionData:
    return SessionData(
        token="session-token",
        user_id=1,
        user_guid=user_guid,
        user_type=user_type,
        expires_at=9999999999,
    )


def test_get_login_user_use_case_builds_expected_dependencies(monkeypatch):
    captured: dict[str, object] = {}

    class _Repo:
        def __init__(self, db):
            captured["db"] = db

    class _UseCase:
        def __init__(self, repo):
            captured["repo_type"] = type(repo)
            self.repo = repo

    monkeypatch.setattr(use_case_dependencies, "SqlAlchemyAuthAccountRepository", _Repo)
    monkeypatch.setattr(use_case_dependencies, "LoginUserUseCase", _UseCase)

    use_case = auth_controller.get_login_user_use_case(db="db-session")
    assert isinstance(use_case, _UseCase)
    assert captured["db"] == "db-session"
    assert captured["repo_type"] is _Repo


def test_get_login_admin_use_case_builds_expected_dependencies(monkeypatch):
    captured: dict[str, object] = {}

    class _Repo:
        def __init__(self, db):
            captured["db"] = db

    class _UseCase:
        def __init__(self, repo):
            captured["repo_type"] = type(repo)
            self.repo = repo

    monkeypatch.setattr(use_case_dependencies, "SqlAlchemyAuthAccountRepository", _Repo)
    monkeypatch.setattr(use_case_dependencies, "LoginAdminUseCase", _UseCase)

    use_case = auth_controller.get_login_admin_use_case(db="db-session")
    assert isinstance(use_case, _UseCase)
    assert captured["db"] == "db-session"
    assert captured["repo_type"] is _Repo


def test_get_register_user_use_case_builds_expected_dependencies(monkeypatch):
    captured: dict[str, object] = {}

    class _Repo:
        def __init__(self, db):
            captured["db"] = db

    class _UseCase:
        def __init__(self, repo):
            captured["repo_type"] = type(repo)
            self.repo = repo

    monkeypatch.setattr(use_case_dependencies, "SqlAlchemyRegistrationRepository", _Repo)
    monkeypatch.setattr(use_case_dependencies, "RegisterUserUseCase", _UseCase)

    use_case = auth_controller.get_register_user_use_case(db="db-session")
    assert isinstance(use_case, _UseCase)
    assert captured["db"] == "db-session"
    assert captured["repo_type"] is _Repo


def test_get_register_admin_use_case_builds_expected_dependencies(monkeypatch):
    captured: dict[str, object] = {}

    class _Repo:
        def __init__(self, db):
            captured["db"] = db

    class _UseCase:
        def __init__(self, repo):
            captured["repo_type"] = type(repo)
            self.repo = repo

    monkeypatch.setattr(use_case_dependencies, "SqlAlchemyRegistrationRepository", _Repo)
    monkeypatch.setattr(use_case_dependencies, "RegisterAdminUseCase", _UseCase)

    use_case = auth_controller.get_register_admin_use_case(db="db-session")
    assert isinstance(use_case, _UseCase)
    assert captured["db"] == "db-session"
    assert captured["repo_type"] is _Repo


def test_login_user_returns_session_response(monkeypatch):
    class _UseCase:
        def __init__(self):
            self.last_payload = None

        def execute(self, payload):
            self.last_payload = payload
            return AuthAccount(
                id=7,
                guid="user-guid-7",
                username="u7",
                password_hash="hash",
                user_type="user",
            )

    use_case = _UseCase()
    monkeypatch.setattr(
        auth_controller,
        "create_session",
        lambda _db, *, user_id, user_guid, user_type: _session(
            user_type=user_type, user_guid=user_guid
        ),
    )

    response = auth_controller.login_user(
        LoginRequest(username="alice", password="secret"),
        use_case=use_case,
        db=object(),
    )

    assert use_case.last_payload.username == "alice"
    assert response.token == "session-token"
    assert response.user_guid == "user-guid-7"
    assert response.user_type == "user"


def test_login_user_maps_invalid_credentials():
    class _UseCase:
        def execute(self, _payload):
            raise InvalidCredentialsError()

    with pytest.raises(HTTPException) as exc:
        auth_controller.login_user(
            LoginRequest(username="alice", password="wrong"),
            use_case=_UseCase(),
            db=object(),
        )
    assert exc.value.status_code == 401
    assert exc.value.detail == "Invalid credentials"


def test_login_admin_returns_session_response(monkeypatch):
    class _UseCase:
        def execute(self, _payload):
            return AuthAccount(
                id=9,
                guid="admin-guid-9",
                username="a9",
                password_hash="hash",
                user_type="admin",
            )

    monkeypatch.setattr(
        auth_controller,
        "create_session",
        lambda _db, *, user_id, user_guid, user_type: _session(
            user_type=user_type, user_guid=user_guid
        ),
    )

    response = auth_controller.login_admin(
        LoginRequest(username="root", password="secret"),
        use_case=_UseCase(),
        db=object(),
    )

    assert response.token_type == "session"
    assert response.user_guid == "admin-guid-9"
    assert response.user_type == "admin"


def test_login_admin_maps_invalid_credentials():
    class _UseCase:
        def execute(self, _payload):
            raise InvalidCredentialsError()

    with pytest.raises(HTTPException) as exc:
        auth_controller.login_admin(
            LoginRequest(username="root", password="wrong"),
            use_case=_UseCase(),
            db=object(),
        )
    assert exc.value.status_code == 401
    assert exc.value.detail == "Invalid credentials"


def test_register_user_returns_session_response(monkeypatch):
    class _UseCase:
        def __init__(self):
            self.last_registration = None

        def execute(self, registration):
            self.last_registration = registration
            return RegisteredUser(
                account_id=17,
                account_guid="user-guid-17",
                player_guid="player-guid-17",
            )

    use_case = _UseCase()
    monkeypatch.setattr(
        auth_controller,
        "create_session",
        lambda _db, *, user_id, user_guid, user_type: _session(
            user_type=user_type, user_guid=user_guid
        ),
    )

    response = auth_controller.register_user(
        RegisterUserRequest(
            username="u17",
            password="secret",
            name="Ana",
            surname1="Lopez",
            surname2=None,
            nationality="ES",
        ),
        use_case=use_case,
        db=object(),
    )

    assert use_case.last_registration.username == "u17"
    assert response.user_guid == "user-guid-17"
    assert response.user_type == "user"


def test_register_user_rolls_back_when_create_session_fails(monkeypatch):
    class _UseCase:
        def execute(self, _registration):
            return RegisteredUser(
                account_id=17,
                account_guid="user-guid-17",
                player_guid="player-guid-17",
            )

    class _Db:
        def __init__(self):
            self.rolled_back = False

        def rollback(self):
            self.rolled_back = True

    db = _Db()

    def _raise_create_session(*_args, **_kwargs):
        raise RuntimeError("session failure")

    monkeypatch.setattr(auth_controller, "create_session", _raise_create_session)

    with pytest.raises(RuntimeError):
        auth_controller.register_user(
            RegisterUserRequest(
                username="u17",
                password="secret",
                name="Ana",
                surname1="Lopez",
                surname2=None,
                nationality="ES",
            ),
            use_case=_UseCase(),
            db=db,
        )

    assert db.rolled_back is True


@pytest.mark.parametrize(
    ("error", "status_code", "detail"),
    [
        (UserUsernameExistsError(), 409, "Username already exists"),
        (InvalidRegistrationDataError(), 400, "Invalid user registration data"),
        (UserInvalidNationalityError(), 400, "Invalid nationality"),
    ],
)
def test_register_user_maps_errors(error, status_code, detail):
    class _UseCase:
        def execute(self, _registration):
            raise error

    with pytest.raises(HTTPException) as exc:
        auth_controller.register_user(
            RegisterUserRequest(
                username="u17",
                password="secret",
                name="Ana",
                surname1="Lopez",
                surname2=None,
                nationality="ES",
            ),
            use_case=_UseCase(),
            db=object(),
        )
    assert exc.value.status_code == status_code
    assert exc.value.detail == detail


def test_register_admin_returns_session_response(monkeypatch):
    class _UseCase:
        def __init__(self):
            self.last_registration = None

        def execute(self, registration):
            self.last_registration = registration
            return RegisteredAdmin(admin_id=23, admin_guid="admin-guid-23")

    use_case = _UseCase()
    monkeypatch.setattr(
        auth_controller,
        "create_session",
        lambda _db, *, user_id, user_guid, user_type: _session(
            user_type=user_type, user_guid=user_guid
        ),
    )

    response = auth_controller.register_admin(
        RegisterAdminRequest(username="a23", password="secret", name="Admin"),
        use_case=use_case,
        db=object(),
    )

    assert use_case.last_registration.username == "a23"
    assert response.user_guid == "admin-guid-23"
    assert response.user_type == "admin"


def test_register_admin_rolls_back_when_create_session_fails(monkeypatch):
    class _UseCase:
        def execute(self, _registration):
            return RegisteredAdmin(admin_id=23, admin_guid="admin-guid-23")

    class _Db:
        def __init__(self):
            self.rolled_back = False

        def rollback(self):
            self.rolled_back = True

    db = _Db()

    def _raise_create_session(*_args, **_kwargs):
        raise RuntimeError("session failure")

    monkeypatch.setattr(auth_controller, "create_session", _raise_create_session)

    with pytest.raises(RuntimeError):
        auth_controller.register_admin(
            RegisterAdminRequest(username="a23", password="secret", name="Admin"),
            use_case=_UseCase(),
            db=db,
        )

    assert db.rolled_back is True


@pytest.mark.parametrize(
    ("error", "status_code", "detail"),
    [
        (AdminUsernameExistsError(), 409, "Username already exists"),
        (InvalidAdminRegistrationDataError(), 400, "Invalid admin registration data"),
    ],
)
def test_register_admin_maps_errors(error, status_code, detail):
    class _UseCase:
        def execute(self, _registration):
            raise error

    with pytest.raises(HTTPException) as exc:
        auth_controller.register_admin(
            RegisterAdminRequest(username="a23", password="secret", name="Admin"),
            use_case=_UseCase(),
            db=object(),
        )
    assert exc.value.status_code == status_code
    assert exc.value.detail == detail


def test_logout_invalidates_session_and_returns_ok(monkeypatch):
    calls: dict[str, object] = {}

    def _fake_invalidate(_db, token: str):
        calls["token"] = token

    monkeypatch.setattr(auth_controller, "invalidate_session", _fake_invalidate)

    response = auth_controller.logout(
        session=SessionData(
            token="tok-123",
            user_id=1,
            user_guid="u1",
            user_type="user",
            expires_at=9999,
        ),
        db=object(),
    )

    assert calls == {"token": "tok-123"}
    assert response == {"status": "ok"}
