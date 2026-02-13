from dataclasses import dataclass
from typing import Protocol


@dataclass(frozen=True)
class PenaLinkTokenResult:
    token: str
    pena_guid: str
    expires_at: int


class PenaNotManagedByAdminError(Exception):
    pass


class InvalidOrExpiredLinkTokenError(Exception):
    pass


class UserAlreadyLinkedToPenaError(Exception):
    pass


class UserPlayerNotFoundError(Exception):
    pass


class PenaLinkRepository(Protocol):
    def create_token_for_admin_pena(
        self, *, admin_id: int, pena_guid: str, ttl_seconds: int
    ) -> PenaLinkTokenResult:
        ...

    def consume_token_for_user(
        self,
        *,
        token: str,
        account_id: int,
        nickname: str | None,
        position: str | None,
    ) -> None:
        ...
