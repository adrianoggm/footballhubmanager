from dataclasses import dataclass
from datetime import date

import pytest
from persistence.application.ports.season_competition_port import (
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
from persistence.application.ports.season_competition_port import (
    MatchPlayersNotInSeasonError as RepositoryMatchPlayersNotInSeasonError,
)
from persistence.application.update_policies import FieldUpdate, StandingsUpdatePolicy
from persistence.application.use_cases.manage_season_matches_usecase import (
    InvalidSeasonMatchDataError,
    InvalidSeasonPlayerUpdateDataError,
    ManageSeasonMatchesUseCase,
    PenaSeasonAccessDeniedError,
    PenaSeasonNotFoundError,
    PenaSeasonPenaNotFoundError,
    SeasonMatchAlreadyStartedError,
    SeasonMatchClockNotRunningError,
    SeasonMatchCreate,
    SeasonMatchCreateDetailed,
    SeasonMatchEventCreate,
    SeasonMatchEventNotFoundError,
    SeasonMatchEventPlayerNotInMatchError,
    SeasonMatchInvalidPlayersError,
    SeasonMatchLineupLockedError,
    SeasonMatchLineupsUpdate,
    SeasonMatchNotFoundError,
    SeasonMatchPlayersNotInSeasonError,
    SeasonMatchReportClosedError,
    SeasonMatchResultUpdate,
    SeasonMatchStatsMismatchError,
    SeasonMatchStatsUpdate,
    SeasonMatchUpdate,
    SeasonPlayerNotFoundError,
)
from persistence.application.use_cases.season_competition_models import (
    SeasonMatchPlayerStatsUpdate,
    SeasonMatchTeamCreate,
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
        return MatchesPageResult(
            items=[self._summary()],
            page=page,
            page_size=page_size,
            total=1,
        )

    def get_match_detail(
        self,
        *,
        pena_guid: str,
        season_guid: str,
        match_guid: str,
    ) -> MatchDetailResult:
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


def test_create_match_rejects_same_player_before_repository():
    with pytest.raises(SeasonMatchInvalidPlayersError):
        ManageSeasonMatchesUseCase(_FakeRepo()).create_match_for_admin(
            pena_guid="pena-guid",
            season_guid="season-guid",
            admin_id=9,
            data=SeasonMatchCreate(
                home_player_guid="player-guid",
                away_player_guid="player-guid",
                match_date=date(2024, 4, 1),
            ),
        )


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
        ManageSeasonMatchesUseCase(repo).create_match_for_admin(
            pena_guid="pena-guid",
            season_guid="season-guid",
            admin_id=9,
            data=SeasonMatchCreate(
                home_player_guid="home-player-guid",
                away_player_guid="away-player-guid",
                match_date=date(2024, 4, 1),
            ),
        )


def test_create_match_returns_match_info():
    repo = _FakeRepo()

    result = ManageSeasonMatchesUseCase(repo).create_match_for_admin(
        pena_guid="pena-guid",
        season_guid="season-guid",
        admin_id=9,
        data=SeasonMatchCreate(
            home_player_guid="home-player-guid",
            away_player_guid="away-player-guid",
            match_date=date(2024, 4, 1),
        ),
    )

    assert result.guid == "match-guid"
    assert repo.last_payload["home_player_guid"] == "home-player-guid"
    assert repo.last_payload["away_player_guid"] == "away-player-guid"


def test_update_match_result_rejects_negative_scores():
    with pytest.raises(InvalidSeasonPlayerUpdateDataError):
        ManageSeasonMatchesUseCase(_FakeRepo()).update_match_result_for_admin(
            pena_guid="pena-guid",
            season_guid="season-guid",
            match_guid="match-guid",
            admin_id=9,
            update=SeasonMatchResultUpdate(home_score=-1, away_score=0),
        )


@pytest.mark.parametrize(
    ("repo", "expected_error"),
    [
        (_FakeRepo(should_raise_pena_not_found=True), PenaSeasonPenaNotFoundError),
        (_FakeRepo(should_raise_access_denied=True), PenaSeasonAccessDeniedError),
        (_FakeRepo(should_raise_season_not_found=True), PenaSeasonNotFoundError),
        (_FakeRepo(should_raise_match_not_found=True), SeasonMatchNotFoundError),
        (_FakeRepo(should_raise_invalid_stats=True), InvalidSeasonPlayerUpdateDataError),
        (_FakeRepo(should_raise_invalid_match_data=True), InvalidSeasonMatchDataError),
    ],
)
def test_update_match_result_maps_repository_errors(repo, expected_error):
    with pytest.raises(expected_error):
        ManageSeasonMatchesUseCase(repo).update_match_result_for_admin(
            pena_guid="pena-guid",
            season_guid="season-guid",
            match_guid="match-guid",
            admin_id=9,
            update=SeasonMatchResultUpdate(
                home_score=2,
                away_score=1,
                standings_policy=StandingsUpdatePolicy.SKIP,
            ),
        )


def test_update_match_result_forwards_payload():
    repo = _FakeRepo()

    result = ManageSeasonMatchesUseCase(repo).update_match_result_for_admin(
        pena_guid="pena-guid",
        season_guid="season-guid",
        match_guid="match-guid",
        admin_id=9,
        update=SeasonMatchResultUpdate(
            home_score=2,
            away_score=1,
            standings_policy=StandingsUpdatePolicy.SKIP,
        ),
    )

    assert result.home_score == 2
    assert repo.last_payload["standings_policy"] is StandingsUpdatePolicy.SKIP


@pytest.mark.parametrize(
    "data",
    [
        SeasonMatchCreateDetailed(
            match_date=date(2024, 4, 1),
            home_team=SeasonMatchTeamCreate(player_guids=[]),
            away_team=SeasonMatchTeamCreate(player_guids=["away-player-guid"]),
        ),
        SeasonMatchCreateDetailed(
            match_date=date(2024, 4, 1),
            home_team=SeasonMatchTeamCreate(player_guids=["home-player-guid", "home-player-guid"]),
            away_team=SeasonMatchTeamCreate(player_guids=["away-player-guid"]),
        ),
    ],
)
def test_create_match_with_lineups_rejects_invalid_team_lineups(data):
    with pytest.raises((InvalidSeasonMatchDataError, SeasonMatchInvalidPlayersError)):
        ManageSeasonMatchesUseCase(_FakeRepo()).create_match_with_lineups_for_admin(
            pena_guid="pena-guid",
            season_guid="season-guid",
            admin_id=9,
            data=data,
        )


def test_create_match_with_lineups_rejects_overlap_across_teams():
    with pytest.raises(SeasonMatchInvalidPlayersError):
        ManageSeasonMatchesUseCase(_FakeRepo()).create_match_with_lineups_for_admin(
            pena_guid="pena-guid",
            season_guid="season-guid",
            admin_id=9,
            data=SeasonMatchCreateDetailed(
                match_date=date(2024, 4, 1),
                home_team=SeasonMatchTeamCreate(player_guids=["shared-player-guid"]),
                away_team=SeasonMatchTeamCreate(player_guids=["shared-player-guid"]),
            ),
        )


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
        (_FakeRepo(should_raise_invalid_match_data=True), InvalidSeasonMatchDataError),
    ],
)
def test_create_match_with_lineups_maps_repository_errors(repo, expected_error):
    with pytest.raises(expected_error):
        ManageSeasonMatchesUseCase(repo).create_match_with_lineups_for_admin(
            pena_guid="pena-guid",
            season_guid="season-guid",
            admin_id=9,
            data=SeasonMatchCreateDetailed(
                match_date=date(2024, 4, 1),
                home_team=SeasonMatchTeamCreate(
                    team_name=" Home ",
                    player_guids=["home-player-guid"],
                ),
                away_team=SeasonMatchTeamCreate(
                    team_name=" Away ",
                    player_guids=["away-player-guid"],
                ),
            ),
        )


