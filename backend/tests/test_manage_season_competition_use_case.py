from dataclasses import dataclass
from datetime import date

import pytest
from persistence.application.ports.season_competition_repository import (
    InvalidMatchDataError,
    InvalidSeasonPlayerStatsError,
    MatchDetailResult,
    MatchesPageResult,
    MatchInsightRowResult,
    MatchLineupLockedError,
    MatchNotFoundError,
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
    SeasonPlayerHasMatchesError,
    SeasonPlayerResult,
    SeasonPlayersPageResult,
    SeasonResult,
)
from persistence.application.ports.season_competition_repository import (
    SeasonPlayerNotFoundError as RepositorySeasonPlayerNotFoundError,
)
from persistence.application.use_cases.manage_season_competition import (
    InvalidSeasonDataError,
    InvalidSeasonInsightsDataError,
    InvalidSeasonMatchDataError,
    InvalidSeasonPlayerBatchDataError,
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
    SeasonMatchLineupLockedError,
    SeasonMatchLineupsUpdate,
    SeasonMatchNotFoundError,
    SeasonMatchPlayerStatsUpdate,
    SeasonMatchResultUpdate,
    SeasonMatchStatsMismatchError,
    SeasonMatchStatsUpdate,
    SeasonMatchTeamCreate,
    SeasonMatchUpdate,
    SeasonPlayerInMatchError,
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
    should_raise_player_has_matches: bool = False
    should_raise_match_lineup_locked: bool = False
    active_exists: bool = True
    last_payload: dict | None = None

    @staticmethod
    def _season() -> SeasonResult:
        return SeasonResult(
            guid="season-guid",
            start_date=date(2024, 1, 1),
            end_date=date(2024, 12, 31),
            points_win=3,
            points_draw=1,
            points_loss=0,
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
            played=1,
            goals=2,
            assists=1,
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
    def _match_detail(cls) -> MatchDetailResult:
        return MatchDetailResult(
            guid="match-guid",
            season_guid="season-guid",
            match_date=date(2024, 3, 1),
            status="open",
            home_team=cls._match_team("Home"),
            away_team=cls._match_team("Away"),
        )

    @staticmethod
    def _match_team_from_stats(
        *,
        team_guid: str,
        team_name: str,
        values: list,
    ) -> MatchTeamResult:
        players: list[MatchPlayerStatsResult] = []
        total_goals = 0
        total_assists = 0
        total_saves = 0
        total_rating = 0.0

        for index, item in enumerate(values, start=1):
            rating = float(item.rating)
            total_goals += int(item.goals)
            total_assists += int(item.assists)
            total_saves += int(item.saves)
            total_rating += rating
            players.append(
                MatchPlayerStatsResult(
                    player_guid=item.player_guid,
                    name=f"{team_name}Player{index}",
                    surname1="Player",
                    surname2=None,
                    nickname=f"{team_name}Nick{index}",
                    position="CM",
                    goals=int(item.goals),
                    assists=int(item.assists),
                    saves=int(item.saves),
                    rating=rating,
                )
            )

        average_rating = round(total_rating / len(values), 2) if values else 0.0
        return MatchTeamResult(
            team_guid=team_guid,
            team_name=team_name,
            score=total_goals,
            total_assists=total_assists,
            total_saves=total_saves,
            average_rating=average_rating,
            players=players,
        )

    @classmethod
    def _match_detail_from_stats(cls, *, home_players_stats: list, away_players_stats: list):
        return MatchDetailResult(
            guid="match-guid",
            season_guid="season-guid",
            match_date=date(2024, 3, 1),
            status="closed",
            home_team=cls._match_team_from_stats(
                team_guid="home-team-guid",
                team_name="Home",
                values=home_players_stats,
            ),
            away_team=cls._match_team_from_stats(
                team_guid="away-team-guid",
                team_name="Away",
                values=away_players_stats,
            ),
        )

    @staticmethod
    def _match_summary() -> MatchSummaryResult:
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
        )

    def find_active_for_pena(self, *, pena_guid: str, reference_date: date):
        if self.should_raise_pena_not_found:
            raise PenaNotFoundError()
        self.last_payload = {"pena_guid": pena_guid, "reference_date": reference_date}
        if not self.active_exists:
            return None
        return self._season()

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
            "points_win": points_win,
            "points_draw": points_draw,
            "points_loss": points_loss,
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

    def register_players_for_admin_bulk(self, **kwargs):
        if self.should_raise_invalid_match_data:
            raise InvalidMatchDataError()
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
        self.last_payload = kwargs
        return [self._player() for _ in kwargs["player_guids"]]

    def update_player_stats_for_admin(self, **kwargs):
        if self.should_raise_invalid_stats:
            raise InvalidSeasonPlayerStatsError()
        if self.should_raise_player_not_found:
            raise RepositorySeasonPlayerNotFoundError()
        self.last_payload = kwargs
        return self._player()

    def unregister_player_for_admin(self, **kwargs):
        if self.should_raise_pena_not_found:
            raise PenaNotFoundError()
        if self.should_raise_access_denied:
            raise PenaNotManagedByAdminError()
        if self.should_raise_season_not_found:
            raise SeasonNotFoundError()
        if self.should_raise_player_not_found:
            raise RepositorySeasonPlayerNotFoundError()
        if self.should_raise_player_has_matches:
            raise SeasonPlayerHasMatchesError()
        self.last_payload = kwargs

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
        if self.should_raise_invalid_match_data:
            raise InvalidMatchDataError()
        self.last_payload = kwargs
        return self._match()

    def update_match_for_admin(self, **kwargs):
        if self.should_raise_invalid_match_data:
            raise InvalidMatchDataError()
        if self.should_raise_match_not_found:
            from persistence.application.ports.season_competition_repository import (
                MatchNotFoundError,
            )

            raise MatchNotFoundError()
        self.last_payload = kwargs
        return self._match_detail()

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
        return self._match_detail_from_stats(
            home_players_stats=kwargs["home_players_stats"],
            away_players_stats=kwargs["away_players_stats"],
        )

    def update_match_lineups_for_admin(self, **kwargs):
        if self.should_raise_invalid_match_data:
            raise InvalidMatchDataError()
        if self.should_raise_match_not_found:
            from persistence.application.ports.season_competition_repository import (
                MatchNotFoundError,
            )

            raise MatchNotFoundError()
        if self.should_raise_match_lineup_locked:
            raise MatchLineupLockedError()
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

    def list_closed_match_insight_rows(self, *, pena_guid: str, season_guids: list[str]):
        self.last_payload = {
            "pena_guid": pena_guid,
            "season_guids": season_guids,
        }
        return []

    def delete_match_for_admin(self, **kwargs):
        if self.should_raise_invalid_match_data:
            raise InvalidMatchDataError()
        if self.should_raise_match_not_found:
            from persistence.application.ports.season_competition_repository import (
                MatchNotFoundError,
            )

            raise MatchNotFoundError()
        self.last_payload = kwargs

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


def test_register_players_bulk_validates_and_forwards_cleaned_guids():
    use_case = ManageSeasonCompetitionUseCase(_FakeRepo())

    with pytest.raises(InvalidSeasonPlayerBatchDataError):
        use_case.register_players_bulk_for_admin(
            pena_guid="pena-guid",
            season_guid="season-guid",
            admin_id=1,
            player_guids=[],
        )
    with pytest.raises(InvalidSeasonPlayerBatchDataError):
        use_case.register_players_bulk_for_admin(
            pena_guid="pena-guid",
            season_guid="season-guid",
            admin_id=1,
            player_guids=["player-a", "player-a"],
        )
    with pytest.raises(InvalidSeasonPlayerBatchDataError):
        use_case.register_players_bulk_for_admin(
            pena_guid="pena-guid",
            season_guid="season-guid",
            admin_id=1,
            player_guids=["player-a", "   "],
        )

    repo = _FakeRepo()
    use_case = ManageSeasonCompetitionUseCase(repo)
    registered = use_case.register_players_bulk_for_admin(
        pena_guid="pena-guid",
        season_guid="season-guid",
        admin_id=1,
        player_guids=[" player-a ", "player-b"],
    )
    assert len(registered) == 2
    assert repo.last_payload["player_guids"] == ["player-a", "player-b"]


def test_unregister_player_maps_in_match_error():
    with pytest.raises(SeasonPlayerInMatchError):
        ManageSeasonCompetitionUseCase(
            _FakeRepo(should_raise_player_has_matches=True)
        ).unregister_player_for_admin(
            pena_guid="pena-guid",
            season_guid="season-guid",
            admin_id=1,
            player_guid="player-guid",
        )

    repo = _FakeRepo()
    ManageSeasonCompetitionUseCase(repo).unregister_player_for_admin(
        pena_guid="pena-guid",
        season_guid="season-guid",
        admin_id=1,
        player_guid="player-guid",
    )
    assert repo.last_payload == {
        "pena_guid": "pena-guid",
        "season_guid": "season-guid",
        "admin_id": 1,
        "player_guid": "player-guid",
    }


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
    assert page.items[0].goals == 2
    assert page.items[0].assists == 1

    standings = use_case.get_standings(
        pena_guid="pena-guid", season_guid="season-guid", page=1, page_size=10
    )
    assert standings.total == 1
    assert standings.items[0].goals == 2
    assert standings.items[0].assists == 1


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


def test_create_match_and_update_result_is_blocked():
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

    with pytest.raises(InvalidSeasonMatchDataError):
        ManageSeasonCompetitionUseCase(
            _FakeRepo(should_raise_invalid_match_data=True)
        ).update_match_result_for_admin(
            pena_guid="pena-guid",
            season_guid="season-guid",
            match_guid="match-guid",
            admin_id=1,
            update=SeasonMatchResultUpdate(home_score=2, away_score=1),
        )


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


def test_update_match_validates_payload_and_maps_not_found():
    use_case = ManageSeasonCompetitionUseCase(_FakeRepo())
    with pytest.raises(InvalidSeasonMatchDataError):
        use_case.update_match_for_admin(
            pena_guid="pena-guid",
            season_guid="season-guid",
            match_guid="match-guid",
            admin_id=1,
            update=SeasonMatchUpdate(),
        )

    with pytest.raises(InvalidSeasonMatchDataError):
        use_case.update_match_for_admin(
            pena_guid="pena-guid",
            season_guid="season-guid",
            match_guid="match-guid",
            admin_id=1,
            update=SeasonMatchUpdate(
                home_team_name="   ",
                home_team_name_provided=True,
            ),
        )

    with pytest.raises(SeasonMatchNotFoundError):
        ManageSeasonCompetitionUseCase(
            _FakeRepo(should_raise_match_not_found=True)
        ).update_match_for_admin(
            pena_guid="pena-guid",
            season_guid="season-guid",
            match_guid="match-guid",
            admin_id=1,
            update=SeasonMatchUpdate(
                home_team_name="Home",
                home_team_name_provided=True,
            ),
        )

    repo = _FakeRepo()
    updated = ManageSeasonCompetitionUseCase(repo).update_match_for_admin(
        pena_guid="pena-guid",
        season_guid="season-guid",
        match_guid="match-guid",
        admin_id=1,
        update=SeasonMatchUpdate(
            home_team_name=" New Home ",
            away_team_name=" New Away ",
            home_team_name_provided=True,
            away_team_name_provided=True,
        ),
    )
    assert updated.guid == "match-guid"
    assert repo.last_payload["home_team_name"] == "New Home"
    assert repo.last_payload["away_team_name"] == "New Away"


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


def test_update_match_lineups_validates_and_maps_locked_error():
    use_case = ManageSeasonCompetitionUseCase(_FakeRepo())
    with pytest.raises(SeasonMatchInvalidPlayersError):
        use_case.update_match_lineups_for_admin(
            pena_guid="pena-guid",
            season_guid="season-guid",
            match_guid="match-guid",
            admin_id=1,
            update=SeasonMatchLineupsUpdate(
                home_player_guids=["player-a", "player-a"],
                away_player_guids=["player-b"],
            ),
        )

    with pytest.raises(SeasonMatchLineupLockedError):
        ManageSeasonCompetitionUseCase(
            _FakeRepo(should_raise_match_lineup_locked=True)
        ).update_match_lineups_for_admin(
            pena_guid="pena-guid",
            season_guid="season-guid",
            match_guid="match-guid",
            admin_id=1,
            update=SeasonMatchLineupsUpdate(
                home_player_guids=["player-a"],
                away_player_guids=["player-b"],
            ),
        )

    repo = _FakeRepo()
    updated = ManageSeasonCompetitionUseCase(repo).update_match_lineups_for_admin(
        pena_guid="pena-guid",
        season_guid="season-guid",
        match_guid="match-guid",
        admin_id=1,
        update=SeasonMatchLineupsUpdate(
            home_player_guids=["player-a"],
            away_player_guids=["player-b"],
        ),
    )
    assert updated.guid == "match-guid"
    assert repo.last_payload["home_player_guids"] == ["player-a"]
    assert repo.last_payload["away_player_guids"] == ["player-b"]


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
                    player_guid=" home-player-guid ",
                    goals=2,
                    assists=1,
                    saves=0,
                    rating=8.5,
                )
            ],
            away_players=[
                SeasonMatchPlayerStatsUpdate(
                    player_guid=" away-player-guid ",
                    goals=1,
                    assists=0,
                    saves=0,
                    rating=7.0,
                )
            ],
        ),
    )
    assert updated.home_team.score == 2
    assert updated.away_team.score == 1
    assert updated.home_team.total_assists == 1
    assert updated.away_team.total_assists == 0
    assert updated.home_team.average_rating == 8.5
    assert updated.away_team.average_rating == 7.0
    assert updated.home_team.players[0].player_guid == "home-player-guid"
    assert updated.away_team.players[0].player_guid == "away-player-guid"
    assert repo.last_payload["home_players_stats"][0].player_guid == "home-player-guid"
    assert repo.last_payload["away_players_stats"][0].player_guid == "away-player-guid"


