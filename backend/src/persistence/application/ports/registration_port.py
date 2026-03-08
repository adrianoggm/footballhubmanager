from dataclasses import dataclass
from typing import Protocol


class DuplicateUsernameError(Exception):
    pass


class InvalidNationalityError(Exception):
    pass


@dataclass(frozen=True)
class RegisteredUserResult:
    account_id: int
    account_guid: str
    player_guid: str


@dataclass(frozen=True)
class RegisteredAdminResult:
    admin_id: int
    admin_guid: str


class UserRegistrationPort(Protocol):
    def register_user(
        self,
        *,
        username: str,
        password_hash: str,
        name: str,
        surname1: str,
        surname2: str | None,
        nationality: str,
    ) -> RegisteredUserResult: ...


class AdminRegistrationPort(Protocol):
    def register_admin(
        self, *, username: str, password_hash: str, name: str
    ) -> RegisteredAdminResult: ...
