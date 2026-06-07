from dataclasses import dataclass
from datetime import date
from typing import Protocol

from core.application.policies import FieldUpdate


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


class PenaSeasonPort(Protocol):
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
        start_date: FieldUpdate[date],
        end_date: FieldUpdate[date],
        points_win: FieldUpdate[int],
        points_draw: FieldUpdate[int],
        points_loss: FieldUpdate[int],
    ) -> PenaSeasonResult: ...

    def delete_for_admin(
        self,
        *,
        pena_guid: str,
        season_guid: str,
        admin_id: int,
    ) -> None: ...
