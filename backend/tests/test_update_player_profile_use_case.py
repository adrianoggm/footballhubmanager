from dataclasses import dataclass

import pytest

from persistence.application.ports.player_profile_repository import (
    InvalidNationalityError as RepositoryInvalidNationalityError,
    PenaInfoResult,
    PlayerProfileResult,
)
from persistence.application.use_cases.update_player_profile import (
    InvalidNationalityError,
    InvalidPlayerUpdateDataError,
    PlayerUpdate,
    UpdatePlayerProfileUseCase,
)


@dataclass
class _FakeRepo:
    should_raise_invalid_nationality: bool = False
    updated_payload: dict | None = None
    profile: PlayerProfileResult | None = None

    def __post_init__(self):
        if self.profile is None:
            self.profile = PlayerProfileResult(
                guid="p-guid",
                name="Name",
                surname1="Surname1",
                surname2=None,
                nationality="Spain",
                penas=[PenaInfoResult(guid="pena-guid", name="Pena")],
            )

    def find_by_guid(self, player_guid: str):
        return self.profile

    def find_by_account_id(self, account_id: int):
        return self.profile

    def update_by_guid(self, player_guid: str, *, name, surname1, surname2, nationality):
        if self.should_raise_invalid_nationality:
            raise RepositoryInvalidNationalityError()
        self.updated_payload = {
            "player_guid": player_guid,
            "name": name,
            "surname1": surname1,
            "surname2": surname2,
            "nationality": nationality,
        }
        return self.profile

    def update_by_account_id(self, account_id: int, *, name, surname1, surname2, nationality):
        if self.should_raise_invalid_nationality:
            raise RepositoryInvalidNationalityError()
        self.updated_payload = {
            "account_id": account_id,
            "name": name,
            "surname1": surname1,
            "surname2": surname2,
            "nationality": nationality,
        }
        return self.profile


def test_update_profile_positive_normalizes_fields():
    repo = _FakeRepo()
    use_case = UpdatePlayerProfileUseCase(repo)

    result = use_case.execute_by_account_id(
        10,
        PlayerUpdate(
            name="  Adriano ",
            surname1=" Garcia ",
            surname2=" Milena ",
            nationality=" Spain ",
        ),
    )

    assert result is not None
    assert repo.updated_payload == {
        "account_id": 10,
        "name": "Adriano",
        "surname1": "Garcia",
        "surname2": "Milena",
        "nationality": "Spain",
    }


def test_update_profile_negative_invalid_nationality_from_repository():
    repo = _FakeRepo(should_raise_invalid_nationality=True)
    use_case = UpdatePlayerProfileUseCase(repo)

    with pytest.raises(InvalidNationalityError):
        use_case.execute_by_account_id(
            10,
            PlayerUpdate(name="Adriano", surname1="Garcia", nationality="Atlantis"),
        )


def test_update_profile_edge_empty_required_value_raises():
    repo = _FakeRepo()
    use_case = UpdatePlayerProfileUseCase(repo)

    with pytest.raises(InvalidPlayerUpdateDataError):
        use_case.execute_by_account_id(
            10,
            PlayerUpdate(name="   "),
        )


def test_update_profile_edge_empty_optional_surname2_becomes_none():
    repo = _FakeRepo()
    use_case = UpdatePlayerProfileUseCase(repo)

    use_case.execute_by_guid(
        "player-guid",
        PlayerUpdate(surname2="   "),
    )

    assert repo.updated_payload is not None
    assert repo.updated_payload["surname2"] is None
