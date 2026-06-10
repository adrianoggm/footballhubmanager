from dataclasses import dataclass
from datetime import date

import pytest
from core.application.commands.pena_season_command_handlers import (
    CreatePenaSeasonHandler,
    DeletePenaSeasonHandler,
    UpdatePenaSeasonHandler,
)
from core.application.commands.pena_season_commands import (
    CreatePenaSeasonCommand,
    DeletePenaSeasonCommand,
    UpdatePenaSeasonCommand,
)
from core.application.policies import FieldUpdate
from core.application.ports.pena_season_port import PenaSeasonResult, PenaSeasonsPageResult
from core.application.queries.pena_season_queries import (
    GetActivePenaSeasonQuery,
    GetPenaSeasonQuery,
    ListPenaSeasonsQuery,
)
from core.application.queries.pena_season_query_handlers import (
    GetActivePenaSeasonHandler,
    GetPenaSeasonHandler,
    ListPenaSeasonsHandler,
)
from core.domain.errors import (
    InvalidPenaSeasonDataError,
    PenaSeasonAccessDeniedError,
    PenaSeasonDateOverlapError,
    PenaSeasonNotFoundError,
    PenaSeasonPenaNotFoundError,
)


@dataclass
class _FakeRepo:
    should_raise_pena_not_found: bool = False
    should_raise_access_denied: bool = False
    should_raise_overlap: bool = False
    should_raise_season_not_found: bool = False
    season_exists: bool = True
    active_season_exists: bool = True
    last_payload: dict | None = None

    @staticmethod
    def _sample_result() -> PenaSeasonResult:
        return PenaSeasonResult(
            guid="season-guid",
            start_date=date(2024, 9, 1),
            end_date=date(2025, 6, 30),
            points_win=3,
            points_draw=1,
            points_loss=0,
        )

    def find_for_pena(self, *, pena_guid: str, page: int, page_size: int) -> PenaSeasonsPageResult:
        if self.should_raise_pena_not_found:
            raise PenaSeasonPenaNotFoundError()
        self.last_payload = {"pena_guid": pena_guid, "page": page, "page_size": page_size}
        return PenaSeasonsPageResult(
            items=[self._sample_result()], page=page, page_size=page_size, total=1
        )

    def find_by_guid(self, *, pena_guid: str, season_guid: str) -> PenaSeasonResult | None:
        if self.should_raise_pena_not_found:
            raise PenaSeasonPenaNotFoundError()
        self.last_payload = {"pena_guid": pena_guid, "season_guid": season_guid}
        return self._sample_result() if self.season_exists else None

    def find_active_for_pena(
        self, *, pena_guid: str, reference_date: date
    ) -> PenaSeasonResult | None:
        if self.should_raise_pena_not_found:
            raise PenaSeasonPenaNotFoundError()
        self.last_payload = {"pena_guid": pena_guid, "reference_date": reference_date}
        return self._sample_result() if self.active_season_exists else None

    def create_for_admin(
        self, *, pena_guid, admin_id, start_date, end_date, points_win, points_draw, points_loss
    ) -> PenaSeasonResult:
        if self.should_raise_pena_not_found:
            raise PenaSeasonPenaNotFoundError()
        if self.should_raise_access_denied:
            raise PenaSeasonAccessDeniedError()
        if self.should_raise_overlap:
            raise PenaSeasonDateOverlapError()
        self.last_payload = {
            "pena_guid": pena_guid,
            "admin_id": admin_id,
            "start_date": start_date,
            "end_date": end_date,
            "points_win": points_win,
            "points_draw": points_draw,
            "points_loss": points_loss,
        }
        return self._sample_result()

    def update_for_admin(
        self,
        *,
        pena_guid,
        season_guid,
        admin_id,
        start_date,
        end_date,
        points_win,
        points_draw,
        points_loss,
    ) -> PenaSeasonResult:
        if self.should_raise_pena_not_found:
            raise PenaSeasonPenaNotFoundError()
        if self.should_raise_access_denied:
            raise PenaSeasonAccessDeniedError()
        if self.should_raise_season_not_found:
            raise PenaSeasonNotFoundError()
        if self.should_raise_overlap:
            raise PenaSeasonDateOverlapError()
        resolved_end = end_date.value if end_date.is_set() else date(2025, 6, 30)
        self.last_payload = {
            "pena_guid": pena_guid,
            "season_guid": season_guid,
            "admin_id": admin_id,
            "start_date": start_date,
            "end_date": end_date,
            "points_win": points_win,
            "points_draw": points_draw,
            "points_loss": points_loss,
        }
        return PenaSeasonResult(
            guid=season_guid,
            start_date=date(2024, 9, 1),
            end_date=resolved_end,
            points_win=3,
            points_draw=1,
            points_loss=0,
        )

    def delete_for_admin(self, *, pena_guid, season_guid, admin_id) -> None:
        if self.should_raise_pena_not_found:
            raise PenaSeasonPenaNotFoundError()
        if self.should_raise_access_denied:
            raise PenaSeasonAccessDeniedError()
        if self.should_raise_season_not_found:
            raise PenaSeasonNotFoundError()
        self.last_payload = {
            "pena_guid": pena_guid,
            "season_guid": season_guid,
            "admin_id": admin_id,
        }


