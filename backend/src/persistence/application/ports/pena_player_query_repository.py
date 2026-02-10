from dataclasses import dataclass
from typing import Protocol


@dataclass(frozen=True)
class PenaPlayerInfoResult:
    guid: str
    name: str
    surname1: str
    surname2: str | None
    nationality: str
    nickname: str | None
    position: str | None


@dataclass(frozen=True)
class PenaPlayersPageResult:
    items: list[PenaPlayerInfoResult]
    page: int
    page_size: int
    total: int


class PenaPlayerQueryRepository(Protocol):
    def find_by_pena_guid(
        self,
        pena_guid: str,
        *,
        name: str | None,
        surname1: str | None,
        surname2: str | None,
        nationality: str | None,
        nickname: str | None,
        position: str | None,
        search: str | None,
        page: int,
        page_size: int,
    ) -> PenaPlayersPageResult:
        ...
