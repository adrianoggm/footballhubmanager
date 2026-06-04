from auth.security import hash_password
from core.application.models import AdminRegistration, RegisteredAdmin
from core.application.ports.registration_port import (
    AdminRegistrationPort,
    DuplicateUsernameError,
)


class UsernameAlreadyExistsError(Exception):
    pass


class InvalidAdminRegistrationDataError(Exception):
    pass


class RegisterAdminUseCase:
    def __init__(self, repository: AdminRegistrationPort):
        self.repository = repository

    def execute(self, data: AdminRegistration) -> RegisteredAdmin:
        username = data.username.strip()
        name = data.name.strip()
        if not username or not name:
            raise InvalidAdminRegistrationDataError()
        try:
            registered = self.repository.register_admin(
                username=username,
                password_hash=hash_password(data.password),
                name=name,
            )
        except DuplicateUsernameError as exc:
            raise UsernameAlreadyExistsError() from exc
        return RegisteredAdmin(admin_id=registered.admin_id, admin_guid=registered.admin_guid)