def test_create_match_with_lineups_normalizes_names():
    repo = _FakeRepo()

    result = ManageSeasonMatchesUseCase(repo).create_match_with_lineups_for_admin(
        pena_guid="pena-guid",
        season_guid="season-guid",
        admin_id=9,
        data=SeasonMatchCreateDetailed(
            match_date=date(2024, 4, 1),
            home_team=SeasonMatchTeamCreate(team_name=" Home ", player_guids=["home-player-guid"]),
            away_team=SeasonMatchTeamCreate(team_name=" ", player_guids=["away-player-guid"]),
        ),
    )

    assert result.guid == "match-guid"
    assert repo.last_payload["home_team_name"] == "Home"
    assert repo.last_payload["away_team_name"] is None


@pytest.mark.parametrize(
    "update",
    [
        SeasonMatchStatsUpdate(home_players=[], away_players=[]),
        SeasonMatchStatsUpdate(
            home_players=[SeasonMatchPlayerStatsUpdate(player_guid=" ", goals=0)],
            away_players=[SeasonMatchPlayerStatsUpdate(player_guid="away-player-guid")],
        ),
        SeasonMatchStatsUpdate(
            home_players=[
                SeasonMatchPlayerStatsUpdate(player_guid="home-player-guid"),
                SeasonMatchPlayerStatsUpdate(player_guid="home-player-guid"),
            ],
            away_players=[SeasonMatchPlayerStatsUpdate(player_guid="away-player-guid")],
        ),
        SeasonMatchStatsUpdate(
            home_players=[SeasonMatchPlayerStatsUpdate(player_guid="home-player-guid", goals=-1)],
            away_players=[SeasonMatchPlayerStatsUpdate(player_guid="away-player-guid")],
        ),
    ],
)
def test_update_match_stats_rejects_invalid_stats_payload(update):
    with pytest.raises(InvalidSeasonMatchDataError):
        ManageSeasonMatchesUseCase(_FakeRepo()).update_match_stats_for_admin(
            pena_guid="pena-guid",
            season_guid="season-guid",
            match_guid="match-guid",
            admin_id=9,
            update=update,
        )


