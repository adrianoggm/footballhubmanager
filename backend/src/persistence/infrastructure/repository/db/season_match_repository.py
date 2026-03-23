import time
from datetime import date

from persistence.application.ports.season_competition_port import (
    InvalidMatchDataError,
    MatchClockAlreadyStartedError,
    MatchClockNotRunningError,
    MatchDetailResult,
    MatchesPageResult,
    MatchEventCreateData,
    MatchEventNotFoundError,
    MatchEventPlayerNotInMatchError,
    MatchEventResult,
    MatchLineupLockedError,
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
    SamePlayerMatchError,
    SeasonNotFoundError,
    SeasonPlayerNotFoundError,
)
from persistence.application.ports.season_match_port import SeasonMatchPort
from persistence.domain.entity import (
    FootballMatch,
    FootballMatchEvent,
    Pena,
    PenaPlayer,
    Player,
    Season,
    SeasonPlayer,
    Team,
    TeamPlayer,
)
from sqlalchemy import func, select
from sqlalchemy.orm import Session


class SqlAlchemySeasonMatchRepository(SeasonMatchPort):
    def __init__(self, session: Session):
        self.session = session

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

        pena, season = self._get_admin_season(
            pena_guid=pena_guid,
            season_guid=season_guid,
            admin_id=admin_id,
        )
        home_player = self._get_player(home_player_guid)
        away_player = self._get_player(away_player_guid)
        self._ensure_players_registered_in_season(
            pena_id=pena.id,
            season_id=season.id,
            players=[home_player, away_player],
        )
        football_match, home_team, away_team = self._create_match_entities(
            season_id=season.id,
            match_date=match_date,
            home_team_name=f"{home_player.name} {home_player.surname1}",
            away_team_name=f"{away_player.name} {away_player.surname1}",
        )

        self.session.add(
            TeamPlayer(
                id_team=home_team.id,
                id_player=home_player.id,
                goals=0,
                assists=0,
                rating=-1.0,
                saves=0,
            )
        )
        self.session.add(
            TeamPlayer(
                id_team=away_team.id,
                id_player=away_player.id,
                goals=0,
                assists=0,
                rating=-1.0,
                saves=0,
            )
        )

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
        cleaned_home, cleaned_away = self._normalize_lineup_guids(
            home_player_guids=home_player_guids,
            away_player_guids=away_player_guids,
        )
        pena, season = self._get_admin_season(
            pena_guid=pena_guid,
            season_guid=season_guid,
            admin_id=admin_id,
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

        football_match, home_team, away_team = self._create_match_entities(
            match_date=match_date,
            season_id=season.id,
            home_team_name=self._team_name_or_default(
                home_team_name,
                default_name="Home Team",
            ),
            away_team_name=self._team_name_or_default(
                away_team_name,
                default_name="Away Team",
            ),
        )

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
        cleaned_home, cleaned_away = self._normalize_lineup_guids(
            home_player_guids=home_player_guids,
            away_player_guids=away_player_guids,
        )
        pena, season, football_match, home_team, away_team = self._get_admin_match_bundle(
            pena_guid=pena_guid,
            season_guid=season_guid,
            match_guid=match_guid,
            admin_id=admin_id,
            for_update=True,
        )
        if football_match.started_at_epoch is not None or self._match_has_events(
            football_match.id,
            for_update=True,
        ):
            self.session.rollback()
            raise MatchLineupLockedError()
        home_team_players, away_team_players = self._load_required_team_players(
            home_team_id=home_team.id,
            away_team_id=away_team.id,
            for_update=True,
        )
        self._remove_match_standings(
            pena_id=pena.id,
            season_id=season.id,
            home_team_players=home_team_players,
            away_team_players=away_team_players,
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

        self._replace_team_players(
            existing_players=home_team_players + away_team_players,
            home_team_id=home_team.id,
            away_team_id=away_team.id,
            home_players=home_players,
            away_players=away_players,
        )

        self.session.commit()
        return self._build_match_detail_result(
            pena_id=pena.id,
            season_guid=season.guid,
            football_match=football_match,
            home_team=home_team,
            away_team=away_team,
        )

    def start_match_for_admin(
        self,
        *,
        pena_guid: str,
        season_guid: str,
        match_guid: str,
        admin_id: int,
    ) -> MatchDetailResult:
        pena, season, football_match, home_team, away_team = self._get_admin_match_bundle(
            pena_guid=pena_guid,
            season_guid=season_guid,
            match_guid=match_guid,
            admin_id=admin_id,
            for_update=True,
        )
        if football_match.started_at_epoch is not None:
            self.session.rollback()
            raise MatchClockAlreadyStartedError()
        if self._match_has_events(football_match.id, for_update=True):
            self.session.rollback()
            raise InvalidMatchDataError()

        football_match.started_at_epoch = self._now_epoch()
        football_match.ended_at_epoch = None
        self.session.commit()
        return self._build_match_detail_result(
            pena_id=pena.id,
            season_guid=season.guid,
            football_match=football_match,
            home_team=home_team,
            away_team=away_team,
        )

    def stop_match_for_admin(
        self,
        *,
        pena_guid: str,
        season_guid: str,
        match_guid: str,
        admin_id: int,
    ) -> MatchDetailResult:
        pena, season, football_match, home_team, away_team = self._get_admin_match_bundle(
            pena_guid=pena_guid,
            season_guid=season_guid,
            match_guid=match_guid,
            admin_id=admin_id,
            for_update=True,
        )
        if football_match.started_at_epoch is None or football_match.ended_at_epoch is not None:
            self.session.rollback()
            raise MatchClockNotRunningError()

        home_team_players, away_team_players = self._load_required_team_players(
            home_team_id=home_team.id,
            away_team_id=away_team.id,
            for_update=True,
        )
        standings_applied = self._match_standings_applied(home_team_players, away_team_players)
        if not standings_applied:
            events = self._list_match_events(match_id=football_match.id, for_update=True)
            if events:
                self._apply_tracked_events_to_team_players(
                    home_team_players=home_team_players,
                    away_team_players=away_team_players,
                    events=events,
                )
                home_season_players, away_season_players = self._load_match_season_players(
                    pena_id=pena.id,
                    season_id=season.id,
                    home_team_players=home_team_players,
                    away_team_players=away_team_players,
                )
                self._apply_team_outcome_delta(
                    home_team_stats=home_season_players,
                    away_team_stats=away_season_players,
                    home_score=sum(player.goals for player in home_team_players),
                    away_score=sum(player.goals for player in away_team_players),
                    delta=1,
                )

        football_match.ended_at_epoch = self._now_epoch()
        self.session.commit()
        return self._build_match_detail_result(
            pena_id=pena.id,
            season_guid=season.guid,
            football_match=football_match,
            home_team=home_team,
            away_team=away_team,
        )

    def create_match_event_for_admin(
        self,
        *,
        pena_guid: str,
        season_guid: str,
        match_guid: str,
        admin_id: int,
        event: MatchEventCreateData,
    ) -> MatchDetailResult:
        pena, season, football_match, home_team, away_team = self._get_admin_match_bundle(
            pena_guid=pena_guid,
            season_guid=season_guid,
            match_guid=match_guid,
            admin_id=admin_id,
            for_update=True,
        )
        home_team_players, away_team_players = self._load_required_team_players(
            home_team_id=home_team.id,
            away_team_id=away_team.id,
            for_update=True,
        )
        roster_by_team = {
            "home": self._team_player_guid_map(home_team_players),
            "away": self._team_player_guid_map(away_team_players),
        }
        players_by_guid = {
            **roster_by_team["home"],
            **roster_by_team["away"],
        }

        primary_player = self._resolve_event_player(
            player_guid=event.player_guid,
            team_side=event.team_side,
            players_by_guid=players_by_guid,
            roster_by_team=roster_by_team,
        )
        related_player = self._resolve_related_event_player(
            player_guid=event.related_player_guid,
            players_by_guid=players_by_guid,
        )

        elapsed_seconds = self._resolve_event_elapsed_seconds(football_match, event.elapsed_seconds)
        match_event = FootballMatchEvent(
            id_match=football_match.id,
            event_type=event.event_type,
            team_side=event.team_side,
            elapsed_seconds=elapsed_seconds,
            value_delta=event.value_delta,
            id_player=primary_player.id_player if primary_player else None,
            id_related_player=related_player.id_player if related_player else None,
            note=event.note,
            recorded_at_epoch=self._now_epoch(),
        )
        self.session.add(match_event)
        self.session.commit()
        return self._build_match_detail_result(
            pena_id=pena.id,
            season_guid=season.guid,
            football_match=football_match,
            home_team=home_team,
            away_team=away_team,
        )

    def delete_match_event_for_admin(
        self,
        *,
        pena_guid: str,
        season_guid: str,
        match_guid: str,
        event_guid: str,
        admin_id: int,
    ) -> MatchDetailResult:
        pena, season, football_match, home_team, away_team = self._get_admin_match_bundle(
            pena_guid=pena_guid,
            season_guid=season_guid,
            match_guid=match_guid,
            admin_id=admin_id,
            for_update=True,
        )
        event = self._get_match_event(
            match_id=football_match.id,
            event_guid=event_guid,
            for_update=True,
        )
        if not event:
            self.session.rollback()
            raise MatchEventNotFoundError()

        self.session.delete(event)
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

        pena, season, football_match, home_team, away_team = self._get_admin_match_bundle(
            pena_guid=pena_guid,
            season_guid=season_guid,
            match_guid=match_guid,
            admin_id=admin_id,
            for_update=True,
        )
        home_team_players, away_team_players = self._load_required_team_players(
            home_team_id=home_team.id,
            away_team_id=away_team.id,
            for_update=True,
        )

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
        home_season_players, away_season_players = self._load_match_season_players(
            pena_id=pena.id,
            season_id=season.id,
            home_team_players=home_team_players,
            away_team_players=away_team_players,
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

        # Saving final stats ends live tracking when the match had been started.
        if football_match.started_at_epoch is not None and football_match.ended_at_epoch is None:
            football_match.ended_at_epoch = self._now_epoch()

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
        current_epoch = self._now_epoch()

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
                    tracking_status=self._match_tracking_status(football_match),
                    started_at_epoch=football_match.started_at_epoch,
                    ended_at_epoch=football_match.ended_at_epoch,
                    elapsed_seconds=self._match_elapsed_seconds(
                        football_match,
                        current_epoch=current_epoch,
                    ),
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

    def delete_match_for_admin(
        self,
        *,
        pena_guid: str,
        season_guid: str,
        match_guid: str,
        admin_id: int,
    ) -> None:
        pena, season, football_match, home_team, away_team = self._get_admin_match_bundle(
            pena_guid=pena_guid,
            season_guid=season_guid,
            match_guid=match_guid,
            admin_id=admin_id,
            for_update=True,
        )
        home_team_players, away_team_players = self._load_required_team_players(
            home_team_id=home_team.id,
            away_team_id=away_team.id,
            for_update=True,
        )
        self._remove_match_standings(
            pena_id=pena.id,
            season_id=season.id,
            home_team_players=home_team_players,
            away_team_players=away_team_players,
        )

        self.session.delete(football_match)
        self.session.flush()
        self.session.delete(home_team)
        self.session.delete(away_team)
        self.session.commit()

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

    def _get_admin_season(
        self,
        *,
        pena_guid: str,
        season_guid: str,
        admin_id: int,
    ) -> tuple[Pena, Season]:
        pena = self._get_pena(pena_guid)
        if pena.id_admin != admin_id:
            self.session.rollback()
            raise PenaNotManagedByAdminError()
        season = self._get_season(pena_id=pena.id, season_guid=season_guid)
        return pena, season

    def _get_admin_match_bundle(
        self,
        *,
        pena_guid: str,
        season_guid: str,
        match_guid: str,
        admin_id: int,
        for_update: bool,
    ) -> tuple[Pena, Season, FootballMatch, Team, Team]:
        pena, season = self._get_admin_season(
            pena_guid=pena_guid,
            season_guid=season_guid,
            admin_id=admin_id,
        )
        bundle = self._get_match_teams(
            season_id=season.id,
            match_guid=match_guid,
            for_update=for_update,
        )
        if not bundle:
            self.session.rollback()
            raise MatchNotFoundError()
        football_match, home_team, away_team = bundle
        return pena, season, football_match, home_team, away_team

    def _load_required_team_players(
        self,
        *,
        home_team_id: int,
        away_team_id: int,
        for_update: bool,
    ) -> tuple[list[TeamPlayer], list[TeamPlayer]]:
        home_team_players = self._list_team_players(home_team_id, for_update=for_update)
        away_team_players = self._list_team_players(away_team_id, for_update=for_update)
        if not home_team_players or not away_team_players:
            self.session.rollback()
            raise MatchNotFoundError()
        return home_team_players, away_team_players

    def _normalize_lineup_guids(
        self,
        *,
        home_player_guids: list[str],
        away_player_guids: list[str],
    ) -> tuple[list[str], list[str]]:
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
        return cleaned_home, cleaned_away

    def _create_match_entities(
        self,
        *,
        season_id: int,
        match_date: date,
        home_team_name: str,
        away_team_name: str,
    ) -> tuple[FootballMatch, Team, Team]:
        home_team = Team(name=home_team_name, id_match=None)
        away_team = Team(name=away_team_name, id_match=None)
        self.session.add(home_team)
        self.session.add(away_team)
        self.session.flush()

        football_match = FootballMatch(
            id_home_team=home_team.id,
            id_away_team=away_team.id,
            match_date=match_date,
            id_season=season_id,
        )
        self.session.add(football_match)
        self.session.flush()

        home_team.id_match = football_match.id
        away_team.id_match = football_match.id
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

    def _ensure_players_registered_in_season(
        self,
        *,
        pena_id: int,
        season_id: int,
        players: list[Player],
    ) -> None:
        for player in players:
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

    def _add_team_players(self, *, team_id: int, players: list[Player]) -> None:
        for player in players:
            self.session.add(
                TeamPlayer(
                    id_team=team_id,
                    id_player=player.id,
                    goals=0,
                    assists=0,
                    rating=-1.0,
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

    @staticmethod
    def _now_epoch() -> int:
        return int(time.time())

    def _match_has_events(self, match_id: int, *, for_update: bool) -> bool:
        stmt = select(FootballMatchEvent.id).where(FootballMatchEvent.id_match == match_id).limit(1)
        if for_update:
            stmt = stmt.with_for_update()
        return self.session.execute(stmt).scalar_one_or_none() is not None

    def _get_match_event(
        self,
        *,
        match_id: int,
        event_guid: str,
        for_update: bool,
    ) -> FootballMatchEvent | None:
        stmt = select(FootballMatchEvent).where(
            FootballMatchEvent.id_match == match_id,
            FootballMatchEvent.guid == event_guid,
        )
        if for_update:
            stmt = stmt.with_for_update()
        return self.session.execute(stmt).scalar_one_or_none()

    def _list_match_events(
        self,
        *,
        match_id: int,
        for_update: bool,
    ) -> list[FootballMatchEvent]:
        stmt = (
            select(FootballMatchEvent)
            .where(FootballMatchEvent.id_match == match_id)
            .order_by(FootballMatchEvent.elapsed_seconds.asc(), FootballMatchEvent.id.asc())
        )
        if for_update:
            stmt = stmt.with_for_update()
        return list(self.session.execute(stmt).scalars())

    def _resolve_event_player(
        self,
        *,
        player_guid: str | None,
        team_side: str,
        players_by_guid: dict[str, TeamPlayer],
        roster_by_team: dict[str, dict[str, TeamPlayer]],
    ) -> TeamPlayer | None:
        if not player_guid:
            return None
        team_player = players_by_guid.get(player_guid)
        if not team_player:
            self.session.rollback()
            raise MatchEventPlayerNotInMatchError()
        if team_side in {"home", "away"} and player_guid not in roster_by_team[team_side]:
            self.session.rollback()
            raise MatchEventPlayerNotInMatchError()
        return team_player

    def _resolve_related_event_player(
        self,
        *,
        player_guid: str | None,
        players_by_guid: dict[str, TeamPlayer],
    ) -> TeamPlayer | None:
        if not player_guid:
            return None
        team_player = players_by_guid.get(player_guid)
        if not team_player:
            self.session.rollback()
            raise MatchEventPlayerNotInMatchError()
        return team_player

    def _resolve_event_elapsed_seconds(
        self,
        football_match: FootballMatch,
        provided_elapsed_seconds: int | None,
    ) -> int:
        if provided_elapsed_seconds is not None:
            return int(provided_elapsed_seconds)
        if football_match.started_at_epoch is None or football_match.ended_at_epoch is not None:
            self.session.rollback()
            raise MatchClockNotRunningError()
        return max(self._now_epoch() - int(football_match.started_at_epoch), 0)

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

    def _load_match_season_players(
        self,
        *,
        pena_id: int,
        season_id: int,
        home_team_players: list[TeamPlayer],
        away_team_players: list[TeamPlayer],
    ) -> tuple[list[SeasonPlayer], list[SeasonPlayer]]:
        return (
            self._team_season_players(
                pena_id=pena_id,
                season_id=season_id,
                team_players=home_team_players,
            ),
            self._team_season_players(
                pena_id=pena_id,
                season_id=season_id,
                team_players=away_team_players,
            ),
        )

    def _remove_match_standings(
        self,
        *,
        pena_id: int,
        season_id: int,
        home_team_players: list[TeamPlayer],
        away_team_players: list[TeamPlayer],
    ) -> None:
        if not self._match_standings_applied(home_team_players, away_team_players):
            return
        home_season_players, away_season_players = self._load_match_season_players(
            pena_id=pena_id,
            season_id=season_id,
            home_team_players=home_team_players,
            away_team_players=away_team_players,
        )
        self._apply_team_outcome_delta(
            home_team_stats=home_season_players,
            away_team_stats=away_season_players,
            home_score=sum(player.goals for player in home_team_players),
            away_score=sum(player.goals for player in away_team_players),
            delta=-1,
        )

    def _replace_team_players(
        self,
        *,
        existing_players: list[TeamPlayer],
        home_team_id: int,
        away_team_id: int,
        home_players: list[Player],
        away_players: list[Player],
    ) -> None:
        for team_player in existing_players:
            self.session.delete(team_player)
        self.session.flush()
        self._add_team_players(team_id=home_team_id, players=home_players)
        self._add_team_players(team_id=away_team_id, players=away_players)

    @staticmethod
    def _apply_tracked_events_to_team_players(
        *,
        home_team_players: list[TeamPlayer],
        away_team_players: list[TeamPlayer],
        events: list[FootballMatchEvent],
    ) -> None:
        tracked_event_types = {"goal", "assist", "save"}
        counts_by_player_id: dict[int, dict[str, int]] = {}

        for event in events:
            player_id = getattr(event, "id_player", None)
            event_type = str(getattr(event, "event_type", "") or "").strip().lower()
            if player_id is None or event_type not in tracked_event_types:
                continue
            current = counts_by_player_id.setdefault(
                int(player_id),
                {"goal": 0, "assist": 0, "save": 0},
            )
            current[event_type] += int(getattr(event, "value_delta", 1) or 1)

        for team_player in home_team_players + away_team_players:
            player_counts = counts_by_player_id.get(int(team_player.id_player), {})
            team_player.goals = max(0, int(player_counts.get("goal", 0)))
            team_player.assists = max(0, int(player_counts.get("assist", 0)))
            team_player.saves = max(0, int(player_counts.get("save", 0)))
            if float(team_player.rating) < 0:
                team_player.rating = 0.0

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
    def _match_tracking_status(football_match: FootballMatch) -> str:
        if football_match.started_at_epoch is None:
            return "not_started"
        if football_match.ended_at_epoch is None:
            return "live"
        return "finished"

    @classmethod
    def _match_elapsed_seconds(
        cls,
        football_match: FootballMatch,
        *,
        current_epoch: int | None = None,
    ) -> int:
        if football_match.started_at_epoch is None:
            return 0
        end_epoch = (
            football_match.ended_at_epoch
            if football_match.ended_at_epoch is not None
            else current_epoch
            if current_epoch is not None
            else cls._now_epoch()
        )
        return max(int(end_epoch) - int(football_match.started_at_epoch), 0)

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
        events = self._list_match_events(match_id=football_match.id, for_update=False)
        player_ids = {team_player.id_player for team_player in home_players + away_players}.union(
            {
                player_id
                for player_id in [
                    *(event.id_player for event in events),
                    *(event.id_related_player for event in events),
                ]
                if player_id is not None
            }
        )
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
            tracking_status=self._match_tracking_status(football_match),
            started_at_epoch=football_match.started_at_epoch,
            ended_at_epoch=football_match.ended_at_epoch,
            elapsed_seconds=self._match_elapsed_seconds(football_match),
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
            events=self._build_match_event_results(
                events=events,
                players_by_id=players_by_id,
                links_by_player_id=links_by_player_id,
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

    def _build_match_event_results(
        self,
        *,
        events: list[FootballMatchEvent],
        players_by_id: dict[int, Player],
        links_by_player_id: dict[int, PenaPlayer],
    ) -> list[MatchEventResult]:
        return [
            self._build_match_event_result(
                event=event,
                players_by_id=players_by_id,
                links_by_player_id=links_by_player_id,
            )
            for event in events
        ]

    def _build_match_event_result(
        self,
        *,
        event: FootballMatchEvent,
        players_by_id: dict[int, Player],
        links_by_player_id: dict[int, PenaPlayer],
    ) -> MatchEventResult:
        primary_player = players_by_id.get(event.id_player) if event.id_player is not None else None
        related_player = (
            players_by_id.get(event.id_related_player)
            if event.id_related_player is not None
            else None
        )
        primary_link = (
            links_by_player_id.get(primary_player.id) if primary_player is not None else None
        )
        related_link = (
            links_by_player_id.get(related_player.id) if related_player is not None else None
        )

        return MatchEventResult(
            guid=event.guid,
            event_type=event.event_type,
            team_side=event.team_side,
            elapsed_seconds=int(event.elapsed_seconds),
            value_delta=int(event.value_delta),
            player_guid=primary_player.guid if primary_player else None,
            player_name=primary_player.name if primary_player else None,
            player_surname1=primary_player.surname1 if primary_player else None,
            player_surname2=primary_player.surname2 if primary_player else None,
            player_nickname=primary_link.nickname if primary_link else None,
            related_player_guid=related_player.guid if related_player else None,
            related_player_name=related_player.name if related_player else None,
            related_player_surname1=related_player.surname1 if related_player else None,
            related_player_surname2=related_player.surname2 if related_player else None,
            related_player_nickname=related_link.nickname if related_link else None,
            note=event.note,
            recorded_at_epoch=int(event.recorded_at_epoch),
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
