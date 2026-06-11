from dataclasses import dataclass

import pytest
from core.application.commands.pena_membership_command_handlers import (
    CreateGuestPlayerHandler,
    RemoveMembershipForAdminHandler,
    RemoveMembershipForUserHandler,
    UpdateMembershipForAdminHandler,
    UpdateMembershipForUserHandler,
)
from core.application.commands.pena_membership_commands import (
    CreateGuestPlayerCommand,
    RemoveMembershipForAdminCommand,
    RemoveMembershipForUserCommand,
    UpdateMembershipForAdminCommand,
    UpdateMembershipForUserCommand,
)
from core.application.policies import FieldUpdate
from core.application.ports.pena_membership_port import (
    InvalidNationalityError,
    InvalidRoleLabelError,
    PenaMembershipResult,
    PenaNotFoundError,
    PenaNotManagedByAdminError,
    PlayerNotFoundError,
    UserPlayerNotFoundError,
)
from core.application.ports.pena_membership_port import (
    PenaMembershipNotFoundError as RepositoryPenaMembershipNotFoundError,
)
from core.application.queries.pena_membership_queries import (
    GetPenaMembershipForPlayerQuery,
    GetPenaMembershipForUserQuery,
)
from core.application.queries.pena_membership_query_handlers import (
    GetPenaMembershipForPlayerHandler,
    GetPenaMembershipForUserHandler,
)
from core.domain.errors import (
    InvalidPenaGuestPlayerDataError,
    InvalidPenaMembershipUpdateDataError,
    PenaMembershipAccessDeniedError,
    PenaMembershipInvalidNationalityError,
    PenaMembershipNotFoundError,
    PenaMembershipPenaNotFoundError,
    PenaMembershipPlayerNotFoundError,
    PenaMembershipUserProfileNotFoundError,
)


@dataclass
class _FakeRepo:
    should_raise_pena_not_found: bool = False
    should_raise_pena_access_denied: bool = False
    should_raise_membership_not_found: bool = False
    should_raise_player_not_found: bool = False
    should_raise_user_player_not_found: bool = False
    should_raise_invalid_nationality: bool = False
    should_raise_invalid_role_label: bool = False
    last_payload: dict | None = None

    @staticmethod
    def _sample_result() -> PenaMembershipResult:
        return PenaMembershipResult(
            pena_guid="pena-guid",
            player_guid="player-guid",
            name="John",
            surname1="Doe",
            surname2=None,
            nationality="Spain",
            nickname="Nick",
            role="member",
            position="ST",
        )

    def _raise_maybe(self):
        if self.should_raise_pena_not_found:
            raise PenaNotFoundError()
        if self.should_raise_pena_access_denied:
            raise PenaNotManagedByAdminError()
        if self.should_raise_membership_not_found:
            raise RepositoryPenaMembershipNotFoundError()
        if self.should_raise_player_not_found:
            raise PlayerNotFoundError()
        if self.should_raise_user_player_not_found:
            raise UserPlayerNotFoundError()

    def get_by_pena_and_player(self, *, pena_guid: str, player_guid: str):
        self._raise_maybe()
        self.last_payload = {"pena_guid": pena_guid, "player_guid": player_guid}
        return self._sample_result()

    def get_by_pena_and_account(self, *, pena_guid: str, account_id: int):
        if self.should_raise_pena_not_found:
            raise PenaNotFoundError()
        if self.should_raise_membership_not_found:
            raise RepositoryPenaMembershipNotFoundError()
        if self.should_raise_user_player_not_found:
            raise UserPlayerNotFoundError()
        if self.should_raise_invalid_role_label:
            raise InvalidRoleLabelError()
        self.last_payload = {"pena_guid": pena_guid, "account_id": account_id}
        return self._sample_result()

    def update_by_account(self, *, pena_guid: str, account_id: int, nickname, role, position):
        if self.should_raise_pena_not_found:
            raise PenaNotFoundError()
        if self.should_raise_membership_not_found:
            raise RepositoryPenaMembershipNotFoundError()
        if self.should_raise_user_player_not_found:
            raise UserPlayerNotFoundError()
        self.last_payload = {
            "pena_guid": pena_guid,
            "account_id": account_id,
            "nickname": nickname,
            "role": role,
            "position": position,
        }
        return self._sample_result()

    def delete_by_account(self, *, pena_guid: str, account_id: int):
        if self.should_raise_pena_not_found:
            raise PenaNotFoundError()
        if self.should_raise_membership_not_found:
            raise RepositoryPenaMembershipNotFoundError()
        if self.should_raise_user_player_not_found:
            raise UserPlayerNotFoundError()
        self.last_payload = {"pena_guid": pena_guid, "account_id": account_id}

    def update_by_player_for_admin(
        self, *, pena_guid: str, admin_id: int, player_guid: str, nickname, role, position
    ):
        self._raise_maybe()
        if self.should_raise_invalid_role_label:
            raise InvalidRoleLabelError()
        self.last_payload = {
            "pena_guid": pena_guid,
            "admin_id": admin_id,
            "player_guid": player_guid,
            "nickname": nickname,
            "role": role,
            "position": position,
        }
        return self._sample_result()

    def delete_by_player_for_admin(self, *, pena_guid: str, admin_id: int, player_guid: str):
        self._raise_maybe()
        self.last_payload = {
            "pena_guid": pena_guid,
            "admin_id": admin_id,
            "player_guid": player_guid,
        }

    def create_guest_player_for_admin(
        self,
        *,
        pena_guid: str,
        admin_id: int,
        name: str,
        surname1: str,
        surname2: str | None,
        nationality: str,
        nickname: str | None,
        role: str | None,
        position: str | None,
    ):
        if self.should_raise_pena_not_found:
            raise PenaNotFoundError()
        if self.should_raise_pena_access_denied:
            raise PenaNotManagedByAdminError()
        if self.should_raise_invalid_nationality:
            raise InvalidNationalityError()
        if self.should_raise_invalid_role_label:
            raise InvalidRoleLabelError()
        self.last_payload = {
            "pena_guid": pena_guid,
            "admin_id": admin_id,
            "name": name,
            "surname1": surname1,
            "surname2": surname2,
            "nationality": nationality,
            "nickname": nickname,
            "role": role,
            "position": position,
        }
        return self._sample_result()


