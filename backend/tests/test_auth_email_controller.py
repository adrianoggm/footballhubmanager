import pytest
from api.dependencies import use_cases as use_case_dependencies
from api.interface.controller.v1 import auth_controller
from api.interface.controller.v1.model.request.auth_request import (
    ChangeAccountEmailRequest,
    RegisterAdminRequest,
    ResendEmailVerificationRequest,
    VerifyEmailRequest,
)
from auth.application.commands.account_email_commands import (
    ChangeAccountEmailCommand,
    ResendEmailVerificationCommand,
    SendRegistrationEmailVerificationCommand,
    VerifyEmailCommand,
)
from auth.application.queries.account_email_queries import (
    AccountEmailStatusResult,
    GetAccountEmailQuery,
)
from auth.domain.errors import (
    AccountEmailAlreadyVerifiedError,
    AccountEmailInUseError,
    AccountEmailMissingError,
    AccountNotFoundError,
    AccountTokenCooldownError,
    ExpiredAccountTokenError,
    InvalidAccountTokenError,
    InvalidEmailError,
    MailDeliveryError,
)
from auth.domain.models.account_email import AccountRef, AccountType
from auth.domain.models.mail_language import MailLanguage
from auth.session import SessionData
from fastapi import HTTPException
from pydantic import ValidationError
from shared.application.bus.buses import CommandBus, QueryBus

_SESSION = SessionData(
    token="tok", user_id=5, user_guid="user-guid-5", user_type="user", expires_at=9999999999
)
_REF = AccountRef(account_type=AccountType.USER, account_id=5)
_TOKEN = "t" * 43


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


def test_read_account_email_maps_result():
    bus = _Bus(AccountEmailStatusResult(email="ana@example.com", email_verified=False))

    response = auth_controller.read_account_email(session=_SESSION, query_bus=bus)

    assert bus.messages == [GetAccountEmailQuery(ref=_REF)]
    assert response.email == "ana@example.com"
    assert response.email_verified is False


def test_change_account_email_dispatches_command_with_language():
    bus = _Bus(
        AccountEmailStatusResult(
            email="new@example.com", email_verified=False, verification_email_sent=True
        )
    )

    response = auth_controller.change_account_email(
        ChangeAccountEmailRequest(email="New@Example.com", lang="en"),
        session=_SESSION,
        command_bus=bus,
    )

    assert bus.messages == [
        ChangeAccountEmailCommand(ref=_REF, email="New@Example.com", lang=MailLanguage.EN)
    ]
    assert response.email == "new@example.com"
    assert response.verification_email_sent is True


def test_change_account_email_reports_a_deferred_verification_email():
    bus = _Bus(
        AccountEmailStatusResult(
            email="new@example.com", email_verified=False, verification_email_sent=False
        )
    )

    response = auth_controller.change_account_email(
        ChangeAccountEmailRequest(email="new@example.com", lang="es"),
        session=_SESSION,
        command_bus=bus,
    )

    assert response.verification_email_sent is False


def test_resend_email_verification_returns_sent():
    bus = _Bus()
    response = auth_controller.resend_email_verification(
        ResendEmailVerificationRequest(), session=_SESSION, command_bus=bus
    )
    assert bus.messages == [ResendEmailVerificationCommand(ref=_REF, lang=MailLanguage.ES)]
    assert response.status == "sent"


def test_verify_email_is_public_and_returns_verified():
    bus = _Bus()
    response = auth_controller.verify_email(VerifyEmailRequest(token=_TOKEN), command_bus=bus)
    assert bus.messages == [VerifyEmailCommand(token=_TOKEN)]
    assert response.status == "verified"


@pytest.mark.parametrize(
    ("error", "status_code"),
    [
        (InvalidEmailError(), 400),
        (AccountEmailInUseError(), 409),
        (AccountTokenCooldownError(), 429),
        (AccountNotFoundError(), 404),
        (MailDeliveryError(), 503),
    ],
)
def test_change_account_email_maps_errors(error, status_code):
    with pytest.raises(HTTPException) as exc:
        auth_controller.change_account_email(
            ChangeAccountEmailRequest(email="a@example.com"),
            session=_SESSION,
            command_bus=_Bus(error=error),
        )
    assert exc.value.status_code == status_code


@pytest.mark.parametrize(
    ("error", "status_code"),
    [(AccountEmailMissingError(), 409), (AccountEmailAlreadyVerifiedError(), 409)],
)
def test_resend_maps_errors(error, status_code):
    with pytest.raises(HTTPException) as exc:
        auth_controller.resend_email_verification(
            ResendEmailVerificationRequest(), session=_SESSION, command_bus=_Bus(error=error)
        )
    assert exc.value.status_code == status_code


@pytest.mark.parametrize(
    ("error", "status_code"),
    [(InvalidAccountTokenError(), 400), (ExpiredAccountTokenError(), 410)],
)
def test_verify_email_maps_token_errors(error, status_code):
    with pytest.raises(HTTPException) as exc:
        auth_controller.verify_email(
            VerifyEmailRequest(token=_TOKEN), command_bus=_Bus(error=error)
        )
    assert exc.value.status_code == status_code


def test_registration_requires_email():
    with pytest.raises(ValidationError):
        RegisterAdminRequest(username="a", password="secret-pass-123", name="A")


def test_get_account_email_buses_register_handlers():
    command_bus = use_case_dependencies.get_account_email_command_bus(db="db-session")
    query_bus = use_case_dependencies.get_account_email_query_bus(db="db-session")
    registration_bus = use_case_dependencies.get_registration_command_bus(db="db-session")

    assert isinstance(command_bus, CommandBus)
    assert isinstance(query_bus, QueryBus)
    for command_type in (
        ChangeAccountEmailCommand,
        ResendEmailVerificationCommand,
        VerifyEmailCommand,
    ):
        assert command_type in command_bus._handlers
    assert GetAccountEmailQuery in query_bus._handlers
    assert SendRegistrationEmailVerificationCommand in registration_bus._handlers
