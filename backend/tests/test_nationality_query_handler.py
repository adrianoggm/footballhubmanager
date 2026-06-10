from core.application.queries.nationality_query import GetNationalitiesQuery
from core.application.queries.nationality_query_handler import GetNationalitiesHandler


class _Repo:
    def __init__(self):
        self.called = False

    def list_names(self):
        self.called = True
        return ["Spain", "France", "Italy"]


def test_get_nationalities_handler_returns_repository_names():
    repo = _Repo()
    result = GetNationalitiesHandler(repo).handle(GetNationalitiesQuery())

    assert repo.called is True
    assert result == ["Spain", "France", "Italy"]
