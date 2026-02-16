from dataclasses import dataclass
from datetime import date
from typing import Protocol


@dataclass(frozen=True)
class PenaSeasonResult:
    guid: str
    start_date: date
    end_date: date
    points_win: int
    points_draw: int
    points_loss: int


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
        points_win: int,
        points_draw: int,
        points_loss: int,
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
        points_win_provided: bool,
        points_win: int | None,
        points_draw_provided: bool,
        points_draw: int | None,
        points_loss_provided: bool,
        points_loss: int | None,
    ) -> PenaSeasonResult: ...

    def delete_for_admin(
        self,
        *,
        pena_guid: str,
        season_guid: str,
        admin_id: int,
    ) -> None: ...
