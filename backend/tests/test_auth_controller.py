import pytest
from api.dependencies import use_cases as use_case_dependencies
from api.interface.controller.v1 import auth_controller
from api.interface.controller.v1.model.request.auth_request import (
    LoginRequest,
    RegisterAdminRequest,
    RegisterUserRequest,
)
from auth.application.use_cases.login import InvalidCredentialsError
from auth.domain.models.auth_account import AuthAccount
from auth.session import SessionData
from core.application.commands.registration_commands import (
    RegisterAdminCommand,
    RegisterUserCommand,
)
from core.application.models import RegisteredAdmin, RegisteredUser
from core.domain.errors import (
    AdminUsernameExistsError,
    InvalidAdminRegistrationDataError,
    InvalidRegistrationDataError,
    UserInvalidNationalityError,
    UserUsernameExistsError,
)
from fastapi import HTTPException


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


def test_get_registration_command_bus_builds_expected_dependencies(monkeypatch):
    from shared.application.bus.buses import CommandBus

    captured: dict[str, object] = {}

    class _Repo:
        def __init__(self, db):
            captured["db"] = db

    monkeypatch.setattr(use_case_dependencies, "SqlAlchemyRegistrationRepository", _Repo)

    bus = auth_controller.get_registration_command_bus(db="db-session")
    assert isinstance(bus, CommandBus)
    assert captured["db"] == "db-session"
    assert RegisterUserCommand in bus._handlers
    assert RegisterAdminCommand in bus._handlers


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


class _RegistrationCommandBus:
    def __init__(self, result=None):
        self._result = result
        self.last_command = None

    def dispatch(self, command):
        self.last_command = command
        return self._result


class _RaisingCommandBus:
    def __init__(self, error):
        self._error = error

    def dispatch(self, _command):
        raise self._error


def _stub_create_session(monkeypatch):
    monkeypatch.setattr(
        auth_controller,
        "create_session",
        lambda _db, *, user_id, user_guid, user_type: _session(
            user_type=user_type, user_guid=user_guid
        ),
    )


def test_register_user_returns_session_response(monkeypatch):
    bus = _RegistrationCommandBus(
        RegisteredUser(account_id=17, account_guid="user-guid-17", player_guid="player-guid-17")
    )
    _stub_create_session(monkeypatch)

    response = auth_controller.register_user(
        RegisterUserRequest(
            username="u17",
            password="secret",
            name="Ana",
            surname1="Lopez",
            surname2=None,
            nationality="ES",
        ),
        command_bus=bus,
        db=object(),
    )

    assert isinstance(bus.last_command, RegisterUserCommand)
    assert bus.last_command.username == "u17"
    assert response.user_guid == "user-guid-17"
    assert response.user_type == "user"


def test_register_user_rolls_back_when_create_session_fails(monkeypatch):
    bus = _RegistrationCommandBus(
        RegisteredUser(account_id=17, account_guid="user-guid-17", player_guid="player-guid-17")
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
            command_bus=bus,
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
            command_bus=_RaisingCommandBus(error),
            db=object(),
        )
    assert exc.value.status_code == status_code
    assert exc.value.detail == detail


def test_register_admin_returns_session_response(monkeypatch):
    bus = _RegistrationCommandBus(RegisteredAdmin(admin_id=23, admin_guid="admin-guid-23"))
    _stub_create_session(monkeypatch)

    response = auth_controller.register_admin(
        RegisterAdminRequest(username="a23", password="secret", name="Admin"),
        command_bus=bus,
        db=object(),
    )

    assert isinstance(bus.last_command, RegisterAdminCommand)
    assert bus.last_command.username == "a23"
    assert response.user_guid == "admin-guid-23"
    assert response.user_type == "admin"


def test_register_admin_rolls_back_when_create_session_fails(monkeypatch):
    bus = _RegistrationCommandBus(RegisteredAdmin(admin_id=23, admin_guid="admin-guid-23"))

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
            command_bus=bus,
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
    with pytest.raises(HTTPException) as exc:
        auth_controller.register_admin(
            RegisterAdminRequest(username="a23", password="secret", name="Admin"),
            command_bus=_RaisingCommandBus(error),
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