@pytest.mark.parametrize(
    ("repo", "expected_error"),
    [
        (_FakeRepo(should_raise_pena_not_found=True), PenaSeasonPenaNotFoundError),
        (_FakeRepo(should_raise_access_denied=True), PenaSeasonAccessDeniedError),
        (_FakeRepo(should_raise_season_not_found=True), PenaSeasonNotFoundError),
        (_FakeRepo(should_raise_match_not_found=True), SeasonMatchNotFoundError),
        (_FakeRepo(should_raise_match_stats_mismatch=True), SeasonMatchStatsMismatchError),
        (_FakeRepo(should_raise_invalid_match_data=True), InvalidSeasonMatchDataError),
        (_FakeRepo(should_raise_invalid_stats=True), InvalidSeasonMatchDataError),
    ],
)
def test_update_match_stats_maps_repository_errors(repo, expected_error):
    with pytest.raises(expected_error):
        ManageSeasonMatchesUseCase(repo).update_match_stats_for_admin(
            pena_guid="pena-guid",
            season_guid="season-guid",
            match_guid="match-guid",
            admin_id=9,
            update=SeasonMatchStatsUpdate(
                home_players=[SeasonMatchPlayerStatsUpdate(player_guid="home-player-guid")],
                away_players=[SeasonMatchPlayerStatsUpdate(player_guid="away-player-guid")],
            ),
        )


def test_update_match_stats_normalizes_player_guids():
    repo = _FakeRepo()

    result = ManageSeasonMatchesUseCase(repo).update_match_stats_for_admin(
        pena_guid="pena-guid",
        season_guid="season-guid",
        match_guid="match-guid",
        admin_id=9,
        update=SeasonMatchStatsUpdate(
            home_players=[
                SeasonMatchPlayerStatsUpdate(
                    player_guid=" home-player-guid ",
                    rating=8.5,
                )
            ],
            away_players=[
                SeasonMatchPlayerStatsUpdate(
                    player_guid=" away-player-guid ",
                    assists=1,
                )
            ],
        ),
    )

    assert result.guid == "match-guid"
    assert repo.last_payload["home_players_stats"][0].player_guid == "home-player-guid"
    assert repo.last_payload["away_players_stats"][0].player_guid == "away-player-guid"


