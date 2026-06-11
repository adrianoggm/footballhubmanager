from api.dependencies import use_cases as use_case_dependencies
from api.interface.controller.v1 import catalogs_controller
from core.application.queries.nationality_query import GetNationalitiesQuery


def test_get_nationalities_query_bus_builds_expected_dependencies(monkeypatch):
    from shared.application.bus.buses import QueryBus

    captured: dict[str, object] = {}

    class _Repo:
        def __init__(self, db):
            captured["db"] = db

    monkeypatch.setattr(use_case_dependencies, "SqlAlchemyNationalityQueryRepository", _Repo)

    bus = catalogs_controller.get_nationalities_query_bus(db="db-session")
    assert isinstance(bus, QueryBus)
    assert captured["db"] == "db-session"
    assert GetNationalitiesQuery in bus._handlers


def test_list_nationalities_returns_query_bus_result():
    class _QueryBus:
        def ask(self, query):
            assert isinstance(query, GetNationalitiesQuery)
            return ["Spain", "France"]

    assert catalogs_controller.list_nationalities(query_bus=_QueryBus()) == ["Spain", "France"]
