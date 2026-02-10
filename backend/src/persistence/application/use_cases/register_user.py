from dataclasses import dataclass

from auth.security import hash_password
from persistence.application.ports.registration_repository import (
    DuplicateUsernameError,
    UserRegistrationRepository,
)


class UsernameAlreadyExistsError(Exception):
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
        try:
            registered = self.repository.register_user(
                username=data.username,
                password_hash=hash_password(data.password),
                name=data.name,
                surname1=data.surname1,
                surname2=data.surname2,
                nationality=data.nationality,
            )
        except DuplicateUsernameError as exc:
            raise UsernameAlreadyExistsError() from exc
        return RegisteredUser(
            account_id=registered.account_id,
            account_guid=registered.account_guid,
            player_guid=registered.player_guid,
        )