@pytest.mark.parametrize(
    "update",
    [
        SeasonMatchUpdate(),
        SeasonMatchUpdate(home_team_name=FieldUpdate.set("   ")),
        SeasonMatchUpdate(away_team_name=FieldUpdate.set("   ")),
        SeasonMatchUpdate(match_date=FieldUpdate.set(None)),
    ],
)
def test_update_match_rejects_invalid_payload(update):
    with pytest.raises(InvalidSeasonMatchDataError):
        ManageSeasonMatchesUseCase(_FakeRepo()).update_match_for_admin(
            pena_guid="pena-guid",
            season_guid="season-guid",
            match_guid="match-guid",
            admin_id=9,
            update=update,
        )


@pytest.mark.parametrize(
    ("repo", "expected_error"),
    [
        (_FakeRepo(should_raise_pena_not_found=True), PenaSeasonPenaNotFoundError),
        (_FakeRepo(should_raise_access_denied=True), PenaSeasonAccessDeniedError),
        (_FakeRepo(should_raise_season_not_found=True), PenaSeasonNotFoundError),
        (_FakeRepo(should_raise_match_not_found=True), SeasonMatchNotFoundError),
        (_FakeRepo(should_raise_invalid_match_data=True), InvalidSeasonMatchDataError),
    ],
)
def test_update_match_maps_repository_errors(repo, expected_error):
    with pytest.raises(expected_error):
        ManageSeasonMatchesUseCase(repo).update_match_for_admin(
            pena_guid="pena-guid",
            season_guid="season-guid",
            match_guid="match-guid",
            admin_id=9,
            update=SeasonMatchUpdate(home_team_name=FieldUpdate.set("Home")),
        )


def test_update_match_normalizes_names_and_passes_flags():
    repo = _FakeRepo()

    result = ManageSeasonMatchesUseCase(repo).update_match_for_admin(
        pena_guid="pena-guid",
        season_guid="season-guid",
        match_guid="match-guid",
        admin_id=9,
        update=SeasonMatchUpdate(
            home_team_name=FieldUpdate.set(" Home "),
            away_team_name=FieldUpdate.set(" Away "),
        ),
    )

    assert result.guid == "match-guid"
    assert repo.last_payload["home_team_name"] == FieldUpdate.set("Home")
    assert repo.last_payload["away_team_name"] == FieldUpdate.set("Away")
    assert repo.last_payload["match_date"] == FieldUpdate.keep()


@pytest.mark.parametrize(
    "update",
    [
        SeasonMatchLineupsUpdate(home_player_guids=[], away_player_guids=["away-player-guid"]),
        SeasonMatchLineupsUpdate(
            home_player_guids=["home-player-guid", "home-player-guid"],
            away_player_guids=["away-player-guid"],
        ),
    ],
)
def test_update_match_lineups_rejects_invalid_team_lineups(update):
    with pytest.raises((InvalidSeasonMatchDataError, SeasonMatchInvalidPlayersError)):
        ManageSeasonMatchesUseCase(_FakeRepo()).update_match_lineups_for_admin(
            pena_guid="pena-guid",
            season_guid="season-guid",
            match_guid="match-guid",
            admin_id=9,
            update=update,
        )


def test_update_match_lineups_rejects_overlap_across_teams():
    with pytest.raises(SeasonMatchInvalidPlayersError):
        ManageSeasonMatchesUseCase(_FakeRepo()).update_match_lineups_for_admin(
            pena_guid="pena-guid",
            season_guid="season-guid",
            match_guid="match-guid",
            admin_id=9,
            update=SeasonMatchLineupsUpdate(
                home_player_guids=["shared-player-guid"],
                away_player_guids=["shared-player-guid"],
            ),
        )


