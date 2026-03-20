from persistence.application.ports.season_competition_port import (
    InvalidMatchDataError,
    InvalidSeasonPlayerStatsError,
    PenaNotFoundError,
    PenaNotManagedByAdminError,
    PlayerNotFoundError,
    PlayerNotInPenaError,
    SeasonNotFoundError,
    SeasonPlayerAlreadyRegisteredError,
    SeasonPlayerFilters,
    SeasonPlayerHasMatchesError,
    SeasonPlayerNotFoundError,
    SeasonPlayerResult,
    SeasonPlayersPageResult,
)
from persistence.application.ports.season_player_port import SeasonPlayerPort
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


class SqlAlchemySeasonPlayerRepository(SeasonPlayerPort):
    def __init__(self, session: Session):
        self.session = session

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

    def _get_pena_player_link(self, *, pena_id: int, player_id: int) -> PenaPlayer:
        link = self.session.execute(
            select(PenaPlayer).where(
                PenaPlayer.id_pena == pena_id,
                PenaPlayer.id_player == player_id,
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
        role_values = SqlAlchemySeasonPlayerRepository._normalize_exact_filter_values(
            [*filters.roles, filters.role] if filters.role else list(filters.roles)
        )
        if role_values:
            stmt = stmt.where(func.lower(role_expr).in_(role_values))

        position_values = SqlAlchemySeasonPlayerRepository._normalize_exact_filter_values(
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
        *,
        position: str | None,
        position_color_map: dict[str, str],
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
        position_color = SqlAlchemySeasonPlayerRepository._resolve_position_color(
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
