from dataclasses import dataclass
from datetime import date

import pytest
from core.application.commands.season_match_command_handlers import (
    CreateSeasonMatchEventHandler,
    CreateSeasonMatchHandler,
    CreateSeasonMatchWithLineupsHandler,
    DeleteSeasonMatchEventHandler,
    DeleteSeasonMatchHandler,
    SetSeasonMatchGoalkeeperRotationHandler,
    StartSeasonMatchHandler,
    StopSeasonMatchHandler,
    UpdateSeasonMatchHandler,
    UpdateSeasonMatchLineupsHandler,
    UpdateSeasonMatchResultHandler,
    UpdateSeasonMatchStatsHandler,
)
from core.application.commands.season_match_commands import (
    CreateSeasonMatchCommand,
    CreateSeasonMatchEventCommand,
    CreateSeasonMatchWithLineupsCommand,
    DeleteSeasonMatchCommand,
    DeleteSeasonMatchEventCommand,
    SetSeasonMatchGoalkeeperRotationCommand,
    StartSeasonMatchCommand,
    StopSeasonMatchCommand,
    UpdateSeasonMatchCommand,
    UpdateSeasonMatchLineupsCommand,
    UpdateSeasonMatchResultCommand,
    UpdateSeasonMatchStatsCommand,
)
from core.application.models.season_competition_models import (
    SeasonMatchCreate,
    SeasonMatchCreateDetailed,
    SeasonMatchEventCreate,
    SeasonMatchLineupsUpdate,
    SeasonMatchPlayerStatsUpdate,
    SeasonMatchResultUpdate,
    SeasonMatchStatsUpdate,
    SeasonMatchTeamCreate,
    SeasonMatchUpdate,
)
from core.application.policies import FieldUpdate, StandingsUpdatePolicy
from core.application.ports.season_competition_port import (
    InvalidMatchDataError,
    InvalidSeasonPlayerStatsError,
    MatchClockAlreadyStartedError,
    MatchClockNotRunningError,
    MatchDetailResult,
    MatchesPageResult,
    MatchEventNotFoundError,
    MatchEventPlayerNotInMatchError,
    MatchLineupLockedError,
    MatchNotFoundError,
    MatchPlayerStatsResult,
    MatchReportClosedError,
    MatchResult,
    MatchStatsMismatchError,
    MatchSummaryResult,
    MatchTeamResult,
    PenaNotFoundError,
    PenaNotManagedByAdminError,
    PlayerNotFoundError,
    SamePlayerMatchError,
    SeasonNotFoundError,
)
from core.application.ports.season_competition_port import (
    MatchPlayersNotInSeasonError as RepositoryMatchPlayersNotInSeasonError,
)
from core.application.queries.season_match_queries import (
    GetSeasonMatchDetailQuery,
    ListSeasonMatchesQuery,
)
from core.application.queries.season_match_query_handlers import (
    GetSeasonMatchDetailHandler,
    ListSeasonMatchesHandler,
)
from core.application.use_cases.season_competition_errors import (
    InvalidSeasonMatchDataError,
    InvalidSeasonPlayerUpdateDataError,
    PenaSeasonAccessDeniedError,
    PenaSeasonNotFoundError,
    PenaSeasonPenaNotFoundError,
    SeasonMatchAlreadyStartedError,
    SeasonMatchClockNotRunningError,
    SeasonMatchEventNotFoundError,
    SeasonMatchEventPlayerNotInMatchError,
    SeasonMatchInvalidPlayersError,
    SeasonMatchLineupLockedError,
    SeasonMatchNotFoundError,
    SeasonMatchPlayersNotInSeasonError,
    SeasonMatchReportClosedError,
    SeasonMatchStatsMismatchError,
    SeasonPlayerNotFoundError,
)


