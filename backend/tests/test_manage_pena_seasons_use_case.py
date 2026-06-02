from dataclasses import dataclass
from datetime import date

import pytest
from persistence.application.ports.pena_season_port import (
    InvalidSeasonDateRangeError,
    PenaNotFoundError,
    PenaNotManagedByAdminError,
    PenaSeasonResult,
    PenaSeasonsPageResult,
    SeasonDateRangeOverlapError,
    SeasonNotFoundError,
)
from persistence.application.update_policies import FieldUpdate
from persistence.application.use_cases.manage_pena_seasons_usecase import (
    InvalidPenaSeasonDataError,
    ManagePenaSeasonsUseCase,
    PenaSeasonAccessDeniedError,
    PenaSeasonCreate,
    PenaSeasonDateOverlapError,
    PenaSeasonNotFoundError,
    PenaSeasonPenaNotFoundError,
    PenaSeasonUpdate,
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
            raise PenaNotFoundError()
        self.last_payload = {"pena_guid": pena_guid, "page": page, "page_size": page_size}
        return PenaSeasonsPageResult(
            items=[self._sample_result()],
            page=page,
            page_size=page_size,
            total=1,
        )

    def find_by_guid(self, *, pena_guid: str, season_guid: str) -> PenaSeasonResult | None:
        if self.should_raise_pena_not_found:
            raise PenaNotFoundError()
        self.last_payload = {"pena_guid": pena_guid, "season_guid": season_guid}
        if not self.season_exists:
            return None
        return self._sample_result()

    def find_active_for_pena(
        self, *, pena_guid: str, reference_date: date
    ) -> PenaSeasonResult | None:
        if self.should_raise_pena_not_found:
            raise PenaNotFoundError()
        self.last_payload = {"pena_guid": pena_guid, "reference_date": reference_date}
        if not self.active_season_exists:
            return None
        return self._sample_result()

    def create_for_admin(
        self,
        *,
        pena_guid: str,
        admin_id: int,
        start_date: date,
        end_date: date,
        points_win: int,
        points_draw: int,
        points_loss: int,
    ) -> PenaSeasonResult:
        if self.should_raise_pena_not_found:
            raise PenaNotFoundError()
        if self.should_raise_access_denied:
            raise PenaNotManagedByAdminError()
        if self.should_raise_overlap:
            raise SeasonDateRangeOverlapError()
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
        pena_guid: str,
        season_guid: str,
        admin_id: int,
        start_date,
        end_date,
        points_win,
        points_draw,
        points_loss,
    ) -> PenaSeasonResult:
        if self.should_raise_pena_not_found:
            raise PenaNotFoundError()
        if self.should_raise_access_denied:
            raise PenaNotManagedByAdminError()
        if self.should_raise_season_not_found:
            raise SeasonNotFoundError()
        if (
            (start_date.is_set() and start_date.value is None)
            or (end_date.is_set() and end_date.value is None)
            or (points_win.is_set() and points_win.value is None)
            or (points_draw.is_set() and points_draw.value is None)
            or (points_loss.is_set() and points_loss.value is None)
            or (
                start_date.is_set()
                and end_date.is_set()
                and start_date.value is not None
                and end_date.value is not None
                and start_date.value > end_date.value
            )
        ):
            raise InvalidSeasonDateRangeError()
        if self.should_raise_overlap:
            raise SeasonDateRangeOverlapError()

        resolved_start = start_date.value if start_date.is_set() else date(2024, 9, 1)
        resolved_end = end_date.value if end_date.is_set() else date(2025, 6, 30)
        resolved_points_win = points_win.value if points_win.is_set() else 3
        resolved_points_draw = points_draw.value if points_draw.is_set() else 1
        resolved_points_loss = points_loss.value if points_loss.is_set() else 0
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
            start_date=resolved_start,
            end_date=resolved_end,
            points_win=resolved_points_win,
            points_draw=resolved_points_draw,
            points_loss=resolved_points_loss,
        )

    def delete_for_admin(self, *, pena_guid: str, season_guid: str, admin_id: int) -> None:
        if self.should_raise_pena_not_found:
            raise PenaNotFoundError()
        if self.should_raise_access_denied:
            raise PenaNotManagedByAdminError()
        if self.should_raise_season_not_found:
            raise SeasonNotFoundError()
        self.last_payload = {
            "pena_guid": pena_guid,
            "season_guid": season_guid,
            "admin_id": admin_id,
        }


