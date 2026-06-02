from dataclasses import dataclass, field
from datetime import date

from persistence.application.ports.pena_season_port import (
    InvalidSeasonDateRangeError as RepositoryInvalidSeasonDateRangeError,
)
from persistence.application.ports.pena_season_port import (
    PenaNotFoundError as RepositoryPenaNotFoundError,
)
from persistence.application.ports.pena_season_port import (
    PenaNotManagedByAdminError as RepositoryPenaNotManagedByAdminError,
)
from persistence.application.ports.pena_season_port import (
    PenaSeasonPort,
    PenaSeasonResult,
    PenaSeasonsPageResult,
)
from persistence.application.ports.pena_season_port import (
    SeasonDateRangeOverlapError as RepositorySeasonDateRangeOverlapError,
)
from persistence.application.ports.pena_season_port import (
    SeasonNotFoundError as RepositorySeasonNotFoundError,
)
from persistence.application.update_policies import FieldUpdate


@dataclass(frozen=True)
class PenaSeasonInfo:
    guid: str
    start_date: date
    end_date: date
    points_win: int
    points_draw: int
    points_loss: int


@dataclass(frozen=True)
class PenaSeasonsPage:
    items: list[PenaSeasonInfo]
    page: int
    page_size: int
    total: int


@dataclass(frozen=True)
class PenaSeasonCreate:
    start_date: date
    end_date: date
    points_win: int = 3
    points_draw: int = 1
    points_loss: int = 0


@dataclass(frozen=True)
class PenaSeasonUpdate:
    start_date: FieldUpdate[date] = field(default_factory=FieldUpdate.keep)
    end_date: FieldUpdate[date] = field(default_factory=FieldUpdate.keep)
    points_win: FieldUpdate[int] = field(default_factory=FieldUpdate.keep)
    points_draw: FieldUpdate[int] = field(default_factory=FieldUpdate.keep)
    points_loss: FieldUpdate[int] = field(default_factory=FieldUpdate.keep)


class InvalidPenaSeasonDataError(Exception):
    pass


class PenaSeasonPenaNotFoundError(Exception):
    pass


class PenaSeasonAccessDeniedError(Exception):
    pass


class PenaSeasonNotFoundError(Exception):
    pass


class PenaSeasonDateOverlapError(Exception):
    pass


