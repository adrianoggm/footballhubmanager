"""Handlers de los comandos de registro de admin y usuario."""

from __future__ import annotations

from auth.security import hash_password
from core.application.commands.registration_commands import (
    RegisterAdminCommand,
    RegisterUserCommand,
)
from core.application.models import RegisteredAdmin, RegisteredUser
from core.application.ports.registration_port import (
    AdminRegistrationPort,
    UserRegistrationPort,
)
from core.domain.errors import InvalidAdminRegistrationDataError, InvalidRegistrationDataError


class RegisterAdminHandler:
    def __init__(self, repository: AdminRegistrationPort) -> None:
        self._repository = repository

    def handle(self, command: RegisterAdminCommand) -> RegisteredAdmin:
        username = command.username.strip()
        name = command.name.strip()
        if not username or not name:
            raise InvalidAdminRegistrationDataError()
        registered = self._repository.register_admin(
            username=username,
            password_hash=hash_password(command.password),
            name=name,
        )
        return RegisteredAdmin(admin_id=registered.admin_id, admin_guid=registered.admin_guid)


class RegisterUserHandler:
    def __init__(self, repository: UserRegistrationPort) -> None:
        self._repository = repository

    def handle(self, command: RegisterUserCommand) -> RegisteredUser:
        username = command.username.strip()
        name = command.name.strip()
        surname1 = command.surname1.strip()
        surname2 = command.surname2.strip() if command.surname2 is not None else None
        nationality = command.nationality.strip()

        if not username or not name or not surname1 or not nationality:
            raise InvalidRegistrationDataError()
        if surname2 == "":
            surname2 = None

        registered = self._repository.register_user(
            username=username,
            password_hash=hash_password(command.password),
            name=name,
            surname1=surname1,
            surname2=surname2,
            nationality=nationality,
        )
        return RegisteredUser(
            account_id=registered.account_id,
            account_guid=registered.account_guid,
            player_guid=registered.player_guid,
        )
