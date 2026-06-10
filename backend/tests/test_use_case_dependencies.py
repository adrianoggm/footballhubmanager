import os

# Required so importing dependency factories does not fail during test collection.
os.environ.setdefault("DB_HOST", "localhost")
os.environ.setdefault("DB_PORT", "3306")
os.environ.setdefault("DB_NAME", "footballhub")
os.environ.setdefault("DB_USER", "footballuser")
os.environ.setdefault("DB_PASSWORD", "footballpass")

from api.dependencies import use_cases as use_case_dependencies


def _assert_single_repository_factory(monkeypatch, *, repo_attr: str, use_case_attr: str, factory):
    captured: dict[str, object] = {}

    class _Repo:
        def __init__(self, db):
            captured["db"] = db

    class _UseCase:
        def __init__(self, repo):
            captured["repo_type"] = type(repo)
            self.repo = repo

    monkeypatch.setattr(use_case_dependencies, repo_attr, _Repo)
    monkeypatch.setattr(use_case_dependencies, use_case_attr, _UseCase)

    use_case = factory(db="db-session")

    assert isinstance(use_case, _UseCase)
    assert captured["db"] == "db-session"
    assert captured["repo_type"] is _Repo


def test_get_pena_membership_use_case_builds_expected_dependencies(monkeypatch):
    _assert_single_repository_factory(
        monkeypatch,
        repo_attr="SqlAlchemyPenaMembershipRepository",
        use_case_attr="ManagePenaMembershipUseCase",
        factory=use_case_dependencies.get_pena_membership_use_case,
    )


def test_get_pena_players_query_bus_builds_expected_dependencies(monkeypatch):
    from core.application.queries.pena_players_query import GetPenaPlayersQuery
    from shared.application.bus.buses import QueryBus

    captured: dict[str, object] = {}

    class _Repo:
        def __init__(self, db):
            captured["db"] = db

    monkeypatch.setattr(use_case_dependencies, "SqlAlchemyPenaPlayerQueryRepository", _Repo)

    bus = use_case_dependencies.get_pena_players_query_bus(db="db-session")
    assert isinstance(bus, QueryBus)
    assert captured["db"] == "db-session"
    assert GetPenaPlayersQuery in bus._handlers


def test_get_pena_season_command_bus_builds_expected_dependencies(monkeypatch):
    from datetime import date

    from core.application.commands.pena_season_commands import (
        CreatePenaSeasonCommand,
        DeletePenaSeasonCommand,
    )
    from core.application.ports.pena_season_port import PenaSeasonResult
    from shared.application.bus.buses import CommandBus

    captured: dict[str, object] = {}
    sample = PenaSeasonResult(
        guid="s",
        start_date=date(2024, 9, 1),
        end_date=date(2025, 6, 30),
        points_win=3,
        points_draw=1,
        points_loss=0,
    )

    class _Repo:
        def __init__(self, db):
            captured["db"] = db

        def create_for_admin(self, **_kwargs):
            return sample

        def delete_for_admin(self, **_kwargs):
            captured["deleted"] = True

    monkeypatch.setattr(use_case_dependencies, "SqlAlchemyPenaSeasonRepository", _Repo)

    bus = use_case_dependencies.get_pena_season_command_bus(db="db-session")
    assert isinstance(bus, CommandBus)
    assert captured["db"] == "db-session"
    created = bus.dispatch(
        CreatePenaSeasonCommand(
            pena_guid="p", admin_id=1, start_date=date(2024, 9, 1), end_date=date(2025, 6, 30)
        )
    )
    assert created.guid == "s"
    bus.dispatch(DeletePenaSeasonCommand(pena_guid="p", season_guid="s", admin_id=1))
    assert captured["deleted"] is True


