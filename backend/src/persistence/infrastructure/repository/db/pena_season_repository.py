from datetime import date

from persistence.application.ports.pena_season_repository import (
    InvalidSeasonDateRangeError,
    PenaNotFoundError,
    PenaNotManagedByAdminError,
    PenaSeasonRepository,
    PenaSeasonResult,
    PenaSeasonsPageResult,
    SeasonDateRangeOverlapError,
    SeasonNotFoundError,
)
from persistence.domain.entity import Pena, Season
from sqlalchemy import func, select
from sqlalchemy.orm import Session


class SqlAlchemyPenaSeasonRepository(PenaSeasonRepository):
    def __init__(self, session: Session):
        self.session = session

    def find_for_pena(self, *, pena_guid: str, page: int, page_size: int) -> PenaSeasonsPageResult:
        pena = self._get_pena(pena_guid)

        stmt = (
            select(Season)
            .where(Season.id_pena == pena.id)
            .order_by(Season.start_date.desc(), Season.end_date.desc())
            .limit(page_size)
            .offset((page - 1) * page_size)
        )
        total_stmt = select(func.count()).select_from(Season).where(Season.id_pena == pena.id)

        seasons = self.session.execute(stmt).scalars().all()
        total = int(self.session.execute(total_stmt).scalar() or 0)
        return PenaSeasonsPageResult(
            items=[
                PenaSeasonResult(
                    guid=season.guid,
                    start_date=season.start_date,
                    end_date=season.end_date,
                    points_win=season.points_win,
                    points_draw=season.points_draw,
                    points_loss=season.points_loss,
                )
                for season in seasons
            ],
            page=page,
            page_size=page_size,
            total=total,
        )

    def find_by_guid(self, *, pena_guid: str, season_guid: str) -> PenaSeasonResult | None:
        pena = self._get_pena(pena_guid)
        season = self.session.execute(
            select(Season).where(Season.guid == season_guid, Season.id_pena == pena.id)
        ).scalar_one_or_none()
        if not season:
            return None
        return PenaSeasonResult(
            guid=season.guid,
            start_date=season.start_date,
            end_date=season.end_date,
            points_win=season.points_win,
            points_draw=season.points_draw,
            points_loss=season.points_loss,
        )

    def find_active_for_pena(
        self, *, pena_guid: str, reference_date: date
    ) -> PenaSeasonResult | None:
        pena = self._get_pena(pena_guid)
        season = self.session.execute(
            select(Season)
            .where(
                Season.id_pena == pena.id,
                Season.start_date <= reference_date,
                Season.end_date >= reference_date,
            )
            .order_by(Season.start_date.desc(), Season.end_date.desc())
            .limit(1)
        ).scalar_one_or_none()
        if not season:
            return None
        return PenaSeasonResult(
            guid=season.guid,
            start_date=season.start_date,
            end_date=season.end_date,
            points_win=season.points_win,
            points_draw=season.points_draw,
            points_loss=season.points_loss,
        )

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
    ) -> PenaSeasonResult:
        pena = self._get_pena(pena_guid)
        if pena.id_admin != admin_id:
            self.session.rollback()
            raise PenaNotManagedByAdminError()

        if self._has_overlapping_range(
            pena_id=pena.id,
            start_date=start_date,
            end_date=end_date,
        ):
            self.session.rollback()
            raise SeasonDateRangeOverlapError()

        season = Season(
            id_pena=pena.id,
            start_date=start_date,
            end_date=end_date,
            points_win=points_win,
            points_draw=points_draw,
            points_loss=points_loss,
        )
        self.session.add(season)
        self.session.commit()
        self.session.refresh(season)
        return PenaSeasonResult(
            guid=season.guid,
            start_date=season.start_date,
            end_date=season.end_date,
            points_win=season.points_win,
            points_draw=season.points_draw,
            points_loss=season.points_loss,
        )

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
    ) -> PenaSeasonResult:
        pena = self._get_pena(pena_guid)
        if pena.id_admin != admin_id:
            self.session.rollback()
            raise PenaNotManagedByAdminError()

        season = self._get_season_for_pena(
            pena_id=pena.id,
            season_guid=season_guid,
            for_update=True,
        )

        resolved_start_date = start_date if start_date_provided else season.start_date
        resolved_end_date = end_date if end_date_provided else season.end_date
        resolved_points_win = points_win if points_win_provided else season.points_win
        resolved_points_draw = points_draw if points_draw_provided else season.points_draw
        resolved_points_loss = points_loss if points_loss_provided else season.points_loss
        if (
            resolved_start_date is None
            or resolved_end_date is None
            or resolved_points_win is None
            or resolved_points_draw is None
            or resolved_points_loss is None
            or resolved_start_date > resolved_end_date
        ):
            self.session.rollback()
            raise InvalidSeasonDateRangeError()

        if self._has_overlapping_range(
            pena_id=pena.id,
            start_date=resolved_start_date,
            end_date=resolved_end_date,
            exclude_season_id=season.id,
        ):
            self.session.rollback()
            raise SeasonDateRangeOverlapError()

        season.start_date = resolved_start_date
        season.end_date = resolved_end_date
        season.points_win = resolved_points_win
        season.points_draw = resolved_points_draw
        season.points_loss = resolved_points_loss
        self.session.commit()
        self.session.refresh(season)
        return PenaSeasonResult(
            guid=season.guid,
            start_date=season.start_date,
            end_date=season.end_date,
            points_win=season.points_win,
            points_draw=season.points_draw,
            points_loss=season.points_loss,
        )

    def delete_for_admin(
        self,
        *,
        pena_guid: str,
        season_guid: str,
        admin_id: int,
    ) -> None:
        pena = self._get_pena(pena_guid)
        if pena.id_admin != admin_id:
            self.session.rollback()
            raise PenaNotManagedByAdminError()

        season = self._get_season_for_pena(
            pena_id=pena.id,
            season_guid=season_guid,
            for_update=True,
        )
        self.session.delete(season)
        self.session.commit()

    def _get_pena(self, pena_guid: str) -> Pena:
        pena = self.session.execute(select(Pena).where(Pena.guid == pena_guid)).scalar_one_or_none()
        if not pena:
            self.session.rollback()
            raise PenaNotFoundError()
        return pena

    def _get_season_for_pena(self, *, pena_id: int, season_guid: str, for_update: bool) -> Season:
        stmt = select(Season).where(Season.guid == season_guid, Season.id_pena == pena_id)
        if for_update:
            stmt = stmt.with_for_update()
        season = self.session.execute(stmt).scalar_one_or_none()
        if not season:
            self.session.rollback()
            raise SeasonNotFoundError()
        return season

    def _has_overlapping_range(
        self,
        *,
        pena_id: int,
        start_date: date,
        end_date: date,
        exclude_season_id: int | None = None,
    ) -> bool:
        stmt = (
            select(Season.id)
            .where(
                Season.id_pena == pena_id,
                Season.start_date <= end_date,
                Season.end_date >= start_date,
            )
            .limit(1)
        )
        if exclude_season_id is not None:
            stmt = stmt.where(Season.id != exclude_season_id)
        row = self.session.execute(stmt).first()
        return bool(row)