@dataclass
class _FakeRepo:
    should_raise_pena_not_found: bool = False
    should_raise_access_denied: bool = False
    should_raise_season_not_found: bool = False
    should_raise_player_not_found: bool = False
    should_raise_match_players_not_in_season: bool = False
    should_raise_same_player_match: bool = False
    should_raise_invalid_match_data: bool = False
    should_raise_invalid_stats: bool = False
    should_raise_match_stats_mismatch: bool = False
    should_raise_match_not_found: bool = False
    should_raise_match_lineup_locked: bool = False
    should_raise_match_already_started: bool = False
    should_raise_match_clock_not_running: bool = False
    should_raise_event_not_found: bool = False
    should_raise_event_player_not_in_match: bool = False
    should_raise_match_report_closed: bool = False
    last_payload: dict | None = None

    @staticmethod
    def _match() -> MatchResult:
        return MatchResult(
            guid="match-guid",
            season_guid="season-guid",
            match_date=date(2024, 3, 1),
            home_player_guid="home-player-guid",
            away_player_guid="away-player-guid",
            home_player_name="Home Player",
            away_player_name="Away Player",
            status="open",
            home_score=2,
            away_score=1,
        )

    @staticmethod
    def _match_team(name: str) -> MatchTeamResult:
        return MatchTeamResult(
            team_guid=f"{name.lower()}-team-guid",
            team_name=name,
            score=2,
            total_assists=1,
            total_saves=0,
            average_rating=7.5,
            players=[
                MatchPlayerStatsResult(
                    player_guid=f"{name.lower()}-player-guid",
                    name=name,
                    surname1="Player",
                    surname2=None,
                    nickname=f"{name}Nick",
                    position="CM",
                    goals=2,
                    assists=1,
                    saves=0,
                    rating=7.5,
                )
            ],
        )

    @classmethod
    def _detail(cls) -> MatchDetailResult:
        return MatchDetailResult(
            guid="match-guid",
            season_guid="season-guid",
            match_date=date(2024, 3, 1),
            status="closed",
            tracking_status="not_started",
            started_at_epoch=None,
            ended_at_epoch=None,
            elapsed_seconds=0,
            total_paused_seconds=0,
            goalkeeper_rotation_seconds=600,
            home_team=cls._match_team("Home"),
            away_team=cls._match_team("Away"),
            events=[],
        )

    @staticmethod
    def _summary() -> MatchSummaryResult:
        return MatchSummaryResult(
            guid="match-guid",
            season_guid="season-guid",
            match_date=date(2024, 3, 1),
            status="closed",
            home_team_name="Home",
            away_team_name="Away",
            home_score=2,
            away_score=1,
            home_players=1,
            away_players=1,
            tracking_status="not_started",
            started_at_epoch=None,
            ended_at_epoch=None,
            elapsed_seconds=0,
        )

    def create_match_for_admin(self, **kwargs) -> MatchResult:
        if self.should_raise_pena_not_found:
            raise PenaNotFoundError()
        if self.should_raise_access_denied:
            raise PenaNotManagedByAdminError()
        if self.should_raise_season_not_found:
            raise SeasonNotFoundError()
        if self.should_raise_same_player_match:
            raise SamePlayerMatchError()
        if self.should_raise_match_players_not_in_season:
            raise RepositoryMatchPlayersNotInSeasonError()
        if self.should_raise_player_not_found:
            raise PlayerNotFoundError()
        self.last_payload = kwargs
        return self._match()

    def update_match_result_for_admin(self, **kwargs) -> MatchResult:
        if self.should_raise_pena_not_found:
            raise PenaNotFoundError()
        if self.should_raise_access_denied:
            raise PenaNotManagedByAdminError()
        if self.should_raise_season_not_found:
            raise SeasonNotFoundError()
        if self.should_raise_match_not_found:
            raise MatchNotFoundError()
        if self.should_raise_invalid_stats:
            raise InvalidSeasonPlayerStatsError()
        if self.should_raise_invalid_match_data:
            raise InvalidMatchDataError()
        self.last_payload = kwargs
        return self._match()

    def create_match_with_lineups_for_admin(self, **kwargs) -> MatchDetailResult:
        if self.should_raise_pena_not_found:
            raise PenaNotFoundError()
        if self.should_raise_access_denied:
            raise PenaNotManagedByAdminError()
        if self.should_raise_season_not_found:
            raise SeasonNotFoundError()
        if self.should_raise_same_player_match:
            raise SamePlayerMatchError()
        if self.should_raise_match_players_not_in_season:
            raise RepositoryMatchPlayersNotInSeasonError()
        if self.should_raise_player_not_found:
            raise PlayerNotFoundError()
        if self.should_raise_invalid_match_data:
            raise InvalidMatchDataError()
        self.last_payload = kwargs
        return self._detail()

    def update_match_stats_for_admin(self, **kwargs) -> MatchDetailResult:
        if self.should_raise_pena_not_found:
            raise PenaNotFoundError()
        if self.should_raise_access_denied:
            raise PenaNotManagedByAdminError()
        if self.should_raise_season_not_found:
            raise SeasonNotFoundError()
        if self.should_raise_match_not_found:
            raise MatchNotFoundError()
        if self.should_raise_match_stats_mismatch:
            raise MatchStatsMismatchError()
        if self.should_raise_invalid_match_data:
            raise InvalidMatchDataError()
        if self.should_raise_invalid_stats:
            raise InvalidSeasonPlayerStatsError()
        self.last_payload = kwargs
        return self._detail()

    def update_match_for_admin(self, **kwargs) -> MatchDetailResult:
        if self.should_raise_pena_not_found:
            raise PenaNotFoundError()
        if self.should_raise_access_denied:
            raise PenaNotManagedByAdminError()
        if self.should_raise_season_not_found:
            raise SeasonNotFoundError()
        if self.should_raise_match_not_found:
            raise MatchNotFoundError()
        if self.should_raise_invalid_match_data:
            raise InvalidMatchDataError()
        self.last_payload = kwargs
        return self._detail()

    def update_match_lineups_for_admin(self, **kwargs) -> MatchDetailResult:
        if self.should_raise_pena_not_found:
            raise PenaNotFoundError()
        if self.should_raise_access_denied:
            raise PenaNotManagedByAdminError()
        if self.should_raise_season_not_found:
            raise SeasonNotFoundError()
        if self.should_raise_match_not_found:
            raise MatchNotFoundError()
        if self.should_raise_match_lineup_locked:
            raise MatchLineupLockedError()
        if self.should_raise_same_player_match:
            raise SamePlayerMatchError()
        if self.should_raise_match_players_not_in_season:
            raise RepositoryMatchPlayersNotInSeasonError()
        if self.should_raise_player_not_found:
            raise PlayerNotFoundError()
        if self.should_raise_invalid_match_data:
            raise InvalidMatchDataError()
        self.last_payload = kwargs
        return self._detail()

    def start_match_for_admin(self, **kwargs) -> MatchDetailResult:
        if self.should_raise_pena_not_found:
            raise PenaNotFoundError()
        if self.should_raise_access_denied:
            raise PenaNotManagedByAdminError()
        if self.should_raise_season_not_found:
            raise SeasonNotFoundError()
        if self.should_raise_match_not_found:
            raise MatchNotFoundError()
        if self.should_raise_match_already_started:
            raise MatchClockAlreadyStartedError()
        if self.should_raise_match_report_closed:
            raise MatchReportClosedError()
        if self.should_raise_invalid_match_data:
            raise InvalidMatchDataError()
        self.last_payload = kwargs
        return self._detail()

    def set_goalkeeper_rotation_for_admin(self, **kwargs) -> MatchDetailResult:
        if self.should_raise_pena_not_found:
            raise PenaNotFoundError()
        if self.should_raise_access_denied:
            raise PenaNotManagedByAdminError()
        if self.should_raise_season_not_found:
            raise SeasonNotFoundError()
        if self.should_raise_match_not_found:
            raise MatchNotFoundError()
        if self.should_raise_invalid_match_data:
            raise InvalidMatchDataError()
        self.last_payload = kwargs
        return self._detail()

    def stop_match_for_admin(self, **kwargs) -> MatchDetailResult:
        if self.should_raise_pena_not_found:
            raise PenaNotFoundError()
        if self.should_raise_access_denied:
            raise PenaNotManagedByAdminError()
        if self.should_raise_season_not_found:
            raise SeasonNotFoundError()
        if self.should_raise_match_not_found:
            raise MatchNotFoundError()
        if self.should_raise_match_clock_not_running:
            raise MatchClockNotRunningError()
        if self.should_raise_match_report_closed:
            raise MatchReportClosedError()
        if self.should_raise_invalid_match_data:
            raise InvalidMatchDataError()
        self.last_payload = kwargs
        return self._detail()

    def create_match_event_for_admin(self, **kwargs) -> MatchDetailResult:
        if self.should_raise_pena_not_found:
            raise PenaNotFoundError()
        if self.should_raise_access_denied:
            raise PenaNotManagedByAdminError()
        if self.should_raise_season_not_found:
            raise SeasonNotFoundError()
        if self.should_raise_match_not_found:
            raise MatchNotFoundError()
        if self.should_raise_match_clock_not_running:
            raise MatchClockNotRunningError()
        if self.should_raise_event_player_not_in_match:
            raise MatchEventPlayerNotInMatchError()
        if self.should_raise_match_report_closed:
            raise MatchReportClosedError()
        if self.should_raise_invalid_match_data:
            raise InvalidMatchDataError()
        self.last_payload = kwargs
        return self._detail()

    def delete_match_event_for_admin(self, **kwargs) -> MatchDetailResult:
        if self.should_raise_pena_not_found:
            raise PenaNotFoundError()
        if self.should_raise_access_denied:
            raise PenaNotManagedByAdminError()
        if self.should_raise_season_not_found:
            raise SeasonNotFoundError()
        if self.should_raise_match_not_found:
            raise MatchNotFoundError()
        if self.should_raise_event_not_found:
            raise MatchEventNotFoundError()
        if self.should_raise_match_report_closed:
            raise MatchReportClosedError()
        if self.should_raise_invalid_match_data:
            raise InvalidMatchDataError()
        self.last_payload = kwargs
        return self._detail()

    def delete_match_for_admin(self, **kwargs) -> None:
        if self.should_raise_pena_not_found:
            raise PenaNotFoundError()
        if self.should_raise_access_denied:
            raise PenaNotManagedByAdminError()
        if self.should_raise_season_not_found:
            raise SeasonNotFoundError()
        if self.should_raise_match_not_found:
            raise MatchNotFoundError()
        if self.should_raise_invalid_match_data:
            raise InvalidMatchDataError()
        self.last_payload = kwargs

    def list_season_matches(
        self, *, pena_guid: str, season_guid: str, page: int, page_size: int
    ) -> MatchesPageResult:
        if self.should_raise_pena_not_found:
            raise PenaNotFoundError()
        if self.should_raise_season_not_found:
            raise SeasonNotFoundError()
        self.last_payload = {
            "pena_guid": pena_guid,
            "season_guid": season_guid,
            "page": page,
            "page_size": page_size,
        }
        return MatchesPageResult(items=[self._summary()], page=page, page_size=page_size, total=1)

    def get_match_detail(self, *, pena_guid: str, season_guid: str, match_guid: str):
        if self.should_raise_pena_not_found:
            raise PenaNotFoundError()
        if self.should_raise_season_not_found:
            raise SeasonNotFoundError()
        if self.should_raise_match_not_found:
            raise MatchNotFoundError()
        self.last_payload = {
            "pena_guid": pena_guid,
            "season_guid": season_guid,
            "match_guid": match_guid,
        }
        return self._detail()


