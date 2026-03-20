from dataclasses import dataclass

import pytest
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
    SeasonPlayerResult,
    SeasonPlayersPageResult,
)
from persistence.application.ports.season_competition_port import (
    SeasonPlayerNotFoundError as RepositorySeasonPlayerNotFoundError,
)
from persistence.application.use_cases.manage_season_players_usecase import (
    InvalidSeasonPlayerBatchDataError,
    InvalidSeasonPlayerUpdateDataError,
    ManageSeasonPlayersUseCase,
    PenaSeasonAccessDeniedError,
    PenaSeasonNotFoundError,
    PenaSeasonPenaNotFoundError,
    SeasonPlayerInMatchError,
    SeasonPlayerNotFoundError,
    SeasonPlayerNotInPenaError,
    SeasonPlayerStatsUpdate,
)
from persistence.application.use_cases.manage_season_players_usecase import (
    SeasonPlayerAlreadyRegisteredError as UseCaseSeasonPlayerAlreadyRegisteredError,
)
from persistence.application.use_cases.manage_season_players_usecase import (
    SeasonPlayersFilters as UseCaseSeasonPlayersFilters,
)


@dataclass
class _FakeRepo:
    should_raise_pena_not_found: bool = False
    should_raise_access_denied: bool = False
    should_raise_season_not_found: bool = False
    should_raise_player_not_found: bool = False
    should_raise_season_player_not_found: bool = False
    should_raise_player_not_in_pena: bool = False
    should_raise_already_registered: bool = False
    should_raise_invalid_match_data: bool = False
    should_raise_invalid_stats: bool = False
    should_raise_player_has_matches: bool = False
    last_payload: dict | None = None

    @staticmethod
    def _player() -> SeasonPlayerResult:
        return SeasonPlayerResult(
            player_guid="player-guid",
            name="John",
            surname1="Doe",
            surname2=None,
            nationality="Spain",
            nickname="JD",
            role="member",
            role_color="#15803D",
            position="CM",
            position_color="#16A34A",
            played=1,
            goals=2,
            assists=1,
            wins=1,
            losses=0,
            draws=0,
            quality_level=7.2,
            points=3,
        )

    def register_player_for_admin(
        self, *, pena_guid: str, season_guid: str, admin_id: int, player_guid: str
    ) -> SeasonPlayerResult:
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

    def register_players_for_admin_bulk(self, **kwargs) -> list[SeasonPlayerResult]:
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

    def update_player_stats_for_admin(self, **kwargs) -> SeasonPlayerResult:
        if self.should_raise_pena_not_found:
            raise PenaNotFoundError()
        if self.should_raise_access_denied:
            raise PenaNotManagedByAdminError()
        if self.should_raise_season_not_found:
            raise SeasonNotFoundError()
        if self.should_raise_player_not_found:
            raise PlayerNotFoundError()
        if self.should_raise_season_player_not_found:
            raise RepositorySeasonPlayerNotFoundError()
        if self.should_raise_invalid_stats:
            raise InvalidSeasonPlayerStatsError()
        self.last_payload = kwargs
        return self._player()

    def unregister_player_for_admin(self, **kwargs) -> None:
        if self.should_raise_pena_not_found:
            raise PenaNotFoundError()
        if self.should_raise_access_denied:
            raise PenaNotManagedByAdminError()
        if self.should_raise_season_not_found:
            raise SeasonNotFoundError()
        if self.should_raise_player_not_found:
            raise PlayerNotFoundError()
        if self.should_raise_season_player_not_found:
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
    ) -> SeasonPlayersPageResult:
        if self.should_raise_pena_not_found:
            raise PenaNotFoundError()
        if self.should_raise_season_not_found:
            raise SeasonNotFoundError()
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
            items=[self._player()],
            page=page,
            page_size=page_size,
            total=1,
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
        if self.should_raise_pena_not_found:
            raise PenaNotFoundError()
        if self.should_raise_season_not_found:
            raise SeasonNotFoundError()
        self.last_payload = {
            "pena_guid": pena_guid,
            "season_guid": season_guid,
            "filters": filters,
            "page": page,
            "page_size": page_size,
        }
        return SeasonPlayersPageResult(
            items=[self._player()],
            page=page,
            page_size=page_size,
            total=1,
        )


@pytest.mark.parametrize(
    ("repo", "expected_error"),
    [
        (_FakeRepo(should_raise_pena_not_found=True), PenaSeasonPenaNotFoundError),
        (_FakeRepo(should_raise_access_denied=True), PenaSeasonAccessDeniedError),
        (_FakeRepo(should_raise_season_not_found=True), PenaSeasonNotFoundError),
        (_FakeRepo(should_raise_player_not_found=True), SeasonPlayerNotFoundError),
        (_FakeRepo(should_raise_player_not_in_pena=True), SeasonPlayerNotInPenaError),
        (
            _FakeRepo(should_raise_already_registered=True),
            UseCaseSeasonPlayerAlreadyRegisteredError,
        ),
    ],
)
def test_register_player_maps_repository_errors(repo, expected_error):
    with pytest.raises(expected_error):
        ManageSeasonPlayersUseCase(repo).register_player_for_admin(
            pena_guid="pena-guid",
            season_guid="season-guid",
            admin_id=3,
            player_guid="player-guid",
        )


