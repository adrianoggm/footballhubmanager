from typing import Protocol

from persistence.application.ports.season_competition_port import (
    SeasonPlayerFilters,
    SeasonPlayerResult,
    SeasonPlayersPageResult,
)


class SeasonPlayerPort(Protocol):
    def register_player_for_admin(
        self,
        *,
        pena_guid: str,
        season_guid: str,
        admin_id: int,
        player_guid: str,
    ) -> SeasonPlayerResult: ...

    def register_players_for_admin_bulk(
        self,
        *,
        pena_guid: str,
        season_guid: str,
        admin_id: int,
        player_guids: list[str],
        source_season_guid: str | None = None,
    ) -> list[SeasonPlayerResult]: ...

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
    ) -> SeasonPlayerResult: ...

    def unregister_player_for_admin(
        self,
        *,
        pena_guid: str,
        season_guid: str,
        admin_id: int,
        player_guid: str,
    ) -> None: ...

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
    ) -> SeasonPlayersPageResult: ...

    def get_standings(
        self,
        *,
        pena_guid: str,
        season_guid: str,
        filters: SeasonPlayerFilters,
        page: int,
        page_size: int,
    ) -> SeasonPlayersPageResult: ...