def _match_create() -> SeasonMatchCreate:
    return SeasonMatchCreate(
        home_player_guid="home-player-guid",
        away_player_guid="away-player-guid",
        match_date=date(2024, 3, 1),
    )


def _detailed() -> SeasonMatchCreateDetailed:
    return SeasonMatchCreateDetailed(
        match_date=date(2024, 3, 1),
        home_team=SeasonMatchTeamCreate(team_name="Home", player_guids=["home-player-guid"]),
        away_team=SeasonMatchTeamCreate(team_name="Away", player_guids=["away-player-guid"]),
    )


def _event() -> SeasonMatchEventCreate:
    return SeasonMatchEventCreate(
        event_type="goal",
        team_side="home",
        player_guid="home-player-guid",
        related_player_guid=None,
        note=None,
        elapsed_seconds=60,
        value_delta=1,
    )


def _stats() -> SeasonMatchStatsUpdate:
    return SeasonMatchStatsUpdate(
        home_players=[
            SeasonMatchPlayerStatsUpdate(
                player_guid="home-player-guid", goals=2, assists=1, saves=0, rating=7.5
            )
        ],
        away_players=[
            SeasonMatchPlayerStatsUpdate(
                player_guid="away-player-guid", goals=1, assists=0, saves=0, rating=7.0
            )
        ],
    )


