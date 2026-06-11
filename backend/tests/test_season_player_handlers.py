from dataclasses import dataclass

import pytest
from core.application.commands.season_player_command_handlers import (
    RegisterSeasonPlayerHandler,
    RegisterSeasonPlayersBulkHandler,
    UnregisterSeasonPlayerHandler,
    UpdateSeasonPlayerStatsHandler,
)
from core.application.commands.season_player_commands import (
    RegisterSeasonPlayerCommand,
    RegisterSeasonPlayersBulkCommand,
    UnregisterSeasonPlayerCommand,
    UpdateSeasonPlayerStatsCommand,
)
from core.application.models.season_competition_models import (
    SeasonPlayersFilters,
    SeasonPlayerStatsUpdate,
)
from core.application.policies import FieldUpdate
from core.application.ports.season_competition_port import (
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
from core.application.ports.season_competition_port import (
    SeasonPlayerNotFoundError as RepositorySeasonPlayerNotFoundError,
)
from core.application.queries.season_player_queries import (
    GetSeasonStandingsQuery,
    ListSeasonPlayersQuery,
)
from core.application.queries.season_player_query_handlers import (
    GetSeasonStandingsHandler,
    ListSeasonPlayersHandler,
)
from core.application.use_cases.season_competition_errors import (
    InvalidSeasonPlayerBatchDataError,
    InvalidSeasonPlayerUpdateDataError,
    PenaSeasonAccessDeniedError,
    PenaSeasonNotFoundError,
    PenaSeasonPenaNotFoundError,
    SeasonPlayerInMatchError,
)
from core.application.use_cases.season_competition_errors import (
    SeasonPlayerAlreadyRegisteredError as DomainSeasonPlayerAlreadyRegisteredError,
)
from core.application.use_cases.season_competition_errors import (
    SeasonPlayerNotFoundError as DomainSeasonPlayerNotFoundError,
)
from core.application.use_cases.season_competition_errors import (
    SeasonPlayerNotInPenaError as DomainSeasonPlayerNotInPenaError,
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

    def register_player_for_admin(self, **kwargs) -> SeasonPlayerResult:
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
        self, *, pena_guid, season_guid, filters, page, page_size, order_by, order_dir
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
            items=[self._player()], page=page, page_size=page_size, total=1
        )

    def get_standings(
        self, *, pena_guid, season_guid, filters: SeasonPlayerFilters, page, page_size
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
            items=[self._player()], page=page, page_size=page_size, total=1
        )


def _register(repo) -> object:
    return RegisterSeasonPlayerHandler(repo).handle(
        RegisterSeasonPlayerCommand(
            pena_guid="pena-guid", season_guid="season-guid", admin_id=3, player_guid="player-guid"
        )
    )


@pytest.mark.parametrize(
    ("repo", "expected_error"),
    [
        (_FakeRepo(should_raise_pena_not_found=True), PenaSeasonPenaNotFoundError),
        (_FakeRepo(should_raise_access_denied=True), PenaSeasonAccessDeniedError),
        (_FakeRepo(should_raise_season_not_found=True), PenaSeasonNotFoundError),
        (_FakeRepo(should_raise_player_not_found=True), DomainSeasonPlayerNotFoundError),
        (_FakeRepo(should_raise_player_not_in_pena=True), DomainSeasonPlayerNotInPenaError),
        (
            _FakeRepo(should_raise_already_registered=True),
            DomainSeasonPlayerAlreadyRegisteredError,
        ),
    ],
)
def test_register_player_maps_repository_errors(repo, expected_error):
    with pytest.raises(expected_error):
        _register(repo)


def test_register_player_returns_info_and_forwards_payload():
    repo = _FakeRepo()
    result = _register(repo)
    assert result.player_guid == "player-guid"
    assert repo.last_payload == {
        "pena_guid": "pena-guid",
        "season_guid": "season-guid",
        "admin_id": 3,
        "player_guid": "player-guid",
    }


@pytest.mark.parametrize("player_guids", [[], ["player-a", "player-a"], ["player-a", "  "]])
def test_register_bulk_rejects_invalid_payload(player_guids):
    with pytest.raises(InvalidSeasonPlayerBatchDataError):
        RegisterSeasonPlayersBulkHandler(_FakeRepo()).handle(
            RegisterSeasonPlayersBulkCommand(
                pena_guid="pena-guid",
                season_guid="season-guid",
                admin_id=3,
                player_guids=player_guids,
            )
        )


def test_register_bulk_normalizes_and_forwards_payload():
    repo = _FakeRepo()
    result = RegisterSeasonPlayersBulkHandler(repo).handle(
        RegisterSeasonPlayersBulkCommand(
            pena_guid="pena-guid",
            season_guid="season-guid",
            admin_id=3,
            player_guids=[" player-a ", "player-b"],
            source_season_guid=" source-season-guid ",
        )
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
    ("repo", "expected_error"),
    [
        (_FakeRepo(should_raise_pena_not_found=True), PenaSeasonPenaNotFoundError),
        (_FakeRepo(should_raise_access_denied=True), PenaSeasonAccessDeniedError),
        (_FakeRepo(should_raise_season_not_found=True), PenaSeasonNotFoundError),
        (_FakeRepo(should_raise_player_not_found=True), DomainSeasonPlayerNotFoundError),
        (_FakeRepo(should_raise_player_not_in_pena=True), DomainSeasonPlayerNotInPenaError),
        (_FakeRepo(should_raise_already_registered=True), DomainSeasonPlayerAlreadyRegisteredError),
        (_FakeRepo(should_raise_invalid_match_data=True), InvalidSeasonPlayerBatchDataError),
    ],
)
def test_register_bulk_maps_repository_errors(repo, expected_error):
    with pytest.raises(expected_error):
        RegisterSeasonPlayersBulkHandler(repo).handle(
            RegisterSeasonPlayersBulkCommand(
                pena_guid="pena-guid",
                season_guid="season-guid",
                admin_id=3,
                player_guids=["player-a"],
            )
        )


@pytest.mark.parametrize(
    "update",
    [
        SeasonPlayerStatsUpdate(),
        SeasonPlayerStatsUpdate(wins=FieldUpdate.set(-1)),
        SeasonPlayerStatsUpdate(quality_level=FieldUpdate.set(-0.1)),
        SeasonPlayerStatsUpdate(role=FieldUpdate.set("x" * 81)),
        SeasonPlayerStatsUpdate(position=FieldUpdate.set("x" * 51)),
    ],
)
def test_update_stats_rejects_invalid_payload(update):
    with pytest.raises(InvalidSeasonPlayerUpdateDataError):
        UpdateSeasonPlayerStatsHandler(_FakeRepo()).handle(
            UpdateSeasonPlayerStatsCommand(
                pena_guid="pena-guid",
                season_guid="season-guid",
                admin_id=3,
                player_guid="player-guid",
                update=update,
            )
        )


def test_update_stats_normalizes_text_and_forwards_flags():
    repo = _FakeRepo()
    result = UpdateSeasonPlayerStatsHandler(repo).handle(
        UpdateSeasonPlayerStatsCommand(
            pena_guid="pena-guid",
            season_guid="season-guid",
            admin_id=3,
            player_guid="player-guid",
            update=SeasonPlayerStatsUpdate(
                wins=FieldUpdate.set(4),
                draws=FieldUpdate.set(1),
                quality_level=FieldUpdate.set(8.5),
                role=FieldUpdate.set(" Captain "),
                position=FieldUpdate.set(" GK "),
            ),
        )
    )
    assert result.player_guid == "player-guid"
    assert repo.last_payload == {
        "pena_guid": "pena-guid",
        "season_guid": "season-guid",
        "admin_id": 3,
        "player_guid": "player-guid",
        "wins": FieldUpdate.set(4),
        "losses": FieldUpdate.keep(),
        "draws": FieldUpdate.set(1),
        "quality_level": FieldUpdate.set(8.5),
        "role": FieldUpdate.set("Captain"),
        "position": FieldUpdate.set("GK"),
    }


@pytest.mark.parametrize(
    ("repo", "expected_error"),
    [
        (_FakeRepo(should_raise_pena_not_found=True), PenaSeasonPenaNotFoundError),
        (_FakeRepo(should_raise_access_denied=True), PenaSeasonAccessDeniedError),
        (_FakeRepo(should_raise_season_not_found=True), PenaSeasonNotFoundError),
        (_FakeRepo(should_raise_player_not_found=True), DomainSeasonPlayerNotFoundError),
        (_FakeRepo(should_raise_season_player_not_found=True), DomainSeasonPlayerNotFoundError),
        (_FakeRepo(should_raise_invalid_stats=True), InvalidSeasonPlayerUpdateDataError),
    ],
)
def test_update_stats_maps_repository_errors(repo, expected_error):
    with pytest.raises(expected_error):
        UpdateSeasonPlayerStatsHandler(repo).handle(
            UpdateSeasonPlayerStatsCommand(
                pena_guid="pena-guid",
                season_guid="season-guid",
                admin_id=3,
                player_guid="player-guid",
                update=SeasonPlayerStatsUpdate(wins=FieldUpdate.set(1)),
            )
        )


@pytest.mark.parametrize(
    ("repo", "expected_error"),
    [
        (_FakeRepo(should_raise_pena_not_found=True), PenaSeasonPenaNotFoundError),
        (_FakeRepo(should_raise_access_denied=True), PenaSeasonAccessDeniedError),
        (_FakeRepo(should_raise_season_not_found=True), PenaSeasonNotFoundError),
        (_FakeRepo(should_raise_player_not_found=True), DomainSeasonPlayerNotFoundError),
        (_FakeRepo(should_raise_player_has_matches=True), SeasonPlayerInMatchError),
        (_FakeRepo(should_raise_season_player_not_found=True), DomainSeasonPlayerNotFoundError),
    ],
)
def test_unregister_maps_repository_errors(repo, expected_error):
    with pytest.raises(expected_error):
        UnregisterSeasonPlayerHandler(repo).handle(
            UnregisterSeasonPlayerCommand(
                pena_guid="pena-guid", season_guid="season-guid", admin_id=3, player_guid="p"
            )
        )


def test_list_players_returns_page_and_forwards_filters():
    repo = _FakeRepo()
    page = ListSeasonPlayersHandler(repo).handle(
        ListSeasonPlayersQuery(
            pena_guid="pena-guid",
            season_guid="season-guid",
            filters=SeasonPlayersFilters(search="john", roles=("member",)),
            page=2,
            page_size=5,
            order_by="points",
            order_dir="asc",
        )
    )
    assert page.total == 1
    assert repo.last_payload["filters"].search == "john"
    assert repo.last_payload["order_by"] == "points"


@pytest.mark.parametrize(
    ("repo", "expected_error"),
    [
        (_FakeRepo(should_raise_pena_not_found=True), PenaSeasonPenaNotFoundError),
        (_FakeRepo(should_raise_season_not_found=True), PenaSeasonNotFoundError),
    ],
)
def test_list_players_maps_not_found(repo, expected_error):
    with pytest.raises(expected_error):
        ListSeasonPlayersHandler(repo).handle(
            ListSeasonPlayersQuery(pena_guid="pena-guid", season_guid="season-guid")
        )


def test_standings_returns_page():
    repo = _FakeRepo()
    page = GetSeasonStandingsHandler(repo).handle(
        GetSeasonStandingsQuery(
            pena_guid="pena-guid",
            season_guid="season-guid",
            filters=SeasonPlayersFilters(search="john"),
            page=1,
            page_size=10,
        )
    )
    assert page.total == 1
    assert repo.last_payload["filters"].search == "john"


@pytest.mark.parametrize(
    ("repo", "expected_error"),
    [
        (_FakeRepo(should_raise_pena_not_found=True), PenaSeasonPenaNotFoundError),
        (_FakeRepo(should_raise_season_not_found=True), PenaSeasonNotFoundError),
    ],
)
def test_standings_maps_not_found(repo, expected_error):
    with pytest.raises(expected_error):
        GetSeasonStandingsHandler(repo).handle(
            GetSeasonStandingsQuery(pena_guid="pena-guid", season_guid="season-guid")
        )
