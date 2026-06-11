from dataclasses import dataclass
from datetime import date

import pytest
from api.interface.controller.v1 import pena_seasons_controller
from api.interface.controller.v1.model.request.pena_seasons_request import (
    CreatePenaSeasonRequest,
    UpdatePenaSeasonRequest,
)
from auth.session import SessionData
from core.application.commands.pena_season_commands import (
    CreatePenaSeasonCommand,
    DeletePenaSeasonCommand,
    UpdatePenaSeasonCommand,
)
from core.application.models import PenaSeasonInfo, PenaSeasonsPage
from core.application.policies import FieldUpdate
from core.application.queries.pena_season_queries import (
    GetActivePenaSeasonQuery,
    GetPenaSeasonQuery,
    ListPenaSeasonsQuery,
)
from core.domain.errors import (
    InvalidPenaSeasonDataError,
    PenaSeasonAccessDeniedError,
    PenaSeasonDateOverlapError,
    PenaSeasonNotFoundError,
    PenaSeasonPenaNotFoundError,
)
from fastapi import HTTPException


def _admin_session(admin_id: int = 77) -> SessionData:
    return SessionData(
        token="tok-admin",
        user_id=admin_id,
        user_guid="admin-guid",
        user_type="admin",
        expires_at=9999999999,
    )


def _season(guid: str = "season-1") -> PenaSeasonInfo:
    return PenaSeasonInfo(
        guid=guid,
        start_date=date(2024, 9, 1),
        end_date=date(2025, 6, 30),
        points_win=3,
        points_draw=1,
        points_loss=0,
    )


def _page(total: int, page: int = 1, page_size: int = 20) -> PenaSeasonsPage:
    return PenaSeasonsPage(items=[_season()], page=page, page_size=page_size, total=total)


@dataclass
class _QueryBusStub:
    last_query: object = None

    def ask(self, query):
        self.last_query = query
        if isinstance(query, ListPenaSeasonsQuery):
            return _page(total=21, page=query.page, page_size=query.page_size)
        if isinstance(query, GetActivePenaSeasonQuery):
            return _season("season-active")
        if isinstance(query, GetPenaSeasonQuery):
            return _season(query.season_guid)
        raise AssertionError(f"unexpected query {type(query)!r}")


@dataclass
class _CommandBusStub:
    last_command: object = None

    def dispatch(self, command):
        self.last_command = command
        if isinstance(command, CreatePenaSeasonCommand):
            return _season("season-created")
        if isinstance(command, UpdatePenaSeasonCommand):
            return _season("season-updated")
        if isinstance(command, DeletePenaSeasonCommand):
            return None
        raise AssertionError(f"unexpected command {type(command)!r}")


class _RaisingQueryBus:
    def __init__(self, error):
        self._error = error

    def ask(self, _query):
        raise self._error


class _RaisingCommandBus:
    def __init__(self, error):
        self._error = error

    def dispatch(self, _command):
        raise self._error


def test_list_pena_seasons_returns_page_with_total_pages():
    bus = _QueryBusStub()
    response = pena_seasons_controller.list_pena_seasons(
        "pena-1", page=2, page_size=20, query_bus=bus, _session=object()
    )

    assert response.page == 2
    assert response.total_pages == 2
    assert response.items[0].guid == "season-1"
    assert isinstance(bus.last_query, ListPenaSeasonsQuery)
    assert bus.last_query.pena_guid == "pena-1"
    assert bus.last_query.page == 2
    assert bus.last_query.page_size == 20


def test_list_pena_seasons_maps_pena_not_found():
    with pytest.raises(HTTPException) as exc:
        pena_seasons_controller.list_pena_seasons(
            "pena-missing",
            page=1,
            page_size=20,
            query_bus=_RaisingQueryBus(PenaSeasonPenaNotFoundError()),
            _session=object(),
        )
    assert exc.value.status_code == 404
    assert exc.value.detail == "Pena not found"


def test_get_active_pena_season_returns_season():
    bus = _QueryBusStub()
    at_date = date(2025, 1, 2)
    response = pena_seasons_controller.get_active_pena_season(
        "pena-1", at_date=at_date, query_bus=bus, _session=object()
    )

    assert response.guid == "season-active"
    assert isinstance(bus.last_query, GetActivePenaSeasonQuery)
    assert bus.last_query.pena_guid == "pena-1"
    assert bus.last_query.reference_date == at_date


@pytest.mark.parametrize(
    ("error", "detail"),
    [
        (PenaSeasonPenaNotFoundError(), "Pena not found"),
        (PenaSeasonNotFoundError(), "Active season not found"),
    ],
)
def test_get_active_pena_season_maps_errors(error, detail):
    with pytest.raises(HTTPException) as exc:
        pena_seasons_controller.get_active_pena_season(
            "pena-1", at_date=None, query_bus=_RaisingQueryBus(error), _session=object()
        )
    assert exc.value.status_code == 404
    assert exc.value.detail == detail


def test_get_pena_season_returns_season():
    bus = _QueryBusStub()
    response = pena_seasons_controller.get_pena_season(
        "pena-1", "season-9", query_bus=bus, _session=object()
    )

    assert response.guid == "season-9"
    assert isinstance(bus.last_query, GetPenaSeasonQuery)
    assert bus.last_query.pena_guid == "pena-1"
    assert bus.last_query.season_guid == "season-9"