def test_update_for_user_normalizes_blank_to_none():
    repo = _FakeRepo()
    result = UpdateMembershipForUserHandler(repo).handle(
        UpdateMembershipForUserCommand(
            pena_guid="pena-guid",
            account_id=12,
            nickname=FieldUpdate.set("  "),
            position=FieldUpdate.set("  GK "),
        )
    )

    assert repo.last_payload == {
        "pena_guid": "pena-guid",
        "account_id": 12,
        "nickname": FieldUpdate.set(None),
        "role": FieldUpdate.keep(),
        "position": FieldUpdate.set("GK"),
    }
    assert result.role == "member"


def test_update_for_user_rejects_empty_patch():
    repo = _FakeRepo()
    with pytest.raises(InvalidPenaMembershipUpdateDataError):
        UpdateMembershipForUserHandler(repo).handle(
            UpdateMembershipForUserCommand(pena_guid="pena-guid", account_id=12)
        )
    assert repo.last_payload is None


def test_get_for_user_maps_missing_membership_to_access_denied():
    with pytest.raises(PenaMembershipAccessDeniedError):
        GetPenaMembershipForUserHandler(_FakeRepo(should_raise_membership_not_found=True)).handle(
            GetPenaMembershipForUserQuery(pena_guid="pena-guid", account_id=12)
        )


def test_get_for_user_maps_invalid_role_label_to_invalid_update_error():
    with pytest.raises(InvalidPenaMembershipUpdateDataError):
        GetPenaMembershipForUserHandler(_FakeRepo(should_raise_invalid_role_label=True)).handle(
            GetPenaMembershipForUserQuery(pena_guid="pena-guid", account_id=12)
        )


def test_update_for_admin_maps_not_managed_to_access_denied():
    with pytest.raises(PenaMembershipAccessDeniedError):
        UpdateMembershipForAdminHandler(_FakeRepo(should_raise_pena_access_denied=True)).handle(
            UpdateMembershipForAdminCommand(
                pena_guid="pena-guid",
                admin_id=1,
                player_guid="player-guid",
                nickname=FieldUpdate.set("N"),
            )
        )


def test_update_for_admin_maps_missing_membership_to_not_found():
    with pytest.raises(PenaMembershipNotFoundError):
        UpdateMembershipForAdminHandler(_FakeRepo(should_raise_membership_not_found=True)).handle(
            UpdateMembershipForAdminCommand(
                pena_guid="pena-guid",
                admin_id=1,
                player_guid="player-guid",
                position=FieldUpdate.set("CM"),
            )
        )


def test_get_for_player_maps_pena_and_player_not_found():
    with pytest.raises(PenaMembershipPenaNotFoundError):
        GetPenaMembershipForPlayerHandler(_FakeRepo(should_raise_pena_not_found=True)).handle(
            GetPenaMembershipForPlayerQuery(pena_guid="pena-guid", player_guid="player-guid")
        )
    with pytest.raises(PenaMembershipPlayerNotFoundError):
        GetPenaMembershipForPlayerHandler(_FakeRepo(should_raise_player_not_found=True)).handle(
            GetPenaMembershipForPlayerQuery(pena_guid="pena-guid", player_guid="player-guid")
        )


def test_get_for_player_maps_membership_not_found():
    with pytest.raises(PenaMembershipNotFoundError):
        GetPenaMembershipForPlayerHandler(_FakeRepo(should_raise_membership_not_found=True)).handle(
            GetPenaMembershipForPlayerQuery(pena_guid="pena-guid", player_guid="player-guid")
        )


def test_remove_for_user_maps_user_profile_not_found():
    with pytest.raises(PenaMembershipUserProfileNotFoundError):
        RemoveMembershipForUserHandler(_FakeRepo(should_raise_user_player_not_found=True)).handle(
            RemoveMembershipForUserCommand(pena_guid="pena-guid", account_id=12)
        )


