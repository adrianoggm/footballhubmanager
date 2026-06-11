from dataclasses import dataclass
from datetime import date

import pytest
from core.application.commands.season_match_command_handlers import (
    CreateSeasonMatchEventHandler,
    CreateSeasonMatchHandler,
    CreateSeasonMatchWithLineupsHandler,
    DeleteSeasonMatchEventHandler,
    DeleteSeasonMatchHandler,
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


# ---- error translation ----


@pytest.mark.parametrize(
    ("repo", "expected_error"),
    [
        (_FakeRepo(should_raise_pena_not_found=True), PenaSeasonPenaNotFoundError),
        (_FakeRepo(should_raise_access_denied=True), PenaSeasonAccessDeniedError),
        (_FakeRepo(should_raise_season_not_found=True), PenaSeasonNotFoundError),
        (_FakeRepo(should_raise_same_player_match=True), SeasonMatchInvalidPlayersError),
        (
            _FakeRepo(should_raise_match_players_not_in_season=True),
            SeasonMatchPlayersNotInSeasonError,
        ),
        (_FakeRepo(should_raise_player_not_found=True), SeasonPlayerNotFoundError),
    ],
)
def test_create_match_maps_repository_errors(repo, expected_error):
    with pytest.raises(expected_error):
        CreateSeasonMatchHandler(repo).handle(
            CreateSeasonMatchCommand(
                pena_guid="pena-guid", season_guid="season-guid", admin_id=9, data=_match_create()
            )
        )


def test_create_match_returns_info_and_forwards_payload():
    repo = _FakeRepo()
    result = CreateSeasonMatchHandler(repo).handle(
        CreateSeasonMatchCommand(
            pena_guid="pena-guid", season_guid="season-guid", admin_id=9, data=_match_create()
        )
    )
    assert result.guid == "match-guid"
    assert repo.last_payload == {
        "pena_guid": "pena-guid",
        "season_guid": "season-guid",
        "admin_id": 9,
        "home_player_guid": "home-player-guid",
        "away_player_guid": "away-player-guid",
        "match_date": date(2024, 3, 1),
    }


@pytest.mark.parametrize(
    ("repo", "expected_error"),
    [
        (_FakeRepo(should_raise_match_not_found=True), SeasonMatchNotFoundError),
        (_FakeRepo(should_raise_invalid_stats=True), InvalidSeasonPlayerUpdateDataError),
        (_FakeRepo(should_raise_invalid_match_data=True), InvalidSeasonMatchDataError),
    ],
)
def test_update_result_maps_repository_errors(repo, expected_error):
    with pytest.raises(expected_error):
        UpdateSeasonMatchResultHandler(repo).handle(
            UpdateSeasonMatchResultCommand(
                pena_guid="pena-guid",
                season_guid="season-guid",
                match_guid="match-guid",
                admin_id=9,
                update=SeasonMatchResultUpdate(
                    home_score=2, away_score=1, standings_policy=StandingsUpdatePolicy.APPLY
                ),
            )
        )


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


@pytest.mark.parametrize(
    ("repo", "expected_error"),
    [
        (_FakeRepo(should_raise_match_stats_mismatch=True), SeasonMatchStatsMismatchError),
        (_FakeRepo(should_raise_invalid_match_data=True), InvalidSeasonMatchDataError),
        (_FakeRepo(should_raise_invalid_stats=True), InvalidSeasonMatchDataError),
    ],
)
def test_update_stats_maps_repository_errors(repo, expected_error):
    with pytest.raises(expected_error):
        UpdateSeasonMatchStatsHandler(repo).handle(
            UpdateSeasonMatchStatsCommand(
                pena_guid="pena-guid",
                season_guid="season-guid",
                match_guid="match-guid",
                admin_id=9,
                update=_stats(),
            )
        )


@pytest.mark.parametrize(
    ("repo", "expected_error"),
    [
        (_FakeRepo(should_raise_match_already_started=True), SeasonMatchAlreadyStartedError),
        (_FakeRepo(should_raise_match_report_closed=True), SeasonMatchReportClosedError),
        (_FakeRepo(should_raise_match_not_found=True), SeasonMatchNotFoundError),
    ],
)
def test_start_match_maps_repository_errors(repo, expected_error):
    with pytest.raises(expected_error):
        StartSeasonMatchHandler(repo).handle(
            StartSeasonMatchCommand(
                pena_guid="pena-guid",
                season_guid="season-guid",
                match_guid="match-guid",
                admin_id=9,
            )
        )


def test_stop_match_maps_clock_not_running():
    with pytest.raises(SeasonMatchClockNotRunningError):
        StopSeasonMatchHandler(_FakeRepo(should_raise_match_clock_not_running=True)).handle(
            StopSeasonMatchCommand(
                pena_guid="pena-guid",
                season_guid="season-guid",
                match_guid="match-guid",
                admin_id=9,
            )
        )


@pytest.mark.parametrize(
    ("repo", "expected_error"),
    [
        (
            _FakeRepo(should_raise_event_player_not_in_match=True),
            SeasonMatchEventPlayerNotInMatchError,
        ),
        (_FakeRepo(should_raise_match_clock_not_running=True), SeasonMatchClockNotRunningError),
        (_FakeRepo(should_raise_match_report_closed=True), SeasonMatchReportClosedError),
    ],
)
def test_create_event_maps_repository_errors(repo, expected_error):
    with pytest.raises(expected_error):
        CreateSeasonMatchEventHandler(repo).handle(
            CreateSeasonMatchEventCommand(
                pena_guid="pena-guid",
                season_guid="season-guid",
                match_guid="match-guid",
                admin_id=9,
                data=_event(),
            )
        )


def test_delete_event_maps_event_not_found():
    with pytest.raises(SeasonMatchEventNotFoundError):
        DeleteSeasonMatchEventHandler(_FakeRepo(should_raise_event_not_found=True)).handle(
            DeleteSeasonMatchEventCommand(
                pena_guid="pena-guid",
                season_guid="season-guid",
                match_guid="match-guid",
                event_guid="event-guid",
                admin_id=9,
            )
        )


def test_update_lineups_maps_lineup_locked():
    with pytest.raises(SeasonMatchLineupLockedError):
        UpdateSeasonMatchLineupsHandler(_FakeRepo(should_raise_match_lineup_locked=True)).handle(
            UpdateSeasonMatchLineupsCommand(
                pena_guid="pena-guid",
                season_guid="season-guid",
                match_guid="match-guid",
                admin_id=9,
                update=SeasonMatchLineupsUpdate(
                    home_player_guids=["home-player-guid"],
                    away_player_guids=["away-player-guid"],
                ),
            )
        )


def test_delete_match_maps_not_found_and_forwards_payload():
    with pytest.raises(SeasonMatchNotFoundError):
        DeleteSeasonMatchHandler(_FakeRepo(should_raise_match_not_found=True)).handle(
            DeleteSeasonMatchCommand(
                pena_guid="pena-guid",
                season_guid="season-guid",
                match_guid="match-guid",
                admin_id=9,
            )
        )

    repo = _FakeRepo()
    DeleteSeasonMatchHandler(repo).handle(
        DeleteSeasonMatchCommand(
            pena_guid="pena-guid", season_guid="season-guid", match_guid="match-guid", admin_id=9
        )
    )
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


def test_get_match_detail_maps_match_not_found():
    with pytest.raises(SeasonMatchNotFoundError):
        GetSeasonMatchDetailHandler(_FakeRepo(should_raise_match_not_found=True)).handle(
            GetSeasonMatchDetailQuery(
                pena_guid="pena-guid", season_guid="season-guid", match_guid="match-guid"
            )
        )
