from dataclasses import dataclass
from typing import Protocol


@dataclass(frozen=True)
class PenaMembershipResult:
    pena_guid: str
    player_guid: str
    name: str
    surname1: str
    surname2: str | None
    nationality: str
    nickname: str | None
    position: str | None


class PenaNotFoundError(Exception):
    pass


class PenaNotManagedByAdminError(Exception):
    pass


class PenaMembershipNotFoundError(Exception):
    pass


class PlayerNotFoundError(Exception):
    pass


class UserPlayerNotFoundError(Exception):
    pass


class InvalidNationalityError(Exception):
    pass


class PenaMembershipRepository(Protocol):
    def get_by_pena_and_player(
        self, *, pena_guid: str, player_guid: str
    ) -> PenaMembershipResult: ...

    def get_by_pena_and_account(
        self, *, pena_guid: str, account_id: int
    ) -> PenaMembershipResult: ...

    def update_by_account(
        self,
        *,
        pena_guid: str,
        account_id: int,
        nickname_provided: bool,
        nickname: str | None,
        position_provided: bool,
        position: str | None,
    ) -> PenaMembershipResult: ...

    def delete_by_account(
        self,
        *,
        pena_guid: str,
        account_id: int,
    ) -> None: ...

    def update_by_player_for_admin(
        self,
        *,
        pena_guid: str,
        admin_id: int,
        player_guid: str,
        nickname_provided: bool,
        nickname: str | None,
        position_provided: bool,
        position: str | None,
    ) -> PenaMembershipResult: ...

    def delete_by_player_for_admin(
        self,
        *,
        pena_guid: str,
        admin_id: int,
        player_guid: str,
    ) -> None: ...

    def create_guest_player_for_admin(
        self,
        *,
        pena_guid: str,
        admin_id: int,
        name: str,
        surname1: str,
        surname2: str | None,
        nationality: str,
        nickname: str | None,
        position: str | None,
    ) -> PenaMembershipResult: ...
