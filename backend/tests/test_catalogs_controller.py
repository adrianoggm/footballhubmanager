from api.dependencies import use_cases as use_case_dependencies
from api.interface.controller.v1 import catalogs_controller


def test_get_nationalities_use_case_builds_expected_dependencies(monkeypatch):
    captured: dict[str, object] = {}

    class _Repo:
        def __init__(self, db):
            captured["db"] = db

    class _UseCase:
        def __init__(self, repo):
            captured["repo_type"] = type(repo)
            self.repo = repo

    monkeypatch.setattr(use_case_dependencies, "SqlAlchemyNationalityQueryRepository", _Repo)
    monkeypatch.setattr(use_case_dependencies, "GetNationalitiesUseCase", _UseCase)

    use_case = catalogs_controller.get_nationalities_use_case(db="db-session")
    assert isinstance(use_case, _UseCase)
    assert captured["db"] == "db-session"
    assert captured["repo_type"] is _Repo


def test_list_nationalities_returns_use_case_result():
    class _UseCase:
        def execute(self):
            return ["Spain", "France"]

    assert catalogs_controller.list_nationalities(use_case=_UseCase()) == ["Spain", "France"]