def test_get_pena_season_query_bus_builds_expected_dependencies(monkeypatch):

    from core.application.ports.pena_season_port import PenaSeasonsPageResult
    from core.application.queries.pena_season_queries import ListPenaSeasonsQuery
    from shared.application.bus.buses import QueryBus

    captured: dict[str, object] = {}

    class _Repo:
        def __init__(self, db):
            captured["db"] = db

        def find_for_pena(self, *, pena_guid, page, page_size):
            return PenaSeasonsPageResult(items=[], page=page, page_size=page_size, total=0)

    monkeypatch.setattr(use_case_dependencies, "SqlAlchemyPenaSeasonRepository", _Repo)

    bus = use_case_dependencies.get_pena_season_query_bus(db="db-session")
    assert isinstance(bus, QueryBus)
    assert captured["db"] == "db-session"
    assert bus.ask(ListPenaSeasonsQuery(pena_guid="p")).total == 0


def test_get_player_profile_buses_build_expected_dependencies(monkeypatch):
    from core.application.commands.player_profile_commands import (
        UpdatePlayerProfileByAccountIdCommand,
        UpdatePlayerProfileByGuidCommand,
    )
    from core.application.queries.player_profile_queries import (
        GetPlayerProfileByAccountIdQuery,
        GetPlayerProfileByGuidQuery,
    )
    from shared.application.bus.buses import CommandBus, QueryBus

    captured: dict[str, object] = {}

    class _Repo:
        def __init__(self, db):
            captured["db"] = db

    monkeypatch.setattr(use_case_dependencies, "SqlAlchemyPlayerProfileRepository", _Repo)

    query_bus = use_case_dependencies.get_player_profile_query_bus(db="db-session")
    command_bus = use_case_dependencies.get_player_profile_command_bus(db="db-session")

    assert isinstance(query_bus, QueryBus)
    assert isinstance(command_bus, CommandBus)
    assert captured["db"] == "db-session"
    assert GetPlayerProfileByGuidQuery in query_bus._handlers
    assert GetPlayerProfileByAccountIdQuery in query_bus._handlers
    assert UpdatePlayerProfileByGuidCommand in command_bus._handlers
    assert UpdatePlayerProfileByAccountIdCommand in command_bus._handlers


def test_get_manage_season_lifecycle_use_case_builds_expected_dependencies(monkeypatch):
    _assert_single_repository_factory(
        monkeypatch,
        repo_attr="SqlAlchemySeasonCompetitionRepository",
        use_case_attr="ManageSeasonLifecycleUseCase",
        factory=use_case_dependencies.get_manage_season_lifecycle_use_case,
    )


def test_get_season_competition_use_case_builds_expected_dependencies(monkeypatch):
    captured: dict[str, object] = {}

    class _CompetitionRepo:
        def __init__(self, db):
            captured["competition_db"] = db

    class _PlayerRepo:
        def __init__(self, db):
            captured["player_db"] = db

    class _MatchRepo:
        def __init__(self, db):
            captured["match_db"] = db

    class _UseCase:
        def __init__(self, repo, *, player_repository, match_repository):
            captured["repo_type"] = type(repo)
            captured["player_repo_type"] = type(player_repository)
            captured["match_repo_type"] = type(match_repository)
            self.repo = repo

    monkeypatch.setattr(
        use_case_dependencies,
        "SqlAlchemySeasonCompetitionRepository",
        _CompetitionRepo,
    )
    monkeypatch.setattr(use_case_dependencies, "SqlAlchemySeasonPlayerRepository", _PlayerRepo)
    monkeypatch.setattr(use_case_dependencies, "SqlAlchemySeasonMatchRepository", _MatchRepo)
    monkeypatch.setattr(use_case_dependencies, "ManageSeasonCompetitionUseCase", _UseCase)

    use_case = use_case_dependencies.get_season_competition_use_case(db="db-session")

    assert isinstance(use_case, _UseCase)
    assert captured == {
        "competition_db": "db-session",
        "player_db": "db-session",
        "match_db": "db-session",
        "repo_type": _CompetitionRepo,
        "player_repo_type": _PlayerRepo,
        "match_repo_type": _MatchRepo,
    }