# ---- validation-before-repository ----


def test_create_match_rejects_same_player():
    with pytest.raises(SeasonMatchInvalidPlayersError):
        CreateSeasonMatchHandler(_FakeRepo()).handle(
            CreateSeasonMatchCommand(
                pena_guid="pena-guid",
                season_guid="season-guid",
                admin_id=9,
                data=SeasonMatchCreate(
                    home_player_guid="same",
                    away_player_guid="same",
                    match_date=date(2024, 3, 1),
                ),
            )
        )


def test_update_result_rejects_negative_score():
    with pytest.raises(InvalidSeasonPlayerUpdateDataError):
        UpdateSeasonMatchResultHandler(_FakeRepo()).handle(
            UpdateSeasonMatchResultCommand(
                pena_guid="pena-guid",
                season_guid="season-guid",
                match_guid="match-guid",
                admin_id=9,
                update=SeasonMatchResultUpdate(
                    home_score=-1, away_score=0, standings_policy=StandingsUpdatePolicy.APPLY
                ),
            )
        )


def test_update_match_rejects_empty_update():
    with pytest.raises(InvalidSeasonMatchDataError):
        UpdateSeasonMatchHandler(_FakeRepo()).handle(
            UpdateSeasonMatchCommand(
                pena_guid="pena-guid",
                season_guid="season-guid",
                match_guid="match-guid",
                admin_id=9,
                update=SeasonMatchUpdate(),
            )
        )


