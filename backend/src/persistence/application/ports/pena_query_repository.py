from dataclasses import dataclass
from typing import Protocol


@dataclass(frozen=True)
class PenaSummary:
    guid: str
    name: str


@dataclass(frozen=True)
class PenasPageResult:
    items: list[PenaSummary]
    page: int
    page_size: int
    total: int


class PenaQueryRepository(Protocol):
    def find_for_admin(
        self, admin_id: int, *, page: int, page_size: int, search: str | None
    ) -> PenasPageResult:
        ...

    def find_for_user(
        self, account_id: int, *, page: int, page_size: int, search: str | None
    ) -> PenasPageResult:
        ...

    def find_by_guid(self, pena_guid: str) -> PenaSummary | None:
        ...
