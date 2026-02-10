from dataclasses import dataclass

from auth.security import hash_password
from persistence.application.ports.registration_repository import (
    AdminRegistrationRepository,
    DuplicateUsernameError,
)


class UsernameAlreadyExistsError(Exception):
    pass


@dataclass(frozen=True)
class AdminRegistration:
    username: str
    password: str
    name: str


@dataclass(frozen=True)
class RegisteredAdmin:
    admin_id: int
    admin_guid: str


class RegisterAdminUseCase:
    def __init__(self, repository: AdminRegistrationRepository):
        self.repository = repository

    def execute(self, data: AdminRegistration) -> RegisteredAdmin:
        try:
            registered = self.repository.register_admin(
                username=data.username,
                password_hash=hash_password(data.password),
                name=data.name,
            )
        except DuplicateUsernameError as exc:
            raise UsernameAlreadyExistsError() from exc
        return RegisteredAdmin(admin_id=registered.admin_id, admin_guid=registered.admin_guid)