def test_register_player_returns_player_info():
    repo = _FakeRepo()

    result = ManageSeasonPlayersUseCase(repo).register_player_for_admin(
        pena_guid="pena-guid",
        season_guid="season-guid",
        admin_id=3,
        player_guid="player-guid",
    )

    assert result.player_guid == "player-guid"
    assert result.role_color == "#15803D"
    assert repo.last_payload == {
        "pena_guid": "pena-guid",
        "season_guid": "season-guid",
        "admin_id": 3,
        "player_guid": "player-guid",
    }


@pytest.mark.parametrize("player_guids", [[], ["player-a", "player-a"], ["player-a", "  "]])
def test_register_players_bulk_rejects_invalid_player_guid_payload(player_guids):
    with pytest.raises(InvalidSeasonPlayerBatchDataError):
        ManageSeasonPlayersUseCase(_FakeRepo()).register_players_bulk_for_admin(
            pena_guid="pena-guid",
            season_guid="season-guid",
            admin_id=3,
            player_guids=player_guids,
        )


@pytest.mark.parametrize(
    ("repo", "expected_error"),
    [
        (_FakeRepo(should_raise_pena_not_found=True), PenaSeasonPenaNotFoundError),
        (_FakeRepo(should_raise_access_denied=True), PenaSeasonAccessDeniedError),
        (_FakeRepo(should_raise_season_not_found=True), PenaSeasonNotFoundError),
        (_FakeRepo(should_raise_player_not_found=True), SeasonPlayerNotFoundError),
        (_FakeRepo(should_raise_player_not_in_pena=True), SeasonPlayerNotInPenaError),
        (
            _FakeRepo(should_raise_already_registered=True),
            UseCaseSeasonPlayerAlreadyRegisteredError,
        ),
        (_FakeRepo(should_raise_invalid_match_data=True), InvalidSeasonPlayerBatchDataError),
    ],
)
def test_register_players_bulk_maps_repository_errors(repo, expected_error):
    with pytest.raises(expected_error):
        ManageSeasonPlayersUseCase(repo).register_players_bulk_for_admin(
            pena_guid="pena-guid",
            season_guid="season-guid",
            admin_id=3,
            player_guids=["player-a"],
        )


def test_register_players_bulk_normalizes_and_forwards_payload():
    repo = _FakeRepo()

    result = ManageSeasonPlayersUseCase(repo).register_players_bulk_for_admin(
        pena_guid="pena-guid",
        season_guid="season-guid",
        admin_id=3,
        player_guids=[" player-a ", "player-b"],
        source_season_guid=" source-season-guid ",
    )

    assert len(result) == 2
    assert repo.last_payload == {
        "pena_guid": "pena-guid",
        "season_guid": "season-guid",
        "admin_id": 3,
        "player_guids": ["player-a", "player-b"],
        "source_season_guid": "source-season-guid",
    }


@pytest.mark.parametrize(
    "update",
    [
        SeasonPlayerStatsUpdate(),
        SeasonPlayerStatsUpdate(wins=-1, wins_provided=True),
        SeasonPlayerStatsUpdate(losses=-1, losses_provided=True),
        SeasonPlayerStatsUpdate(draws=-1, draws_provided=True),
        SeasonPlayerStatsUpdate(quality_level=-0.1, quality_level_provided=True),
        SeasonPlayerStatsUpdate(role="x" * 81, role_provided=True),
        SeasonPlayerStatsUpdate(position="x" * 51, position_provided=True),
    ],
)
def test_update_player_stats_rejects_invalid_payload(update):
    with pytest.raises(InvalidSeasonPlayerUpdateDataError):
        ManageSeasonPlayersUseCase(_FakeRepo()).update_player_stats_for_admin(
            pena_guid="pena-guid",
            season_guid="season-guid",
            admin_id=3,
            player_guid="player-guid",
            update=update,
        )


def test_update_player_stats_normalizes_optional_text_and_forwards_flags():
    repo = _FakeRepo()

    result = ManageSeasonPlayersUseCase(repo).update_player_stats_for_admin(
        pena_guid="pena-guid",
        season_guid="season-guid",
        admin_id=3,
        player_guid="player-guid",
        update=SeasonPlayerStatsUpdate(
            wins=4,
            draws=1,
            quality_level=8.5,
            role=" Captain ",
            position=" GK ",
            wins_provided=True,
            draws_provided=True,
            quality_level_provided=True,
            role_provided=True,
            position_provided=True,
        ),
    )

    assert result.player_guid == "player-guid"
    assert repo.last_payload == {
        "pena_guid": "pena-guid",
        "season_guid": "season-guid",
        "admin_id": 3,
        "player_guid": "player-guid",
        "wins_provided": True,
        "wins": 4,
        "losses_provided": False,
        "losses": None,
        "draws_provided": True,
        "draws": 1,
        "quality_level_provided": True,
        "quality_level": 8.5,
        "role_provided": True,
        "role": "Captain",
        "position_provided": True,
        "position": "GK",
    }


