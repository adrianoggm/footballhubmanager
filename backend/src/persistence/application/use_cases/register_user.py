from dataclasses import dataclass

from auth.security import hash_password
from persistence.application.ports.registration_repository import (
    DuplicateUsernameError,
    InvalidNationalityError as RegistrationInvalidNationalityError,
    UserRegistrationRepository,
)


class UsernameAlreadyExistsError(Exception):
    pass


class InvalidNationalityError(Exception):
    pass


class InvalidRegistrationDataError(Exception):
    pass


@dataclass(frozen=True)
class UserRegistration:
    username: str
    password: str
    name: str
    surname1: str
    surname2: str | None
    nationality: str


@dataclass(frozen=True)
class RegisteredUser:
    account_id: int
    account_guid: str
    player_guid: str


class RegisterUserUseCase:
    def __init__(self, repository: UserRegistrationRepository):
        self.repository = repository

    def execute(self, data: UserRegistration) -> RegisteredUser:
        username = data.username.strip()
        name = data.name.strip()
        surname1 = data.surname1.strip()
        surname2 = data.surname2.strip() if data.surname2 is not None else None
        nationality = data.nationality.strip()

        if not username or not name or not surname1 or not nationality:
            raise InvalidRegistrationDataError()
        if surname2 == "":
            surname2 = None

        try:
            registered = self.repository.register_user(
                username=username,
                password_hash=hash_password(data.password),
                name=name,
                surname1=surname1,
                surname2=surname2,
                nationality=nationality,
            )
        except DuplicateUsernameError as exc:
            raise UsernameAlreadyExistsError() from exc
        except RegistrationInvalidNationalityError as exc:
            raise InvalidNationalityError() from exc
        return RegisteredUser(
            account_id=registered.account_id,
            account_guid=registered.account_guid,
            player_guid=registered.player_guid,
        )