def test_set_goalkeeper_rotation_forwards_interval_to_repository():
    repo = _FakeRepo()
    handler = SetSeasonMatchGoalkeeperRotationHandler(repo)

    handler.handle(
        SetSeasonMatchGoalkeeperRotationCommand(
            pena_guid="pena-guid",
            season_guid="season-guid",
            match_guid="match-guid",
            admin_id=9,
            rotation_seconds=300,
        )
    )

    assert repo.last_payload["rotation_seconds"] == 300


@pytest.mark.parametrize("rotation_seconds", [-1, 7201])
def test_set_goalkeeper_rotation_rejects_out_of_range_interval(rotation_seconds):
    repo = _FakeRepo()
    with pytest.raises(InvalidSeasonMatchDataError):
        SetSeasonMatchGoalkeeperRotationHandler(repo).handle(
            SetSeasonMatchGoalkeeperRotationCommand(
                pena_guid="pena-guid",
                season_guid="season-guid",
                match_guid="match-guid",
                admin_id=9,
                rotation_seconds=rotation_seconds,
            )
        )
    # Validation happens before the repository is touched.
    assert repo.last_payload is None


@pytest.mark.parametrize(
    "update",
    [
        SeasonMatchUpdate(home_team_name=FieldUpdate.set("   ")),
        SeasonMatchUpdate(away_team_name=FieldUpdate.set("   ")),
        SeasonMatchUpdate(match_date=FieldUpdate.set(None)),
    ],
)
def test_update_match_rejects_invalid_field_values(update):
    with pytest.raises(InvalidSeasonMatchDataError):
        UpdateSeasonMatchHandler(_FakeRepo()).handle(
            UpdateSeasonMatchCommand(
                pena_guid="pena-guid",
                season_guid="season-guid",
                match_guid="match-guid",
                admin_id=9,
                update=update,
            )
        )


def test_create_with_lineups_rejects_shared_players():
    with pytest.raises(SeasonMatchInvalidPlayersError):
        CreateSeasonMatchWithLineupsHandler(_FakeRepo()).handle(
            CreateSeasonMatchWithLineupsCommand(
                pena_guid="pena-guid",
                season_guid="season-guid",
                admin_id=9,
                data=SeasonMatchCreateDetailed(
                    match_date=date(2024, 3, 1),
                    home_team=SeasonMatchTeamCreate(team_name="Home", player_guids=["shared"]),
                    away_team=SeasonMatchTeamCreate(team_name="Away", player_guids=["shared"]),
                ),
            )
        )


def test_update_lineups_rejects_shared_players():
    with pytest.raises(SeasonMatchInvalidPlayersError):
        UpdateSeasonMatchLineupsHandler(_FakeRepo()).handle(
            UpdateSeasonMatchLineupsCommand(
                pena_guid="pena-guid",
                season_guid="season-guid",
                match_guid="match-guid",
                admin_id=9,
                update=SeasonMatchLineupsUpdate(
                    home_player_guids=["shared"], away_player_guids=["shared"]
                ),
            )
        )


# ---- command dispatch helper ----

_PENA, _SEASON, _MATCH = "pena-guid", "season-guid", "match-guid"


