from dataclasses import dataclass
from datetime import date

import pytest
from persistence.application.ports.season_competition_repository import (
    InvalidMatchDataError,
    InvalidSeasonPlayerStatsError,
    MatchDetailResult,
    MatchesPageResult,
    MatchPlayerStatsResult,
    MatchResult,
    MatchStatsMismatchError,
    MatchSummaryResult,
    MatchTeamResult,
    PenaNotFoundError,
    PenaNotManagedByAdminError,
    PlayerNotFoundError,
    PlayerNotInPenaError,
    SamePlayerMatchError,
    SeasonDateRangeOverlapError,
    SeasonNotFoundError,
    SeasonPlayerAlreadyRegisteredError,
    SeasonPlayerFilters,
    SeasonPlayerResult,
    SeasonPlayersPageResult,
    SeasonResult,
)
from persistence.application.ports.season_competition_repository import (
    SeasonPlayerNotFoundError as RepositorySeasonPlayerNotFoundError,
)
from persistence.application.use_cases.manage_season_competition import (
    InvalidSeasonDataError,
    InvalidSeasonMatchDataError,
    InvalidSeasonPlayerUpdateDataError,
    ManageSeasonCompetitionUseCase,
    PenaSeasonAccessDeniedError,
    PenaSeasonDateOverlapError,
    PenaSeasonNotFoundError,
    PenaSeasonPenaNotFoundError,
    SeasonCreate,
    SeasonMatchCreate,
    SeasonMatchCreateDetailed,
    SeasonMatchInvalidPlayersError,
    SeasonMatchPlayerStatsUpdate,
    SeasonMatchResultUpdate,
    SeasonMatchStatsMismatchError,
    SeasonMatchStatsUpdate,
    SeasonMatchTeamCreate,
    SeasonPlayerNotFoundError,
    SeasonPlayerStatsUpdate,
)
from persistence.application.use_cases.manage_season_competition import (
    SeasonPlayerAlreadyRegisteredError as UseCaseSeasonPlayerAlreadyRegisteredError,
)
from persistence.application.use_cases.manage_season_competition import (
    SeasonPlayerNotInPenaError as UseCaseSeasonPlayerNotInPenaError,
)


