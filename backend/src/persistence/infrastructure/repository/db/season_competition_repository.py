from datetime import date

from persistence.application.ports.season_competition_port import (
    InvalidMatchDataError,
    InvalidSeasonDateRangeError,
    InvalidSeasonPlayerStatsError,
    MatchDetailResult,
    MatchesPageResult,
    MatchInsightRowResult,
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
    SeasonCompetitionPort,
    SeasonDateRangeOverlapError,
    SeasonNotFoundError,
    SeasonPlayerAlreadyRegisteredError,
    SeasonPlayerFilters,
    SeasonPlayerHasMatchesError,
    SeasonPlayerNotFoundError,
    SeasonPlayerResult,
    SeasonPlayersPageResult,
    SeasonResult,
)
from persistence.domain.entity import (
    FootballMatch,
    Pena,
    PenaPlayer,
    PenaRole,
    Player,
    Season,
    SeasonPlayer,
    Team,
    TeamPlayer,
)
from persistence.domain.label_config import (
    DEFAULT_POSITION_LABEL_COLORS,
    DEFAULT_ROLE_LABEL_COLORS,
    align_label_colors,
    parse_label_colors_payload,
)
from sqlalchemy import and_, case, func, or_, select
from sqlalchemy.exc import IntegrityError
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

        role_names_by_id = self._get_role_names_by_ids(
            pena_id=pena.id,
            role_ids={link.id_role} if link.id_role is not None else set(),
        )
        resolved_role = self._resolve_snapshot_role(
            explicit_role=None,
            role_id=link.id_role,
            player=player,
            role_names_by_id=role_names_by_id,
        )

        season_player = SeasonPlayer(
            id_player=player.id,
            id_pena=pena.id,
            id_season=season.id,
            id_role=link.id_role,
            role=resolved_role,
            position=link.position,
            wins=0,
            losses=0,
            draws=0,
            quality_level=0.0,
        )
        try:
            self.session.add(season_player)
            self.session.commit()
        except IntegrityError as exc:
            self.session.rollback()
            raise SeasonPlayerAlreadyRegisteredError() from exc
        position_color_map = parse_label_colors_payload(pena.position_label_colors)
        return self._to_season_player_result(
            player=player,
            link=link,
            season_player=season_player,
            points_win=season.points_win,
            points_draw=season.points_draw,
            points_loss=season.points_loss,
            position_color_map=position_color_map,
        )

    def register_players_for_admin_bulk(
        self,
        *,
        pena_guid: str,
        season_guid: str,
        admin_id: int,
        player_guids: list[str],
        source_season_guid: str | None = None,
    ) -> list[SeasonPlayerResult]:
        if not player_guids:
            self.session.rollback()
            raise InvalidMatchDataError()

        cleaned_guids = [player_guid.strip() for player_guid in player_guids if player_guid.strip()]
        if len(cleaned_guids) != len(player_guids) or len(set(cleaned_guids)) != len(cleaned_guids):
            self.session.rollback()
            raise InvalidMatchDataError()

        pena = self._get_pena(pena_guid)
        if pena.id_admin != admin_id:
            self.session.rollback()
            raise PenaNotManagedByAdminError()
        season = self._get_season(pena_id=pena.id, season_guid=season_guid)
        source_season = (
            self._get_season(pena_id=pena.id, season_guid=source_season_guid)
            if source_season_guid
            else None
        )

        players = list(
            self.session.execute(
                select(Player).where(Player.guid.in_(set(cleaned_guids)))
            ).scalars()
        )
        players_by_guid = {player.guid: player for player in players}
        if len(players_by_guid) != len(cleaned_guids):
            self.session.rollback()
            raise PlayerNotFoundError()

        player_ids = {player.id for player in players}
        links = list(
            self.session.execute(
                select(PenaPlayer).where(
                    PenaPlayer.id_pena == pena.id,
                    PenaPlayer.id_player.in_(player_ids),
                )
            ).scalars()
        )
        links_by_player_id = {link.id_player: link for link in links}
        if len(links_by_player_id) != len(player_ids):
            self.session.rollback()
            raise PlayerNotInPenaError()

        existing_rows = self.session.execute(
            select(SeasonPlayer.id_player).where(
                SeasonPlayer.id_pena == pena.id,
                SeasonPlayer.id_season == season.id,
                SeasonPlayer.id_player.in_(player_ids),
            )
        ).all()
        if existing_rows:
            self.session.rollback()
            raise SeasonPlayerAlreadyRegisteredError()

        source_rows_by_player_id: dict[int, object] = {}
        if source_season is not None:
            source_rows = self.session.execute(
                select(
                    SeasonPlayer.id_player.label("id_player"),
                    SeasonPlayer.id_role.label("id_role"),
                    SeasonPlayer.role.label("role"),
                    SeasonPlayer.position.label("position"),
                ).where(
                    SeasonPlayer.id_pena == pena.id,
                    SeasonPlayer.id_season == source_season.id,
                    SeasonPlayer.id_player.in_(player_ids),
                )
            ).all()
            source_rows_by_player_id = {int(row.id_player): row for row in source_rows}

        role_ids = {link.id_role for link in links if link.id_role is not None}
        role_ids.update(
            int(row.id_role)
            for row in source_rows_by_player_id.values()
            if getattr(row, "id_role", None) is not None
        )
        role_names_by_id = self._get_role_names_by_ids(pena_id=pena.id, role_ids=role_ids)

        season_players: dict[int, SeasonPlayer] = {}
        try:
            for player_guid in cleaned_guids:
                player = players_by_guid[player_guid]
                link = links_by_player_id[player.id]
                source_row = source_rows_by_player_id.get(player.id)
                role_id = source_row.id_role if source_row is not None else link.id_role
                role_name = self._resolve_snapshot_role(
                    explicit_role=source_row.role if source_row is not None else None,
                    role_id=role_id,
                    player=player,
                    role_names_by_id=role_names_by_id,
                )
                position = (
                    source_row.position
                    if source_row is not None and source_row.position is not None
                    else link.position
                )
                season_player = SeasonPlayer(
                    id_player=player.id,
                    id_pena=pena.id,
                    id_season=season.id,
                    id_role=role_id,
                    role=role_name,
                    position=position,
                    wins=0,
                    losses=0,
                    draws=0,
                    quality_level=0.0,
                )
                self.session.add(season_player)
                season_players[player.id] = season_player
            self.session.commit()
        except IntegrityError as exc:
            self.session.rollback()
            raise SeasonPlayerAlreadyRegisteredError() from exc

        position_color_map = parse_label_colors_payload(pena.position_label_colors)
        return [
            self._to_season_player_result(
                player=players_by_guid[player_guid],
                link=links_by_player_id[players_by_guid[player_guid].id],
                season_player=season_players[players_by_guid[player_guid].id],
                points_win=season.points_win,
                points_draw=season.points_draw,
                points_loss=season.points_loss,
                position_color_map=position_color_map,
            )
            for player_guid in cleaned_guids
        ]

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
        role_provided: bool,
        role: str | None,
        position_provided: bool,
        position: str | None,
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
        if role_provided:
            resolved_role_id, resolved_role_name = self._resolve_role_snapshot_for_update(
                pena_id=pena.id,
                role=role,
            )
            season_player.id_role = resolved_role_id
            season_player.role = resolved_role_name
        if position_provided:
            season_player.position = position

        self.session.commit()
        position_color_map = parse_label_colors_payload(pena.position_label_colors)
        return self._to_season_player_result(
            player=player,
            link=link,
            season_player=season_player,
            points_win=season.points_win,
            points_draw=season.points_draw,
            points_loss=season.points_loss,
            position_color_map=position_color_map,
        )

    def unregister_player_for_admin(
        self,
        *,
        pena_guid: str,
        season_guid: str,
        admin_id: int,
        player_guid: str,
    ) -> None:
        pena = self._get_pena(pena_guid)
        if pena.id_admin != admin_id:
            self.session.rollback()
            raise PenaNotManagedByAdminError()
        season = self._get_season(pena_id=pena.id, season_guid=season_guid)
        player = self._get_player(player_guid)
        season_player = self._get_season_player(
            pena_id=pena.id,
            season_id=season.id,
            player_id=player.id,
            for_update=True,
            allow_missing=True,
        )
        if not season_player:
            self.session.rollback()
            raise SeasonPlayerNotFoundError()
        if self._player_has_season_matches(season_id=season.id, player_id=player.id):
            self.session.rollback()
            raise SeasonPlayerHasMatchesError()
        self.session.delete(season_player)
        self.session.commit()

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
        position_color_map = parse_label_colors_payload(pena.position_label_colors)
        points_expr = (
            SeasonPlayer.wins * season.points_win
            + SeasonPlayer.draws * season.points_draw
            + SeasonPlayer.losses * season.points_loss
        ).label("points")
        played_expr = (SeasonPlayer.wins + SeasonPlayer.draws + SeasonPlayer.losses).label("played")
        role_expr = func.coalesce(
            SeasonPlayer.role,
            PenaRole.name,
            case((Player.id_player_account.is_(None), "guest"), else_="member"),
        ).label("role")
        role_color_expr = PenaRole.color.label("role_color")
        season_player_stats = (
            select(
                TeamPlayer.id_player.label("id_player"),
                func.coalesce(func.sum(TeamPlayer.goals), 0).label("goals"),
                func.coalesce(func.sum(TeamPlayer.assists), 0).label("assists"),
            )
            .select_from(TeamPlayer)
            .join(Team, Team.id == TeamPlayer.id_team)
            .join(FootballMatch, FootballMatch.id == Team.id_match)
            .where(FootballMatch.id_season == season.id)
            .group_by(TeamPlayer.id_player)
            .subquery()
        )
        goals_expr = func.coalesce(season_player_stats.c.goals, 0).label("goals")
        assists_expr = func.coalesce(season_player_stats.c.assists, 0).label("assists")

        stmt = (
            select(
                Player.guid.label("player_guid"),
                Player.name.label("name"),
                Player.surname1.label("surname1"),
                Player.surname2.label("surname2"),
                Player.nationality.label("nationality"),
                PenaPlayer.nickname.label("nickname"),
                role_expr,
                role_color_expr,
                SeasonPlayer.position.label("position"),
                played_expr,
                goals_expr,
                assists_expr,
                SeasonPlayer.wins.label("wins"),
                SeasonPlayer.losses.label("losses"),
                SeasonPlayer.draws.label("draws"),
                SeasonPlayer.quality_level.label("quality_level"),
                points_expr,
            )
            .select_from(SeasonPlayer)
            .join(Player, Player.id == SeasonPlayer.id_player)
            .outerjoin(
                PenaPlayer,
                and_(
                    PenaPlayer.id_player == SeasonPlayer.id_player,
                    PenaPlayer.id_pena == SeasonPlayer.id_pena,
                ),
            )
            .outerjoin(PenaRole, PenaRole.id == SeasonPlayer.id_role)
            .outerjoin(
                season_player_stats,
                season_player_stats.c.id_player == SeasonPlayer.id_player,
            )
            .where(
                SeasonPlayer.id_pena == pena.id,
                SeasonPlayer.id_season == season.id,
            )
        )

        stmt = self._apply_season_player_filters(stmt, filters, role_expr=role_expr)
        stmt = self._apply_player_order(
            stmt,
            order_by=order_by,
            order_dir=order_dir,
            points_expr=points_expr,
            goals_expr=goals_expr,
            assists_expr=assists_expr,
        )
        total = int(
            self.session.execute(select(func.count()).select_from(stmt.subquery())).scalar() or 0
        )
        rows = self.session.execute(stmt.limit(page_size).offset((page - 1) * page_size)).all()
        return SeasonPlayersPageResult(
            items=[
                self._row_to_player_result(row, position_color_map=position_color_map)
                for row in rows
            ],
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
            status="open",
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
        self.session.rollback()
        raise InvalidMatchDataError()

    def update_match_for_admin(
        self,
        *,
        pena_guid: str,
        season_guid: str,
        match_guid: str,
        admin_id: int,
        match_date_provided: bool,
        match_date: date | None,
        home_team_name_provided: bool,
        home_team_name: str | None,
        away_team_name_provided: bool,
        away_team_name: str | None,
    ) -> MatchDetailResult:
        if not (match_date_provided or home_team_name_provided or away_team_name_provided):
            self.session.rollback()
            raise InvalidMatchDataError()
        if match_date_provided and match_date is None:
            self.session.rollback()
            raise InvalidMatchDataError()
        if home_team_name_provided and not home_team_name:
            self.session.rollback()
            raise InvalidMatchDataError()
        if away_team_name_provided and not away_team_name:
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

        if match_date_provided:
            football_match.match_date = match_date
        if home_team_name_provided:
            home_team.name = home_team_name
        if away_team_name_provided:
            away_team.name = away_team_name

        self.session.commit()
        return self._build_match_detail_result(
            pena_id=pena.id,
            season_guid=season.guid,
            football_match=football_match,
            home_team=home_team,
            away_team=away_team,
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

        self._add_team_players(team_id=home_team.id, players=home_players)
        self._add_team_players(team_id=away_team.id, players=away_players)

        self.session.commit()
        return self._build_match_detail_result(
            pena_id=pena.id,
            season_guid=season.guid,
            football_match=football_match,
            home_team=home_team,
            away_team=away_team,
        )

    def update_match_lineups_for_admin(
        self,
        *,
        pena_guid: str,
        season_guid: str,
        match_guid: str,
        admin_id: int,
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

        standings_applied = self._match_standings_applied(home_team_players, away_team_players)
        if standings_applied:
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
            self._apply_team_outcome_delta(
                home_team_stats=home_season_players,
                away_team_stats=away_season_players,
                home_score=sum(player.goals for player in home_team_players),
                away_score=sum(player.goals for player in away_team_players),
                delta=-1,
            )

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

        for team_player in home_team_players + away_team_players:
            self.session.delete(team_player)
        self.session.flush()

        self._add_team_players(team_id=home_team.id, players=home_players)
        self._add_team_players(team_id=away_team.id, players=away_players)

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
        matches = list(
            self.session.execute(
                base_stmt.limit(page_size).offset((page - 1) * page_size)
            ).scalars()
        )
        if not matches:
            return MatchesPageResult(
                items=[],
                page=page,
                page_size=page_size,
                total=total,
            )

        team_ids = {
            team_id
            for football_match in matches
            for team_id in (football_match.id_home_team, football_match.id_away_team)
        }
        teams_by_id = self._get_teams_by_ids(team_ids, for_update=False)
        team_stats = self._get_team_match_summary_stats(team_ids)

        items: list[MatchSummaryResult] = []
        for football_match in matches:
            home_team = teams_by_id[football_match.id_home_team]
            away_team = teams_by_id[football_match.id_away_team]
            home_score, home_players, home_closed = team_stats.get(home_team.id, (0, 0, False))
            away_score, away_players, away_closed = team_stats.get(away_team.id, (0, 0, False))
            items.append(
                MatchSummaryResult(
                    guid=football_match.guid,
                    season_guid=season.guid,
                    match_date=football_match.match_date,
                    status="closed" if home_closed and away_closed else "open",
                    home_team_name=home_team.name,
                    away_team_name=away_team.name,
                    home_score=home_score,
                    away_score=away_score,
                    home_players=home_players,
                    away_players=away_players,
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

    def list_closed_match_insight_rows(
        self,
        *,
        pena_guid: str,
        season_guids: list[str],
    ) -> list[MatchInsightRowResult]:
        pena = self._get_pena(pena_guid)
        cleaned_season_guids = [item.strip() for item in season_guids if item.strip()]
        if not cleaned_season_guids:
            return []

        season_rows = self.session.execute(
            select(Season.id, Season.guid).where(
                Season.id_pena == pena.id,
                Season.guid.in_(set(cleaned_season_guids)),
            )
        ).all()
        season_ids_by_guid = {row.guid: int(row.id) for row in season_rows}
        if len(season_ids_by_guid) != len(set(cleaned_season_guids)):
            self.session.rollback()
            raise SeasonNotFoundError()

        team_match_stats = (
            select(
                TeamPlayer.id_team.label("team_id"),
                func.coalesce(func.sum(TeamPlayer.goals), 0).label("score"),
                func.min(TeamPlayer.rating).label("min_rating"),
            )
            .group_by(TeamPlayer.id_team)
            .subquery()
        )
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

        result: list[MatchInsightRowResult] = []
        for row in rows:
            team_side = "home" if int(row.team_id) == int(row.home_team_id) else "away"
            result.append(
                MatchInsightRowResult(
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
            )

        return result

    def delete_match_for_admin(
        self,
        *,
        pena_guid: str,
        season_guid: str,
        match_guid: str,
        admin_id: int,
    ) -> None:
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

        if self._match_standings_applied(home_team_players, away_team_players):
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
            self._apply_team_outcome_delta(
                home_team_stats=home_season_players,
                away_team_stats=away_season_players,
                home_score=sum(player.goals for player in home_team_players),
                away_score=sum(player.goals for player in away_team_players),
                delta=-1,
            )

        self.session.delete(football_match)
        self.session.flush()
        self.session.delete(home_team)
        self.session.delete(away_team)
        self.session.commit()

    def get_standings(
        self,
        *,
        pena_guid: str,
        season_guid: str,
        filters: SeasonPlayerFilters,
        page: int,
        page_size: int,
    ) -> SeasonPlayersPageResult:
        return self.list_season_players(
            pena_guid=pena_guid,
            season_guid=season_guid,
            filters=filters,
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

    def _get_role_names_by_ids(
        self,
        *,
        pena_id: int,
        role_ids: set[int | None],
    ) -> dict[int, str]:
        cleaned_role_ids = {int(role_id) for role_id in role_ids if role_id is not None}
        if not cleaned_role_ids:
            return {}
        rows = self.session.execute(
            select(PenaRole.id, PenaRole.name).where(
                PenaRole.id_pena == pena_id,
                PenaRole.id.in_(cleaned_role_ids),
            )
        ).all()
        return {int(row.id): str(row.name) for row in rows}

    @staticmethod
    def _resolve_snapshot_role(
        *,
        explicit_role: str | None,
        role_id: int | None,
        player: Player,
        role_names_by_id: dict[int, str],
    ) -> str:
        if explicit_role and explicit_role.strip():
            return explicit_role.strip()
        if role_id is not None:
            mapped = role_names_by_id.get(int(role_id))
            if mapped:
                return mapped
        return "member" if player.id_player_account is not None else "guest"

    def _resolve_role_snapshot_for_update(
        self,
        *,
        pena_id: int,
        role: str | None,
    ) -> tuple[int | None, str | None]:
        if role is None:
            return None, None

        role_row = self.session.execute(
            select(PenaRole.id, PenaRole.name).where(
                PenaRole.id_pena == pena_id,
                func.lower(PenaRole.name) == func.lower(role),
            )
        ).one_or_none()
        if role_row:
            return int(role_row.id), str(role_row.name)
        return None, role

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

    def _player_has_season_matches(self, *, season_id: int, player_id: int) -> bool:
        row = self.session.execute(
            select(TeamPlayer.id_player)
            .join(Team, Team.id == TeamPlayer.id_team)
            .join(
                FootballMatch,
                or_(
                    FootballMatch.id_home_team == Team.id,
                    FootballMatch.id_away_team == Team.id,
                ),
            )
            .where(
                TeamPlayer.id_player == player_id,
                FootballMatch.id_season == season_id,
            )
            .limit(1)
        ).first()
        return bool(row)

    def _get_season_player_match_totals(self, *, season_id: int, player_id: int) -> tuple[int, int]:
        row = self.session.execute(
            select(
                func.coalesce(func.sum(TeamPlayer.goals), 0).label("goals"),
                func.coalesce(func.sum(TeamPlayer.assists), 0).label("assists"),
            )
            .select_from(TeamPlayer)
            .join(Team, Team.id == TeamPlayer.id_team)
            .join(FootballMatch, FootballMatch.id == Team.id_match)
            .where(
                TeamPlayer.id_player == player_id,
                FootballMatch.id_season == season_id,
            )
        ).one()
        return int(row.goals), int(row.assists)

    def _to_season_player_result(
        self,
        *,
        player: Player,
        link: PenaPlayer,
        season_player: SeasonPlayer,
        points_win: int,
        points_draw: int,
        points_loss: int,
        position_color_map: dict[str, str],
    ) -> SeasonPlayerResult:
        goals, assists = self._get_season_player_match_totals(
            season_id=season_player.id_season,
            player_id=player.id,
        )
        role, role_color = self._resolve_role_data(player=player, season_player=season_player)
        position_color = self._resolve_position_color(
            position=season_player.position,
            position_color_map=position_color_map,
        )
        return SeasonPlayerResult(
            player_guid=player.guid,
            name=player.name,
            surname1=player.surname1,
            surname2=player.surname2,
            nationality=player.nationality,
            nickname=link.nickname,
            role=role,
            role_color=role_color,
            position=season_player.position,
            position_color=position_color,
            played=season_player.wins + season_player.draws + season_player.losses,
            goals=goals,
            assists=assists,
            wins=season_player.wins,
            losses=season_player.losses,
            draws=season_player.draws,
            quality_level=float(season_player.quality_level),
            points=(
                season_player.wins * points_win
                + season_player.draws * points_draw
                + season_player.losses * points_loss
            ),
        )

    @staticmethod
    def _apply_season_player_filters(stmt, filters: SeasonPlayerFilters, *, role_expr):
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
        role_values = SqlAlchemySeasonCompetitionRepository._normalize_exact_filter_values(
            [*filters.roles, filters.role] if filters.role else list(filters.roles)
        )
        if role_values:
            stmt = stmt.where(func.lower(role_expr).in_(role_values))

        position_values = SqlAlchemySeasonCompetitionRepository._normalize_exact_filter_values(
            [*filters.positions, filters.position] if filters.position else list(filters.positions)
        )
        if position_values:
            stmt = stmt.where(func.lower(SeasonPlayer.position).in_(position_values))
        if filters.search:
            token = f"%{filters.search}%"
            stmt = stmt.where(
                or_(
                    Player.name.ilike(token),
                    Player.surname1.ilike(token),
                    Player.surname2.ilike(token),
                    PenaPlayer.nickname.ilike(token),
                    role_expr.ilike(token),
                    SeasonPlayer.position.ilike(token),
                )
            )
        return stmt

    @staticmethod
    def _normalize_exact_filter_values(values: list[str]) -> tuple[str, ...]:
        output: list[str] = []
        seen: set[str] = set()
        for raw in values:
            normalized = str(raw or "").strip().casefold()
            if not normalized or normalized in seen:
                continue
            seen.add(normalized)
            output.append(normalized)
        return tuple(output)

    @staticmethod
    def _apply_player_order(
        stmt,
        *,
        order_by: str,
        order_dir: str,
        points_expr,
        goals_expr,
        assists_expr,
    ):
        columns = {
            "quality_level": SeasonPlayer.quality_level,
            "played": SeasonPlayer.wins + SeasonPlayer.draws + SeasonPlayer.losses,
            "goals": goals_expr,
            "assists": assists_expr,
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
    def _resolve_position_color(
        *, position: str | None, position_color_map: dict[str, str]
    ) -> str | None:
        if not position:
            return None
        return align_label_colors(
            [position],
            configured_colors=position_color_map,
            defaults=DEFAULT_POSITION_LABEL_COLORS,
        ).get(position)

    def _resolve_role_data(self, *, player: Player, season_player: SeasonPlayer) -> tuple[str, str]:
        if season_player.role and season_player.role.strip():
            role_name = season_player.role.strip()
            configured_color = None
            if season_player.id_role is not None:
                role_row = self.session.execute(
                    select(PenaRole.color).where(PenaRole.id == season_player.id_role)
                ).one_or_none()
                if role_row and role_row.color:
                    configured_color = role_row.color
            role_color = align_label_colors(
                [role_name],
                configured_colors={role_name: configured_color} if configured_color else None,
                defaults=DEFAULT_ROLE_LABEL_COLORS,
            )[role_name]
            return role_name, role_color

        if season_player.id_role is not None:
            role_row = self.session.execute(
                select(PenaRole.name, PenaRole.color).where(PenaRole.id == season_player.id_role)
            ).one_or_none()
            if role_row:
                role_name = role_row.name
                role_color = align_label_colors(
                    [role_name],
                    configured_colors={role_name: role_row.color} if role_row.color else None,
                    defaults=DEFAULT_ROLE_LABEL_COLORS,
                )[role_name]
                return role_name, role_color

        role_name = "member" if player.id_player_account is not None else "guest"
        role_color = align_label_colors(
            [role_name],
            configured_colors=None,
            defaults=DEFAULT_ROLE_LABEL_COLORS,
        )[role_name]
        return role_name, role_color

    @staticmethod
    def _row_to_player_result(row, *, position_color_map: dict[str, str]) -> SeasonPlayerResult:
        values = row._mapping
        role_name = values["role"]
        role_color = align_label_colors(
            [role_name],
            configured_colors={role_name: values["role_color"]} if values["role_color"] else None,
            defaults=DEFAULT_ROLE_LABEL_COLORS,
        )[role_name]
        position_color = SqlAlchemySeasonCompetitionRepository._resolve_position_color(
            position=values["position"],
            position_color_map=position_color_map,
        )
        return SeasonPlayerResult(
            player_guid=values["player_guid"],
            name=values["name"],
            surname1=values["surname1"],
            surname2=values["surname2"],
            nationality=values["nationality"],
            nickname=values["nickname"],
            role=role_name,
            role_color=role_color,
            position=values["position"],
            position_color=position_color,
            played=int(values["played"]),
            goals=int(values["goals"]),
            assists=int(values["assists"]),
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

        teams_by_id = self._get_teams_by_ids(
            {football_match.id_home_team, football_match.id_away_team},
            for_update=for_update,
        )
        home_team = teams_by_id[football_match.id_home_team]
        away_team = teams_by_id[football_match.id_away_team]
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

    def _list_team_players_by_team_ids(
        self,
        team_ids: set[int],
        *,
        for_update: bool,
    ) -> dict[int, list[TeamPlayer]]:
        if not team_ids:
            return {}

        stmt = (
            select(TeamPlayer)
            .where(TeamPlayer.id_team.in_(team_ids))
            .order_by(TeamPlayer.id_team.asc(), TeamPlayer.id_player.asc())
        )
        if for_update:
            stmt = stmt.with_for_update()

        grouped = {team_id: [] for team_id in team_ids}
        for row in self.session.execute(stmt).scalars():
            grouped[row.id_team].append(row)
        return grouped

    def _get_teams_by_ids(self, team_ids: set[int], *, for_update: bool) -> dict[int, Team]:
        if not team_ids:
            return {}

        stmt = select(Team).where(Team.id.in_(team_ids))
        if for_update:
            stmt = stmt.with_for_update()
        teams = list(self.session.execute(stmt).scalars())
        teams_by_id = {team.id: team for team in teams}
        if len(teams_by_id) != len(team_ids):
            self.session.rollback()
            raise MatchNotFoundError()
        return teams_by_id

    def _get_team_match_summary_stats(self, team_ids: set[int]) -> dict[int, tuple[int, int, bool]]:
        if not team_ids:
            return {}

        rows = self.session.execute(
            select(
                TeamPlayer.id_team.label("team_id"),
                func.coalesce(func.sum(TeamPlayer.goals), 0).label("score"),
                func.count(TeamPlayer.id_player).label("players"),
                func.min(TeamPlayer.rating).label("min_rating"),
            )
            .where(TeamPlayer.id_team.in_(team_ids))
            .group_by(TeamPlayer.id_team)
        ).all()
        return {
            int(row.team_id): (
                int(row.score),
                int(row.players),
                row.min_rating is not None and float(row.min_rating) >= 0.0,
            )
            for row in rows
        }

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

    def _add_team_players(self, *, team_id: int, players: list[Player]) -> None:
        for player in players:
            self.session.add(
                TeamPlayer(
                    id_team=team_id,
                    id_player=player.id,
                    goals=0,
                    assists=0,
                    rating=-1.0,  # sentinel: standings were not applied yet
                    saves=0,
                )
            )

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
        player_ids = {team_player.id_player for team_player in team_players}
        players_by_id = self._get_players_by_ids(player_ids)
        result: dict[str, TeamPlayer] = {}
        for team_player in team_players:
            player = players_by_id.get(team_player.id_player)
            if not player:
                self.session.rollback()
                raise PlayerNotFoundError()
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

    @classmethod
    def _match_status_from_players(
        cls,
        home_team_players: list[TeamPlayer],
        away_team_players: list[TeamPlayer],
    ) -> str:
        return (
            "closed"
            if cls._match_standings_applied(home_team_players, away_team_players)
            else "open"
        )

    @staticmethod
    def _lineup_update_locked(
        home_team_players: list[TeamPlayer],
        away_team_players: list[TeamPlayer],
    ) -> bool:
        players = home_team_players + away_team_players
        return any(
            player.goals > 0 or player.assists > 0 or player.saves > 0 or player.rating >= 0
            for player in players
        )

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
        team_players_by_id = self._list_team_players_by_team_ids(
            {home_team.id, away_team.id},
            for_update=False,
        )
        home_players = team_players_by_id.get(home_team.id, [])
        away_players = team_players_by_id.get(away_team.id, [])
        player_ids = {team_player.id_player for team_player in home_players + away_players}
        players_by_id = self._get_players_by_ids(player_ids)
        links_by_player_id = self._get_pena_player_links_by_player_ids(
            pena_id=pena_id,
            player_ids=player_ids,
        )
        positions_by_player_id = self._get_season_player_positions(
            pena_id=pena_id,
            season_id=football_match.id_season,
            player_ids=player_ids,
        )

        return MatchDetailResult(
            guid=football_match.guid,
            season_guid=season_guid,
            match_date=football_match.match_date,
            status=self._match_status_from_players(home_players, away_players),
            home_team=self._build_match_team_result(
                team=home_team,
                team_players=home_players,
                players_by_id=players_by_id,
                links_by_player_id=links_by_player_id,
                positions_by_player_id=positions_by_player_id,
            ),
            away_team=self._build_match_team_result(
                team=away_team,
                team_players=away_players,
                players_by_id=players_by_id,
                links_by_player_id=links_by_player_id,
                positions_by_player_id=positions_by_player_id,
            ),
        )

    def _build_match_team_result(
        self,
        *,
        team: Team,
        team_players: list[TeamPlayer],
        players_by_id: dict[int, Player],
        links_by_player_id: dict[int, PenaPlayer],
        positions_by_player_id: dict[int, str | None],
    ) -> MatchTeamResult:
        players: list[MatchPlayerStatsResult] = []
        total_goals = 0
        total_assists = 0
        total_saves = 0
        total_rating = 0.0

        for team_player in team_players:
            player = players_by_id.get(team_player.id_player)
            if not player:
                self.session.rollback()
                raise PlayerNotFoundError()
            link = links_by_player_id.get(player.id)
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
                    position=positions_by_player_id.get(player.id),
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

    def _get_players_by_ids(self, player_ids: set[int]) -> dict[int, Player]:
        if not player_ids:
            return {}

        players = list(
            self.session.execute(select(Player).where(Player.id.in_(player_ids))).scalars()
        )
        players_by_id = {player.id: player for player in players}
        if len(players_by_id) != len(player_ids):
            self.session.rollback()
            raise PlayerNotFoundError()
        return players_by_id

    def _get_pena_player_links_by_player_ids(
        self,
        *,
        pena_id: int,
        player_ids: set[int],
    ) -> dict[int, PenaPlayer]:
        if not player_ids:
            return {}

        rows = self.session.execute(
            select(PenaPlayer).where(
                PenaPlayer.id_pena == pena_id,
                PenaPlayer.id_player.in_(player_ids),
            )
        ).scalars()
        return {row.id_player: row for row in rows}

    def _get_season_player_positions(
        self,
        *,
        pena_id: int,
        season_id: int,
        player_ids: set[int],
    ) -> dict[int, str | None]:
        if not player_ids:
            return {}

        rows = self.session.execute(
            select(SeasonPlayer.id_player, SeasonPlayer.position).where(
                SeasonPlayer.id_pena == pena_id,
                SeasonPlayer.id_season == season_id,
                SeasonPlayer.id_player.in_(player_ids),
            )
        ).all()
        return {int(row.id_player): row.position for row in rows}