# --- Queries ---


def test_list_handler_returns_page_data():
    repo = _FakeRepo()
    page = ListPenaSeasonsHandler(repo).handle(
        ListPenaSeasonsQuery(pena_guid="pena-guid", page=2, page_size=10)
    )
    assert repo.last_payload == {"pena_guid": "pena-guid", "page": 2, "page_size": 10}
    assert page.page == 2
    assert page.total == 1
    assert page.items[0].guid == "season-guid"


def test_get_handler_raises_not_found_when_missing():
    handler = GetPenaSeasonHandler(_FakeRepo(season_exists=False))
    with pytest.raises(PenaSeasonNotFoundError):
        handler.handle(GetPenaSeasonQuery(pena_guid="pena-guid", season_guid="season-guid"))


def test_get_handler_propagates_pena_not_found():
    handler = GetPenaSeasonHandler(_FakeRepo(should_raise_pena_not_found=True))
    with pytest.raises(PenaSeasonPenaNotFoundError):
        handler.handle(GetPenaSeasonQuery(pena_guid="pena-guid", season_guid="season-guid"))


def test_get_active_handler_raises_not_found_when_missing():
    handler = GetActivePenaSeasonHandler(_FakeRepo(active_season_exists=False))
    with pytest.raises(PenaSeasonNotFoundError):
        handler.handle(
            GetActivePenaSeasonQuery(pena_guid="pena-guid", reference_date=date(2025, 3, 1))
        )


def test_get_active_handler_passes_reference_date():
    repo = _FakeRepo()
    GetActivePenaSeasonHandler(repo).handle(
        GetActivePenaSeasonQuery(pena_guid="pena-guid", reference_date=date(2025, 3, 1))
    )
    assert repo.last_payload == {"pena_guid": "pena-guid", "reference_date": date(2025, 3, 1)}


# --- Commands ---


def test_create_handler_rejects_invalid_date_range():
    repo = _FakeRepo()
    with pytest.raises(InvalidPenaSeasonDataError):
        CreatePenaSeasonHandler(repo).handle(
            CreatePenaSeasonCommand(
                pena_guid="pena-guid",
                admin_id=10,
                start_date=date(2025, 7, 1),
                end_date=date(2025, 6, 30),
            )
        )
    assert repo.last_payload is None


def test_create_handler_maps_pena_not_found():
    handler = CreatePenaSeasonHandler(_FakeRepo(should_raise_pena_not_found=True))
    with pytest.raises(PenaSeasonPenaNotFoundError):
        handler.handle(
            CreatePenaSeasonCommand(
                pena_guid="pena-guid",
                admin_id=10,
                start_date=date(2024, 9, 1),
                end_date=date(2025, 6, 30),
            )
        )