@dataclass
class _FakeRepo:
    should_raise_pena_not_found: bool = False
    should_raise_access_denied: bool = False
    should_raise_season_not_found: bool = False
    should_raise_player_not_found: bool = False
    should_raise_player_not_in_pena: bool = False
    should_raise_already_registered: bool = False
    should_raise_invalid_stats: bool = False
    should_raise_overlap: bool = False
    should_raise_same_player_match: bool = False
    should_raise_invalid_match_data: bool = False
    should_raise_match_stats_mismatch: bool = False
    should_raise_match_not_found: bool = False
    active_exists: bool = True
    last_payload: dict | None = None

    @staticmethod
    def _season() -> SeasonResult:
        return SeasonResult(
            guid="season-guid", start_date=date(2024, 1, 1), end_date=date(2024, 12, 31)
        )

    @staticmethod
    def _player() -> SeasonPlayerResult:
        return SeasonPlayerResult(
            player_guid="player-guid",
            name="John",
            surname1="Doe",
            surname2=None,
            nationality="Spain",
            nickname="JD",
            position="CM",
            wins=1,
            losses=0,
            draws=0,
            quality_level=7.2,
            points=3,
        )

    @staticmethod
    def _match() -> MatchResult:
        return MatchResult(
            guid="match-guid",
            season_guid="season-guid",
            match_date=date(2024, 3, 1),
            home_player_guid="home-guid",
            away_player_guid="away-guid",
            home_player_name="Home P",
            away_player_name="Away P",
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
    def _match_detail(cls) -> MatchDetailResult:
        return MatchDetailResult(
            guid="match-guid",
            season_guid="season-guid",
            match_date=date(2024, 3, 1),
            home_team=cls._match_team("Home"),
            away_team=cls._match_team("Away"),
        )

    @staticmethod
    def _match_summary() -> MatchSummaryResult:
        return MatchSummaryResult(
            guid="match-guid",
            season_guid="season-guid",
            match_date=date(2024, 3, 1),
            home_team_name="Home",
            away_team_name="Away",
            home_score=2,
            away_score=1,
            home_players=1,
            away_players=1,
        )

    def find_active_for_pena(self, *, pena_guid: str, reference_date: date):
        if self.should_raise_pena_not_found:
            raise PenaNotFoundError()
        self.last_payload = {"pena_guid": pena_guid, "reference_date": reference_date}
        if not self.active_exists:
            return None
        return self._season()

    def create_season_for_admin(
        self, *, pena_guid: str, admin_id: int, start_date: date, end_date: date
    ):
        if self.should_raise_pena_not_found:
            raise PenaNotFoundError()
        if self.should_raise_access_denied:
            raise PenaNotManagedByAdminError()
        if self.should_raise_overlap:
            raise SeasonDateRangeOverlapError()
        self.last_payload = {
            "pena_guid": pena_guid,
            "admin_id": admin_id,
            "start_date": start_date,
            "end_date": end_date,
        }
        return self._season()

    def register_player_for_admin(
        self, *, pena_guid: str, season_guid: str, admin_id: int, player_guid: str
    ):
        if self.should_raise_pena_not_found:
            raise PenaNotFoundError()
        if self.should_raise_access_denied:
            raise PenaNotManagedByAdminError()
        if self.should_raise_season_not_found:
            raise SeasonNotFoundError()
        if self.should_raise_player_not_found:
            raise PlayerNotFoundError()
        if self.should_raise_player_not_in_pena:
            raise PlayerNotInPenaError()
        if self.should_raise_already_registered:
            raise SeasonPlayerAlreadyRegisteredError()
        self.last_payload = {
            "pena_guid": pena_guid,
            "season_guid": season_guid,
            "admin_id": admin_id,
            "player_guid": player_guid,
        }
        return self._player()

    def update_player_stats_for_admin(self, **kwargs):
        if self.should_raise_invalid_stats:
            raise InvalidSeasonPlayerStatsError()
        if self.should_raise_player_not_found:
            raise RepositorySeasonPlayerNotFoundError()
        self.last_payload = kwargs
        return self._player()

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
    ):
        self.last_payload = {
            "pena_guid": pena_guid,
            "season_guid": season_guid,
            "filters": filters,
            "page": page,
            "page_size": page_size,
            "order_by": order_by,
            "order_dir": order_dir,
        }
        return SeasonPlayersPageResult(
            items=[self._player()], page=page, page_size=page_size, total=1
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
    ):
        if self.should_raise_same_player_match:
            raise SamePlayerMatchError()
        self.last_payload = {
            "pena_guid": pena_guid,
            "season_guid": season_guid,
            "admin_id": admin_id,
            "home_player_guid": home_player_guid,
            "away_player_guid": away_player_guid,
            "match_date": match_date,
        }
        return self._match()

    def update_match_result_for_admin(self, **kwargs):
        self.last_payload = kwargs
        return self._match()

    def create_match_with_lineups_for_admin(self, **kwargs):
        if self.should_raise_invalid_match_data:
            raise InvalidMatchDataError()
        self.last_payload = kwargs
        return self._match_detail()

    def update_match_stats_for_admin(self, **kwargs):
        if self.should_raise_invalid_match_data:
            raise InvalidMatchDataError()
        if self.should_raise_match_stats_mismatch:
            raise MatchStatsMismatchError()
        if self.should_raise_match_not_found:
            from persistence.application.ports.season_competition_repository import (
                MatchNotFoundError,
            )

            raise MatchNotFoundError()
        self.last_payload = kwargs
        return self._match_detail()

    def list_season_matches(self, *, pena_guid: str, season_guid: str, page: int, page_size: int):
        self.last_payload = {
            "pena_guid": pena_guid,
            "season_guid": season_guid,
            "page": page,
            "page_size": page_size,
        }
        return MatchesPageResult(
            items=[self._match_summary()], page=page, page_size=page_size, total=1
        )

    def get_match_detail(self, *, pena_guid: str, season_guid: str, match_guid: str):
        if self.should_raise_match_not_found:
            from persistence.application.ports.season_competition_repository import (
                MatchNotFoundError,
            )

            raise MatchNotFoundError()
        self.last_payload = {
            "pena_guid": pena_guid,
            "season_guid": season_guid,
            "match_guid": match_guid,
        }
        return self._match_detail()

    def get_standings(self, *, pena_guid: str, season_guid: str, page: int, page_size: int):
        self.last_payload = {
            "pena_guid": pena_guid,
            "season_guid": season_guid,
            "page": page,
            "page_size": page_size,
        }
        return SeasonPlayersPageResult(
            items=[self._player()], page=page, page_size=page_size, total=1
        )


