import logging
import os

import pytest
from fastapi import HTTPException

# Required so importing auth controller does not fail during test collection.
os.environ.setdefault("DB_HOST", "localhost")
os.environ.setdefault("DB_PORT", "3306")
os.environ.setdefault("DB_NAME", "footballhub")
os.environ.setdefault("DB_USER", "footballuser")
os.environ.setdefault("DB_PASSWORD", "footballpass")

from api.interface.controller.v1 import auth_controller
from auth.application.use_cases.login import InvalidCredentialsError


class _DummyRepo:
    def __init__(self, _db):
        pass


class _AlwaysFailLoginUseCase:
    def __init__(self, _repo):
        pass

    def execute(self, _payload):
        raise InvalidCredentialsError()


def test_user_login_failure_logs_do_not_expose_username_or_password(monkeypatch, caplog):
    monkeypatch.setattr(auth_controller, "SqlAlchemyAuthAccountRepository", _DummyRepo)
    monkeypatch.setattr(auth_controller, "LoginUserUseCase", _AlwaysFailLoginUseCase)

    payload = auth_controller.LoginRequest(username="sensitive_user", password="sensitive_password")
    use_case = _AlwaysFailLoginUseCase(_DummyRepo(object()))

    with caplog.at_level(logging.WARNING):
        with pytest.raises(HTTPException) as exc:
            auth_controller.login_user(payload, use_case=use_case, db=object())

    assert exc.value.status_code == 401
    assert "invalid credentials" in caplog.text.lower()
    assert "sensitive_user" not in caplog.text
    assert "sensitive_password" not in caplog.text


def test_admin_login_failure_logs_do_not_expose_username_or_password(monkeypatch, caplog):
    monkeypatch.setattr(auth_controller, "SqlAlchemyAuthAccountRepository", _DummyRepo)
    monkeypatch.setattr(auth_controller, "LoginAdminUseCase", _AlwaysFailLoginUseCase)

    payload = auth_controller.LoginRequest(username="admin_secret", password="admin_password")
    use_case = _AlwaysFailLoginUseCase(_DummyRepo(object()))

    with caplog.at_level(logging.WARNING):
        with pytest.raises(HTTPException) as exc:
            auth_controller.login_admin(payload, use_case=use_case, db=object())

    assert exc.value.status_code == 401
    assert "invalid credentials" in caplog.text.lower()
    assert "admin_secret" not in caplog.text
    assert "admin_password" not in caplog.text
