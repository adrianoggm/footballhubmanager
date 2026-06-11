"""Handlers de escritura de membership. La traducción de errores de contrato
del repositorio a errores de dominio depende del contexto (user vs admin)."""

from __future__ import annotations

from core.application.commands.pena_membership_commands import (
    CreateGuestPlayerCommand,
    RemoveMembershipForAdminCommand,
    RemoveMembershipForUserCommand,
    UpdateMembershipForAdminCommand,
    UpdateMembershipForUserCommand,
)
from core.application.models import PenaMembershipInfo
from core.application.policies import FieldUpdate
from core.application.ports.pena_membership_port import (
    InvalidNationalityError as RepositoryInvalidNationalityError,
)
from core.application.ports.pena_membership_port import (
    InvalidRoleLabelError as RepositoryInvalidRoleLabelError,
)
from core.application.ports.pena_membership_port import (
    PenaMembershipNotFoundError as RepositoryPenaMembershipNotFoundError,
)
from core.application.ports.pena_membership_port import PenaMembershipPort
from core.application.ports.pena_membership_port import (
    PenaNotFoundError as RepositoryPenaNotFoundError,
)
from core.application.ports.pena_membership_port import (
    PenaNotManagedByAdminError as RepositoryPenaNotManagedByAdminError,
)
from core.application.ports.pena_membership_port import (
    PlayerNotFoundError as RepositoryPlayerNotFoundError,
)
from core.application.ports.pena_membership_port import (
    UserPlayerNotFoundError as RepositoryUserPlayerNotFoundError,
)
from core.application.queries.pena_membership_query_handlers import to_membership_info
from core.domain.errors import (
    InvalidPenaGuestPlayerDataError,
    InvalidPenaMembershipUpdateDataError,
    PenaMembershipAccessDeniedError,
    PenaMembershipInvalidNationalityError,
    PenaMembershipNotFoundError,
    PenaMembershipPenaNotFoundError,
    PenaMembershipPlayerNotFoundError,
    PenaMembershipUserProfileNotFoundError,
)


def _normalize_field(value: FieldUpdate[str]) -> FieldUpdate[str]:
    if not value.is_set():
        return FieldUpdate.keep()
    raw = value.value
    normalized = raw.strip() if raw is not None else None
    if normalized == "":
        normalized = None
    return FieldUpdate.set(normalized)


def _normalize_update(
    *, nickname: FieldUpdate[str], role: FieldUpdate[str], position: FieldUpdate[str]
) -> tuple[FieldUpdate[str], FieldUpdate[str], FieldUpdate[str]]:
    if not (nickname.is_set() or role.is_set() or position.is_set()):
        raise InvalidPenaMembershipUpdateDataError()
    return _normalize_field(nickname), _normalize_field(role), _normalize_field(position)


class UpdateMembershipForUserHandler:
    def __init__(self, repository: PenaMembershipPort) -> None:
        self._repository = repository

    def handle(self, command: UpdateMembershipForUserCommand) -> PenaMembershipInfo:
        nickname, role, position = _normalize_update(
            nickname=command.nickname, role=command.role, position=command.position
        )
        try:
            membership = self._repository.update_by_account(
                pena_guid=command.pena_guid,
                account_id=command.account_id,
                nickname=nickname,
                role=role,
                position=position,
            )
        except RepositoryPenaNotFoundError as exc:
            raise PenaMembershipPenaNotFoundError() from exc
        except RepositoryUserPlayerNotFoundError as exc:
            raise PenaMembershipUserProfileNotFoundError() from exc
        except RepositoryPenaMembershipNotFoundError as exc:
            raise PenaMembershipAccessDeniedError() from exc
        return to_membership_info(membership)


