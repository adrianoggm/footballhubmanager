from dataclasses import dataclass
from unittest.mock import ANY

import pytest
from persistence.application.ports.registration_repository import (
    DuplicateUsernameError,
    RegisteredUserResult,
)
from persistence.application.ports.registration_repository import (
    InvalidNationalityError as RepositoryInvalidNationalityError,
)
from persistence.application.use_cases.register_user import (
    InvalidNationalityError,
    InvalidRegistrationDataError,
    RegisterUserUseCase,
    UsernameAlreadyExistsError,
    UserRegistration,
)


@dataclass
class _FakeRepo:
    should_raise_duplicate: bool = False
    should_raise_invalid_nationality: bool = False
    last_payload: dict | None = None

    def register_user(
        self,
        *,
        username: str,
        password_hash: str,
        name: str,
        surname1: str,
        surname2: str | None,
        nationality: str,
    ) -> RegisteredUserResult:
        if self.should_raise_duplicate:
            raise DuplicateUsernameError()
        if self.should_raise_invalid_nationality:
            raise RepositoryInvalidNationalityError()

        self.last_payload = {
            "username": username,
            "password_hash": password_hash,
            "name": name,
            "surname1": surname1,
            "surname2": surname2,
            "nationality": nationality,
        }
        return RegisteredUserResult(
            account_id=1, account_guid="acc-guid", player_guid="player-guid"
        )


def test_register_user_positive_normalizes_and_persists():
    repo = _FakeRepo()
    use_case = RegisterUserUseCase(repo)

    result = use_case.execute(
        UserRegistration(
            username="  user.one  ",
            password="secret",
            name="  Adriano  ",
            surname1="  Garcia  ",
            surname2="  Milena ",
            nationality=" Spain ",
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
    }


def test_register_user_negative_duplicate_username():
    repo = _FakeRepo(should_raise_duplicate=True)
    use_case = RegisterUserUseCase(repo)

    with pytest.raises(UsernameAlreadyExistsError):
        use_case.execute(
            UserRegistration(
                username="user.one",
                password="secret",
                name="Adriano",
                surname1="Garcia",
                surname2=None,
                nationality="Spain",
            )
        )


def test_register_user_edge_empty_required_field_raises():
    repo = _FakeRepo()
    use_case = RegisterUserUseCase(repo)

    with pytest.raises(InvalidRegistrationDataError):
        use_case.execute(
            UserRegistration(
                username="   ",
                password="secret",
                name="Adriano",
                surname1="Garcia",
                surname2=None,
                nationality="Spain",
            )
        )


def test_register_user_edge_invalid_nationality_from_repository():
    repo = _FakeRepo(should_raise_invalid_nationality=True)
    use_case = RegisterUserUseCase(repo)

    with pytest.raises(InvalidNationalityError):
        use_case.execute(
            UserRegistration(
                username="user.one",
                password="secret",
                name="Adriano",
                surname1="Garcia",
                surname2=None,
                nationality="Atlantis",
            )
        )
