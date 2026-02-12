from dataclasses import dataclass

from persistence.application.ports.pena_membership_repository import (
    PenaMembershipNotFoundError as RepositoryPenaMembershipNotFoundError,
    PenaMembershipRepository,
    PenaMembershipResult,
    PenaNotFoundError as RepositoryPenaNotFoundError,
    PenaNotManagedByAdminError as RepositoryPenaNotManagedByAdminError,
    PlayerNotFoundError as RepositoryPlayerNotFoundError,
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
    position: str | None = None
    nickname_provided: bool = False
    position_provided: bool = False


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


class ManagePenaMembershipUseCase:
    def __init__(self, repository: PenaMembershipRepository):
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
        return self._to_info(membership)

    def update_for_user(
        self, *, pena_guid: str, account_id: int, update: PenaMembershipUpdate
    ) -> PenaMembershipInfo:
        nickname, position = self._normalize_update(update)
        try:
            membership = self.repository.update_by_account(
                pena_guid=pena_guid,
                account_id=account_id,
                nickname_provided=update.nickname_provided,
                nickname=nickname,
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
        nickname, position = self._normalize_update(update)
        try:
            membership = self.repository.update_by_player_for_admin(
                pena_guid=pena_guid,
                admin_id=admin_id,
                player_guid=player_guid,
                nickname_provided=update.nickname_provided,
                nickname=nickname,
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

    @staticmethod
    def _normalize_update(update: PenaMembershipUpdate) -> tuple[str | None, str | None]:
        if not update.nickname_provided and not update.position_provided:
            raise InvalidPenaMembershipUpdateDataError()

        nickname = update.nickname
        position = update.position

        if update.nickname_provided:
            nickname = nickname.strip() if nickname is not None else None
            if nickname == "":
                nickname = None

        if update.position_provided:
            position = position.strip() if position is not None else None
            if position == "":
                position = None

        return nickname, position

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
            position=membership.position,
            role="member",
        )