def _run(kind: str, repo: _FakeRepo):
    if kind == "create":
        return CreateSeasonMatchHandler(repo).handle(
            CreateSeasonMatchCommand(
                pena_guid=_PENA, season_guid=_SEASON, admin_id=9, data=_match_create()
            )
        )
    if kind == "result":
        return UpdateSeasonMatchResultHandler(repo).handle(
            UpdateSeasonMatchResultCommand(
                pena_guid=_PENA,
                season_guid=_SEASON,
                match_guid=_MATCH,
                admin_id=9,
                update=SeasonMatchResultUpdate(
                    home_score=2, away_score=1, standings_policy=StandingsUpdatePolicy.APPLY
                ),
            )
        )
    if kind == "with_lineups":
        return CreateSeasonMatchWithLineupsHandler(repo).handle(
            CreateSeasonMatchWithLineupsCommand(
                pena_guid=_PENA, season_guid=_SEASON, admin_id=9, data=_detailed()
            )
        )
    if kind == "stats":
        return UpdateSeasonMatchStatsHandler(repo).handle(
            UpdateSeasonMatchStatsCommand(
                pena_guid=_PENA, season_guid=_SEASON, match_guid=_MATCH, admin_id=9, update=_stats()
            )
        )
    if kind == "update":
        return UpdateSeasonMatchHandler(repo).handle(
            UpdateSeasonMatchCommand(
                pena_guid=_PENA,
                season_guid=_SEASON,
                match_guid=_MATCH,
                admin_id=9,
                update=SeasonMatchUpdate(
                    home_team_name=FieldUpdate.set("Reds"),
                    away_team_name=FieldUpdate.keep(),
                    match_date=FieldUpdate.keep(),
                ),
            )
        )
    if kind == "start":
        return StartSeasonMatchHandler(repo).handle(
            StartSeasonMatchCommand(
                pena_guid=_PENA, season_guid=_SEASON, match_guid=_MATCH, admin_id=9
            )
        )
    if kind == "stop":
        return StopSeasonMatchHandler(repo).handle(
            StopSeasonMatchCommand(
                pena_guid=_PENA, season_guid=_SEASON, match_guid=_MATCH, admin_id=9
            )
        )
    if kind == "event":
        return CreateSeasonMatchEventHandler(repo).handle(
            CreateSeasonMatchEventCommand(
                pena_guid=_PENA, season_guid=_SEASON, match_guid=_MATCH, admin_id=9, data=_event()
            )
        )
    if kind == "delete_event":
        return DeleteSeasonMatchEventHandler(repo).handle(
            DeleteSeasonMatchEventCommand(
                pena_guid=_PENA,
                season_guid=_SEASON,
                match_guid=_MATCH,
                event_guid="event-guid",
                admin_id=9,
            )
        )
    if kind == "lineups":
        return UpdateSeasonMatchLineupsHandler(repo).handle(
            UpdateSeasonMatchLineupsCommand(
                pena_guid=_PENA,
                season_guid=_SEASON,
                match_guid=_MATCH,
                admin_id=9,
                update=SeasonMatchLineupsUpdate(
                    home_player_guids=["home-player-guid"],
                    away_player_guids=["away-player-guid"],
                ),
            )
        )
    if kind == "delete":
        return DeleteSeasonMatchHandler(repo).handle(
            DeleteSeasonMatchCommand(
                pena_guid=_PENA, season_guid=_SEASON, match_guid=_MATCH, admin_id=9
            )
        )
    raise AssertionError(f"Unknown kind: {kind}")


_ALL_KINDS = [
    "create",
    "result",
    "with_lineups",
    "stats",
    "update",
    "start",
    "stop",
    "event",
    "delete_event",
    "lineups",
    "delete",
]


# ---- error translation (every except->domain branch per handler) ----

