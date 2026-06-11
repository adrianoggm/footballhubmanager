from datetime import date

from core.application.policies import FieldUpdate
from core.application.ports.pena_season_port import (
    PenaSeasonPort,
    PenaSeasonResult,
    PenaSeasonsPageResult,
)
from core.domain.errors import (
    InvalidPenaSeasonDataError,
    PenaSeasonAccessDeniedError,
    PenaSeasonDateOverlapError,
    PenaSeasonNotFoundError,
    PenaSeasonPenaNotFoundError,
)
from persistence.infrastructure.entity import Pena, Season
from sqlalchemy import func, select
from sqlalchemy.orm import Session


class SqlAlchemyPenaSeasonRepository(PenaSeasonPort):
    def __init__(self, session: Session):
        self.session = session

    def find_for_pena(self, *, pena_guid: str, page: int, page_size: int) -> PenaSeasonsPageResult:
        pena = self._get_pena(pena_guid)

        stmt = (
            select(Season)
            .where(Season.id_pena == pena.id)
            .order_by(Season.end_date.desc(), Season.start_date.desc())
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
            raise PenaSeasonAccessDeniedError()

        if self._has_overlapping_range(
            pena_id=pena.id,
            start_date=start_date,
            end_date=end_date,
        ):
            self.session.rollback()
            raise PenaSeasonDateOverlapError()

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
        start_date: FieldUpdate[date],
        end_date: FieldUpdate[date],
        points_win: FieldUpdate[int],
        points_draw: FieldUpdate[int],
        points_loss: FieldUpdate[int],
    ) -> PenaSeasonResult:
        pena = self._get_pena(pena_guid)
        if pena.id_admin != admin_id:
            self.session.rollback()
            raise PenaSeasonAccessDeniedError()

        season = self._lock_season_for_pena(
            pena_id=pena.id,
            season_guid=season_guid,
        )

        resolved_start_date = start_date.value if start_date.is_set() else season.start_date
        resolved_end_date = end_date.value if end_date.is_set() else season.end_date
        resolved_points_win = points_win.value if points_win.is_set() else season.points_win
        resolved_points_draw = points_draw.value if points_draw.is_set() else season.points_draw
        resolved_points_loss = points_loss.value if points_loss.is_set() else season.points_loss
        if (
            resolved_start_date is None
            or resolved_end_date is None
            or resolved_points_win is None
            or resolved_points_draw is None
            or resolved_points_loss is None
            or resolved_start_date > resolved_end_date
        ):
            self.session.rollback()
            raise InvalidPenaSeasonDataError()

        if self._has_overlapping_range(
            pena_id=pena.id,
            start_date=resolved_start_date,
            end_date=resolved_end_date,
            exclude_season_id=season.id,
        ):
            self.session.rollback()
            raise PenaSeasonDateOverlapError()

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
            raise PenaSeasonAccessDeniedError()

        season = self._lock_season_for_pena(
            pena_id=pena.id,
            season_guid=season_guid,
        )
        self.session.delete(season)
        self.session.commit()

    def _get_pena(self, pena_guid: str) -> Pena:
        pena = self.session.execute(select(Pena).where(Pena.guid == pena_guid)).scalar_one_or_none()
        if not pena:
            self.session.rollback()
            raise PenaSeasonPenaNotFoundError()
        return pena

    def _get_season_for_pena(self, *, pena_id: int, season_guid: str) -> Season:
        season = self.session.execute(
            select(Season).where(Season.guid == season_guid, Season.id_pena == pena_id)
        ).scalar_one_or_none()
        if not season:
            self.session.rollback()
            raise PenaSeasonNotFoundError()
        return season

    def _lock_season_for_pena(self, *, pena_id: int, season_guid: str) -> Season:
        stmt = (
            select(Season)
            .where(Season.guid == season_guid, Season.id_pena == pena_id)
            .with_for_update()
        )
        season = self.session.execute(stmt).scalar_one_or_none()
        if not season:
            self.session.rollback()
            raise PenaSeasonNotFoundError()
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
