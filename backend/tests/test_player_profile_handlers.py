from dataclasses import dataclass

import pytest
from core.application.commands.player_profile_command_handlers import (
    UpdatePlayerProfileByAccountIdHandler,
    UpdatePlayerProfileByGuidHandler,
)
from core.application.commands.player_profile_commands import (
    UpdatePlayerProfileByAccountIdCommand,
    UpdatePlayerProfileByGuidCommand,
)
from core.application.ports.player_profile_port import PenaInfoResult, PlayerProfileResult
from core.application.queries.player_profile_queries import (
    GetPlayerProfileByAccountIdQuery,
    GetPlayerProfileByGuidQuery,
)
from core.application.queries.player_profile_query_handlers import (
    GetPlayerProfileByAccountIdHandler,
    GetPlayerProfileByGuidHandler,
)
from core.domain.errors import (
    InvalidPlayerNationalityError,
    InvalidPlayerUpdateDataError,
    InvalidProfileImageError,
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
            raise InvalidPlayerNationalityError()
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
            raise InvalidPlayerNationalityError()
        self.updated_payload = {
            "account_id": account_id,
            "name": name,
            "surname1": surname1,
            "surname2": surname2,
            "nationality": nationality,
            "image_url": image_url,
        }
        return self.profile


def test_update_by_account_id_normalizes_fields():
    repo = _FakeRepo()
    result = UpdatePlayerProfileByAccountIdHandler(repo).handle(
        UpdatePlayerProfileByAccountIdCommand(
            account_id=10,
            name="  Adriano ",
            surname1=" Garcia ",
            surname2=" Milena ",
            nationality=" Spain ",
        )
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


def test_update_by_account_id_propagates_invalid_nationality():
    repo = _FakeRepo(should_raise_invalid_nationality=True)
    with pytest.raises(InvalidPlayerNationalityError):
        UpdatePlayerProfileByAccountIdHandler(repo).handle(
            UpdatePlayerProfileByAccountIdCommand(
                account_id=10, name="Adriano", surname1="Garcia", nationality="Atlantis"
            )
        )


def test_update_by_guid_propagates_invalid_nationality():
    repo = _FakeRepo(should_raise_invalid_nationality=True)
    with pytest.raises(InvalidPlayerNationalityError):
        UpdatePlayerProfileByGuidHandler(repo).handle(
            UpdatePlayerProfileByGuidCommand(
                player_guid="player-guid", name="Adriano", surname1="Garcia", nationality="Atlantis"
            )
        )


def test_update_rejects_blank_required_field():
    repo = _FakeRepo()
    with pytest.raises(InvalidPlayerUpdateDataError):
        UpdatePlayerProfileByAccountIdHandler(repo).handle(
            UpdatePlayerProfileByAccountIdCommand(account_id=10, name="   ")
        )


def test_update_by_guid_rejects_blank_required_field():
    repo = _FakeRepo()
    with pytest.raises(InvalidPlayerUpdateDataError):
        UpdatePlayerProfileByGuidHandler(repo).handle(
            UpdatePlayerProfileByGuidCommand(player_guid="player-guid", surname1="   ")
        )


def test_update_empty_optional_surname2_becomes_none():
    repo = _FakeRepo()
    UpdatePlayerProfileByGuidHandler(repo).handle(
        UpdatePlayerProfileByGuidCommand(player_guid="player-guid", surname2="   ")
    )
    assert repo.updated_payload is not None
    assert repo.updated_payload["surname2"] is None


def test_update_by_guid_returns_none_when_repo_does_not_update():
    repo = _FakeRepo(profile=None, populate_default_profile=False)
    result = UpdatePlayerProfileByGuidHandler(repo).handle(
        UpdatePlayerProfileByGuidCommand(player_guid="player-guid", name="Adriano")
    )
    assert result is None


def test_update_by_account_id_returns_none_when_repo_does_not_update():
    repo = _FakeRepo(profile=None, populate_default_profile=False)
    result = UpdatePlayerProfileByAccountIdHandler(repo).handle(
        UpdatePlayerProfileByAccountIdCommand(account_id=10, name="Adriano")
    )
    assert result is None


def test_update_rejects_invalid_image_payload():
    repo = _FakeRepo()
    with pytest.raises(InvalidProfileImageError):
        UpdatePlayerProfileByAccountIdHandler(repo).handle(
            UpdatePlayerProfileByAccountIdCommand(
                account_id=10, image_url="data:image/gif;base64,R0lGODlhAQABAIAAAAUEBA=="
            )
        )


def test_get_by_guid_handler_maps_profile_and_handles_missing():
    repo = _FakeRepo()
    found = GetPlayerProfileByGuidHandler(repo).handle(
        GetPlayerProfileByGuidQuery(player_guid="p-guid")
    )
    assert found is not None
    assert found.guid == "p-guid"
    assert found.penas[0].guid == "pena-guid"

    empty = _FakeRepo(profile=None, populate_default_profile=False)
    missing = GetPlayerProfileByGuidHandler(empty).handle(
        GetPlayerProfileByGuidQuery(player_guid="nope")
    )
    assert missing is None


def test_get_by_account_id_handler_maps_profile():
    repo = _FakeRepo()
    found = GetPlayerProfileByAccountIdHandler(repo).handle(
        GetPlayerProfileByAccountIdQuery(account_id=10)
    )
    assert found is not None
    assert found.name == "Name"