_ERROR_CASES = [
    # create_match_for_admin
    ("create", "should_raise_pena_not_found", PenaSeasonPenaNotFoundError),
    ("create", "should_raise_access_denied", PenaSeasonAccessDeniedError),
    ("create", "should_raise_season_not_found", PenaSeasonNotFoundError),
    ("create", "should_raise_same_player_match", SeasonMatchInvalidPlayersError),
    ("create", "should_raise_match_players_not_in_season", SeasonMatchPlayersNotInSeasonError),
    ("create", "should_raise_player_not_found", SeasonPlayerNotFoundError),
    # update_match_result_for_admin
    ("result", "should_raise_pena_not_found", PenaSeasonPenaNotFoundError),
    ("result", "should_raise_access_denied", PenaSeasonAccessDeniedError),
    ("result", "should_raise_season_not_found", PenaSeasonNotFoundError),
    ("result", "should_raise_match_not_found", SeasonMatchNotFoundError),
    ("result", "should_raise_invalid_stats", InvalidSeasonPlayerUpdateDataError),
    ("result", "should_raise_invalid_match_data", InvalidSeasonMatchDataError),
    # create_match_with_lineups_for_admin
    ("with_lineups", "should_raise_pena_not_found", PenaSeasonPenaNotFoundError),
    ("with_lineups", "should_raise_access_denied", PenaSeasonAccessDeniedError),
    ("with_lineups", "should_raise_season_not_found", PenaSeasonNotFoundError),
    ("with_lineups", "should_raise_same_player_match", SeasonMatchInvalidPlayersError),
    (
        "with_lineups",
        "should_raise_match_players_not_in_season",
        SeasonMatchPlayersNotInSeasonError,
    ),
    ("with_lineups", "should_raise_player_not_found", SeasonPlayerNotFoundError),
    ("with_lineups", "should_raise_invalid_match_data", InvalidSeasonMatchDataError),
    # update_match_stats_for_admin
    ("stats", "should_raise_pena_not_found", PenaSeasonPenaNotFoundError),
    ("stats", "should_raise_access_denied", PenaSeasonAccessDeniedError),
    ("stats", "should_raise_season_not_found", PenaSeasonNotFoundError),
    ("stats", "should_raise_match_not_found", SeasonMatchNotFoundError),
    ("stats", "should_raise_match_stats_mismatch", SeasonMatchStatsMismatchError),
    ("stats", "should_raise_invalid_match_data", InvalidSeasonMatchDataError),
    ("stats", "should_raise_invalid_stats", InvalidSeasonMatchDataError),
    # update_match_for_admin
    ("update", "should_raise_pena_not_found", PenaSeasonPenaNotFoundError),
    ("update", "should_raise_access_denied", PenaSeasonAccessDeniedError),
    ("update", "should_raise_season_not_found", PenaSeasonNotFoundError),
    ("update", "should_raise_match_not_found", SeasonMatchNotFoundError),
    ("update", "should_raise_invalid_match_data", InvalidSeasonMatchDataError),
    # start_match_for_admin
    ("start", "should_raise_pena_not_found", PenaSeasonPenaNotFoundError),
    ("start", "should_raise_access_denied", PenaSeasonAccessDeniedError),
    ("start", "should_raise_season_not_found", PenaSeasonNotFoundError),
    ("start", "should_raise_match_not_found", SeasonMatchNotFoundError),
    ("start", "should_raise_match_already_started", SeasonMatchAlreadyStartedError),
    ("start", "should_raise_match_report_closed", SeasonMatchReportClosedError),
    ("start", "should_raise_invalid_match_data", InvalidSeasonMatchDataError),
    # stop_match_for_admin
    ("stop", "should_raise_pena_not_found", PenaSeasonPenaNotFoundError),
    ("stop", "should_raise_access_denied", PenaSeasonAccessDeniedError),
    ("stop", "should_raise_season_not_found", PenaSeasonNotFoundError),
    ("stop", "should_raise_match_not_found", SeasonMatchNotFoundError),
    ("stop", "should_raise_match_clock_not_running", SeasonMatchClockNotRunningError),
    ("stop", "should_raise_invalid_match_data", InvalidSeasonMatchDataError),
    # create_match_event_for_admin
    ("event", "should_raise_pena_not_found", PenaSeasonPenaNotFoundError),
    ("event", "should_raise_access_denied", PenaSeasonAccessDeniedError),
    ("event", "should_raise_season_not_found", PenaSeasonNotFoundError),
    ("event", "should_raise_match_not_found", SeasonMatchNotFoundError),
    ("event", "should_raise_event_player_not_in_match", SeasonMatchEventPlayerNotInMatchError),
    ("event", "should_raise_match_clock_not_running", SeasonMatchClockNotRunningError),
    ("event", "should_raise_match_report_closed", SeasonMatchReportClosedError),
    ("event", "should_raise_invalid_match_data", InvalidSeasonMatchDataError),
    # delete_match_event_for_admin
    ("delete_event", "should_raise_pena_not_found", PenaSeasonPenaNotFoundError),
    ("delete_event", "should_raise_access_denied", PenaSeasonAccessDeniedError),
    ("delete_event", "should_raise_season_not_found", PenaSeasonNotFoundError),
    ("delete_event", "should_raise_match_not_found", SeasonMatchNotFoundError),
    ("delete_event", "should_raise_event_not_found", SeasonMatchEventNotFoundError),
    ("delete_event", "should_raise_match_report_closed", SeasonMatchReportClosedError),
    ("delete_event", "should_raise_invalid_match_data", InvalidSeasonMatchDataError),
    # update_match_lineups_for_admin
    ("lineups", "should_raise_pena_not_found", PenaSeasonPenaNotFoundError),
    ("lineups", "should_raise_access_denied", PenaSeasonAccessDeniedError),
    ("lineups", "should_raise_season_not_found", PenaSeasonNotFoundError),
    ("lineups", "should_raise_match_not_found", SeasonMatchNotFoundError),
    ("lineups", "should_raise_match_lineup_locked", SeasonMatchLineupLockedError),
    ("lineups", "should_raise_same_player_match", SeasonMatchInvalidPlayersError),
    ("lineups", "should_raise_match_players_not_in_season", SeasonMatchPlayersNotInSeasonError),
    ("lineups", "should_raise_player_not_found", SeasonPlayerNotFoundError),
    ("lineups", "should_raise_invalid_match_data", InvalidSeasonMatchDataError),
    # delete_match_for_admin
    ("delete", "should_raise_pena_not_found", PenaSeasonPenaNotFoundError),
    ("delete", "should_raise_access_denied", PenaSeasonAccessDeniedError),
    ("delete", "should_raise_season_not_found", PenaSeasonNotFoundError),
    ("delete", "should_raise_match_not_found", SeasonMatchNotFoundError),
    ("delete", "should_raise_invalid_match_data", InvalidSeasonMatchDataError),
]


