from persistence.application.ports.season_competition_port import SeasonCompetitionPort
from persistence.application.ports.season_match_port import SeasonMatchPort
from persistence.application.ports.season_player_port import SeasonPlayerPort

from . import season_competition_errors as _errors
from . import season_competition_models as _models
from .manage_season_lifecycle_usecase import ManageSeasonLifecycleUseCase
from .manage_season_matches_usecase import ManageSeasonMatchesUseCase
from .manage_season_players_usecase import ManageSeasonPlayersUseCase

InvalidSeasonDataError = _errors.InvalidSeasonDataError
InvalidSeasonInsightsDataError = _errors.InvalidSeasonInsightsDataError
InvalidSeasonMatchDataError = _errors.InvalidSeasonMatchDataError
InvalidSeasonPlayerBatchDataError = _errors.InvalidSeasonPlayerBatchDataError
InvalidSeasonPlayerUpdateDataError = _errors.InvalidSeasonPlayerUpdateDataError
PenaSeasonAccessDeniedError = _errors.PenaSeasonAccessDeniedError
PenaSeasonDateOverlapError = _errors.PenaSeasonDateOverlapError
PenaSeasonNotFoundError = _errors.PenaSeasonNotFoundError
PenaSeasonPenaNotFoundError = _errors.PenaSeasonPenaNotFoundError
SeasonMatchAlreadyStartedError = _errors.SeasonMatchAlreadyStartedError
SeasonMatchClockNotRunningError = _errors.SeasonMatchClockNotRunningError
SeasonMatchEventNotFoundError = _errors.SeasonMatchEventNotFoundError
SeasonMatchEventPlayerNotInMatchError = _errors.SeasonMatchEventPlayerNotInMatchError
SeasonMatchInvalidPlayersError = _errors.SeasonMatchInvalidPlayersError
SeasonMatchLineupLockedError = _errors.SeasonMatchLineupLockedError
SeasonMatchNotFoundError = _errors.SeasonMatchNotFoundError
SeasonMatchPlayersNotInSeasonError = _errors.SeasonMatchPlayersNotInSeasonError
SeasonMatchReportClosedError = _errors.SeasonMatchReportClosedError
SeasonMatchStatsMismatchError = _errors.SeasonMatchStatsMismatchError
SeasonPlayerAlreadyRegisteredError = _errors.SeasonPlayerAlreadyRegisteredError
SeasonPlayerInMatchError = _errors.SeasonPlayerInMatchError
SeasonPlayerNotFoundError = _errors.SeasonPlayerNotFoundError
SeasonPlayerNotInPenaError = _errors.SeasonPlayerNotInPenaError

SeasonCreate = _models.SeasonCreate
SeasonInfo = _models.SeasonInfo
SeasonMatchCreate = _models.SeasonMatchCreate
SeasonMatchCreateDetailed = _models.SeasonMatchCreateDetailed
SeasonMatchDetailInfo = _models.SeasonMatchDetailInfo
SeasonMatchEventCreate = _models.SeasonMatchEventCreate
SeasonMatchesPage = _models.SeasonMatchesPage
SeasonMatchInfo = _models.SeasonMatchInfo
SeasonMatchLineupsUpdate = _models.SeasonMatchLineupsUpdate
SeasonMatchPlayerStatsInfo = _models.SeasonMatchPlayerStatsInfo
SeasonMatchPlayerStatsUpdate = _models.SeasonMatchPlayerStatsUpdate
SeasonMatchResultUpdate = _models.SeasonMatchResultUpdate
SeasonMatchStatsUpdate = _models.SeasonMatchStatsUpdate
SeasonMatchSummaryInfo = _models.SeasonMatchSummaryInfo
SeasonMatchTeamCreate = _models.SeasonMatchTeamCreate
SeasonMatchTeamInfo = _models.SeasonMatchTeamInfo
SeasonMatchUpdate = _models.SeasonMatchUpdate
SeasonPlayerInfo = _models.SeasonPlayerInfo
SeasonPlayersFilters = _models.SeasonPlayersFilters
SeasonPlayersPage = _models.SeasonPlayersPage
SeasonPlayerStatsUpdate = _models.SeasonPlayerStatsUpdate

