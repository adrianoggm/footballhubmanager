from dataclasses import dataclass

import pytest
from core.application.commands.pena_labels_command import UpdatePenaLabelsCommand
from core.application.commands.pena_labels_command_handler import UpdatePenaLabelsHandler
from core.application.ports.pena_labels_port import PenaLabelsResult
from core.application.queries.pena_labels_query import GetPenaLabelsQuery
from core.application.queries.pena_labels_query_handler import GetPenaLabelsHandler
from core.domain.errors import (
    InvalidPenaLabelsDataError,
    PenaLabelsAccessDeniedError,
    PenaLabelsPenaNotFoundError,
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
            raise PenaLabelsPenaNotFoundError()
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
            raise PenaLabelsPenaNotFoundError()
        if self.should_raise_access_denied:
            raise PenaLabelsAccessDeniedError()
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


def test_get_handler_returns_labels():
    result = GetPenaLabelsHandler(_FakeRepo()).handle(GetPenaLabelsQuery(pena_guid="pena-guid"))

    assert result.role_labels == ["president", "coordinator", "member", "guest"]
    assert result.position_labels == ["attacker", "defender", "midfielder", "polivalent", "keeper"]
    assert result.role_colors["member"] == "#15803D"
    assert result.position_colors["keeper"] == "#EA580C"


def test_get_handler_propagates_not_found():
    handler = GetPenaLabelsHandler(_FakeRepo(should_raise_not_found=True))
    with pytest.raises(PenaLabelsPenaNotFoundError):
        handler.handle(GetPenaLabelsQuery(pena_guid="pena-guid"))


def test_update_handler_normalizes_labels_and_removes_duplicates():
    repo = _FakeRepo()
    result = UpdatePenaLabelsHandler(repo).handle(
        UpdatePenaLabelsCommand(
            pena_guid="pena-guid",
            admin_id=99,
            role_labels=[" President ", "member", "MEMBER", "guest"],
            position_labels=[" attacker ", "midfielder", "ATTACKER", "keeper "],
        )
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


def test_update_handler_rejects_invalid_payload():
    handler = UpdatePenaLabelsHandler(_FakeRepo())

    with pytest.raises(InvalidPenaLabelsDataError):
        handler.handle(
            UpdatePenaLabelsCommand(
                pena_guid="pena-guid", admin_id=1, role_labels=[" "], position_labels=["keeper"]
            )
        )

    with pytest.raises(InvalidPenaLabelsDataError):
        handler.handle(
            UpdatePenaLabelsCommand(
                pena_guid="pena-guid",
                admin_id=1,
                role_labels=["member"],
                position_labels=["keeper"],
                role_colors={"member": "blue"},
            )
        )


def test_update_handler_propagates_not_found_and_access_denied():
    with pytest.raises(PenaLabelsPenaNotFoundError):
        UpdatePenaLabelsHandler(_FakeRepo(should_raise_not_found=True)).handle(
            UpdatePenaLabelsCommand(
                pena_guid="pena-guid",
                admin_id=1,
                role_labels=["member"],
                position_labels=["keeper"],
            )
        )

    with pytest.raises(PenaLabelsAccessDeniedError):
        UpdatePenaLabelsHandler(_FakeRepo(should_raise_access_denied=True)).handle(
            UpdatePenaLabelsCommand(
                pena_guid="pena-guid",
                admin_id=1,
                role_labels=["member"],
                position_labels=["keeper"],
            )
        )