class ManagePenaSeasonsUseCase:
    def __init__(self, repository: PenaSeasonPort):
        self.repository = repository

    def list_for_pena(
        self, *, pena_guid: str, page: int = 1, page_size: int = 20
    ) -> PenaSeasonsPage:
        try:
            result = self.repository.find_for_pena(
                pena_guid=pena_guid,
                page=page,
                page_size=page_size,
            )
        except RepositoryPenaNotFoundError as exc:
            raise PenaSeasonPenaNotFoundError() from exc
        return self._to_page(result)

    def get_by_guid(self, *, pena_guid: str, season_guid: str) -> PenaSeasonInfo:
        try:
            season = self.repository.find_by_guid(
                pena_guid=pena_guid,
                season_guid=season_guid,
            )
        except RepositoryPenaNotFoundError as exc:
            raise PenaSeasonPenaNotFoundError() from exc
        if not season:
            raise PenaSeasonNotFoundError()
        return self._to_info(season)

    def get_active_for_pena(
        self, *, pena_guid: str, reference_date: date | None = None
    ) -> PenaSeasonInfo:
        effective_reference_date = reference_date or date.today()
        try:
            season = self.repository.find_active_for_pena(
                pena_guid=pena_guid,
                reference_date=effective_reference_date,
            )
        except RepositoryPenaNotFoundError as exc:
            raise PenaSeasonPenaNotFoundError() from exc
        if not season:
            raise PenaSeasonNotFoundError()
        return self._to_info(season)

    def create_for_admin(
        self,
        *,
        pena_guid: str,
        admin_id: int,
        data: PenaSeasonCreate,
    ) -> PenaSeasonInfo:
        if data.start_date > data.end_date:
            raise InvalidPenaSeasonDataError()

        try:
            created = self.repository.create_for_admin(
                pena_guid=pena_guid,
                admin_id=admin_id,
                start_date=data.start_date,
                end_date=data.end_date,
                points_win=data.points_win,
                points_draw=data.points_draw,
                points_loss=data.points_loss,
            )
        except RepositoryPenaNotFoundError as exc:
            raise PenaSeasonPenaNotFoundError() from exc
        except RepositoryPenaNotManagedByAdminError as exc:
            raise PenaSeasonAccessDeniedError() from exc
        except RepositorySeasonDateRangeOverlapError as exc:
            raise PenaSeasonDateOverlapError() from exc
        return self._to_info(created)

    def update_for_admin(
        self,
        *,
        pena_guid: str,
        season_guid: str,
        admin_id: int,
        update: PenaSeasonUpdate,
    ) -> PenaSeasonInfo:
        if not any(
            field_update.is_set()
            for field_update in (
                update.start_date,
                update.end_date,
                update.points_win,
                update.points_draw,
                update.points_loss,
            )
        ):
            raise InvalidPenaSeasonDataError()
        if update.points_win.is_set() and update.points_win.value is None:
            raise InvalidPenaSeasonDataError()
        if update.points_draw.is_set() and update.points_draw.value is None:
            raise InvalidPenaSeasonDataError()
        if update.points_loss.is_set() and update.points_loss.value is None:
            raise InvalidPenaSeasonDataError()
        if (
            update.start_date.is_set()
            and update.end_date.is_set()
            and update.start_date.value is not None
            and update.end_date.value is not None
            and update.start_date.value > update.end_date.value
        ):
            raise InvalidPenaSeasonDataError()

        try:
            updated = self.repository.update_for_admin(
                pena_guid=pena_guid,
                season_guid=season_guid,
                admin_id=admin_id,
                start_date=update.start_date,
                end_date=update.end_date,
                points_win=update.points_win,
                points_draw=update.points_draw,
                points_loss=update.points_loss,
            )
        except RepositoryPenaNotFoundError as exc:
            raise PenaSeasonPenaNotFoundError() from exc
        except RepositoryPenaNotManagedByAdminError as exc:
            raise PenaSeasonAccessDeniedError() from exc
        except RepositorySeasonNotFoundError as exc:
            raise PenaSeasonNotFoundError() from exc
        except RepositoryInvalidSeasonDateRangeError as exc:
            raise InvalidPenaSeasonDataError() from exc
        except RepositorySeasonDateRangeOverlapError as exc:
            raise PenaSeasonDateOverlapError() from exc
        return self._to_info(updated)

    def delete_for_admin(self, *, pena_guid: str, season_guid: str, admin_id: int) -> None:
        try:
            self.repository.delete_for_admin(
                pena_guid=pena_guid,
                season_guid=season_guid,
                admin_id=admin_id,
            )
        except RepositoryPenaNotFoundError as exc:
            raise PenaSeasonPenaNotFoundError() from exc
        except RepositoryPenaNotManagedByAdminError as exc:
            raise PenaSeasonAccessDeniedError() from exc
        except RepositorySeasonNotFoundError as exc:
            raise PenaSeasonNotFoundError() from exc

    @staticmethod
    def _to_info(season: PenaSeasonResult) -> PenaSeasonInfo:
        return PenaSeasonInfo(
            guid=season.guid,
            start_date=season.start_date,
            end_date=season.end_date,
            points_win=season.points_win,
            points_draw=season.points_draw,
            points_loss=season.points_loss,
        )

    @classmethod
    def _to_page(cls, result: PenaSeasonsPageResult) -> PenaSeasonsPage:
        return PenaSeasonsPage(
            items=[cls._to_info(item) for item in result.items],
            page=result.page,
            page_size=result.page_size,
            total=result.total,
        )