@pytest.mark.parametrize(
    ("repo", "expected_error"),
    [
        (_FakeRepo(should_raise_pena_not_found=True), PenaMembershipPenaNotFoundError),
        (
            _FakeRepo(should_raise_user_player_not_found=True),
            PenaMembershipUserProfileNotFoundError,
        ),
        (_FakeRepo(should_raise_membership_not_found=True), PenaMembershipAccessDeniedError),
    ],
)
def test_update_for_user_maps_expected_errors(repo, expected_error):
    with pytest.raises(expected_error):
        UpdateMembershipForUserHandler(repo).handle(
            UpdateMembershipForUserCommand(
                pena_guid="pena-guid", account_id=12, nickname=FieldUpdate.set("Nick")
            )
        )


@pytest.mark.parametrize(
    ("repo", "expected_error"),
    [
        (_FakeRepo(should_raise_player_not_found=True), PenaMembershipPlayerNotFoundError),
        (_FakeRepo(should_raise_invalid_role_label=True), InvalidPenaMembershipUpdateDataError),
    ],
)
def test_update_for_admin_maps_player_and_role_validation_errors(repo, expected_error):
    with pytest.raises(expected_error):
        UpdateMembershipForAdminHandler(repo).handle(
            UpdateMembershipForAdminCommand(
                pena_guid="pena-guid",
                admin_id=1,
                player_guid="player-guid",
                role=FieldUpdate.set("captain"),
            )
        )


@pytest.mark.parametrize(
    ("repo", "expected_error"),
    [
        (_FakeRepo(should_raise_pena_not_found=True), PenaMembershipPenaNotFoundError),
        (_FakeRepo(should_raise_pena_access_denied=True), PenaMembershipAccessDeniedError),
        (_FakeRepo(should_raise_player_not_found=True), PenaMembershipPlayerNotFoundError),
        (_FakeRepo(should_raise_membership_not_found=True), PenaMembershipNotFoundError),
    ],
)
def test_remove_for_admin_maps_expected_errors(repo, expected_error):
    with pytest.raises(expected_error):
        RemoveMembershipForAdminHandler(repo).handle(
            RemoveMembershipForAdminCommand(
                pena_guid="pena-guid", admin_id=1, player_guid="player-guid"
            )
        )


def test_remove_for_admin_forwards_payload():
    repo = _FakeRepo()
    RemoveMembershipForAdminHandler(repo).handle(
        RemoveMembershipForAdminCommand(
            pena_guid="pena-guid", admin_id=1, player_guid="player-guid"
        )
    )
    assert repo.last_payload == {
        "pena_guid": "pena-guid",
        "admin_id": 1,
        "player_guid": "player-guid",
    }


def test_create_guest_normalizes_blank_to_none():
    repo = _FakeRepo()
    result = CreateGuestPlayerHandler(repo).handle(
        CreateGuestPlayerCommand(
            pena_guid="pena-guid",
            admin_id=7,
            name="  Guest  ",
            surname1="  Player  ",
            surname2="   ",
            nationality="  Spain ",
            nickname="  Invitado  ",
            position="  ",
        )
    )

    assert repo.last_payload == {
        "pena_guid": "pena-guid",
        "admin_id": 7,
        "name": "Guest",
        "surname1": "Player",
        "surname2": None,
        "nationality": "Spain",
        "nickname": "Invitado",
        "role": None,
        "position": None,
    }
    assert result.role == "member"


def test_create_guest_rejects_invalid_payload():
    repo = _FakeRepo()
    with pytest.raises(InvalidPenaGuestPlayerDataError):
        CreateGuestPlayerHandler(repo).handle(
            CreateGuestPlayerCommand(
                pena_guid="pena-guid", admin_id=7, name=" ", surname1="Player", nationality="Spain"
            )
        )
    assert repo.last_payload is None


def test_create_guest_maps_invalid_nationality():
    with pytest.raises(PenaMembershipInvalidNationalityError):
        CreateGuestPlayerHandler(_FakeRepo(should_raise_invalid_nationality=True)).handle(
            CreateGuestPlayerCommand(
                pena_guid="pena-guid",
                admin_id=7,
                name="Guest",
                surname1="Player",
                nationality="WrongCountry",
            )
        )


@pytest.mark.parametrize(
    ("repo", "expected_error"),
    [
        (_FakeRepo(should_raise_pena_access_denied=True), PenaMembershipAccessDeniedError),
        (_FakeRepo(should_raise_invalid_role_label=True), InvalidPenaGuestPlayerDataError),
    ],
)
def test_create_guest_maps_access_denied_and_invalid_role_label(repo, expected_error):
    with pytest.raises(expected_error):
        CreateGuestPlayerHandler(repo).handle(
            CreateGuestPlayerCommand(
                pena_guid="pena-guid",
                admin_id=7,
                name="Guest",
                surname1="Player",
                nationality="Spain",
                role="captain",
            )
        )