def test_get_active_maps_not_found_and_passes_reference_date():
    use_case = ManageSeasonCompetitionUseCase(_FakeRepo(active_exists=False))
    with pytest.raises(PenaSeasonNotFoundError):
        use_case.get_active_for_pena(pena_guid="pena-guid", reference_date=date(2024, 6, 1))

    repo = _FakeRepo()
    use_case = ManageSeasonCompetitionUseCase(repo)
    season = use_case.get_active_for_pena(pena_guid="pena-guid", reference_date=date(2024, 6, 1))
    assert repo.last_payload == {"pena_guid": "pena-guid", "reference_date": date(2024, 6, 1)}
    assert season.guid == "season-guid"


def test_create_season_validates_range_and_maps_errors():
    use_case = ManageSeasonCompetitionUseCase(_FakeRepo())
    with pytest.raises(InvalidSeasonDataError):
        use_case.create_season_for_admin(
            pena_guid="pena-guid",
            admin_id=1,
            data=SeasonCreate(start_date=date(2025, 1, 2), end_date=date(2025, 1, 1)),
        )

    with pytest.raises(PenaSeasonDateOverlapError):
        ManageSeasonCompetitionUseCase(
            _FakeRepo(should_raise_overlap=True)
        ).create_season_for_admin(
            pena_guid="pena-guid",
            admin_id=1,
            data=SeasonCreate(start_date=date(2025, 1, 1), end_date=date(2025, 12, 1)),
        )


def test_register_player_maps_expected_errors():
    with pytest.raises(UseCaseSeasonPlayerNotInPenaError):
        ManageSeasonCompetitionUseCase(
            _FakeRepo(should_raise_player_not_in_pena=True)
        ).register_player_for_admin(
            pena_guid="pena-guid",
            season_guid="season-guid",
            admin_id=1,
            player_guid="player-guid",
        )
    with pytest.raises(UseCaseSeasonPlayerAlreadyRegisteredError):
        ManageSeasonCompetitionUseCase(
            _FakeRepo(should_raise_already_registered=True)
        ).register_player_for_admin(
            pena_guid="pena-guid",
            season_guid="season-guid",
            admin_id=1,
            player_guid="player-guid",
        )


def test_update_player_stats_validates_payload_and_values():
    use_case = ManageSeasonCompetitionUseCase(_FakeRepo())
    with pytest.raises(InvalidSeasonPlayerUpdateDataError):
        use_case.update_player_stats_for_admin(
            pena_guid="pena-guid",
            season_guid="season-guid",
            admin_id=1,
            player_guid="player-guid",
            update=SeasonPlayerStatsUpdate(),
        )

    with pytest.raises(InvalidSeasonPlayerUpdateDataError):
        use_case.update_player_stats_for_admin(
            pena_guid="pena-guid",
            season_guid="season-guid",
            admin_id=1,
            player_guid="player-guid",
            update=SeasonPlayerStatsUpdate(wins=-1, wins_provided=True),
        )


