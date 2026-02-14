from datetime import date

from persistence.application.ports.season_competition_repository import (
    InvalidMatchDataError,
    InvalidSeasonDateRangeError,
    InvalidSeasonPlayerStatsError,
    MatchDetailResult,
    MatchesPageResult,
    MatchNotFoundError,
    MatchPlayersNotInSeasonError,
    MatchPlayerStatsResult,
    MatchPlayerStatsUpdateData,
    MatchResult,
    MatchStatsMismatchError,
    MatchSummaryResult,
    MatchTeamResult,
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
        if (
            len(self._list_team_players(home_team.id, for_update=False)) != 1
            or len(self._list_team_players(away_team.id, for_update=False)) != 1
        ):
            self.session.rollback()
            raise InvalidSeasonPlayerStatsError()
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

    def create_match_with_lineups_for_admin(
        self,
        *,
        pena_guid: str,
        season_guid: str,
        admin_id: int,
        match_date: date,
        home_team_name: str | None,
        away_team_name: str | None,
        home_player_guids: list[str],
        away_player_guids: list[str],
    ) -> MatchDetailResult:
        cleaned_home = [guid.strip() for guid in home_player_guids if guid.strip()]
        cleaned_away = [guid.strip() for guid in away_player_guids if guid.strip()]
        if (
            not cleaned_home
            or not cleaned_away
            or len(cleaned_home) != len(home_player_guids)
            or len(cleaned_away) != len(away_player_guids)
        ):
            self.session.rollback()
            raise InvalidMatchDataError()
        if len(set(cleaned_home)) != len(cleaned_home) or len(set(cleaned_away)) != len(
            cleaned_away
        ):
            self.session.rollback()
            raise SamePlayerMatchError()
        if set(cleaned_home).intersection(set(cleaned_away)):
            self.session.rollback()
            raise SamePlayerMatchError()

        pena = self._get_pena(pena_guid)
        if pena.id_admin != admin_id:
            self.session.rollback()
            raise PenaNotManagedByAdminError()
        season = self._get_season(pena_id=pena.id, season_guid=season_guid)

        home_players = self._resolve_match_players(
            pena_id=pena.id,
            season_id=season.id,
            player_guids=cleaned_home,
        )
        away_players = self._resolve_match_players(
            pena_id=pena.id,
            season_id=season.id,
            player_guids=cleaned_away,
        )

        home_team = Team(
            name=self._team_name_or_default(home_team_name, default_name="Home Team"),
            id_match=None,
        )
        away_team = Team(
            name=self._team_name_or_default(away_team_name, default_name="Away Team"),
            id_match=None,
        )
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

        for home_player in home_players:
            self.session.add(
                TeamPlayer(
                    id_team=home_team.id,
                    id_player=home_player.id,
                    goals=0,
                    assists=0,
                    rating=-1.0,  # sentinel: standings were not applied yet
                    saves=0,
                )
            )
        for away_player in away_players:
            self.session.add(
                TeamPlayer(
                    id_team=away_team.id,
                    id_player=away_player.id,
                    goals=0,
                    assists=0,
                    rating=-1.0,  # sentinel: standings were not applied yet
                    saves=0,
                )
            )

        self.session.commit()
        return self._build_match_detail_result(
            pena_id=pena.id,
            season_guid=season.guid,
            football_match=football_match,
            home_team=home_team,
            away_team=away_team,
        )

    def update_match_stats_for_admin(
        self,
        *,
        pena_guid: str,
        season_guid: str,
        match_guid: str,
        admin_id: int,
        home_players_stats: list[MatchPlayerStatsUpdateData],
        away_players_stats: list[MatchPlayerStatsUpdateData],
    ) -> MatchDetailResult:
        home_stats_map = self._to_stats_map(home_players_stats)
        away_stats_map = self._to_stats_map(away_players_stats)
        if not home_stats_map or not away_stats_map:
            self.session.rollback()
            raise InvalidMatchDataError()

        pena = self._get_pena(pena_guid)
        if pena.id_admin != admin_id:
            self.session.rollback()
            raise PenaNotManagedByAdminError()
        season = self._get_season(pena_id=pena.id, season_guid=season_guid)

        bundle = self._get_match_teams(
            season_id=season.id,
            match_guid=match_guid,
            for_update=True,
        )
        if not bundle:
            self.session.rollback()
            raise MatchNotFoundError()
        football_match, home_team, away_team = bundle

        home_team_players = self._list_team_players(home_team.id, for_update=True)
        away_team_players = self._list_team_players(away_team.id, for_update=True)
        if not home_team_players or not away_team_players:
            self.session.rollback()
            raise MatchNotFoundError()

        home_roster = self._team_player_guid_map(home_team_players)
        away_roster = self._team_player_guid_map(away_team_players)
        if set(home_roster.keys()) != set(home_stats_map.keys()):
            self.session.rollback()
            raise MatchStatsMismatchError()
        if set(away_roster.keys()) != set(away_stats_map.keys()):
            self.session.rollback()
            raise MatchStatsMismatchError()

        old_home_score = sum(row.goals for row in home_team_players)
        old_away_score = sum(row.goals for row in away_team_players)
        standings_applied = self._match_standings_applied(home_team_players, away_team_players)

        home_season_players = self._team_season_players(
            pena_id=pena.id,
            season_id=season.id,
            team_players=home_team_players,
        )
        away_season_players = self._team_season_players(
            pena_id=pena.id,
            season_id=season.id,
            team_players=away_team_players,
        )
        if standings_applied:
            self._apply_team_outcome_delta(
                home_team_stats=home_season_players,
                away_team_stats=away_season_players,
                home_score=old_home_score,
                away_score=old_away_score,
                delta=-1,
            )

        self._apply_team_player_stats(home_roster, home_stats_map)
        self._apply_team_player_stats(away_roster, away_stats_map)

        new_home_score = sum(row.goals for row in home_team_players)
        new_away_score = sum(row.goals for row in away_team_players)
        self._apply_team_outcome_delta(
            home_team_stats=home_season_players,
            away_team_stats=away_season_players,
            home_score=new_home_score,
            away_score=new_away_score,
            delta=1,
        )

        self.session.commit()
        return self._build_match_detail_result(
            pena_id=pena.id,
            season_guid=season.guid,
            football_match=football_match,
            home_team=home_team,
            away_team=away_team,
        )

    def list_season_matches(
        self,
        *,
        pena_guid: str,
        season_guid: str,
        page: int,
        page_size: int,
    ) -> MatchesPageResult:
        pena = self._get_pena(pena_guid)
        season = self._get_season(pena_id=pena.id, season_guid=season_guid)

        base_stmt = (
            select(FootballMatch)
            .where(FootballMatch.id_season == season.id)
            .order_by(FootballMatch.match_date.desc(), FootballMatch.id.desc())
        )
        total = int(
            self.session.execute(select(func.count()).select_from(base_stmt.subquery())).scalar()
            or 0
        )
        rows = self.session.execute(
            base_stmt.limit(page_size).offset((page - 1) * page_size)
        ).scalars()

        items: list[MatchSummaryResult] = []
        for football_match in rows:
            home_team = self._get_team(football_match.id_home_team)
            away_team = self._get_team(football_match.id_away_team)
            home_players = self._list_team_players(home_team.id, for_update=False)
            away_players = self._list_team_players(away_team.id, for_update=False)
            items.append(
                MatchSummaryResult(
                    guid=football_match.guid,
                    season_guid=season.guid,
                    match_date=football_match.match_date,
                    home_team_name=home_team.name,
                    away_team_name=away_team.name,
                    home_score=sum(player.goals for player in home_players),
                    away_score=sum(player.goals for player in away_players),
                    home_players=len(home_players),
                    away_players=len(away_players),
                )
            )

        return MatchesPageResult(
            items=items,
            page=page,
            page_size=page_size,
            total=total,
        )

    def get_match_detail(
        self,
        *,
        pena_guid: str,
        season_guid: str,
        match_guid: str,
    ) -> MatchDetailResult:
        pena = self._get_pena(pena_guid)
        season = self._get_season(pena_id=pena.id, season_guid=season_guid)
        bundle = self._get_match_teams(
            season_id=season.id,
            match_guid=match_guid,
            for_update=False,
        )
        if not bundle:
            self.session.rollback()
            raise MatchNotFoundError()
        football_match, home_team, away_team = bundle
        return self._build_match_detail_result(
            pena_id=pena.id,
            season_guid=season.guid,
            football_match=football_match,
            home_team=home_team,
            away_team=away_team,
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
        teams_bundle = self._get_match_teams(
            season_id=season_id,
            match_guid=match_guid,
            for_update=for_update,
        )
        if not teams_bundle:
            return None
        football_match, home_team, away_team = teams_bundle

        home_team_player = self.session.execute(
            select(TeamPlayer)
            .where(TeamPlayer.id_team == home_team.id)
            .order_by(TeamPlayer.id_player.asc())
            .limit(1)
        ).scalar_one_or_none()
        away_team_player = self.session.execute(
            select(TeamPlayer)
            .where(TeamPlayer.id_team == away_team.id)
            .order_by(TeamPlayer.id_player.asc())
            .limit(1)
        ).scalar_one_or_none()
        if not home_team_player or not away_team_player:
            self.session.rollback()
            raise MatchNotFoundError()

        return football_match, home_team, away_team, home_team_player, away_team_player

    def _get_match_teams(
        self,
        *,
        season_id: int,
        match_guid: str,
        for_update: bool,
    ) -> tuple[FootballMatch, Team, Team] | None:
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

        return football_match, home_team, away_team

    def _list_team_players(self, team_id: int, *, for_update: bool) -> list[TeamPlayer]:
        stmt = (
            select(TeamPlayer)
            .where(TeamPlayer.id_team == team_id)
            .order_by(TeamPlayer.id_player.asc())
        )
        if for_update:
            stmt = stmt.with_for_update()
        return list(self.session.execute(stmt).scalars())

    def _get_team(self, team_id: int) -> Team:
        team = self.session.execute(select(Team).where(Team.id == team_id)).scalar_one_or_none()
        if not team:
            self.session.rollback()
            raise MatchNotFoundError()
        return team

    def _resolve_match_players(
        self,
        *,
        pena_id: int,
        season_id: int,
        player_guids: list[str],
    ) -> list[Player]:
        players: list[Player] = []
        for player_guid in player_guids:
            player = self._get_player(player_guid)
            season_player = self._get_season_player(
                pena_id=pena_id,
                season_id=season_id,
                player_id=player.id,
                for_update=False,
                allow_missing=True,
            )
            if not season_player:
                self.session.rollback()
                raise MatchPlayersNotInSeasonError()
            players.append(player)
        return players

    @staticmethod
    def _team_name_or_default(name: str | None, *, default_name: str) -> str:
        if name is None:
            return default_name
        cleaned = name.strip()
        if not cleaned:
            return default_name
        return cleaned

    @staticmethod
    def _to_stats_map(
        values: list[MatchPlayerStatsUpdateData],
    ) -> dict[str, MatchPlayerStatsUpdateData]:
        result: dict[str, MatchPlayerStatsUpdateData] = {}
        for item in values:
            player_guid = item.player_guid.strip()
            if (
                item.goals < 0
                or item.assists < 0
                or item.saves < 0
                or item.rating < 0
                or not player_guid
            ):
                raise InvalidMatchDataError()
            if player_guid in result:
                raise InvalidMatchDataError()
            result[player_guid] = MatchPlayerStatsUpdateData(
                player_guid=player_guid,
                goals=item.goals,
                assists=item.assists,
                saves=item.saves,
                rating=item.rating,
            )
        return result

    def _team_player_guid_map(self, team_players: list[TeamPlayer]) -> dict[str, TeamPlayer]:
        result: dict[str, TeamPlayer] = {}
        for team_player in team_players:
            player = self._get_player_by_id(team_player.id_player)
            result[player.guid] = team_player
        return result

    def _team_season_players(
        self,
        *,
        pena_id: int,
        season_id: int,
        team_players: list[TeamPlayer],
    ) -> list[SeasonPlayer]:
        rows: list[SeasonPlayer] = []
        for team_player in team_players:
            season_player = self._get_season_player(
                pena_id=pena_id,
                season_id=season_id,
                player_id=team_player.id_player,
                for_update=True,
                allow_missing=True,
            )
            if not season_player:
                self.session.rollback()
                raise InvalidMatchDataError()
            rows.append(season_player)
        return rows

    @staticmethod
    def _match_standings_applied(
        home_team_players: list[TeamPlayer],
        away_team_players: list[TeamPlayer],
    ) -> bool:
        if not home_team_players or not away_team_players:
            return False
        return all(player.rating >= 0 for player in home_team_players + away_team_players)

    @staticmethod
    def _apply_team_outcome_delta(
        *,
        home_team_stats: list[SeasonPlayer],
        away_team_stats: list[SeasonPlayer],
        home_score: int,
        away_score: int,
        delta: int,
    ) -> None:
        if home_score > away_score:
            for row in home_team_stats:
                row.wins += delta
            for row in away_team_stats:
                row.losses += delta
            return
        if home_score < away_score:
            for row in home_team_stats:
                row.losses += delta
            for row in away_team_stats:
                row.wins += delta
            return
        for row in home_team_stats:
            row.draws += delta
        for row in away_team_stats:
            row.draws += delta

    @staticmethod
    def _apply_team_player_stats(
        roster: dict[str, TeamPlayer],
        payload: dict[str, MatchPlayerStatsUpdateData],
    ) -> None:
        for player_guid, team_player in roster.items():
            stats = payload.get(player_guid)
            if stats is None:
                raise MatchStatsMismatchError()
            team_player.goals = stats.goals
            team_player.assists = stats.assists
            team_player.saves = stats.saves
            team_player.rating = stats.rating

    def _build_match_detail_result(
        self,
        *,
        pena_id: int,
        season_guid: str,
        football_match: FootballMatch,
        home_team: Team,
        away_team: Team,
    ) -> MatchDetailResult:
        home_players = self._list_team_players(home_team.id, for_update=False)
        away_players = self._list_team_players(away_team.id, for_update=False)
        return MatchDetailResult(
            guid=football_match.guid,
            season_guid=season_guid,
            match_date=football_match.match_date,
            home_team=self._build_match_team_result(
                pena_id=pena_id,
                team=home_team,
                team_players=home_players,
            ),
            away_team=self._build_match_team_result(
                pena_id=pena_id,
                team=away_team,
                team_players=away_players,
            ),
        )

    def _build_match_team_result(
        self,
        *,
        pena_id: int,
        team: Team,
        team_players: list[TeamPlayer],
    ) -> MatchTeamResult:
        players: list[MatchPlayerStatsResult] = []
        total_goals = 0
        total_assists = 0
        total_saves = 0
        total_rating = 0.0

        for team_player in team_players:
            player = self._get_player_by_id(team_player.id_player)
            link = self._get_pena_player_link_optional(pena_id=pena_id, player_id=player.id)
            rating = max(float(team_player.rating), 0.0)
            total_goals += int(team_player.goals)
            total_assists += int(team_player.assists)
            total_saves += int(team_player.saves)
            total_rating += rating
            players.append(
                MatchPlayerStatsResult(
                    player_guid=player.guid,
                    name=player.name,
                    surname1=player.surname1,
                    surname2=player.surname2,
                    nickname=link.nickname if link else None,
                    position=link.position if link else None,
                    goals=int(team_player.goals),
                    assists=int(team_player.assists),
                    saves=int(team_player.saves),
                    rating=rating,
                )
            )

        average_rating = (total_rating / len(team_players)) if team_players else 0.0
        return MatchTeamResult(
            team_guid=team.guid,
            team_name=team.name,
            score=total_goals,
            total_assists=total_assists,
            total_saves=total_saves,
            average_rating=round(average_rating, 2),
            players=players,
        )

    def _get_pena_player_link_optional(
        self,
        *,
        pena_id: int,
        player_id: int,
    ) -> PenaPlayer | None:
        return self.session.execute(
            select(PenaPlayer).where(
                PenaPlayer.id_pena == pena_id,
                PenaPlayer.id_player == player_id,
            )
        ).scalar_one_or_none()