def test_delete_match_maps_not_found_and_passthrough():
    with pytest.raises(SeasonMatchNotFoundError):
        ManageSeasonCompetitionUseCase(
            _FakeRepo(should_raise_match_not_found=True)
        ).delete_match_for_admin(
            pena_guid="pena-guid",
            season_guid="season-guid",
            match_guid="match-guid",
            admin_id=1,
        )

    repo = _FakeRepo()
    ManageSeasonCompetitionUseCase(repo).delete_match_for_admin(
        pena_guid="pena-guid",
        season_guid="season-guid",
        match_guid="match-guid",
        admin_id=1,
    )
    assert repo.last_payload == {
        "pena_guid": "pena-guid",
        "season_guid": "season-guid",
        "match_guid": "match-guid",
        "admin_id": 1,
    }


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


def test_get_match_insights_validates_payload():
    use_case = ManageSeasonCompetitionUseCase(_FakeRepo())
    with pytest.raises(InvalidSeasonInsightsDataError):
        use_case.get_match_insights(
            pena_guid="pena-guid",
            season_guids=[],
        )


def test_get_match_insights_computes_report_from_closed_matches():
    class _InsightsRepo(_FakeRepo):
        def list_closed_match_insight_rows(
            self, *, pena_guid: str, season_guids: list[str]
        ) -> list[MatchInsightRowResult]:
            self.last_payload = {
                "pena_guid": pena_guid,
                "season_guids": season_guids,
            }
            return [
                MatchInsightRowResult(
                    season_guid="season-guid",
                    match_guid="match-closed",
                    match_date=date(2024, 3, 1),
                    home_score=2,
                    away_score=1,
                    team_side="home",
                    player_guid="player-a",
                    player_name="Ana",
                    player_surname1="A",
                    player_surname2=None,
                    player_nickname="Anita",
                    goals=1,
                    assists=1,
                    saves=0,
                ),
                MatchInsightRowResult(
                    season_guid="season-guid",
                    match_guid="match-closed",
                    match_date=date(2024, 3, 1),
                    home_score=2,
                    away_score=1,
                    team_side="home",
                    player_guid="player-b",
                    player_name="Beto",
                    player_surname1="B",
                    player_surname2=None,
                    player_nickname=None,
                    goals=1,
                    assists=0,
                    saves=1,
                ),
                MatchInsightRowResult(
                    season_guid="season-guid",
                    match_guid="match-closed",
                    match_date=date(2024, 3, 1),
                    home_score=2,
                    away_score=1,
                    team_side="away",
                    player_guid="player-c",
                    player_name="Cora",
                    player_surname1="C",
                    player_surname2=None,
                    player_nickname=None,
                    goals=1,
                    assists=1,
                    saves=0,
                ),
                MatchInsightRowResult(
                    season_guid="season-guid",
                    match_guid="match-closed",
                    match_date=date(2024, 3, 1),
                    home_score=2,
                    away_score=1,
                    team_side="away",
                    player_guid="player-d",
                    player_name="Dani",
                    player_surname1="D",
                    player_surname2=None,
                    player_nickname=None,
                    goals=0,
                    assists=0,
                    saves=0,
                ),
            ]

        def get_match_detail(self, *, pena_guid: str, season_guid: str, match_guid: str):
            raise MatchNotFoundError()

        def list_season_matches(
            self, *, pena_guid: str, season_guid: str, page: int, page_size: int
        ):
            return MatchesPageResult(
                items=[],
                page=page,
                page_size=page_size,
                total=0,
            )

    repo = _InsightsRepo()
    use_case = ManageSeasonCompetitionUseCase(repo)
    report = use_case.get_match_insights(
        pena_guid="pena-guid",
        season_guids=["season-guid"],
        scope="selected_season",
        matrix_size=4,
        top_pairs_size=3,
        leaders_size=2,
    )

    assert report["scope"] == "selected_season"
    assert report["season_guids"] == ["season-guid"]
    assert report["matches_analyzed"] == 1
    assert report["goals_per_match"] == 3.0
    assert report["assists_per_match"] == 2.0
    assert report["saves_per_match"] == 1.0
    assert len(report["timeline_by_match"]) == 1
    assert report["timeline_by_match"][0]["label"] == "M1"
    assert len(report["leaders"]["scorers"]) == 2
    assert repo.last_payload == {
        "pena_guid": "pena-guid",
        "season_guids": ["season-guid"],
    }


