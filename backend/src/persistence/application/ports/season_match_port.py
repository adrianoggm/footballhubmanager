from datetime import date
from typing import Protocol

from persistence.application.ports.season_competition_port import (
    MatchDetailResult,
    MatchEventCreateData,
    MatchesPageResult,
    MatchPlayerStatsUpdateData,
    MatchResult,
)


class SeasonMatchPort(Protocol):
    def create_match_for_admin(
        self,
        *,
        pena_guid: str,
        season_guid: str,
        admin_id: int,
        home_player_guid: str,
        away_player_guid: str,
        match_date: date,
    ) -> MatchResult: ...

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
    ) -> MatchResult: ...

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
    ) -> MatchDetailResult: ...

    def update_match_stats_for_admin(
        self,
        *,
        pena_guid: str,
        season_guid: str,
        match_guid: str,
        admin_id: int,
        home_players_stats: list[MatchPlayerStatsUpdateData],
        away_players_stats: list[MatchPlayerStatsUpdateData],
    ) -> MatchDetailResult: ...

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
    ) -> MatchDetailResult: ...

    def update_match_lineups_for_admin(
        self,
        *,
        pena_guid: str,
        season_guid: str,
        match_guid: str,
        admin_id: int,
        home_player_guids: list[str],
        away_player_guids: list[str],
    ) -> MatchDetailResult: ...

    def start_match_for_admin(
        self,
        *,
        pena_guid: str,
        season_guid: str,
        match_guid: str,
        admin_id: int,
    ) -> MatchDetailResult: ...

    def stop_match_for_admin(
        self,
        *,
        pena_guid: str,
        season_guid: str,
        match_guid: str,
        admin_id: int,
    ) -> MatchDetailResult: ...

    def create_match_event_for_admin(
        self,
        *,
        pena_guid: str,
        season_guid: str,
        match_guid: str,
        admin_id: int,
        event: MatchEventCreateData,
    ) -> MatchDetailResult: ...

    def delete_match_event_for_admin(
        self,
        *,
        pena_guid: str,
        season_guid: str,
        match_guid: str,
        event_guid: str,
        admin_id: int,
    ) -> MatchDetailResult: ...

    def list_season_matches(
        self,
        *,
        pena_guid: str,
        season_guid: str,
        page: int,
        page_size: int,
    ) -> MatchesPageResult: ...

    def get_match_detail(
        self,
        *,
        pena_guid: str,
        season_guid: str,
        match_guid: str,
    ) -> MatchDetailResult: ...

    def delete_match_for_admin(
        self,
        *,
        pena_guid: str,
        season_guid: str,
        match_guid: str,
        admin_id: int,
    ) -> None: ...
