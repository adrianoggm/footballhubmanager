from dataclasses import dataclass

from persistence.application.ports.pena_membership_port import (
    InvalidNationalityError as RepositoryInvalidNationalityError,
)
from persistence.application.ports.pena_membership_port import (
    InvalidRoleLabelError as RepositoryInvalidRoleLabelError,
)
from persistence.application.ports.pena_membership_port import (
    PenaMembershipNotFoundError as RepositoryPenaMembershipNotFoundError,
)
from persistence.application.ports.pena_membership_port import (
    PenaMembershipPort,
    PenaMembershipResult,
)
from persistence.application.ports.pena_membership_port import (
    PenaNotFoundError as RepositoryPenaNotFoundError,
)
from persistence.application.ports.pena_membership_port import (
    PenaNotManagedByAdminError as RepositoryPenaNotManagedByAdminError,
)
from persistence.application.ports.pena_membership_port import (
    PlayerNotFoundError as RepositoryPlayerNotFoundError,
)
from persistence.application.ports.pena_membership_port import (
    UserPlayerNotFoundError as RepositoryUserPlayerNotFoundError,
)


@dataclass(frozen=True)
class PenaMembershipInfo:
    pena_guid: str
    player_guid: str
    name: str
    surname1: str
    surname2: str | None
    nationality: str
    nickname: str | None
    position: str | None
    role: str


@dataclass(frozen=True)
class PenaMembershipUpdate:
    nickname: str | None = None
    role: str | None = None
    position: str | None = None
    nickname_provided: bool = False
    role_provided: bool = False
    position_provided: bool = False


@dataclass(frozen=True)
class PenaGuestPlayerCreate:
    name: str
    surname1: str
    surname2: str | None = None
    nationality: str = ""
    nickname: str | None = None
    role: str | None = None
    position: str | None = None


class PenaMembershipPenaNotFoundError(Exception):
    pass


class PenaMembershipAccessDeniedError(Exception):
    pass


class PenaMembershipNotFoundError(Exception):
    pass


class PenaMembershipPlayerNotFoundError(Exception):
    pass


class PenaMembershipUserProfileNotFoundError(Exception):
    pass


class InvalidPenaMembershipUpdateDataError(Exception):
    pass


class InvalidPenaGuestPlayerDataError(Exception):
    pass


class PenaMembershipInvalidNationalityError(Exception):
    pass


