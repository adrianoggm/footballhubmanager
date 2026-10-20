import pytest
from api.dependencies import use_cases as use_case_dependencies
from api.interface.controller.v1 import auth_controller
from api.interface.controller.v1.model.request.auth_request import (
    ForgotPasswordRequest,
    PasswordResetTokenRequest,
    ResetPasswordRequest,
)
from auth.application.commands.password_reset_commands import (
    RequestPasswordResetCommand,
    ResetPasswordCommand,
)
from auth.application.queries.password_reset_queries import (
    InspectPasswordResetTokenQuery,
    PasswordResetTokenInfoResult,
)
from auth.domain.errors import (
    ExpiredAccountTokenError,
    InvalidAccountTokenError,
    InvalidEmailError,
)
from auth.domain.models.mail_language import MailLanguage
from auth.infrastructure.mail.background_mail_sender import BackgroundMailSender
from fastapi import HTTPException, Response
from pydantic import ValidationError

_TOKEN = "r" * 43


class _Bus:
    def __init__(self, result=None, error: Exception | None = None):
        self._result = result
        self._error = error
        self.messages = []

    def _handle(self, message):
        self.messages.append(message)
        if self._error is not None:
            raise self._error
        return self._result

    dispatch = _handle
    ask = _handle


def test_forgot_password_always_returns_accepted():
    bus = _Bus()
    response = auth_controller.forgot_password(
        ForgotPasswordRequest(email="ana@example.com", lang="en"), command_bus=bus
    )
    assert bus.messages == [
        RequestPasswordResetCommand(email="ana@example.com", lang=MailLanguage.EN)
    ]
    assert response.status == "accepted"


def test_forgot_password_rejects_malformed_email():
    with pytest.raises(HTTPException) as exc:
        auth_controller.forgot_password(
            ForgotPasswordRequest(email="not-an-email"), command_bus=_Bus(error=InvalidEmailError())
        )
    assert exc.value.status_code == 400


def test_inspect_reset_token_returns_info():
    bus = _Bus(PasswordResetTokenInfoResult(username="ana", account_type="user", expires_at=99))
    response = auth_controller.inspect_password_reset_token(
        PasswordResetTokenRequest(token=_TOKEN), query_bus=bus
    )
    assert bus.messages == [InspectPasswordResetTokenQuery(token=_TOKEN)]
    assert response.username == "ana"
    assert response.account_type == "user"
    assert response.expires_at == 99


@pytest.mark.parametrize(
    ("error", "status_code"),
    [(InvalidAccountTokenError(), 400), (ExpiredAccountTokenError(), 410)],
)
def test_inspect_and_reset_map_token_errors(error, status_code):
    with pytest.raises(HTTPException) as exc:
        auth_controller.inspect_password_reset_token(
            PasswordResetTokenRequest(token=_TOKEN), query_bus=_Bus(error=error)
        )
    assert exc.value.status_code == status_code

    with pytest.raises(HTTPException) as exc:
        auth_controller.reset_password(
            ResetPasswordRequest(token=_TOKEN, new_password="brand-new-password"),
            Response(),
            command_bus=_Bus(error=error),
        )
    assert exc.value.status_code == status_code


def test_reset_password_dispatches_and_clears_cookie():
    bus = _Bus()
    http_response = Response()

    response = auth_controller.reset_password(
        ResetPasswordRequest(token=_TOKEN, new_password="brand-new-password"),
        http_response,
        command_bus=bus,
    )

    assert bus.messages == [ResetPasswordCommand(token=_TOKEN, new_password="brand-new-password")]
    assert response.status == "password_reset"
    assert "session=" in http_response.headers.get("set-cookie", "")


def test_reset_password_enforces_minimum_length():
    with pytest.raises(ValidationError):
        ResetPasswordRequest(token=_TOKEN, new_password="short")


def test_password_reset_buses_register_handlers():
    command_bus = use_case_dependencies.get_password_reset_command_bus(db="db-session")
    query_bus = use_case_dependencies.get_password_reset_query_bus(db="db-session")

    assert RequestPasswordResetCommand in command_bus._handlers
    assert ResetPasswordCommand in command_bus._handlers
    assert InspectPasswordResetTokenQuery in query_bus._handlers
    forgot_handler = command_bus._handlers[RequestPasswordResetCommand]
    assert isinstance(forgot_handler._mail_sender, BackgroundMailSender)