def test_list_for_pena_returns_page_data():
    repo = _FakeRepo()
    use_case = ManagePenaSeasonsUseCase(repo)

    result = use_case.list_for_pena(pena_guid="pena-guid", page=2, page_size=10)

    assert repo.last_payload == {"pena_guid": "pena-guid", "page": 2, "page_size": 10}
    assert result.page == 2
    assert result.page_size == 10
    assert result.total == 1
    assert result.items[0].guid == "season-guid"


def test_get_by_guid_raises_not_found_when_missing():
    repo = _FakeRepo(season_exists=False)
    use_case = ManagePenaSeasonsUseCase(repo)

    with pytest.raises(PenaSeasonNotFoundError):
        use_case.get_by_guid(pena_guid="pena-guid", season_guid="season-guid")


def test_get_by_guid_maps_pena_not_found():
    repo = _FakeRepo(should_raise_pena_not_found=True)
    use_case = ManagePenaSeasonsUseCase(repo)

    with pytest.raises(PenaSeasonPenaNotFoundError):
        use_case.get_by_guid(pena_guid="pena-guid", season_guid="season-guid")


def test_get_active_for_pena_raises_not_found_when_missing():
    repo = _FakeRepo(active_season_exists=False)
    use_case = ManagePenaSeasonsUseCase(repo)

    with pytest.raises(PenaSeasonNotFoundError):
        use_case.get_active_for_pena(pena_guid="pena-guid", reference_date=date(2025, 3, 1))


def test_get_active_for_pena_maps_pena_not_found():
    repo = _FakeRepo(should_raise_pena_not_found=True)
    use_case = ManagePenaSeasonsUseCase(repo)

    with pytest.raises(PenaSeasonPenaNotFoundError):
        use_case.get_active_for_pena(pena_guid="pena-guid", reference_date=date(2025, 3, 1))


def test_get_active_for_pena_passes_reference_date_to_repository():
    repo = _FakeRepo()
    use_case = ManagePenaSeasonsUseCase(repo)

    use_case.get_active_for_pena(pena_guid="pena-guid", reference_date=date(2025, 3, 1))

    assert repo.last_payload == {"pena_guid": "pena-guid", "reference_date": date(2025, 3, 1)}


def test_create_for_admin_rejects_invalid_date_range():
    repo = _FakeRepo()
    use_case = ManagePenaSeasonsUseCase(repo)

    with pytest.raises(InvalidPenaSeasonDataError):
        use_case.create_for_admin(
            pena_guid="pena-guid",
            admin_id=10,
            data=PenaSeasonCreate(
                start_date=date(2025, 7, 1),
                end_date=date(2025, 6, 30),
            ),
        )
    assert repo.last_payload is None


def test_update_for_admin_positive_partial_update():
    repo = _FakeRepo()
    use_case = ManagePenaSeasonsUseCase(repo)

    updated = use_case.update_for_admin(
        pena_guid="pena-guid",
        season_guid="season-guid",
        admin_id=55,
        update=PenaSeasonUpdate(
            end_date=FieldUpdate.set(date(2025, 7, 15)),
        ),
    )

    assert repo.last_payload == {
        "pena_guid": "pena-guid",
        "season_guid": "season-guid",
        "admin_id": 55,
        "start_date": FieldUpdate.keep(),
        "end_date": FieldUpdate.set(date(2025, 7, 15)),
        "points_win": FieldUpdate.keep(),
        "points_draw": FieldUpdate.keep(),
        "points_loss": FieldUpdate.keep(),
    }
    assert updated.end_date == date(2025, 7, 15)


def test_update_for_admin_rejects_empty_patch_payload():
    repo = _FakeRepo()
    use_case = ManagePenaSeasonsUseCase(repo)

    with pytest.raises(InvalidPenaSeasonDataError):
        use_case.update_for_admin(
            pena_guid="pena-guid",
            season_guid="season-guid",
            admin_id=55,
            update=PenaSeasonUpdate(),
        )