class ManagePenaMembershipUseCase:
    def __init__(self, repository: PenaMembershipPort):
        self.repository = repository

    def get_for_player(self, *, pena_guid: str, player_guid: str) -> PenaMembershipInfo:
        try:
            membership = self.repository.get_by_pena_and_player(
                pena_guid=pena_guid,
                player_guid=player_guid,
            )
        except RepositoryPenaNotFoundError as exc:
            raise PenaMembershipPenaNotFoundError() from exc
        except RepositoryPlayerNotFoundError as exc:
            raise PenaMembershipPlayerNotFoundError() from exc
        except RepositoryPenaMembershipNotFoundError as exc:
            raise PenaMembershipNotFoundError() from exc
        return self._to_info(membership)

    def get_for_user(self, *, pena_guid: str, account_id: int) -> PenaMembershipInfo:
        try:
            membership = self.repository.get_by_pena_and_account(
                pena_guid=pena_guid,
                account_id=account_id,
            )
        except RepositoryPenaNotFoundError as exc:
            raise PenaMembershipPenaNotFoundError() from exc
        except RepositoryUserPlayerNotFoundError as exc:
            raise PenaMembershipUserProfileNotFoundError() from exc
        except RepositoryPenaMembershipNotFoundError as exc:
            raise PenaMembershipAccessDeniedError() from exc
        except RepositoryInvalidRoleLabelError as exc:
            raise InvalidPenaMembershipUpdateDataError() from exc
        return self._to_info(membership)

    def update_for_user(
        self, *, pena_guid: str, account_id: int, update: PenaMembershipUpdate
    ) -> PenaMembershipInfo:
        nickname, role, position = self._normalize_update(update)
        try:
            membership = self.repository.update_by_account(
                pena_guid=pena_guid,
                account_id=account_id,
                nickname_provided=update.nickname_provided,
                nickname=nickname,
                role_provided=update.role_provided,
                role=role,
                position_provided=update.position_provided,
                position=position,
            )
        except RepositoryPenaNotFoundError as exc:
            raise PenaMembershipPenaNotFoundError() from exc
        except RepositoryUserPlayerNotFoundError as exc:
            raise PenaMembershipUserProfileNotFoundError() from exc
        except RepositoryPenaMembershipNotFoundError as exc:
            raise PenaMembershipAccessDeniedError() from exc
        return self._to_info(membership)

    def remove_for_user(self, *, pena_guid: str, account_id: int) -> None:
        try:
            self.repository.delete_by_account(
                pena_guid=pena_guid,
                account_id=account_id,
            )
        except RepositoryPenaNotFoundError as exc:
            raise PenaMembershipPenaNotFoundError() from exc
        except RepositoryUserPlayerNotFoundError as exc:
            raise PenaMembershipUserProfileNotFoundError() from exc
        except RepositoryPenaMembershipNotFoundError as exc:
            raise PenaMembershipAccessDeniedError() from exc

    def update_for_admin(
        self,
        *,
        pena_guid: str,
        admin_id: int,
        player_guid: str,
        update: PenaMembershipUpdate,
    ) -> PenaMembershipInfo:
        nickname, role, position = self._normalize_update(update)
        try:
            membership = self.repository.update_by_player_for_admin(
                pena_guid=pena_guid,
                admin_id=admin_id,
                player_guid=player_guid,
                nickname_provided=update.nickname_provided,
                nickname=nickname,
                role_provided=update.role_provided,
                role=role,
                position_provided=update.position_provided,
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
        return self._to_info(membership)

    def remove_for_admin(self, *, pena_guid: str, admin_id: int, player_guid: str) -> None:
        try:
            self.repository.delete_by_player_for_admin(
                pena_guid=pena_guid,
                admin_id=admin_id,
                player_guid=player_guid,
            )
        except RepositoryPenaNotFoundError as exc:
            raise PenaMembershipPenaNotFoundError() from exc
        except RepositoryPenaNotManagedByAdminError as exc:
            raise PenaMembershipAccessDeniedError() from exc
        except RepositoryPlayerNotFoundError as exc:
            raise PenaMembershipPlayerNotFoundError() from exc
        except RepositoryPenaMembershipNotFoundError as exc:
            raise PenaMembershipNotFoundError() from exc

    def create_guest_for_admin(
        self, *, pena_guid: str, admin_id: int, data: PenaGuestPlayerCreate
    ) -> PenaMembershipInfo:
        name = data.name.strip()
        surname1 = data.surname1.strip()
        nationality = data.nationality.strip()
        surname2 = data.surname2.strip() if data.surname2 is not None else None
        nickname = data.nickname.strip() if data.nickname is not None else None
        role = data.role.strip() if data.role is not None else None
        position = data.position.strip() if data.position is not None else None
        if surname2 == "":
            surname2 = None
        if nickname == "":
            nickname = None
        if role == "":
            role = None
        if position == "":
            position = None

        if not name or not surname1 or not nationality:
            raise InvalidPenaGuestPlayerDataError()

        try:
            created = self.repository.create_guest_player_for_admin(
                pena_guid=pena_guid,
                admin_id=admin_id,
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
        return self._to_info(created)

    @staticmethod
    def _normalize_update(
        update: PenaMembershipUpdate,
    ) -> tuple[str | None, str | None, str | None]:
        if (
            not update.nickname_provided
            and not update.role_provided
            and not update.position_provided
        ):
            raise InvalidPenaMembershipUpdateDataError()

        nickname = update.nickname
        role = update.role
        position = update.position

        if update.nickname_provided:
            nickname = nickname.strip() if nickname is not None else None
            if nickname == "":
                nickname = None

        if update.role_provided:
            role = role.strip() if role is not None else None
            if role == "":
                role = None

        if update.position_provided:
            position = position.strip() if position is not None else None
            if position == "":
                position = None

        return nickname, role, position

    @staticmethod
    def _to_info(membership: PenaMembershipResult) -> PenaMembershipInfo:
        return PenaMembershipInfo(
            pena_guid=membership.pena_guid,
            player_guid=membership.player_guid,
            name=membership.name,
            surname1=membership.surname1,
            surname2=membership.surname2,
            nationality=membership.nationality,
            nickname=membership.nickname,
            role=membership.role,
            position=membership.position,
        )
