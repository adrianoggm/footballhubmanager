from dataclasses import dataclass, field


@dataclass(frozen=True)
class PenaPlayerInfo:
    guid: str
    name: str
    surname1: str
    surname2: str | None
    nationality: str
    nickname: str | None
    role: str | None = field(default=None, kw_only=True)
    position: str | None


@dataclass(frozen=True)
class PenaPlayerFilters:
    name: str | None = None
    surname1: str | None = None
    surname2: str | None = None
    nationality: str | None = None
    nickname: str | None = None
    role: str | None = None
    position: str | None = None
    search: str | None = None


@dataclass(frozen=True)
class PenaPlayersPage:
    items: list[PenaPlayerInfo]
    page: int
    page_size: int
    total: int