@pytest.mark.parametrize(
    ("error", "detail"),
    [
        (PenaSeasonPenaNotFoundError(), "Pena not found"),
        (PenaSeasonNotFoundError(), "Season not found"),
    ],
)
def test_get_pena_season_maps_errors(error, detail):
    with pytest.raises(HTTPException) as exc:
        pena_seasons_controller.get_pena_season(
            "pena-1", "season-9", query_bus=_RaisingQueryBus(error), _session=object()
        )
    assert exc.value.status_code == 404
    assert exc.value.detail == detail


def test_create_pena_season_success_passes_admin_id_and_payload():
    bus = _CommandBusStub()
    payload = CreatePenaSeasonRequest(start_date=date(2024, 9, 1), end_date=date(2025, 6, 30))
    response = pena_seasons_controller.create_pena_season(
        "pena-1", payload=payload, admin_session=_admin_session(12), command_bus=bus
    )

    assert response.guid == "season-created"
    command = bus.last_command
    assert isinstance(command, CreatePenaSeasonCommand)
    assert command.pena_guid == "pena-1"
    assert command.admin_id == 12
    assert command.start_date == date(2024, 9, 1)
    assert command.end_date == date(2025, 6, 30)
    assert (command.points_win, command.points_draw, command.points_loss) == (3, 1, 0)


@pytest.mark.parametrize(
    ("error", "status_code", "detail"),
    [
        (InvalidPenaSeasonDataError(), 400, "Invalid season date range"),
        (PenaSeasonPenaNotFoundError(), 404, "Pena not found"),
        (PenaSeasonAccessDeniedError(), 403, "Admin does not manage this pena"),
        (PenaSeasonDateOverlapError(), 409, "Season range overlaps an existing season"),
    ],
)
def test_create_pena_season_maps_errors(error, status_code, detail):
    payload = CreatePenaSeasonRequest(start_date=date(2024, 9, 1), end_date=date(2025, 6, 30))
    with pytest.raises(HTTPException) as exc:
        pena_seasons_controller.create_pena_season(
            "pena-1",
            payload=payload,
            admin_session=_admin_session(),
            command_bus=_RaisingCommandBus(error),
        )
    assert exc.value.status_code == status_code
    assert exc.value.detail == detail


def test_update_pena_season_sets_model_fields_flags_for_partial_update():
    bus = _CommandBusStub()
    payload = UpdatePenaSeasonRequest(points_win=5)

    response = pena_seasons_controller.update_pena_season(
        "pena-1", "season-1", payload=payload, admin_session=_admin_session(33), command_bus=bus
    )

    assert response.guid == "season-updated"
    command = bus.last_command
    assert isinstance(command, UpdatePenaSeasonCommand)
    assert command.admin_id == 33
    assert command.points_win == FieldUpdate.set(5)
    assert command.points_draw == FieldUpdate.keep()
    assert command.points_loss == FieldUpdate.keep()
    assert command.start_date == FieldUpdate.keep()
    assert command.end_date == FieldUpdate.keep()


@pytest.mark.parametrize(
    ("error", "status_code", "detail"),
    [
        (InvalidPenaSeasonDataError(), 400, "Invalid season update data"),
        (PenaSeasonPenaNotFoundError(), 404, "Pena not found"),
        (PenaSeasonNotFoundError(), 404, "Season not found"),
        (PenaSeasonAccessDeniedError(), 403, "Admin does not manage this pena"),
        (PenaSeasonDateOverlapError(), 409, "Season range overlaps an existing season"),
    ],
)
def test_update_pena_season_maps_errors(error, status_code, detail):
    with pytest.raises(HTTPException) as exc:
        pena_seasons_controller.update_pena_season(
            "pena-1",
            "season-1",
            payload=UpdatePenaSeasonRequest(points_win=4),
            admin_session=_admin_session(),
            command_bus=_RaisingCommandBus(error),
        )
    assert exc.value.status_code == status_code
    assert exc.value.detail == detail


def test_delete_pena_season_returns_no_content():
    bus = _CommandBusStub()
    response = pena_seasons_controller.delete_pena_season(
        "pena-1", "season-1", admin_session=_admin_session(44), command_bus=bus
    )

    assert response.status_code == 204
    command = bus.last_command
    assert isinstance(command, DeletePenaSeasonCommand)
    assert command.pena_guid == "pena-1"
    assert command.season_guid == "season-1"
    assert command.admin_id == 44


@pytest.mark.parametrize(
    ("error", "status_code", "detail"),
    [
        (PenaSeasonPenaNotFoundError(), 404, "Pena not found"),
        (PenaSeasonNotFoundError(), 404, "Season not found"),
        (PenaSeasonAccessDeniedError(), 403, "Admin does not manage this pena"),
    ],
)
def test_delete_pena_season_maps_errors(error, status_code, detail):
    with pytest.raises(HTTPException) as exc:
        pena_seasons_controller.delete_pena_season(
            "pena-1",
            "season-1",
            admin_session=_admin_session(),
            command_bus=_RaisingCommandBus(error),
        )
    assert exc.value.status_code == status_code
    assert exc.value.detail == detail
