import pytest
from auth import dependencies
from auth.application.use_cases.authorize_access import AccessDeniedError, InvalidSessionTypeError
from auth.session import SessionData
from fastapi import HTTPException


def _session(*, user_type: str) -> SessionData:
    return SessionData(
        token="token-1",
        user_id=101,
        user_guid="guid-101",
        user_type=user_type,
        expires_at=9999999999,
    )


def test_extract_token_prefers_bearer_authorization():
    token = dependencies._extract_token("Bearer abc123", "fallback-token")
    assert token == "abc123"


@pytest.mark.parametrize(
    "authorization",
    [None, "Basic abc123", "Bearer", "token-only"],
)
def test_extract_token_uses_x_session_token_as_fallback(authorization: str | None):
    token = dependencies._extract_token(authorization, "x-session-token")
    assert token == "x-session-token"


def test_extract_token_returns_none_when_no_token_present():
    token = dependencies._extract_token(None, None)
    assert token is None


def test_get_current_session_raises_401_when_missing_token():
    with pytest.raises(HTTPException) as exc:
        dependencies.get_current_session(
            authorization=None, x_session_token=None, session_cookie=None, db=object()
        )
    assert exc.value.status_code == 401
    assert exc.value.detail == "Missing session token"


def test_get_current_session_raises_401_when_session_is_invalid(monkeypatch):
    monkeypatch.setattr(dependencies, "get_session", lambda _db, _token: None)

    with pytest.raises(HTTPException) as exc:
        dependencies.get_current_session(
            authorization="Bearer token-1",
            x_session_token=None,
            db=object(),
        )
    assert exc.value.status_code == 401
    assert exc.value.detail == "Invalid or expired session"


def test_get_current_session_returns_session_when_valid(monkeypatch):
    captured: dict[str, object] = {}
    expected = _session(user_type="user")

    def _fake_get_session(db, token):
        captured["db"] = db
        captured["token"] = token
        return expected

    db = object()
    monkeypatch.setattr(dependencies, "get_session", _fake_get_session)

    result = dependencies.get_current_session(
        authorization="Bearer token-1",
        x_session_token=None,
        db=db,
    )

    assert result == expected
    assert captured == {"db": db, "token": "token-1"}


def test_require_admin_allows_admin_session():
    session = _session(user_type="admin")
    assert dependencies.require_admin(session) == session


def test_require_admin_rejects_non_admin_session():
    with pytest.raises(HTTPException) as exc:
        dependencies.require_admin(_session(user_type="user"))
    assert exc.value.status_code == 403
    assert exc.value.detail == "Admin access required"


def test_require_user_allows_user_session():
    session = _session(user_type="user")
    assert dependencies.require_user(session) == session


def test_require_user_rejects_non_user_session():
    with pytest.raises(HTTPException) as exc:
        dependencies.require_user(_session(user_type="admin"))
    assert exc.value.status_code == 403
    assert exc.value.detail == "User access required"


def test_authorize_pena_access_returns_session_on_success(monkeypatch):
    calls: dict[str, object] = {}

    class _Repo:
        def __init__(self, db):
            calls["db"] = db

    class _UseCase:
        def __init__(self, _repo):
            calls["constructed"] = True

        def execute(self, *, pena_guid, session):
            calls["pena_guid"] = pena_guid
            calls["session"] = session

    monkeypatch.setattr(dependencies, "SqlAlchemyAccessRepository", _Repo)
    monkeypatch.setattr(dependencies, "AuthorizePenaAccessUseCase", _UseCase)

    session = _session(user_type="admin")
    db = object()
    result = dependencies.authorize_pena_access("pena-1", session=session, db=db)

    assert result == session
    assert calls["db"] is db
    assert calls["constructed"] is True
    assert calls["pena_guid"] == "pena-1"
    assert calls["session"] == session


