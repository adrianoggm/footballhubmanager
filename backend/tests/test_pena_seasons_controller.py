from dataclasses import dataclass
from datetime import date

import pytest
from api.interface.controller.v1 import pena_seasons_controller
from api.interface.controller.v1.model.request.pena_seasons_request import (
    CreatePenaSeasonRequest,
    UpdatePenaSeasonRequest,
)
from auth.session import SessionData
from core.application.models import (
    PenaSeasonCreate,
    PenaSeasonInfo,
    PenaSeasonsPage,
)
from core.application.policies import FieldUpdate
from core.application.use_cases.manage_pena_seasons_usecase import (
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
class _UseCaseStub:
    last_call: dict | None = None

    def list_for_pena(self, *, pena_guid: str, page: int, page_size: int):
        self.last_call = {"pena_guid": pena_guid, "page": page, "page_size": page_size}
        return _page(total=21, page=page, page_size=page_size)

    def get_active_for_pena(self, *, pena_guid: str, reference_date: date | None):
        self.last_call = {"pena_guid": pena_guid, "reference_date": reference_date}
        return _season("season-active")

    def get_by_guid(self, *, pena_guid: str, season_guid: str):
        self.last_call = {"pena_guid": pena_guid, "season_guid": season_guid}
        return _season(season_guid)

    def create_for_admin(self, *, pena_guid: str, admin_id: int, data: PenaSeasonCreate):
        self.last_call = {"pena_guid": pena_guid, "admin_id": admin_id, "data": data}
        return _season("season-created")

    def update_for_admin(self, *, pena_guid: str, season_guid: str, admin_id: int, update):
        self.last_call = {
            "pena_guid": pena_guid,
            "season_guid": season_guid,
            "admin_id": admin_id,
            "update": update,
        }
        return _season("season-updated")

    def delete_for_admin(self, *, pena_guid: str, season_guid: str, admin_id: int):
        self.last_call = {"pena_guid": pena_guid, "season_guid": season_guid, "admin_id": admin_id}


def test_list_pena_seasons_returns_page_with_total_pages():
    use_case = _UseCaseStub()
    response = pena_seasons_controller.list_pena_seasons(
        "pena-1",
        page=2,
        page_size=20,
        use_case=use_case,
        _session=object(),
    )

    assert response.page == 2
    assert response.total_pages == 2
    assert response.items[0].guid == "season-1"
    assert use_case.last_call == {"pena_guid": "pena-1", "page": 2, "page_size": 20}


def test_list_pena_seasons_maps_pena_not_found():
    class _UseCase:
        def list_for_pena(self, **_kwargs):
            raise PenaSeasonPenaNotFoundError()

    with pytest.raises(HTTPException) as exc:
        pena_seasons_controller.list_pena_seasons(
            "pena-missing",
            page=1,
            page_size=20,
            use_case=_UseCase(),
            _session=object(),
        )
    assert exc.value.status_code == 404
    assert exc.value.detail == "Pena not found"


def test_get_active_pena_season_returns_season():
    use_case = _UseCaseStub()
    at_date = date(2025, 1, 2)
    response = pena_seasons_controller.get_active_pena_season(
        "pena-1",
        at_date=at_date,
        use_case=use_case,
        _session=object(),
    )

    assert response.guid == "season-active"
    assert use_case.last_call == {"pena_guid": "pena-1", "reference_date": at_date}


@pytest.mark.parametrize(
    ("error", "detail"),
    [
        (PenaSeasonPenaNotFoundError(), "Pena not found"),
        (PenaSeasonNotFoundError(), "Active season not found"),
    ],
)
def test_get_active_pena_season_maps_errors(error, detail):
    class _UseCase:
        def get_active_for_pena(self, **_kwargs):
            raise error

    with pytest.raises(HTTPException) as exc:
        pena_seasons_controller.get_active_pena_season(
            "pena-1",
            at_date=None,
            use_case=_UseCase(),
            _session=object(),
        )
    assert exc.value.status_code == 404
    assert exc.value.detail == detail


def test_get_pena_season_returns_season():
    use_case = _UseCaseStub()
    response = pena_seasons_controller.get_pena_season(
        "pena-1",
        "season-9",
        use_case=use_case,
        _session=object(),
    )

    assert response.guid == "season-9"
    assert use_case.last_call == {"pena_guid": "pena-1", "season_guid": "season-9"}


@pytest.mark.parametrize(
    ("error", "detail"),
    [
        (PenaSeasonPenaNotFoundError(), "Pena not found"),
        (PenaSeasonNotFoundError(), "Season not found"),
    ],
)
def test_get_pena_season_maps_errors(error, detail):
    class _UseCase:
        def get_by_guid(self, **_kwargs):
            raise error

    with pytest.raises(HTTPException) as exc:
        pena_seasons_controller.get_pena_season(
            "pena-1",
            "season-9",
            use_case=_UseCase(),
            _session=object(),
        )
    assert exc.value.status_code == 404
    assert exc.value.detail == detail


def test_create_pena_season_success_passes_admin_id_and_payload():
    use_case = _UseCaseStub()
    payload = CreatePenaSeasonRequest(start_date=date(2024, 9, 1), end_date=date(2025, 6, 30))
    response = pena_seasons_controller.create_pena_season(
        "pena-1",
        payload=payload,
        admin_session=_admin_session(12),
        use_case=use_case,
    )

    assert response.guid == "season-created"
    assert use_case.last_call is not None
    assert use_case.last_call["pena_guid"] == "pena-1"
    assert use_case.last_call["admin_id"] == 12
    assert use_case.last_call["data"] == PenaSeasonCreate(
        start_date=date(2024, 9, 1),
        end_date=date(2025, 6, 30),
        points_win=3,
        points_draw=1,
        points_loss=0,
    )


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
    class _UseCase:
        def create_for_admin(self, **_kwargs):
            raise error

    payload = CreatePenaSeasonRequest(start_date=date(2024, 9, 1), end_date=date(2025, 6, 30))
    with pytest.raises(HTTPException) as exc:
        pena_seasons_controller.create_pena_season(
            "pena-1",
            payload=payload,
            admin_session=_admin_session(),
            use_case=_UseCase(),
        )
    assert exc.value.status_code == status_code
    assert exc.value.detail == detail


def test_update_pena_season_sets_model_fields_flags_for_partial_update():
    use_case = _UseCaseStub()
    payload = UpdatePenaSeasonRequest(points_win=5)

    response = pena_seasons_controller.update_pena_season(
        "pena-1",
        "season-1",
        payload=payload,
        admin_session=_admin_session(33),
        use_case=use_case,
    )

    assert response.guid == "season-updated"
    update = use_case.last_call["update"]
    assert use_case.last_call["admin_id"] == 33
    assert update.points_win == FieldUpdate.set(5)
    assert update.points_draw == FieldUpdate.keep()
    assert update.points_loss == FieldUpdate.keep()
    assert update.start_date == FieldUpdate.keep()
    assert update.end_date == FieldUpdate.keep()


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
    class _UseCase:
        def update_for_admin(self, **_kwargs):
            raise error

    with pytest.raises(HTTPException) as exc:
        pena_seasons_controller.update_pena_season(
            "pena-1",
            "season-1",
            payload=UpdatePenaSeasonRequest(points_win=4),
            admin_session=_admin_session(),
            use_case=_UseCase(),
        )
    assert exc.value.status_code == status_code
    assert exc.value.detail == detail


def test_delete_pena_season_returns_no_content():
    use_case = _UseCaseStub()
    response = pena_seasons_controller.delete_pena_season(
        "pena-1",
        "season-1",
        admin_session=_admin_session(44),
        use_case=use_case,
    )

    assert response.status_code == 204
    assert use_case.last_call == {"pena_guid": "pena-1", "season_guid": "season-1", "admin_id": 44}


@pytest.mark.parametrize(
    ("error", "status_code", "detail"),
    [
        (PenaSeasonPenaNotFoundError(), 404, "Pena not found"),
        (PenaSeasonNotFoundError(), 404, "Season not found"),
        (PenaSeasonAccessDeniedError(), 403, "Admin does not manage this pena"),
    ],
)
def test_delete_pena_season_maps_errors(error, status_code, detail):
    class _UseCase:
        def delete_for_admin(self, **_kwargs):
            raise error

    with pytest.raises(HTTPException) as exc:
        pena_seasons_controller.delete_pena_season(
            "pena-1",
            "season-1",
            admin_session=_admin_session(),
            use_case=_UseCase(),
        )
    assert exc.value.status_code == status_code
    assert exc.value.detail == detail