class RemoveMembershipForUserHandler:
    def __init__(self, repository: PenaMembershipPort) -> None:
        self._repository = repository

    def handle(self, command: RemoveMembershipForUserCommand) -> None:
        try:
            self._repository.delete_by_account(
                pena_guid=command.pena_guid, account_id=command.account_id
            )
        except RepositoryPenaNotFoundError as exc:
            raise PenaMembershipPenaNotFoundError() from exc
        except RepositoryUserPlayerNotFoundError as exc:
            raise PenaMembershipUserProfileNotFoundError() from exc
        except RepositoryPenaMembershipNotFoundError as exc:
            raise PenaMembershipAccessDeniedError() from exc


class UpdateMembershipForAdminHandler:
    def __init__(self, repository: PenaMembershipPort) -> None:
        self._repository = repository

    def handle(self, command: UpdateMembershipForAdminCommand) -> PenaMembershipInfo:
        nickname, role, position = _normalize_update(
            nickname=command.nickname, role=command.role, position=command.position
        )
        try:
            membership = self._repository.update_by_player_for_admin(
                pena_guid=command.pena_guid,
                admin_id=command.admin_id,
                player_guid=command.player_guid,
                nickname=nickname,
                role=role,
                position=position,
            )
        except RepositoryPenaNotFoundError as exc:
            raise PenaMembershipPenaNotFoundError() from exc
        except RepositoryPenaNotManagedByAdminError as exc:
            raise PenaMembershipAccessDeniedError() from exc
        except RepositoryPlayerNotFoundError as exc:
            raise PenaMembershipPlayerNotFoundError() from exc
        except RepositoryPenaMembershipNotFoundError as exc:
            raise PenaMembershipNotFoundError() from exc
        except RepositoryInvalidRoleLabelError as exc:
            raise InvalidPenaMembershipUpdateDataError() from exc
        return to_membership_info(membership)


class RemoveMembershipForAdminHandler:
    def __init__(self, repository: PenaMembershipPort) -> None:
        self._repository = repository

    def handle(self, command: RemoveMembershipForAdminCommand) -> None:
        try:
            self._repository.delete_by_player_for_admin(
                pena_guid=command.pena_guid,
                admin_id=command.admin_id,
                player_guid=command.player_guid,
            )
        except RepositoryPenaNotFoundError as exc:
            raise PenaMembershipPenaNotFoundError() from exc
        except RepositoryPenaNotManagedByAdminError as exc:
            raise PenaMembershipAccessDeniedError() from exc
        except RepositoryPlayerNotFoundError as exc:
            raise PenaMembershipPlayerNotFoundError() from exc
        except RepositoryPenaMembershipNotFoundError as exc:
            raise PenaMembershipNotFoundError() from exc


class CreateGuestPlayerHandler:
    def __init__(self, repository: PenaMembershipPort) -> None:
        self._repository = repository

    def handle(self, command: CreateGuestPlayerCommand) -> PenaMembershipInfo:
        name = command.name.strip()
        surname1 = command.surname1.strip()
        nationality = command.nationality.strip()
        surname2 = command.surname2.strip() if command.surname2 is not None else None
        nickname = command.nickname.strip() if command.nickname is not None else None
        role = command.role.strip() if command.role is not None else None
        position = command.position.strip() if command.position is not None else None
        surname2 = surname2 or None
        nickname = nickname or None
        role = role or None
        position = position or None

        if not name or not surname1 or not nationality:
            raise InvalidPenaGuestPlayerDataError()

        try:
            created = self._repository.create_guest_player_for_admin(
                pena_guid=command.pena_guid,
                admin_id=command.admin_id,
                name=name,
                surname1=surname1,
                surname2=surname2,
                nationality=nationality,
                nickname=nickname,
                role=role,
                position=position,
            )
        except RepositoryPenaNotFoundError as exc:
            raise PenaMembershipPenaNotFoundError() from exc
        except RepositoryPenaNotManagedByAdminError as exc:
            raise PenaMembershipAccessDeniedError() from exc
        except RepositoryInvalidNationalityError as exc:
            raise PenaMembershipInvalidNationalityError() from exc
        except RepositoryInvalidRoleLabelError as exc:
            raise InvalidPenaGuestPlayerDataError() from exc
        return to_membership_info(created)