@pytest.mark.parametrize(
    ("repo", "expected_error"),
    [
        (_FakeRepo(should_raise_pena_not_found=True), PenaSeasonPenaNotFoundError),
        (_FakeRepo(should_raise_access_denied=True), PenaSeasonAccessDeniedError),
        (_FakeRepo(should_raise_season_not_found=True), PenaSeasonNotFoundError),
        (_FakeRepo(should_raise_match_not_found=True), SeasonMatchNotFoundError),
        (_FakeRepo(should_raise_match_lineup_locked=True), SeasonMatchLineupLockedError),
        (_FakeRepo(should_raise_same_player_match=True), SeasonMatchInvalidPlayersError),
        (
            _FakeRepo(should_raise_match_players_not_in_season=True),
            SeasonMatchPlayersNotInSeasonError,
        ),
        (_FakeRepo(should_raise_player_not_found=True), SeasonPlayerNotFoundError),
        (_FakeRepo(should_raise_invalid_match_data=True), InvalidSeasonMatchDataError),
    ],
)
def test_update_match_lineups_maps_repository_errors(repo, expected_error):
    with pytest.raises(expected_error):
        ManageSeasonMatchesUseCase(repo).update_match_lineups_for_admin(
            pena_guid="pena-guid",
            season_guid="season-guid",
            match_guid="match-guid",
            admin_id=9,
            update=SeasonMatchLineupsUpdate(
                home_player_guids=["home-player-guid"],
                away_player_guids=["away-player-guid"],
            ),
        )


def test_update_match_lineups_forwards_payload():
    repo = _FakeRepo()

    result = ManageSeasonMatchesUseCase(repo).update_match_lineups_for_admin(
        pena_guid="pena-guid",
        season_guid="season-guid",
        match_guid="match-guid",
        admin_id=9,
        update=SeasonMatchLineupsUpdate(
            home_player_guids=["home-player-guid"],
            away_player_guids=["away-player-guid"],
        ),
    )

    assert result.guid == "match-guid"
    assert repo.last_payload["home_player_guids"] == ["home-player-guid"]
    assert repo.last_payload["away_player_guids"] == ["away-player-guid"]


@pytest.mark.parametrize(
    ("repo", "expected_error"),
    [
        (_FakeRepo(should_raise_pena_not_found=True), PenaSeasonPenaNotFoundError),
        (_FakeRepo(should_raise_access_denied=True), PenaSeasonAccessDeniedError),
        (_FakeRepo(should_raise_season_not_found=True), PenaSeasonNotFoundError),
        (_FakeRepo(should_raise_match_not_found=True), SeasonMatchNotFoundError),
        (_FakeRepo(should_raise_invalid_match_data=True), InvalidSeasonMatchDataError),
    ],
)
def test_delete_match_maps_repository_errors(repo, expected_error):
    with pytest.raises(expected_error):
        ManageSeasonMatchesUseCase(repo).delete_match_for_admin(
            pena_guid="pena-guid",
            season_guid="season-guid",
            match_guid="match-guid",
            admin_id=9,
        )


def test_delete_match_forwards_payload():
    repo = _FakeRepo()

    ManageSeasonMatchesUseCase(repo).delete_match_for_admin(
        pena_guid="pena-guid",
        season_guid="season-guid",
        match_guid="match-guid",
        admin_id=9,
    )

    assert repo.last_payload == {
        "pena_guid": "pena-guid",
        "season_guid": "season-guid",
        "match_guid": "match-guid",
        "admin_id": 9,
    }


@pytest.mark.parametrize(
    ("repo", "expected_error"),
    [
        (_FakeRepo(should_raise_pena_not_found=True), PenaSeasonPenaNotFoundError),
        (_FakeRepo(should_raise_season_not_found=True), PenaSeasonNotFoundError),
    ],
)
def test_list_season_matches_maps_not_found_errors(repo, expected_error):
    with pytest.raises(expected_error):
        ManageSeasonMatchesUseCase(repo).list_season_matches(
            pena_guid="pena-guid",
            season_guid="season-guid",
            page=1,
            page_size=20,
        )


def test_list_season_matches_returns_page():
    repo = _FakeRepo()

    page = ManageSeasonMatchesUseCase(repo).list_season_matches(
        pena_guid="pena-guid",
        season_guid="season-guid",
        page=1,
        page_size=20,
    )

    assert page.total == 1
    assert page.items[0].home_score == 2
    assert repo.last_payload["page_size"] == 20


