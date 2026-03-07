from dataclasses import dataclass

import pytest
from persistence.application.ports.pena_labels_repository import (
    PenaLabelsResult,
    PenaNotFoundError,
    PenaNotManagedByAdminError,
)
from persistence.application.use_cases.manage_pena_labels import (
    InvalidPenaLabelsDataError,
    ManagePenaLabelsUseCase,
    PenaLabelsAccessDeniedError,
    PenaLabelsPenaNotFoundError,
    PenaLabelsUpdate,
)


@dataclass
class _FakeRepo:
    should_raise_not_found: bool = False
    should_raise_access_denied: bool = False
    last_update: dict | None = None

    @staticmethod
    def _sample_result() -> PenaLabelsResult:
        return PenaLabelsResult(
            role_labels=["president", "coordinator", "member", "guest"],
            position_labels=["attacker", "defender", "midfielder", "polivalent", "keeper"],
            role_colors={
                "president": "#B45309",
                "coordinator": "#1D4ED8",
                "member": "#15803D",
                "guest": "#64748B",
            },
            position_colors={
                "attacker": "#DC2626",
                "defender": "#2563EB",
                "midfielder": "#16A34A",
                "polivalent": "#7C3AED",
                "keeper": "#EA580C",
            },
        )

    def get_by_pena_guid(self, *, pena_guid: str) -> PenaLabelsResult:
        if self.should_raise_not_found:
            raise PenaNotFoundError()
        return self._sample_result()

    def update_for_admin(
        self,
        *,
        pena_guid: str,
        admin_id: int,
        role_labels: list[str],
        position_labels: list[str],
        role_colors: dict[str, str],
        position_colors: dict[str, str],
    ) -> PenaLabelsResult:
        if self.should_raise_not_found:
            raise PenaNotFoundError()
        if self.should_raise_access_denied:
            raise PenaNotManagedByAdminError()
        self.last_update = {
            "pena_guid": pena_guid,
            "admin_id": admin_id,
            "role_labels": role_labels,
            "position_labels": position_labels,
            "role_colors": role_colors,
            "position_colors": position_colors,
        }
        return PenaLabelsResult(
            role_labels=role_labels,
            position_labels=position_labels,
            role_colors=role_colors,
            position_colors=position_colors,
        )


def test_get_for_pena_returns_labels():
    use_case = ManagePenaLabelsUseCase(_FakeRepo())

    result = use_case.get_for_pena(pena_guid="pena-guid")

    assert result.role_labels == ["president", "coordinator", "member", "guest"]
    assert result.position_labels == ["attacker", "defender", "midfielder", "polivalent", "keeper"]
    assert result.role_colors["member"] == "#15803D"
    assert result.position_colors["keeper"] == "#EA580C"


def test_update_for_admin_normalizes_labels_and_removes_duplicates():
    repo = _FakeRepo()
    use_case = ManagePenaLabelsUseCase(repo)

    result = use_case.update_for_admin(
        pena_guid="pena-guid",
        admin_id=99,
        update=PenaLabelsUpdate(
            role_labels=[" President ", "member", "MEMBER", "guest"],
            position_labels=[" attacker ", "midfielder", "ATTACKER", "keeper "],
        ),
    )

    assert repo.last_update == {
        "pena_guid": "pena-guid",
        "admin_id": 99,
        "role_labels": ["President", "member", "guest"],
        "position_labels": ["attacker", "midfielder", "keeper"],
        "role_colors": {
            "President": "#B45309",
            "member": "#15803D",
            "guest": "#64748B",
        },
        "position_colors": {
            "attacker": "#DC2626",
            "midfielder": "#16A34A",
            "keeper": "#EA580C",
        },
    }
    assert result.role_labels == ["President", "member", "guest"]
    assert result.position_labels == ["attacker", "midfielder", "keeper"]
    assert result.role_colors["President"] == "#B45309"
    assert result.position_colors["attacker"] == "#DC2626"


def test_update_for_admin_rejects_invalid_payload():
    use_case = ManagePenaLabelsUseCase(_FakeRepo())

    with pytest.raises(InvalidPenaLabelsDataError):
        use_case.update_for_admin(
            pena_guid="pena-guid",
            admin_id=1,
            update=PenaLabelsUpdate(role_labels=[" "], position_labels=["keeper"]),
        )

    with pytest.raises(InvalidPenaLabelsDataError):
        use_case.update_for_admin(
            pena_guid="pena-guid",
            admin_id=1,
            update=PenaLabelsUpdate(
                role_labels=["member"],
                position_labels=["keeper"],
                role_colors={"member": "blue"},
            ),
        )


def test_update_for_admin_maps_not_found_and_access_denied_errors():
    not_found_use_case = ManagePenaLabelsUseCase(_FakeRepo(should_raise_not_found=True))
    with pytest.raises(PenaLabelsPenaNotFoundError):
        not_found_use_case.update_for_admin(
            pena_guid="pena-guid",
            admin_id=1,
            update=PenaLabelsUpdate(role_labels=["member"], position_labels=["keeper"]),
        )

    denied_use_case = ManagePenaLabelsUseCase(_FakeRepo(should_raise_access_denied=True))
    with pytest.raises(PenaLabelsAccessDeniedError):
        denied_use_case.update_for_admin(
            pena_guid="pena-guid",
            admin_id=1,
            update=PenaLabelsUpdate(role_labels=["member"], position_labels=["keeper"]),
        )