__all__ = [
    "InvalidSeasonDataError",
    "InvalidSeasonInsightsDataError",
    "InvalidSeasonMatchDataError",
    "InvalidSeasonPlayerBatchDataError",
    "InvalidSeasonPlayerUpdateDataError",
    "ManageSeasonCompetitionUseCase",
    "PenaSeasonAccessDeniedError",
    "PenaSeasonDateOverlapError",
    "PenaSeasonNotFoundError",
    "PenaSeasonPenaNotFoundError",
    "SeasonMatchAlreadyStartedError",
    "SeasonMatchClockNotRunningError",
    "SeasonCreate",
    "SeasonInfo",
    "SeasonMatchCreate",
    "SeasonMatchCreateDetailed",
    "SeasonMatchDetailInfo",
    "SeasonMatchEventCreate",
    "SeasonMatchEventNotFoundError",
    "SeasonMatchEventPlayerNotInMatchError",
    "SeasonMatchInfo",
    "SeasonMatchInvalidPlayersError",
    "SeasonMatchLineupLockedError",
    "SeasonMatchLineupsUpdate",
    "SeasonMatchNotFoundError",
    "SeasonMatchPlayerStatsInfo",
    "SeasonMatchPlayerStatsUpdate",
    "SeasonMatchPlayersNotInSeasonError",
    "SeasonMatchReportClosedError",
    "SeasonMatchResultUpdate",
    "SeasonMatchStatsMismatchError",
    "SeasonMatchStatsUpdate",
    "SeasonMatchesPage",
    "SeasonMatchSummaryInfo",
    "SeasonMatchTeamCreate",
    "SeasonMatchTeamInfo",
    "SeasonMatchUpdate",
    "SeasonPlayerAlreadyRegisteredError",
    "SeasonPlayerInMatchError",
    "SeasonPlayerInfo",
    "SeasonPlayerNotFoundError",
    "SeasonPlayerNotInPenaError",
    "SeasonPlayersFilters",
    "SeasonPlayersPage",
    "SeasonPlayerStatsUpdate",
]


class ManageSeasonCompetitionUseCase:
    def __init__(
        self,
        repository: SeasonCompetitionPort,
        player_repository: SeasonPlayerPort | None = None,
        match_repository: SeasonMatchPort | None = None,
    ):
        self.season_use_case = ManageSeasonLifecycleUseCase(repository)
        self.player_use_case = ManageSeasonPlayersUseCase(player_repository or repository)
        self.match_use_case = ManageSeasonMatchesUseCase(match_repository or repository)

    def get_active_for_pena(self, **kwargs) -> SeasonInfo:
        return self.season_use_case.get_active_for_pena(**kwargs)

    def create_season_for_admin(self, **kwargs) -> SeasonInfo:
        return self.season_use_case.create_season_for_admin(**kwargs)

    def register_player_for_admin(self, **kwargs) -> SeasonPlayerInfo:
        return self.player_use_case.register_player_for_admin(**kwargs)

    def register_players_bulk_for_admin(self, **kwargs) -> list[SeasonPlayerInfo]:
        return self.player_use_case.register_players_bulk_for_admin(**kwargs)

    def update_player_stats_for_admin(self, **kwargs) -> SeasonPlayerInfo:
        return self.player_use_case.update_player_stats_for_admin(**kwargs)

    def unregister_player_for_admin(self, **kwargs) -> None:
        self.player_use_case.unregister_player_for_admin(**kwargs)

    def list_season_players(self, **kwargs) -> SeasonPlayersPage:
        return self.player_use_case.list_season_players(**kwargs)

    def get_standings(self, **kwargs) -> SeasonPlayersPage:
        return self.player_use_case.get_standings(**kwargs)

    def create_match_for_admin(self, **kwargs) -> SeasonMatchInfo:
        return self.match_use_case.create_match_for_admin(**kwargs)

    def update_match_result_for_admin(self, **kwargs) -> SeasonMatchInfo:
        return self.match_use_case.update_match_result_for_admin(**kwargs)

    def create_match_with_lineups_for_admin(self, **kwargs) -> SeasonMatchDetailInfo:
        return self.match_use_case.create_match_with_lineups_for_admin(**kwargs)

    def update_match_stats_for_admin(self, **kwargs) -> SeasonMatchDetailInfo:
        return self.match_use_case.update_match_stats_for_admin(**kwargs)

    def update_match_for_admin(self, **kwargs) -> SeasonMatchDetailInfo:
        return self.match_use_case.update_match_for_admin(**kwargs)

    def update_match_lineups_for_admin(self, **kwargs) -> SeasonMatchDetailInfo:
        return self.match_use_case.update_match_lineups_for_admin(**kwargs)

    def start_match_for_admin(self, **kwargs) -> SeasonMatchDetailInfo:
        return self.match_use_case.start_match_for_admin(**kwargs)

    def stop_match_for_admin(self, **kwargs) -> SeasonMatchDetailInfo:
        return self.match_use_case.stop_match_for_admin(**kwargs)

    def create_match_event_for_admin(self, **kwargs) -> SeasonMatchDetailInfo:
        return self.match_use_case.create_match_event_for_admin(**kwargs)

    def delete_match_event_for_admin(self, **kwargs) -> SeasonMatchDetailInfo:
        return self.match_use_case.delete_match_event_for_admin(**kwargs)

    def delete_match_for_admin(self, **kwargs) -> None:
        self.match_use_case.delete_match_for_admin(**kwargs)

    def list_season_matches(self, **kwargs) -> SeasonMatchesPage:
        return self.match_use_case.list_season_matches(**kwargs)

    def get_match_detail(self, **kwargs) -> SeasonMatchDetailInfo:
        return self.match_use_case.get_match_detail(**kwargs)
