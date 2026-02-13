from typing import Protocol

from auth.application.models import AuthAccount


class AuthAccountRepository(Protocol):
    def find_user_by_username(self, username: str) -> AuthAccount | None:
        ...

    def find_admin_by_username(self, username: str) -> AuthAccount | None:
        ...


class AccessRepository(Protocol):
    def admin_manages_pena(self, *, admin_id: int, pena_guid: str) -> bool:
        ...

    def user_belongs_to_pena(self, *, account_id: int, pena_guid: str) -> bool:
        ...

    def user_owns_player(self, *, account_id: int, player_guid: str) -> bool:
        ...

    def admin_manages_player(self, *, admin_id: int, player_guid: str) -> bool:
        ...
