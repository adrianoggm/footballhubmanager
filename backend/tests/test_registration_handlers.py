from dataclasses import dataclass
from unittest.mock import ANY

import pytest
from auth.domain.errors import InvalidEmailError
from core.application.commands.registration_command_handlers import (
    RegisterAdminHandler,
    RegisterUserHandler,
)
from core.application.commands.registration_commands import (
    RegisterAdminCommand,
    RegisterUserCommand,
)
from core.application.ports.registration_port import (
    RegisteredAdminResult,
    RegisteredUserResult,
)
from core.domain.errors import (
    AdminUsernameExistsError,
    InvalidAdminRegistrationDataError,
    InvalidRegistrationDataError,
    UserInvalidNationalityError,
    UserUsernameExistsError,
)


@dataclass
class _AdminRepo:
    should_raise_duplicate: bool = False
    last_payload: dict | None = None

    def register_admin(self, *, username: str, password_hash: str, name: str, email: str):
        if self.should_raise_duplicate:
            raise AdminUsernameExistsError()
        self.last_payload = {
            "username": username,
            "password_hash": password_hash,
            "name": name,
            "email": email,
        }
        return RegisteredAdminResult(admin_id=7, admin_guid="admin-guid")


@dataclass
class _UserRepo:
    should_raise_duplicate: bool = False
    should_raise_invalid_nationality: bool = False
    last_payload: dict | None = None

    def register_user(
        self, *, username, password_hash, name, surname1, surname2, nationality, email
    ) -> RegisteredUserResult:
        if self.should_raise_duplicate:
            raise UserUsernameExistsError()
        if self.should_raise_invalid_nationality:
            raise UserInvalidNationalityError()
        self.last_payload = {
            "username": username,
            "password_hash": password_hash,
            "name": name,
            "surname1": surname1,
            "surname2": surname2,
            "nationality": nationality,
            "email": email,
        }
        return RegisteredUserResult(
            account_id=1, account_guid="acc-guid", player_guid="player-guid"
        )


def test_register_admin_normalizes_and_persists():
    repo = _AdminRepo()
    result = RegisterAdminHandler(repo).handle(
        RegisterAdminCommand(
            username="  admin.one  ", password="secret", name="  Admin Name ", email="a@example.com"
        )
    )

    assert result.admin_id == 7
    assert repo.last_payload == {
        "username": "admin.one",
        "password_hash": ANY,
        "name": "Admin Name",
        "email": "a@example.com",
    }


def test_register_admin_propagates_duplicate_username():
    with pytest.raises(AdminUsernameExistsError):
        RegisterAdminHandler(_AdminRepo(should_raise_duplicate=True)).handle(
            RegisterAdminCommand(
                username="admin.one", password="secret", name="Admin Name", email="a@example.com"
            )
        )


@pytest.mark.parametrize(
    "command",
    [
        RegisterAdminCommand(
            username="   ", password="secret", name="Admin Name", email="a@example.com"
        ),
        RegisterAdminCommand(
            username="admin.one", password="secret", name="   ", email="a@example.com"
        ),
    ],
)
def test_register_admin_rejects_blank_required_fields(command):
    with pytest.raises(InvalidAdminRegistrationDataError):
        RegisterAdminHandler(_AdminRepo()).handle(command)


def test_register_user_normalizes_and_persists():
    repo = _UserRepo()
    result = RegisterUserHandler(repo).handle(
        RegisterUserCommand(
            username="  user.one  ",
            password="secret",
            name="  Adriano  ",
            surname1="  Garcia  ",
            surname2="  Milena ",
            nationality=" Spain ",
            email=" User.One@Example.COM ",
        )
    )

    assert result.account_id == 1
    assert repo.last_payload == {
        "username": "user.one",
        "password_hash": ANY,
        "name": "Adriano",
        "surname1": "Garcia",
        "surname2": "Milena",
        "nationality": "Spain",
        "email": "user.one@example.com",
    }


def test_register_user_propagates_duplicate_username():
    with pytest.raises(UserUsernameExistsError):
        RegisterUserHandler(_UserRepo(should_raise_duplicate=True)).handle(
            RegisterUserCommand(
                username="user.one",
                password="secret",
                name="Adriano",
                surname1="Garcia",
                surname2=None,
                nationality="Spain",
                email="u@example.com",
            )
        )


def test_register_user_rejects_blank_required_field():
    with pytest.raises(InvalidRegistrationDataError):
        RegisterUserHandler(_UserRepo()).handle(
            RegisterUserCommand(
                username="   ",
                password="secret",
                name="Adriano",
                surname1="Garcia",
                surname2=None,
                nationality="Spain",
                email="u@example.com",
            )
        )


def test_register_user_propagates_invalid_nationality():
    with pytest.raises(UserInvalidNationalityError):
        RegisterUserHandler(_UserRepo(should_raise_invalid_nationality=True)).handle(
            RegisterUserCommand(
                username="user.one",
                password="secret",
                name="Adriano",
                surname1="Garcia",
                surname2=None,
                nationality="Atlantis",
                email="u@example.com",
            )
        )


def test_register_handlers_reject_invalid_email():
    with pytest.raises(InvalidEmailError):
        RegisterAdminHandler(_AdminRepo()).handle(
            RegisterAdminCommand(username="root", password="secret", name="Root", email="nope")
        )
    with pytest.raises(InvalidEmailError):
        RegisterUserHandler(_UserRepo()).handle(
            RegisterUserCommand(
                username="ana",
                password="secret",
                name="Ana",
                surname1="Lopez",
                surname2=None,
                nationality="Spain",
                email="ana@",
            )
        )
