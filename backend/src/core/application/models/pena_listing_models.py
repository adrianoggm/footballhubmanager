from dataclasses import dataclass


@dataclass(frozen=True)
class PenaSummary:
    guid: str
    name: str
    image_url: str | None = None


@dataclass(frozen=True)
class PenasPageResult:
    items: list[PenaSummary]
    page: int
    page_size: int
    total: int


@dataclass(frozen=True)
class PenaInfo:
    guid: str
    name: str
    image_url: str | None = None


@dataclass(frozen=True)
class PenasPage:
    items: list[PenaInfo]
    page: int
    page_size: int
    total: int