def test_create_handler_propagates_access_denied_and_overlap():
    with pytest.raises(PenaSeasonAccessDeniedError):
        CreatePenaSeasonHandler(_FakeRepo(should_raise_access_denied=True)).handle(
            CreatePenaSeasonCommand(
                pena_guid="p", admin_id=10, start_date=date(2024, 9, 1), end_date=date(2025, 6, 30)
            )
        )
    with pytest.raises(PenaSeasonDateOverlapError):
        CreatePenaSeasonHandler(_FakeRepo(should_raise_overlap=True)).handle(
            CreatePenaSeasonCommand(
                pena_guid="p", admin_id=10, start_date=date(2024, 9, 1), end_date=date(2025, 6, 30)
            )
        )


def test_update_handler_positive_partial_update():
    repo = _FakeRepo()
    updated = UpdatePenaSeasonHandler(repo).handle(
        UpdatePenaSeasonCommand(
            pena_guid="pena-guid",
            season_guid="season-guid",
            admin_id=55,
            end_date=FieldUpdate.set(date(2025, 7, 15)),
        )
    )
    assert repo.last_payload["end_date"] == FieldUpdate.set(date(2025, 7, 15))
    assert repo.last_payload["start_date"] == FieldUpdate.keep()
    assert updated.end_date == date(2025, 7, 15)


def test_update_handler_rejects_empty_patch():
    with pytest.raises(InvalidPenaSeasonDataError):
        UpdatePenaSeasonHandler(_FakeRepo()).handle(
            UpdatePenaSeasonCommand(pena_guid="p", season_guid="s", admin_id=55)
        )


def test_update_handler_rejects_null_date_values():
    with pytest.raises(InvalidPenaSeasonDataError):
        UpdatePenaSeasonHandler(_FakeRepo()).handle(
            UpdatePenaSeasonCommand(
                pena_guid="p", season_guid="s", admin_id=55, start_date=FieldUpdate.set(None)
            )
        )


def test_update_handler_propagates_access_denied():
    handler = UpdatePenaSeasonHandler(_FakeRepo(should_raise_access_denied=True))
    with pytest.raises(PenaSeasonAccessDeniedError):
        handler.handle(
            UpdatePenaSeasonCommand(
                pena_guid="p",
                season_guid="s",
                admin_id=55,
                end_date=FieldUpdate.set(date(2025, 7, 15)),
            )
        )


def test_update_handler_propagates_season_not_found_and_overlap():
    with pytest.raises(PenaSeasonNotFoundError):
        UpdatePenaSeasonHandler(_FakeRepo(should_raise_season_not_found=True)).handle(
            UpdatePenaSeasonCommand(
                pena_guid="p",
                season_guid="s",
                admin_id=1,
                start_date=FieldUpdate.set(date(2024, 8, 1)),
            )
        )
    with pytest.raises(PenaSeasonDateOverlapError):
        UpdatePenaSeasonHandler(_FakeRepo(should_raise_overlap=True)).handle(
            UpdatePenaSeasonCommand(
                pena_guid="p",
                season_guid="s",
                admin_id=1,
                start_date=FieldUpdate.set(date(2024, 8, 1)),
            )
        )


def test_delete_handler_positive_calls_repository():
    repo = _FakeRepo()
    DeletePenaSeasonHandler(repo).handle(
        DeletePenaSeasonCommand(pena_guid="pena-guid", season_guid="season-guid", admin_id=1)
    )
    assert repo.last_payload == {
        "pena_guid": "pena-guid",
        "season_guid": "season-guid",
        "admin_id": 1,
    }


def test_delete_handler_propagates_errors():
    with pytest.raises(PenaSeasonNotFoundError):
        DeletePenaSeasonHandler(_FakeRepo(should_raise_season_not_found=True)).handle(
            DeletePenaSeasonCommand(pena_guid="p", season_guid="s", admin_id=1)
        )
    with pytest.raises(PenaSeasonAccessDeniedError):
        DeletePenaSeasonHandler(_FakeRepo(should_raise_access_denied=True)).handle(
            DeletePenaSeasonCommand(pena_guid="p", season_guid="s", admin_id=1)
        )
