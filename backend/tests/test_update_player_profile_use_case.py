from dataclasses import dataclass

import pytest
from core.application.use_cases.update_player_profile_usecase import (
    InvalidNationalityError,
    InvalidPlayerUpdateDataError,
    InvalidProfileImageError,
    PlayerUpdate,
    UpdatePlayerProfileUseCase,
)
from persistence.application.ports.player_profile_port import (
    InvalidNationalityError as RepositoryInvalidNationalityError,
)
from persistence.application.ports.player_profile_port import (
    PenaInfoResult,
    PlayerProfileResult,
)


@dataclass
class _FakeRepo:
    should_raise_invalid_nationality: bool = False
    updated_payload: dict | None = None
    profile: PlayerProfileResult | None = None
    populate_default_profile: bool = True

    def __post_init__(self):
        if self.profile is None and self.populate_default_profile:
            self.profile = PlayerProfileResult(
                guid="p-guid",
                name="Name",
                surname1="Surname1",
                surname2=None,
                nationality="Spain",
                penas=[PenaInfoResult(guid="pena-guid", name="Pena")],
                image_url=None,
            )

    def find_by_guid(self, player_guid: str):
        return self.profile

    def find_by_account_id(self, account_id: int):
        return self.profile

    def update_by_guid(self, player_guid: str, *, name, surname1, surname2, nationality, image_url):
        if self.should_raise_invalid_nationality:
            raise RepositoryInvalidNationalityError()
        self.updated_payload = {
            "player_guid": player_guid,
            "name": name,
            "surname1": surname1,
            "surname2": surname2,
            "nationality": nationality,
            "image_url": image_url,
        }
        return self.profile

    def update_by_account_id(
        self, account_id: int, *, name, surname1, surname2, nationality, image_url
    ):
        if self.should_raise_invalid_nationality:
            raise RepositoryInvalidNationalityError()
        self.updated_payload = {
            "account_id": account_id,
            "name": name,
            "surname1": surname1,
            "surname2": surname2,
            "nationality": nationality,
            "image_url": image_url,
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
        "image_url": None,
    }


def test_update_profile_negative_invalid_nationality_from_repository():
    repo = _FakeRepo(should_raise_invalid_nationality=True)
    use_case = UpdatePlayerProfileUseCase(repo)

    with pytest.raises(InvalidNationalityError):
        use_case.execute_by_account_id(
            10,
            PlayerUpdate(name="Adriano", surname1="Garcia", nationality="Atlantis"),
        )


def test_update_profile_by_guid_negative_invalid_nationality_from_repository():
    repo = _FakeRepo(should_raise_invalid_nationality=True)
    use_case = UpdatePlayerProfileUseCase(repo)

    with pytest.raises(InvalidNationalityError):
        use_case.execute_by_guid(
            "player-guid",
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


def test_update_profile_by_guid_rejects_blank_required_fields():
    repo = _FakeRepo()
    use_case = UpdatePlayerProfileUseCase(repo)

    with pytest.raises(InvalidPlayerUpdateDataError):
        use_case.execute_by_guid(
            "player-guid",
            PlayerUpdate(surname1="   "),
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


def test_update_profile_by_guid_returns_none_when_repository_does_not_update():
    repo = _FakeRepo(profile=None, populate_default_profile=False)
    use_case = UpdatePlayerProfileUseCase(repo)

    result = use_case.execute_by_guid(
        "player-guid",
        PlayerUpdate(name="Adriano"),
    )

    assert result is None


def test_update_profile_by_account_id_returns_none_when_repository_does_not_update():
    repo = _FakeRepo(profile=None, populate_default_profile=False)
    use_case = UpdatePlayerProfileUseCase(repo)

    result = use_case.execute_by_account_id(
        10,
        PlayerUpdate(name="Adriano"),
    )

    assert result is None


def test_update_profile_rejects_invalid_image_payload():
    repo = _FakeRepo()
    use_case = UpdatePlayerProfileUseCase(repo)

    with pytest.raises(InvalidProfileImageError):
        use_case.execute_by_account_id(
            10,
            PlayerUpdate(image_url="data:image/gif;base64,R0lGODlhAQABAIAAAAUEBA=="),
        )