@pytest.mark.parametrize(
    ("repo", "expected_error"),
    [
        (_FakeRepo(should_raise_pena_not_found=True), PenaSeasonPenaNotFoundError),
        (_FakeRepo(should_raise_season_not_found=True), PenaSeasonNotFoundError),
        (_FakeRepo(should_raise_match_not_found=True), SeasonMatchNotFoundError),
    ],
)
def test_get_match_detail_maps_not_found_errors(repo, expected_error):
    with pytest.raises(expected_error):
        ManageSeasonMatchesUseCase(repo).get_match_detail(
            pena_guid="pena-guid",
            season_guid="season-guid",
            match_guid="match-guid",
        )


def test_get_match_detail_returns_detail():
    repo = _FakeRepo()

    detail = ManageSeasonMatchesUseCase(repo).get_match_detail(
        pena_guid="pena-guid",
        season_guid="season-guid",
        match_guid="match-guid",
    )

    assert detail.guid == "match-guid"
    assert detail.home_team.team_name == "Home"
    assert repo.last_payload["match_guid"] == "match-guid"


@pytest.mark.parametrize(
    ("repo", "expected_error"),
    [
        (_FakeRepo(should_raise_pena_not_found=True), PenaSeasonPenaNotFoundError),
        (_FakeRepo(should_raise_access_denied=True), PenaSeasonAccessDeniedError),
        (_FakeRepo(should_raise_season_not_found=True), PenaSeasonNotFoundError),
        (_FakeRepo(should_raise_match_not_found=True), SeasonMatchNotFoundError),
        (_FakeRepo(should_raise_match_already_started=True), SeasonMatchAlreadyStartedError),
        (_FakeRepo(should_raise_match_report_closed=True), SeasonMatchReportClosedError),
        (_FakeRepo(should_raise_invalid_match_data=True), InvalidSeasonMatchDataError),
    ],
)
def test_start_match_maps_repository_errors(repo, expected_error):
    with pytest.raises(expected_error):
        ManageSeasonMatchesUseCase(repo).start_match_for_admin(
            pena_guid="pena-guid",
            season_guid="season-guid",
            match_guid="match-guid",
            admin_id=9,
        )


def test_start_match_forwards_payload():
    repo = _FakeRepo()

    detail = ManageSeasonMatchesUseCase(repo).start_match_for_admin(
        pena_guid="pena-guid",
        season_guid="season-guid",
        match_guid="match-guid",
        admin_id=9,
    )

    assert detail.guid == "match-guid"
    assert repo.last_payload["admin_id"] == 9


@pytest.mark.parametrize(
    ("repo", "expected_error"),
    [
        (_FakeRepo(should_raise_pena_not_found=True), PenaSeasonPenaNotFoundError),
        (_FakeRepo(should_raise_access_denied=True), PenaSeasonAccessDeniedError),
        (_FakeRepo(should_raise_season_not_found=True), PenaSeasonNotFoundError),
        (_FakeRepo(should_raise_match_not_found=True), SeasonMatchNotFoundError),
        (_FakeRepo(should_raise_match_clock_not_running=True), SeasonMatchClockNotRunningError),
        (_FakeRepo(should_raise_invalid_match_data=True), InvalidSeasonMatchDataError),
    ],
)
def test_stop_match_maps_repository_errors(repo, expected_error):
    with pytest.raises(expected_error):
        ManageSeasonMatchesUseCase(repo).stop_match_for_admin(
            pena_guid="pena-guid",
            season_guid="season-guid",
            match_guid="match-guid",
            admin_id=9,
        )


def test_create_match_event_rejects_invalid_payload():
    with pytest.raises(InvalidSeasonMatchDataError):
        ManageSeasonMatchesUseCase(_FakeRepo()).create_match_event_for_admin(
            pena_guid="pena-guid",
            season_guid="season-guid",
            match_guid="match-guid",
            admin_id=9,
            data=SeasonMatchEventCreate(
                event_type="goal",
                team_side="home",
                player_guid=None,
            ),
        )

    with pytest.raises(InvalidSeasonMatchDataError):
        ManageSeasonMatchesUseCase(_FakeRepo()).create_match_event_for_admin(
            pena_guid="pena-guid",
            season_guid="season-guid",
            match_guid="match-guid",
            admin_id=9,
            data=SeasonMatchEventCreate(
                event_type="goal",
                team_side="home",
                player_guid="player-guid",
                value_delta=0,
            ),
        )