@pytest.mark.parametrize(
    ("error", "detail"),
    [
        (AccessDeniedError("denied"), "denied"),
        (InvalidSessionTypeError(), "Invalid session type"),
    ],
)
def test_authorize_pena_access_maps_use_case_errors_to_http(monkeypatch, error, detail):
    class _Repo:
        def __init__(self, _db):
            pass

    class _UseCase:
        def __init__(self, _repo):
            pass

        def execute(self, **_kwargs):
            raise error

    monkeypatch.setattr(dependencies, "SqlAlchemyAccessRepository", _Repo)
    monkeypatch.setattr(dependencies, "AuthorizePenaAccessUseCase", _UseCase)

    with pytest.raises(HTTPException) as exc:
        dependencies.authorize_pena_access(
            "pena-1",
            session=_session(user_type="user"),
            db=object(),
        )
    assert exc.value.status_code == 403
    assert exc.value.detail == detail


def test_authorize_player_access_returns_session_on_success(monkeypatch):
    calls: dict[str, object] = {}

    class _Repo:
        def __init__(self, db):
            calls["db"] = db

    class _UseCase:
        def __init__(self, _repo):
            calls["constructed"] = True

        def execute(self, *, player_guid, session):
            calls["player_guid"] = player_guid
            calls["session"] = session

    monkeypatch.setattr(dependencies, "SqlAlchemyAccessRepository", _Repo)
    monkeypatch.setattr(dependencies, "AuthorizePlayerAccessUseCase", _UseCase)

    session = _session(user_type="admin")
    db = object()
    result = dependencies.authorize_player_access("player-1", session=session, db=db)

    assert result == session
    assert calls["db"] is db
    assert calls["constructed"] is True
    assert calls["player_guid"] == "player-1"
    assert calls["session"] == session


@pytest.mark.parametrize(
    ("error", "detail"),
    [
        (AccessDeniedError("player denied"), "player denied"),
        (InvalidSessionTypeError(), "Invalid session type"),
    ],
)
def test_authorize_player_access_maps_use_case_errors_to_http(monkeypatch, error, detail):
    class _Repo:
        def __init__(self, _db):
            pass

    class _UseCase:
        def __init__(self, _repo):
            pass

        def execute(self, **_kwargs):
            raise error

    monkeypatch.setattr(dependencies, "SqlAlchemyAccessRepository", _Repo)
    monkeypatch.setattr(dependencies, "AuthorizePlayerAccessUseCase", _UseCase)

    with pytest.raises(HTTPException) as exc:
        dependencies.authorize_player_access(
            "player-1",
            session=_session(user_type="user"),
            db=object(),
        )
    assert exc.value.status_code == 403
    assert exc.value.detail == detail


def test_extract_token_falls_back_to_session_cookie():
    # Header sources take precedence; cookie is the last resort.
    assert dependencies._extract_token(None, None, "cookie-token") == "cookie-token"
    assert dependencies._extract_token("Bearer hdr", None, "cookie-token") == "hdr"
    assert dependencies._extract_token(None, "xtok", "cookie-token") == "xtok"
    assert dependencies._extract_token(None, None, None) is None


def test_get_current_session_reads_token_from_cookie(monkeypatch):
    captured = {}

    def _fake_get_session(_db, token):
        captured["token"] = token
        return _session(user_type="user")

    monkeypatch.setattr(dependencies, "get_session", _fake_get_session)

    session = dependencies.get_current_session(
        authorization=None,
        x_session_token=None,
        session_cookie="cookie-token",
        db=object(),
    )
    assert captured["token"] == "cookie-token"
    assert session.user_type == "user"


def test_set_session_cookie_is_httponly_and_samesite_strict(monkeypatch):
    from fastapi import Response

    monkeypatch.setenv("APP_ENV", "production")
    response = Response()
    dependencies.set_session_cookie(response, _session(user_type="admin"))

    header = response.headers.get("set-cookie", "")
    assert "session=token-1" in header
    assert "HttpOnly" in header
    assert "SameSite=strict" in header.replace("Strict", "strict")
    assert "Secure" in header


def test_set_session_cookie_omits_secure_in_dev(monkeypatch):
    from fastapi import Response

    monkeypatch.setenv("APP_ENV", "development")
    response = Response()
    dependencies.set_session_cookie(response, _session(user_type="user"))

    assert "Secure" not in response.headers.get("set-cookie", "")


def test_clear_session_cookie_expires_the_cookie():
    from fastapi import Response

    response = Response()
    dependencies.clear_session_cookie(response)
    header = response.headers.get("set-cookie", "")
    assert "session=" in header
    assert "Max-Age=0" in header or "expires=Thu, 01 Jan 1970" in header