def test_update_for_admin_rejects_null_date_values():
    repo = _FakeRepo()
    use_case = ManagePenaSeasonsUseCase(repo)

    with pytest.raises(InvalidPenaSeasonDataError):
        use_case.update_for_admin(
            pena_guid="pena-guid",
            season_guid="season-guid",
            admin_id=55,
            update=PenaSeasonUpdate(start_date=FieldUpdate.set(None)),
        )


def test_update_for_admin_maps_access_denied():
    repo = _FakeRepo(should_raise_access_denied=True)
    use_case = ManagePenaSeasonsUseCase(repo)

    with pytest.raises(PenaSeasonAccessDeniedError):
        use_case.update_for_admin(
            pena_guid="pena-guid",
            season_guid="season-guid",
            admin_id=55,
            update=PenaSeasonUpdate(end_date=FieldUpdate.set(date(2025, 7, 15))),
        )


def test_delete_for_admin_positive_calls_repository():
    repo = _FakeRepo()
    use_case = ManagePenaSeasonsUseCase(repo)

    use_case.delete_for_admin(
        pena_guid="pena-guid",
        season_guid="season-guid",
        admin_id=1,
    )

    assert repo.last_payload == {
        "pena_guid": "pena-guid",
        "season_guid": "season-guid",
        "admin_id": 1,
    }


def test_create_for_admin_maps_pena_not_found():
    repo = _FakeRepo(should_raise_pena_not_found=True)
    use_case = ManagePenaSeasonsUseCase(repo)

    with pytest.raises(PenaSeasonPenaNotFoundError):
        use_case.create_for_admin(
            pena_guid="pena-guid",
            admin_id=10,
            data=PenaSeasonCreate(
                start_date=date(2024, 9, 1),
                end_date=date(2025, 6, 30),
            ),
        )


def test_create_for_admin_maps_access_denied_and_overlap_errors():
    denied_use_case = ManagePenaSeasonsUseCase(_FakeRepo(should_raise_access_denied=True))
    with pytest.raises(PenaSeasonAccessDeniedError):
        denied_use_case.create_for_admin(
            pena_guid="pena-guid",
            admin_id=10,
            data=PenaSeasonCreate(
                start_date=date(2024, 9, 1),
                end_date=date(2025, 6, 30),
            ),
        )

    overlap_use_case = ManagePenaSeasonsUseCase(_FakeRepo(should_raise_overlap=True))
    with pytest.raises(PenaSeasonDateOverlapError):
        overlap_use_case.create_for_admin(
            pena_guid="pena-guid",
            admin_id=10,
            data=PenaSeasonCreate(
                start_date=date(2024, 9, 1),
                end_date=date(2025, 6, 30),
            ),
        )


def test_update_and_delete_for_admin_map_not_found_access_and_overlap_errors():
    missing_use_case = ManagePenaSeasonsUseCase(_FakeRepo(should_raise_season_not_found=True))
    with pytest.raises(PenaSeasonNotFoundError):
        missing_use_case.update_for_admin(
            pena_guid="pena-guid",
            season_guid="season-guid",
            admin_id=1,
            update=PenaSeasonUpdate(start_date=FieldUpdate.set(date(2024, 8, 1))),
        )
    with pytest.raises(PenaSeasonNotFoundError):
        missing_use_case.delete_for_admin(
            pena_guid="pena-guid",
            season_guid="season-guid",
            admin_id=1,
        )

    denied_use_case = ManagePenaSeasonsUseCase(_FakeRepo(should_raise_access_denied=True))
    with pytest.raises(PenaSeasonAccessDeniedError):
        denied_use_case.delete_for_admin(
            pena_guid="pena-guid",
            season_guid="season-guid",
            admin_id=1,
        )

    overlap_use_case = ManagePenaSeasonsUseCase(_FakeRepo(should_raise_overlap=True))
    with pytest.raises(PenaSeasonDateOverlapError):
        overlap_use_case.update_for_admin(
            pena_guid="pena-guid",
            season_guid="season-guid",
            admin_id=1,
            update=PenaSeasonUpdate(start_date=FieldUpdate.set(date(2024, 8, 1))),
        )