@pytest.mark.parametrize(
    ("repo", "expected_error"),
    [
        (_FakeRepo(should_raise_pena_not_found=True), PenaSeasonPenaNotFoundError),
        (_FakeRepo(should_raise_access_denied=True), PenaSeasonAccessDeniedError),
        (_FakeRepo(should_raise_season_not_found=True), PenaSeasonNotFoundError),
        (_FakeRepo(should_raise_match_not_found=True), SeasonMatchNotFoundError),
        (_FakeRepo(should_raise_match_clock_not_running=True), SeasonMatchClockNotRunningError),
        (
            _FakeRepo(should_raise_event_player_not_in_match=True),
            SeasonMatchEventPlayerNotInMatchError,
        ),
        (_FakeRepo(should_raise_match_report_closed=True), SeasonMatchReportClosedError),
        (_FakeRepo(should_raise_invalid_match_data=True), InvalidSeasonMatchDataError),
    ],
)
def test_create_match_event_maps_repository_errors(repo, expected_error):
    with pytest.raises(expected_error):
        ManageSeasonMatchesUseCase(repo).create_match_event_for_admin(
            pena_guid="pena-guid",
            season_guid="season-guid",
            match_guid="match-guid",
            admin_id=9,
            data=SeasonMatchEventCreate(
                event_type="goal",
                team_side="home",
                player_guid="player-guid",
                related_player_guid="assist-guid",
                note="Nice finish",
                elapsed_seconds=42,
            ),
        )


def test_create_match_event_normalizes_payload():
    repo = _FakeRepo()

    detail = ManageSeasonMatchesUseCase(repo).create_match_event_for_admin(
        pena_guid="pena-guid",
        season_guid="season-guid",
        match_guid="match-guid",
        admin_id=9,
        data=SeasonMatchEventCreate(
            event_type=" GOAL ",
            team_side=" HOME ",
            player_guid=" player-guid ",
            related_player_guid=" assist-guid ",
            note="  Nice finish  ",
            elapsed_seconds=42,
            value_delta=-1,
        ),
    )

    assert detail.guid == "match-guid"
    event = repo.last_payload["event"]
    assert event.event_type == "goal"
    assert event.team_side == "home"
    assert event.player_guid == "player-guid"
    assert event.related_player_guid == "assist-guid"
    assert event.note == "Nice finish"
    assert event.elapsed_seconds == 42
    assert event.value_delta == -1


@pytest.mark.parametrize(
    ("repo", "expected_error"),
    [
        (_FakeRepo(should_raise_pena_not_found=True), PenaSeasonPenaNotFoundError),
        (_FakeRepo(should_raise_access_denied=True), PenaSeasonAccessDeniedError),
        (_FakeRepo(should_raise_season_not_found=True), PenaSeasonNotFoundError),
        (_FakeRepo(should_raise_match_not_found=True), SeasonMatchNotFoundError),
        (_FakeRepo(should_raise_event_not_found=True), SeasonMatchEventNotFoundError),
        (_FakeRepo(should_raise_match_report_closed=True), SeasonMatchReportClosedError),
        (_FakeRepo(should_raise_invalid_match_data=True), InvalidSeasonMatchDataError),
    ],
)
def test_delete_match_event_maps_repository_errors(repo, expected_error):
    with pytest.raises(expected_error):
        ManageSeasonMatchesUseCase(repo).delete_match_event_for_admin(
            pena_guid="pena-guid",
            season_guid="season-guid",
            match_guid="match-guid",
            event_guid="event-guid",
            admin_id=9,
        )


def test_delete_match_event_forwards_payload():
    repo = _FakeRepo()

    detail = ManageSeasonMatchesUseCase(repo).delete_match_event_for_admin(
        pena_guid="pena-guid",
        season_guid="season-guid",
        match_guid="match-guid",
        event_guid="event-guid",
        admin_id=9,
    )

    assert detail.guid == "match-guid"
    assert repo.last_payload["event_guid"] == "event-guid"