@pytest.mark.parametrize(
    ("repo", "expected_error"),
    [
        (_FakeRepo(should_raise_pena_not_found=True), PenaSeasonPenaNotFoundError),
        (_FakeRepo(should_raise_access_denied=True), PenaSeasonAccessDeniedError),
        (_FakeRepo(should_raise_season_not_found=True), PenaSeasonNotFoundError),
        (_FakeRepo(should_raise_player_not_found=True), SeasonPlayerNotFoundError),
        (_FakeRepo(should_raise_season_player_not_found=True), SeasonPlayerNotFoundError),
        (_FakeRepo(should_raise_invalid_stats=True), InvalidSeasonPlayerUpdateDataError),
    ],
)
def test_update_player_stats_maps_repository_errors(repo, expected_error):
    with pytest.raises(expected_error):
        ManageSeasonPlayersUseCase(repo).update_player_stats_for_admin(
            pena_guid="pena-guid",
            season_guid="season-guid",
            admin_id=3,
            player_guid="player-guid",
            update=SeasonPlayerStatsUpdate(wins=1, wins_provided=True),
        )


@pytest.mark.parametrize(
    ("repo", "expected_error"),
    [
        (_FakeRepo(should_raise_pena_not_found=True), PenaSeasonPenaNotFoundError),
        (_FakeRepo(should_raise_access_denied=True), PenaSeasonAccessDeniedError),
        (_FakeRepo(should_raise_season_not_found=True), PenaSeasonNotFoundError),
        (_FakeRepo(should_raise_player_not_found=True), SeasonPlayerNotFoundError),
        (_FakeRepo(should_raise_season_player_not_found=True), SeasonPlayerNotFoundError),
        (_FakeRepo(should_raise_player_has_matches=True), SeasonPlayerInMatchError),
    ],
)
def test_unregister_player_maps_repository_errors(repo, expected_error):
    with pytest.raises(expected_error):
        ManageSeasonPlayersUseCase(repo).unregister_player_for_admin(
            pena_guid="pena-guid",
            season_guid="season-guid",
            admin_id=3,
            player_guid="player-guid",
        )


def test_unregister_player_forwards_payload():
    repo = _FakeRepo()

    ManageSeasonPlayersUseCase(repo).unregister_player_for_admin(
        pena_guid="pena-guid",
        season_guid="season-guid",
        admin_id=3,
        player_guid="player-guid",
    )

    assert repo.last_payload == {
        "pena_guid": "pena-guid",
        "season_guid": "season-guid",
        "admin_id": 3,
        "player_guid": "player-guid",
    }


@pytest.mark.parametrize(
    ("repo", "expected_error"),
    [
        (_FakeRepo(should_raise_pena_not_found=True), PenaSeasonPenaNotFoundError),
        (_FakeRepo(should_raise_season_not_found=True), PenaSeasonNotFoundError),
    ],
)
def test_list_season_players_maps_not_found_errors(repo, expected_error):
    with pytest.raises(expected_error):
        ManageSeasonPlayersUseCase(repo).list_season_players(
            pena_guid="pena-guid",
            season_guid="season-guid",
            filters=UseCaseSeasonPlayersFilters(search="john"),
            page=2,
            page_size=5,
            order_by="points",
            order_dir="asc",
        )


def test_list_season_players_returns_page_and_forwards_filters():
    repo = _FakeRepo()

    page = ManageSeasonPlayersUseCase(repo).list_season_players(
        pena_guid="pena-guid",
        season_guid="season-guid",
        filters=UseCaseSeasonPlayersFilters(search="john", roles=("member",)),
        page=2,
        page_size=5,
        order_by="points",
        order_dir="asc",
    )

    assert page.total == 1
    assert page.items[0].goals == 2
    assert repo.last_payload["filters"].search == "john"
    assert repo.last_payload["filters"].roles == ("member",)
    assert repo.last_payload["order_by"] == "points"
    assert repo.last_payload["order_dir"] == "asc"


@pytest.mark.parametrize(
    ("repo", "expected_error"),
    [
        (_FakeRepo(should_raise_pena_not_found=True), PenaSeasonPenaNotFoundError),
        (_FakeRepo(should_raise_season_not_found=True), PenaSeasonNotFoundError),
    ],
)
def test_get_standings_maps_not_found_errors(repo, expected_error):
    with pytest.raises(expected_error):
        ManageSeasonPlayersUseCase(repo).get_standings(
            pena_guid="pena-guid",
            season_guid="season-guid",
            filters=UseCaseSeasonPlayersFilters(),
            page=1,
            page_size=10,
        )


def test_get_standings_returns_page():
    repo = _FakeRepo()

    page = ManageSeasonPlayersUseCase(repo).get_standings(
        pena_guid="pena-guid",
        season_guid="season-guid",
        filters=UseCaseSeasonPlayersFilters(search="john"),
        page=1,
        page_size=10,
    )

    assert page.total == 1
    assert page.items[0].assists == 1
    assert repo.last_payload["filters"].search == "john"
