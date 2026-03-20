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


def test_get_pena_players_use_case_builds_expected_dependencies(monkeypatch):
    _assert_single_repository_factory(
        monkeypatch,
        repo_attr="SqlAlchemyPenaPlayerQueryRepository",
        use_case_attr="GetPenaPlayersUseCase",
        factory=use_case_dependencies.get_pena_players_use_case,
    )


def test_get_manage_pena_seasons_use_case_builds_expected_dependencies(monkeypatch):
    _assert_single_repository_factory(
        monkeypatch,
        repo_attr="SqlAlchemyPenaSeasonRepository",
        use_case_attr="ManagePenaSeasonsUseCase",
        factory=use_case_dependencies.get_manage_pena_seasons_use_case,
    )


def test_get_player_profile_use_case_builds_expected_dependencies(monkeypatch):
    _assert_single_repository_factory(
        monkeypatch,
        repo_attr="SqlAlchemyPlayerProfileRepository",
        use_case_attr="GetPlayerProfileUseCase",
        factory=use_case_dependencies.get_player_profile_use_case,
    )


def test_get_update_player_profile_use_case_builds_expected_dependencies(monkeypatch):
    _assert_single_repository_factory(
        monkeypatch,
        repo_attr="SqlAlchemyPlayerProfileRepository",
        use_case_attr="UpdatePlayerProfileUseCase",
        factory=use_case_dependencies.get_update_player_profile_use_case,
    )


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
