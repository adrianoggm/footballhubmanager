from datetime import date

from persistence.application.ports.season_competition_repository import (
    InvalidSeasonDateRangeError,
    InvalidSeasonPlayerStatsError,
    MatchNotFoundError,
    MatchPlayersNotInSeasonError,
    MatchResult,
    PenaNotFoundError,
    PenaNotManagedByAdminError,
    PlayerNotFoundError,
    PlayerNotInPenaError,
    SamePlayerMatchError,
    SeasonCompetitionRepository,
    SeasonDateRangeOverlapError,
    SeasonNotFoundError,
    SeasonPlayerAlreadyRegisteredError,
    SeasonPlayerFilters,
    SeasonPlayerNotFoundError,
    SeasonPlayerResult,
    SeasonPlayersPageResult,
    SeasonResult,
)
from persistence.domain.entity import (
    FootballMatch,
    Pena,
    PenaPlayer,
    Player,
    Season,
    SeasonPlayer,
    Team,
    TeamPlayer,
)
from sqlalchemy import and_, func, or_, select
from sqlalchemy.orm import Session


class SqlAlchemySeasonCompetitionRepository(SeasonCompetitionRepository):
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
            guid=season.guid, start_date=season.start_date, end_date=season.end_date
        )

    def create_season_for_admin(
        self,
        *,
        pena_guid: str,
        admin_id: int,
        start_date: date,
        end_date: date,
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

        season = Season(id_pena=pena.id, start_date=start_date, end_date=end_date)
        self.session.add(season)
        self.session.commit()
        self.session.refresh(season)
        return SeasonResult(
            guid=season.guid, start_date=season.start_date, end_date=season.end_date
        )

    def register_player_for_admin(
        self,
        *,
        pena_guid: str,
        season_guid: str,
        admin_id: int,
        player_guid: str,
    ) -> SeasonPlayerResult:
        pena = self._get_pena(pena_guid)
        if pena.id_admin != admin_id:
            self.session.rollback()
            raise PenaNotManagedByAdminError()
        season = self._get_season(pena_id=pena.id, season_guid=season_guid)
        player = self._get_player(player_guid)
        link = self._get_pena_player_link(pena_id=pena.id, player_id=player.id)

        existing = self.session.execute(
            select(SeasonPlayer).where(
                SeasonPlayer.id_pena == pena.id,
                SeasonPlayer.id_season == season.id,
                SeasonPlayer.id_player == player.id,
            )
        ).scalar_one_or_none()
        if existing:
            self.session.rollback()
            raise SeasonPlayerAlreadyRegisteredError()

        season_player = SeasonPlayer(
            id_player=player.id,
            id_pena=pena.id,
            id_season=season.id,
            wins=0,
            losses=0,
            draws=0,
            quality_level=0.0,
        )
        self.session.add(season_player)
        self.session.commit()
        return self._to_season_player_result(player=player, link=link, season_player=season_player)

    def update_player_stats_for_admin(
        self,
        *,
        pena_guid: str,
        season_guid: str,
        admin_id: int,
        player_guid: str,
        wins_provided: bool,
        wins: int | None,
        losses_provided: bool,
        losses: int | None,
        draws_provided: bool,
        draws: int | None,
        quality_level_provided: bool,
        quality_level: float | None,
    ) -> SeasonPlayerResult:
        pena = self._get_pena(pena_guid)
        if pena.id_admin != admin_id:
            self.session.rollback()
            raise PenaNotManagedByAdminError()
        season = self._get_season(pena_id=pena.id, season_guid=season_guid)
        player = self._get_player(player_guid)
        link = self._get_pena_player_link(pena_id=pena.id, player_id=player.id)
        season_player = self._get_season_player(
            pena_id=pena.id,
            season_id=season.id,
            player_id=player.id,
            for_update=True,
        )

        if wins_provided:
            if wins is None or wins < 0:
                self.session.rollback()
                raise InvalidSeasonPlayerStatsError()
            season_player.wins = wins
        if losses_provided:
            if losses is None or losses < 0:
                self.session.rollback()
                raise InvalidSeasonPlayerStatsError()
            season_player.losses = losses
        if draws_provided:
            if draws is None or draws < 0:
                self.session.rollback()
                raise InvalidSeasonPlayerStatsError()
            season_player.draws = draws
        if quality_level_provided:
            if quality_level is None or quality_level < 0:
                self.session.rollback()
                raise InvalidSeasonPlayerStatsError()
            season_player.quality_level = quality_level

        self.session.commit()
        return self._to_season_player_result(player=player, link=link, season_player=season_player)

    def list_season_players(
        self,
        *,
        pena_guid: str,
        season_guid: str,
        filters: SeasonPlayerFilters,
        page: int,
        page_size: int,
        order_by: str,
        order_dir: str,
    ) -> SeasonPlayersPageResult:
        pena = self._get_pena(pena_guid)
        season = self._get_season(pena_id=pena.id, season_guid=season_guid)
        points_expr = (SeasonPlayer.wins * 3 + SeasonPlayer.draws).label("points")

        stmt = (
            select(
                Player.guid.label("player_guid"),
                Player.name.label("name"),
                Player.surname1.label("surname1"),
                Player.surname2.label("surname2"),
                Player.nationality.label("nationality"),
                PenaPlayer.nickname.label("nickname"),
                PenaPlayer.position.label("position"),
                SeasonPlayer.wins.label("wins"),
                SeasonPlayer.losses.label("losses"),
                SeasonPlayer.draws.label("draws"),
                SeasonPlayer.quality_level.label("quality_level"),
                points_expr,
            )
            .select_from(SeasonPlayer)
            .join(Player, Player.id == SeasonPlayer.id_player)
            .join(
                PenaPlayer,
                and_(
                    PenaPlayer.id_player == SeasonPlayer.id_player,
                    PenaPlayer.id_pena == SeasonPlayer.id_pena,
                ),
            )
            .where(
                SeasonPlayer.id_pena == pena.id,
                SeasonPlayer.id_season == season.id,
            )
        )

        stmt = self._apply_season_player_filters(stmt, filters)
        stmt = self._apply_player_order(
            stmt, order_by=order_by, order_dir=order_dir, points_expr=points_expr
        )
        total = int(
            self.session.execute(select(func.count()).select_from(stmt.subquery())).scalar() or 0
        )
        rows = self.session.execute(stmt.limit(page_size).offset((page - 1) * page_size)).all()
        return SeasonPlayersPageResult(
            items=[self._row_to_player_result(row) for row in rows],
            page=page,
            page_size=page_size,
            total=total,
        )

    def create_match_for_admin(
        self,
        *,
        pena_guid: str,
        season_guid: str,
        admin_id: int,
        home_player_guid: str,
        away_player_guid: str,
        match_date: date,
    ) -> MatchResult:
        if home_player_guid == away_player_guid:
            self.session.rollback()
            raise SamePlayerMatchError()

        pena = self._get_pena(pena_guid)
        if pena.id_admin != admin_id:
            self.session.rollback()
            raise PenaNotManagedByAdminError()
        season = self._get_season(pena_id=pena.id, season_guid=season_guid)
        home_player = self._get_player(home_player_guid)
        away_player = self._get_player(away_player_guid)

        home_season_player = self._get_season_player(
            pena_id=pena.id,
            season_id=season.id,
            player_id=home_player.id,
            for_update=False,
            allow_missing=True,
        )
        away_season_player = self._get_season_player(
            pena_id=pena.id,
            season_id=season.id,
            player_id=away_player.id,
            for_update=False,
            allow_missing=True,
        )
        if not home_season_player or not away_season_player:
            self.session.rollback()
            raise MatchPlayersNotInSeasonError()

        home_team = Team(name=f"{home_player.name} {home_player.surname1}", id_match=None)
        away_team = Team(name=f"{away_player.name} {away_player.surname1}", id_match=None)
        self.session.add(home_team)
        self.session.add(away_team)
        self.session.flush()

        football_match = FootballMatch(
            id_home_team=home_team.id,
            id_away_team=away_team.id,
            match_date=match_date,
            id_season=season.id,
        )
        self.session.add(football_match)
        self.session.flush()

        home_team.id_match = football_match.id
        away_team.id_match = football_match.id

        home_team_player = TeamPlayer(
            id_team=home_team.id,
            id_player=home_player.id,
            goals=0,
            assists=0,
            rating=-1.0,  # sentinel: standings were not applied yet
            saves=0,
        )
        away_team_player = TeamPlayer(
            id_team=away_team.id,
            id_player=away_player.id,
            goals=0,
            assists=0,
            rating=-1.0,  # sentinel: standings were not applied yet
            saves=0,
        )
        self.session.add(home_team_player)
        self.session.add(away_team_player)

        self.session.commit()
        self.session.refresh(football_match)
        return MatchResult(
            guid=football_match.guid,
            season_guid=season.guid,
            match_date=football_match.match_date,
            home_player_guid=home_player.guid,
            away_player_guid=away_player.guid,
            home_player_name=f"{home_player.name} {home_player.surname1}",
            away_player_name=f"{away_player.name} {away_player.surname1}",
            home_score=0,
            away_score=0,
        )

    def update_match_result_for_admin(
        self,
        *,
        pena_guid: str,
        season_guid: str,
        match_guid: str,
        admin_id: int,
        home_score: int,
        away_score: int,
        update_standings: bool,
    ) -> MatchResult:
        if home_score < 0 or away_score < 0:
            self.session.rollback()
            raise InvalidSeasonPlayerStatsError()

        pena = self._get_pena(pena_guid)
        if pena.id_admin != admin_id:
            self.session.rollback()
            raise PenaNotManagedByAdminError()
        season = self._get_season(pena_id=pena.id, season_guid=season_guid)

        bundle = self._get_match_bundle(
            season_id=season.id,
            match_guid=match_guid,
            for_update=True,
        )
        if not bundle:
            self.session.rollback()
            raise MatchNotFoundError()

        football_match, home_team, away_team, home_team_player, away_team_player = bundle
        home_player = self._get_player_by_id(home_team_player.id_player)
        away_player = self._get_player_by_id(away_team_player.id_player)

        if update_standings:
            home_season_player = self._get_season_player(
                pena_id=pena.id,
                season_id=season.id,
                player_id=home_player.id,
                for_update=True,
            )
            away_season_player = self._get_season_player(
                pena_id=pena.id,
                season_id=season.id,
                player_id=away_player.id,
                for_update=True,
            )

            # If rating >= 0, standings were already applied with previous score.
            if home_team_player.rating >= 0 and away_team_player.rating >= 0:
                self._apply_outcome_delta(
                    home_player_stats=home_season_player,
                    away_player_stats=away_season_player,
                    home_score=home_team_player.goals,
                    away_score=away_team_player.goals,
                    delta=-1,
                )

            self._apply_outcome_delta(
                home_player_stats=home_season_player,
                away_player_stats=away_season_player,
                home_score=home_score,
                away_score=away_score,
                delta=1,
            )
            home_team_player.rating = 0.0
            away_team_player.rating = 0.0

        home_team_player.goals = home_score
        away_team_player.goals = away_score

        self.session.commit()
        return MatchResult(
            guid=football_match.guid,
            season_guid=season.guid,
            match_date=football_match.match_date,
            home_player_guid=home_player.guid,
            away_player_guid=away_player.guid,
            home_player_name=home_team.name,
            away_player_name=away_team.name,
            home_score=home_team_player.goals,
            away_score=away_team_player.goals,
        )

    def get_standings(
        self,
        *,
        pena_guid: str,
        season_guid: str,
        page: int,
        page_size: int,
    ) -> SeasonPlayersPageResult:
        return self.list_season_players(
            pena_guid=pena_guid,
            season_guid=season_guid,
            filters=SeasonPlayerFilters(),
            page=page,
            page_size=page_size,
            order_by="points",
            order_dir="desc",
        )

    def _get_pena(self, pena_guid: str) -> Pena:
        pena = self.session.execute(select(Pena).where(Pena.guid == pena_guid)).scalar_one_or_none()
        if not pena:
            self.session.rollback()
            raise PenaNotFoundError()
        return pena

    def _get_season(self, *, pena_id: int, season_guid: str) -> Season:
        season = self.session.execute(
            select(Season).where(Season.id_pena == pena_id, Season.guid == season_guid)
        ).scalar_one_or_none()
        if not season:
            self.session.rollback()
            raise SeasonNotFoundError()
        return season

    def _get_player(self, player_guid: str) -> Player:
        player = self.session.execute(
            select(Player).where(Player.guid == player_guid)
        ).scalar_one_or_none()
        if not player:
            self.session.rollback()
            raise PlayerNotFoundError()
        return player

    def _get_player_by_id(self, player_id: int) -> Player:
        player = self.session.execute(
            select(Player).where(Player.id == player_id)
        ).scalar_one_or_none()
        if not player:
            self.session.rollback()
            raise PlayerNotFoundError()
        return player

    def _get_pena_player_link(self, *, pena_id: int, player_id: int) -> PenaPlayer:
        link = self.session.execute(
            select(PenaPlayer).where(
                PenaPlayer.id_pena == pena_id, PenaPlayer.id_player == player_id
            )
        ).scalar_one_or_none()
        if not link:
            self.session.rollback()
            raise PlayerNotInPenaError()
        return link

    def _get_season_player(
        self,
        *,
        pena_id: int,
        season_id: int,
        player_id: int,
        for_update: bool,
        allow_missing: bool = False,
    ) -> SeasonPlayer | None:
        stmt = select(SeasonPlayer).where(
            SeasonPlayer.id_pena == pena_id,
            SeasonPlayer.id_season == season_id,
            SeasonPlayer.id_player == player_id,
        )
        if for_update:
            stmt = stmt.with_for_update()
        row = self.session.execute(stmt).scalar_one_or_none()
        if row:
            return row
        if allow_missing:
            return None
        self.session.rollback()
        raise SeasonPlayerNotFoundError()

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

    @staticmethod
    def _to_season_player_result(
        *,
        player: Player,
        link: PenaPlayer,
        season_player: SeasonPlayer,
    ) -> SeasonPlayerResult:
        return SeasonPlayerResult(
            player_guid=player.guid,
            name=player.name,
            surname1=player.surname1,
            surname2=player.surname2,
            nationality=player.nationality,
            nickname=link.nickname,
            position=link.position,
            wins=season_player.wins,
            losses=season_player.losses,
            draws=season_player.draws,
            quality_level=float(season_player.quality_level),
            points=(season_player.wins * 3 + season_player.draws),
        )

    @staticmethod
    def _apply_season_player_filters(stmt, filters: SeasonPlayerFilters):
        if filters.name:
            stmt = stmt.where(Player.name.ilike(f"%{filters.name}%"))
        if filters.surname1:
            stmt = stmt.where(Player.surname1.ilike(f"%{filters.surname1}%"))
        if filters.surname2:
            stmt = stmt.where(Player.surname2.ilike(f"%{filters.surname2}%"))
        if filters.nationality:
            stmt = stmt.where(Player.nationality.ilike(f"%{filters.nationality}%"))
        if filters.nickname:
            stmt = stmt.where(PenaPlayer.nickname.ilike(f"%{filters.nickname}%"))
        if filters.position:
            stmt = stmt.where(PenaPlayer.position.ilike(f"%{filters.position}%"))
        if filters.search:
            token = f"%{filters.search}%"
            stmt = stmt.where(
                or_(
                    Player.name.ilike(token),
                    Player.surname1.ilike(token),
                    Player.surname2.ilike(token),
                    PenaPlayer.nickname.ilike(token),
                    PenaPlayer.position.ilike(token),
                )
            )
        return stmt

    @staticmethod
    def _apply_player_order(stmt, *, order_by: str, order_dir: str, points_expr):
        columns = {
            "quality_level": SeasonPlayer.quality_level,
            "wins": SeasonPlayer.wins,
            "losses": SeasonPlayer.losses,
            "draws": SeasonPlayer.draws,
            "points": points_expr,
        }
        order_column = columns.get(order_by, SeasonPlayer.quality_level)
        is_desc = order_dir.lower() != "asc"
        if is_desc:
            return stmt.order_by(order_column.desc(), Player.name.asc())
        return stmt.order_by(order_column.asc(), Player.name.asc())

    @staticmethod
    def _row_to_player_result(row) -> SeasonPlayerResult:
        values = row._mapping
        return SeasonPlayerResult(
            player_guid=values["player_guid"],
            name=values["name"],
            surname1=values["surname1"],
            surname2=values["surname2"],
            nationality=values["nationality"],
            nickname=values["nickname"],
            position=values["position"],
            wins=int(values["wins"]),
            losses=int(values["losses"]),
            draws=int(values["draws"]),
            quality_level=float(values["quality_level"]),
            points=int(values["points"]),
        )

    @staticmethod
    def _apply_outcome_delta(
        *,
        home_player_stats: SeasonPlayer,
        away_player_stats: SeasonPlayer,
        home_score: int,
        away_score: int,
        delta: int,
    ) -> None:
        if home_score > away_score:
            home_player_stats.wins += delta
            away_player_stats.losses += delta
            return
        if home_score < away_score:
            home_player_stats.losses += delta
            away_player_stats.wins += delta
            return
        home_player_stats.draws += delta
        away_player_stats.draws += delta

    def _get_match_bundle(
        self,
        *,
        season_id: int,
        match_guid: str,
        for_update: bool,
    ) -> tuple[FootballMatch, Team, Team, TeamPlayer, TeamPlayer] | None:
        stmt = select(FootballMatch).where(
            FootballMatch.guid == match_guid,
            FootballMatch.id_season == season_id,
        )
        if for_update:
            stmt = stmt.with_for_update()
        football_match = self.session.execute(stmt).scalar_one_or_none()
        if not football_match:
            return None

        home_team = self.session.execute(
            select(Team).where(Team.id == football_match.id_home_team)
        ).scalar_one_or_none()
        away_team = self.session.execute(
            select(Team).where(Team.id == football_match.id_away_team)
        ).scalar_one_or_none()
        if not home_team or not away_team:
            self.session.rollback()
            raise MatchNotFoundError()

        home_team_player = self.session.execute(
            select(TeamPlayer).where(TeamPlayer.id_team == home_team.id)
        ).scalar_one_or_none()
        away_team_player = self.session.execute(
            select(TeamPlayer).where(TeamPlayer.id_team == away_team.id)
        ).scalar_one_or_none()
        if not home_team_player or not away_team_player:
            self.session.rollback()
            raise MatchNotFoundError()

        return football_match, home_team, away_team, home_team_player, away_team_player
