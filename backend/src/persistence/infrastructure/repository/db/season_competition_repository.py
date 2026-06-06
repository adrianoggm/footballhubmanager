from datetime import date

from core.application.ports.season_competition_port import (
    InvalidSeasonDateRangeError,
    PenaNotFoundError,
    PenaNotManagedByAdminError,
    SeasonCompetitionPort,
    SeasonDateRangeOverlapError,
    SeasonResult,
)
from persistence.domain.entity import Pena, Season
from sqlalchemy import select
from sqlalchemy.orm import Session


class SqlAlchemySeasonCompetitionRepository(SeasonCompetitionPort):
    def __init__(self, session: Session):
        self.session = session

    def find_active_for_pena(self, *, pena_guid: str, reference_date: date) -> SeasonResult | None:
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
        return SeasonResult(
            guid=season.guid,
            start_date=season.start_date,
            end_date=season.end_date,
            points_win=season.points_win,
            points_draw=season.points_draw,
            points_loss=season.points_loss,
        )

    def create_season_for_admin(
        self,
        *,
        pena_guid: str,
        admin_id: int,
        start_date: date,
        end_date: date,
        points_win: int,
        points_draw: int,
        points_loss: int,
    ) -> SeasonResult:
        if start_date > end_date:
            self.session.rollback()
            raise InvalidSeasonDateRangeError()

        pena = self._get_pena(pena_guid)
        if pena.id_admin != admin_id:
            self.session.rollback()
            raise PenaNotManagedByAdminError()

        if self._has_overlapping_season_range(
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
        return SeasonResult(
            guid=season.guid,
            start_date=season.start_date,
            end_date=season.end_date,
            points_win=season.points_win,
            points_draw=season.points_draw,
            points_loss=season.points_loss,
        )

    def _get_pena(self, pena_guid: str) -> Pena:
        pena = self.session.execute(select(Pena).where(Pena.guid == pena_guid)).scalar_one_or_none()
        if not pena:
            self.session.rollback()
            raise PenaNotFoundError()
        return pena

    def _has_overlapping_season_range(
        self,
        *,
        pena_id: int,
        start_date: date,
        end_date: date,
    ) -> bool:
        row = self.session.execute(
            select(Season.id)
            .where(
                Season.id_pena == pena_id,
                Season.start_date <= end_date,
                Season.end_date >= start_date,
            )
            .limit(1)
        ).first()
        return bool(row)