def test_collect_match_insight_details_preserves_position_and_rating():
    class _InsightsRepo(_FakeRepo):
        def list_closed_match_insight_rows(
            self, *, pena_guid: str, season_guids: list[str]
        ) -> list[MatchInsightRowResult]:
            self.last_payload = {
                "pena_guid": pena_guid,
                "season_guids": season_guids,
            }
            return [
                MatchInsightRowResult(
                    season_guid="season-guid",
                    match_guid="match-closed",
                    match_date=date(2024, 3, 1),
                    home_score=3,
                    away_score=1,
                    team_side="home",
                    player_guid="player-a",
                    player_name="Ana",
                    player_surname1="A",
                    player_surname2=None,
                    player_nickname="Anita",
                    goals=2,
                    assists=1,
                    saves=0,
                    player_position="CM",
                    rating=8.0,
                ),
                MatchInsightRowResult(
                    season_guid="season-guid",
                    match_guid="match-closed",
                    match_date=date(2024, 3, 1),
                    home_score=3,
                    away_score=1,
                    team_side="home",
                    player_guid="player-b",
                    player_name="Beto",
                    player_surname1="B",
                    player_surname2=None,
                    player_nickname=None,
                    goals=1,
                    assists=0,
                    saves=1,
                    player_position=None,
                    rating=6.0,
                ),
                MatchInsightRowResult(
                    season_guid="season-guid",
                    match_guid="match-closed",
                    match_date=date(2024, 3, 1),
                    home_score=3,
                    away_score=1,
                    team_side="away",
                    player_guid="player-c",
                    player_name="Cora",
                    player_surname1="C",
                    player_surname2=None,
                    player_nickname=None,
                    goals=1,
                    assists=0,
                    saves=2,
                    player_position="GK",
                    rating=7.5,
                ),
            ]

    repo = _InsightsRepo()
    use_case = ManageSeasonCompetitionUseCase(repo)

    details = use_case._collect_match_insight_details(
        pena_guid="pena-guid",
        season_guids=["season-guid"],
    )

    assert len(details) == 1
    assert details[0].home_team.players[0].position == "CM"
    assert details[0].home_team.players[0].rating == 8.0
    assert details[0].home_team.players[1].position is None
    assert details[0].away_team.players[0].position == "GK"
    assert details[0].away_team.players[0].rating == 7.5
    assert details[0].home_team.average_rating == 7.0
    assert details[0].away_team.average_rating == 7.5
