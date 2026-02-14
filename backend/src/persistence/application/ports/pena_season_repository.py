from dataclasses import dataclass
from datetime import date
from typing import Protocol


@dataclass(frozen=True)
class PenaSeasonResult:
    guid: str
    start_date: date
    end_date: date


@dataclass(frozen=True)
class PenaSeasonsPageResult:
    items: list[PenaSeasonResult]
    page: int
    page_size: int
    total: int


class PenaNotFoundError(Exception):
    pass


class PenaNotManagedByAdminError(Exception):
    pass


class SeasonDateRangeOverlapError(Exception):
    pass


class SeasonNotFoundError(Exception):
    pass


class InvalidSeasonDateRangeError(Exception):
    pass


class PenaSeasonRepository(Protocol):
    def find_for_pena(
        self, *, pena_guid: str, page: int, page_size: int
    ) -> PenaSeasonsPageResult: ...

    def find_by_guid(self, *, pena_guid: str, season_guid: str) -> PenaSeasonResult | None: ...

    def find_active_for_pena(
        self, *, pena_guid: str, reference_date: date
    ) -> PenaSeasonResult | None: ...

    def create_for_admin(
        self,
        *,
        pena_guid: str,
        admin_id: int,
        start_date: date,
        end_date: date,
    ) -> PenaSeasonResult: ...

    def update_for_admin(
        self,
        *,
        pena_guid: str,
        season_guid: str,
        admin_id: int,
        start_date_provided: bool,
        start_date: date | None,
        end_date_provided: bool,
        end_date: date | None,
    ) -> PenaSeasonResult: ...

    def delete_for_admin(
        self,
        *,
        pena_guid: str,
        season_guid: str,
        admin_id: int,
    ) -> None: ...
