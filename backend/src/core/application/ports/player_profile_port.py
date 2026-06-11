from dataclasses import dataclass
from typing import Protocol


@dataclass(frozen=True)
class PenaInfoResult:
    guid: str
    name: str


@dataclass(frozen=True)
class PlayerProfileResult:
    guid: str
    name: str
    surname1: str
    surname2: str | None
    nationality: str
    penas: list[PenaInfoResult]
    image_url: str | None = None


class PlayerProfilePort(Protocol):
    def find_by_guid(self, player_guid: str) -> PlayerProfileResult | None: ...

    def find_by_account_id(self, account_id: int) -> PlayerProfileResult | None: ...

    def update_by_guid(
        self,
        player_guid: str,
        *,
        name: str | None,
        surname1: str | None,
        surname2: str | None,
        nationality: str | None,
        image_url: str | None,
    ) -> PlayerProfileResult | None: ...

    def update_by_account_id(
        self,
        account_id: int,
        *,
        name: str | None,
        surname1: str | None,
        surname2: str | None,
        nationality: str | None,
        image_url: str | None,
    ) -> PlayerProfileResult | None: ...