def test_update_player_stats_maps_invalid_stats_error():
    with pytest.raises(InvalidSeasonPlayerUpdateDataError):
        ManageSeasonCompetitionUseCase(
            _FakeRepo(should_raise_invalid_stats=True)
        ).update_player_stats_for_admin(
            pena_guid="pena-guid",
            season_guid="season-guid",
            admin_id=1,
            player_guid="player-guid",
            update=SeasonPlayerStatsUpdate(wins=3, wins_provided=True),
        )


def test_list_players_and_standings_passthrough():
    repo = _FakeRepo()
    use_case = ManageSeasonCompetitionUseCase(repo)
    page = use_case.list_season_players(
        pena_guid="pena-guid",
        season_guid="season-guid",
        filters=SeasonPlayerFilters(search="john"),
        page=2,
        page_size=5,
        order_by="points",
        order_dir="asc",
    )
    assert page.page == 2
    assert page.page_size == 5
    assert page.total == 1

    standings = use_case.get_standings(
        pena_guid="pena-guid", season_guid="season-guid", page=1, page_size=10
    )
    assert standings.total == 1


def test_create_match_rejects_same_player_before_repo():
    use_case = ManageSeasonCompetitionUseCase(_FakeRepo())
    with pytest.raises(SeasonMatchInvalidPlayersError):
        use_case.create_match_for_admin(
            pena_guid="pena-guid",
            season_guid="season-guid",
            admin_id=1,
            data=SeasonMatchCreate(
                home_player_guid="player-guid",
                away_player_guid="player-guid",
                match_date=date(2024, 4, 1),
            ),
        )


def test_create_match_and_update_result_positive():
    repo = _FakeRepo()
    use_case = ManageSeasonCompetitionUseCase(repo)
    created = use_case.create_match_for_admin(
        pena_guid="pena-guid",
        season_guid="season-guid",
        admin_id=1,
        data=SeasonMatchCreate(
            home_player_guid="home-guid",
            away_player_guid="away-guid",
            match_date=date(2024, 4, 1),
        ),
    )
    assert created.guid == "match-guid"

    updated = use_case.update_match_result_for_admin(
        pena_guid="pena-guid",
        season_guid="season-guid",
        match_guid="match-guid",
        admin_id=1,
        update=SeasonMatchResultUpdate(home_score=2, away_score=1),
    )
    assert updated.home_score == 2
    assert updated.away_score == 1


def test_update_match_rejects_negative_scores():
    use_case = ManageSeasonCompetitionUseCase(_FakeRepo())
    with pytest.raises(InvalidSeasonPlayerUpdateDataError):
        use_case.update_match_result_for_admin(
            pena_guid="pena-guid",
            season_guid="season-guid",
            match_guid="match-guid",
            admin_id=1,
            update=SeasonMatchResultUpdate(home_score=-1, away_score=0),
        )


def test_create_match_with_lineups_rejects_invalid_roster():
    use_case = ManageSeasonCompetitionUseCase(_FakeRepo())
    with pytest.raises(SeasonMatchInvalidPlayersError):
        use_case.create_match_with_lineups_for_admin(
            pena_guid="pena-guid",
            season_guid="season-guid",
            admin_id=1,
            data=SeasonMatchCreateDetailed(
                match_date=date(2024, 4, 1),
                home_team=SeasonMatchTeamCreate(player_guids=["player-a", "player-a"]),
                away_team=SeasonMatchTeamCreate(player_guids=["player-b"]),
            ),
        )