@pytest.mark.parametrize(
    ("kind", "flag", "expected_error"),
    _ERROR_CASES,
    ids=[f"{k}-{f}" for k, f, _ in _ERROR_CASES],
)
def test_command_handlers_map_repository_errors(kind, flag, expected_error):
    with pytest.raises(expected_error):
        _run(kind, _FakeRepo(**{flag: True}))


@pytest.mark.parametrize("kind", _ALL_KINDS)
def test_command_handlers_succeed_on_happy_path(kind):
    result = _run(kind, _FakeRepo())
    if kind == "delete":
        assert result is None
    else:
        assert result.guid == "match-guid"


# ---- focused happy-path assertions (payload forwarding / normalization) ----


def test_create_match_forwards_payload():
    repo = _FakeRepo()
    _run("create", repo)
    assert repo.last_payload == {
        "pena_guid": "pena-guid",
        "season_guid": "season-guid",
        "admin_id": 9,
        "home_player_guid": "home-player-guid",
        "away_player_guid": "away-player-guid",
        "match_date": date(2024, 3, 1),
    }


def test_update_match_normalizes_and_forwards_names():
    repo = _FakeRepo()
    UpdateSeasonMatchHandler(repo).handle(
        UpdateSeasonMatchCommand(
            pena_guid="pena-guid",
            season_guid="season-guid",
            match_guid="match-guid",
            admin_id=9,
            update=SeasonMatchUpdate(
                home_team_name=FieldUpdate.set(" Reds "),
                away_team_name=FieldUpdate.keep(),
                match_date=FieldUpdate.keep(),
            ),
        )
    )
    assert repo.last_payload["home_team_name"] == FieldUpdate.set("Reds")
    assert repo.last_payload["away_team_name"] == FieldUpdate.keep()


def test_delete_match_forwards_payload():
    repo = _FakeRepo()
    _run("delete", repo)
    assert repo.last_payload == {
        "pena_guid": "pena-guid",
        "season_guid": "season-guid",
        "match_guid": "match-guid",
        "admin_id": 9,
    }


# ---- queries ----


def test_list_matches_returns_page_and_forwards_payload():
    repo = _FakeRepo()
    page = ListSeasonMatchesHandler(repo).handle(
        ListSeasonMatchesQuery(
            pena_guid="pena-guid", season_guid="season-guid", page=2, page_size=5
        )
    )
    assert page.total == 1
    assert repo.last_payload == {
        "pena_guid": "pena-guid",
        "season_guid": "season-guid",
        "page": 2,
        "page_size": 5,
    }


@pytest.mark.parametrize(
    ("repo", "expected_error"),
    [
        (_FakeRepo(should_raise_pena_not_found=True), PenaSeasonPenaNotFoundError),
        (_FakeRepo(should_raise_season_not_found=True), PenaSeasonNotFoundError),
    ],
)
def test_list_matches_maps_not_found(repo, expected_error):
    with pytest.raises(expected_error):
        ListSeasonMatchesHandler(repo).handle(
            ListSeasonMatchesQuery(pena_guid="pena-guid", season_guid="season-guid")
        )


def test_get_match_detail_returns_detail():
    repo = _FakeRepo()
    detail = GetSeasonMatchDetailHandler(repo).handle(
        GetSeasonMatchDetailQuery(
            pena_guid="pena-guid", season_guid="season-guid", match_guid="match-guid"
        )
    )
    assert detail.guid == "match-guid"


@pytest.mark.parametrize(
    ("repo", "expected_error"),
    [
        (_FakeRepo(should_raise_pena_not_found=True), PenaSeasonPenaNotFoundError),
        (_FakeRepo(should_raise_season_not_found=True), PenaSeasonNotFoundError),
        (_FakeRepo(should_raise_match_not_found=True), SeasonMatchNotFoundError),
    ],
)
def test_get_match_detail_maps_errors(repo, expected_error):
    with pytest.raises(expected_error):
        GetSeasonMatchDetailHandler(repo).handle(
            GetSeasonMatchDetailQuery(
                pena_guid="pena-guid", season_guid="season-guid", match_guid="match-guid"
            )
        )
