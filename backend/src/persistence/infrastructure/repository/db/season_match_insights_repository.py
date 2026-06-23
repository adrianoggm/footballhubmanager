from core.application.models import MatchInsightRow
from core.application.ports.season_competition_port import (
    PenaNotFoundError,
    SeasonNotFoundError,
)
from core.application.ports.season_match_insights_port import SeasonMatchInsightsPort
from persistence.infrastructure.entity import (
    FootballMatch,
    FootballMatchEvent,
    Pena,
    PenaPlayer,
    Player,
    Season,
    SeasonPlayer,
    TeamPlayer,
)
from sqlalchemy import and_, func, or_, select
from sqlalchemy.orm import Session


class SqlAlchemySeasonMatchInsightsRepository(SeasonMatchInsightsPort):
    def __init__(self, session: Session):
        self.session = session

    def list_closed_match_insight_rows(
        self,
        *,
        pena_guid: str,
        season_guids: list[str],
    ) -> list[MatchInsightRow]:
        pena = self._get_pena(pena_guid)
        season_ids_by_guid = self._get_requested_season_ids(
            pena_id=pena.id,
            season_guids=season_guids,
        )
        if not season_ids_by_guid:
            return []

        team_match_stats = self._build_team_match_stats_subquery()
        home_team_stats = team_match_stats.alias("home_team_stats")
        away_team_stats = team_match_stats.alias("away_team_stats")

        rows = self.session.execute(
            select(
                Season.guid.label("season_guid"),
                FootballMatch.guid.label("match_guid"),
                FootballMatch.match_date.label("match_date"),
                FootballMatch.id_home_team.label("home_team_id"),
                FootballMatch.id_away_team.label("away_team_id"),
                func.coalesce(home_team_stats.c.score, 0).label("home_score"),
                func.coalesce(away_team_stats.c.score, 0).label("away_score"),
                TeamPlayer.id_team.label("team_id"),
                Player.guid.label("player_guid"),
                Player.name.label("player_name"),
                Player.surname1.label("player_surname1"),
                Player.surname2.label("player_surname2"),
                PenaPlayer.nickname.label("player_nickname"),
                SeasonPlayer.position.label("player_position"),
                TeamPlayer.goals.label("goals"),
                TeamPlayer.assists.label("assists"),
                TeamPlayer.saves.label("saves"),
                TeamPlayer.rating.label("rating"),
            )
            .select_from(FootballMatch)
            .join(Season, Season.id == FootballMatch.id_season)
            .join(home_team_stats, home_team_stats.c.team_id == FootballMatch.id_home_team)
            .join(away_team_stats, away_team_stats.c.team_id == FootballMatch.id_away_team)
            .join(
                TeamPlayer,
                or_(
                    TeamPlayer.id_team == FootballMatch.id_home_team,
                    TeamPlayer.id_team == FootballMatch.id_away_team,
                ),
            )
            .join(Player, Player.id == TeamPlayer.id_player)
            .outerjoin(
                PenaPlayer,
                and_(
                    PenaPlayer.id_player == Player.id,
                    PenaPlayer.id_pena == pena.id,
                ),
            )
            .outerjoin(
                SeasonPlayer,
                and_(
                    SeasonPlayer.id_player == Player.id,
                    SeasonPlayer.id_pena == pena.id,
                    SeasonPlayer.id_season == Season.id,
                ),
            )
            .where(FootballMatch.id_season.in_(season_ids_by_guid.values()))
            .where(
                home_team_stats.c.min_rating.is_not(None),
                away_team_stats.c.min_rating.is_not(None),
                home_team_stats.c.min_rating >= 0.0,
                away_team_stats.c.min_rating >= 0.0,
            )
            .order_by(
                FootballMatch.match_date.asc(),
                FootballMatch.id.asc(),
                TeamPlayer.id_team.asc(),
                Player.id.asc(),
            )
        ).all()

        return [self._to_match_insight_row(row) for row in rows]

    def list_goal_event_seconds(
        self,
        *,
        pena_guid: str,
        season_guids: list[str],
    ) -> list[int]:
        pena = self._get_pena(pena_guid)
        season_ids_by_guid = self._get_requested_season_ids(
            pena_id=pena.id,
            season_guids=season_guids,
        )
        if not season_ids_by_guid:
            return []

        rows = self.session.execute(
            select(FootballMatchEvent.elapsed_seconds)
            .select_from(FootballMatchEvent)
            .join(FootballMatch, FootballMatch.id == FootballMatchEvent.id_match)
            .where(
                FootballMatch.id_season.in_(season_ids_by_guid.values()),
                FootballMatch.status == "closed",
                FootballMatchEvent.event_type == "goal",
            )
        ).all()
        return [int(row.elapsed_seconds) for row in rows if row.elapsed_seconds is not None]

    def _get_pena(self, pena_guid: str) -> Pena:
        pena = self.session.execute(select(Pena).where(Pena.guid == pena_guid)).scalar_one_or_none()
        if not pena:
            self.session.rollback()
            raise PenaNotFoundError()
        return pena

    def _get_requested_season_ids(
        self,
        *,
        pena_id: int,
        season_guids: list[str],
    ) -> dict[str, int]:
        cleaned_season_guids = [item.strip() for item in season_guids if item.strip()]
        if not cleaned_season_guids:
            return {}

        season_rows = self.session.execute(
            select(Season.id, Season.guid).where(
                Season.id_pena == pena_id,
                Season.guid.in_(set(cleaned_season_guids)),
            )
        ).all()
        season_ids_by_guid = {str(row.guid): int(row.id) for row in season_rows}
        if len(season_ids_by_guid) != len(set(cleaned_season_guids)):
            self.session.rollback()
            raise SeasonNotFoundError()
        return season_ids_by_guid

    @staticmethod
    def _build_team_match_stats_subquery():
        return (
            select(
                TeamPlayer.id_team.label("team_id"),
                func.coalesce(func.sum(TeamPlayer.goals), 0).label("score"),
                func.min(TeamPlayer.rating).label("min_rating"),
            )
            .group_by(TeamPlayer.id_team)
            .subquery()
        )

    @staticmethod
    def _to_match_insight_row(row) -> MatchInsightRow:
        team_side = "home" if int(row.team_id) == int(row.home_team_id) else "away"
        return MatchInsightRow(
            season_guid=str(row.season_guid),
            match_guid=str(row.match_guid),
            match_date=row.match_date,
            home_score=int(row.home_score),
            away_score=int(row.away_score),
            team_side=team_side,
            player_guid=str(row.player_guid),
            player_name=str(row.player_name),
            player_surname1=str(row.player_surname1),
            player_surname2=row.player_surname2,
            player_nickname=row.player_nickname,
            goals=int(row.goals),
            assists=int(row.assists),
            saves=int(row.saves),
            player_position=row.player_position,
            rating=float(row.rating or 0.0),
        )