def test_create_match_with_lineups_and_update_stats_positive():
    repo = _FakeRepo()
    use_case = ManageSeasonCompetitionUseCase(repo)
    created = use_case.create_match_with_lineups_for_admin(
        pena_guid="pena-guid",
        season_guid="season-guid",
        admin_id=1,
        data=SeasonMatchCreateDetailed(
            match_date=date(2024, 4, 1),
            home_team=SeasonMatchTeamCreate(
                team_name="Team Home",
                player_guids=["home-player-guid"],
            ),
            away_team=SeasonMatchTeamCreate(
                team_name="Team Away",
                player_guids=["away-player-guid"],
            ),
        ),
    )
    assert created.guid == "match-guid"
    assert created.home_team.team_name == "Home"

    updated = use_case.update_match_stats_for_admin(
        pena_guid="pena-guid",
        season_guid="season-guid",
        match_guid="match-guid",
        admin_id=1,
        update=SeasonMatchStatsUpdate(
            home_players=[
                SeasonMatchPlayerStatsUpdate(
                    player_guid="home-player-guid",
                    goals=2,
                    assists=1,
                    saves=0,
                    rating=8.5,
                )
            ],
            away_players=[
                SeasonMatchPlayerStatsUpdate(
                    player_guid="away-player-guid",
                    goals=1,
                    assists=0,
                    saves=0,
                    rating=7.0,
                )
            ],
        ),
    )
    assert updated.away_team.score == 2


def test_update_match_stats_maps_validation_and_mismatch_errors():
    use_case = ManageSeasonCompetitionUseCase(_FakeRepo())
    with pytest.raises(InvalidSeasonMatchDataError):
        use_case.update_match_stats_for_admin(
            pena_guid="pena-guid",
            season_guid="season-guid",
            match_guid="match-guid",
            admin_id=1,
            update=SeasonMatchStatsUpdate(
                home_players=[
                    SeasonMatchPlayerStatsUpdate(
                        player_guid="home-player-guid",
                        goals=-1,
                    )
                ],
                away_players=[SeasonMatchPlayerStatsUpdate(player_guid="away-player-guid")],
            ),
        )

    with pytest.raises(SeasonMatchStatsMismatchError):
        ManageSeasonCompetitionUseCase(
            _FakeRepo(should_raise_match_stats_mismatch=True)
        ).update_match_stats_for_admin(
            pena_guid="pena-guid",
            season_guid="season-guid",
            match_guid="match-guid",
            admin_id=1,
            update=SeasonMatchStatsUpdate(
                home_players=[SeasonMatchPlayerStatsUpdate(player_guid="home-player-guid")],
                away_players=[SeasonMatchPlayerStatsUpdate(player_guid="away-player-guid")],
            ),
        )


def test_list_and_get_match_detail_passthrough():
    repo = _FakeRepo()
    use_case = ManageSeasonCompetitionUseCase(repo)
    matches = use_case.list_season_matches(
        pena_guid="pena-guid", season_guid="season-guid", page=1, page_size=20
    )
    assert matches.total == 1
    assert matches.items[0].home_score == 2

    detail = use_case.get_match_detail(
        pena_guid="pena-guid", season_guid="season-guid", match_guid="match-guid"
    )
    assert detail.guid == "match-guid"


def test_maps_generic_access_and_not_found_errors():
    with pytest.raises(PenaSeasonPenaNotFoundError):
        ManageSeasonCompetitionUseCase(
            _FakeRepo(should_raise_pena_not_found=True)
        ).register_player_for_admin(
            pena_guid="pena-guid",
            season_guid="season-guid",
            admin_id=1,
            player_guid="player-guid",
        )

    with pytest.raises(PenaSeasonAccessDeniedError):
        ManageSeasonCompetitionUseCase(
            _FakeRepo(should_raise_access_denied=True)
        ).register_player_for_admin(
            pena_guid="pena-guid",
            season_guid="season-guid",
            admin_id=1,
            player_guid="player-guid",
        )

    with pytest.raises(SeasonPlayerNotFoundError):
        ManageSeasonCompetitionUseCase(
            _FakeRepo(should_raise_player_not_found=True)
        ).register_player_for_admin(
            pena_guid="pena-guid",
            season_guid="season-guid",
            admin_id=1,
            player_guid="player-guid",
        )
