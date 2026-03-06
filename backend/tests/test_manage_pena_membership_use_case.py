from dataclasses import dataclass

import pytest
from persistence.application.ports.pena_membership_repository import (
    InvalidNationalityError,
    PenaMembershipNotFoundError,
    PenaMembershipResult,
    PenaNotFoundError,
    PenaNotManagedByAdminError,
    PlayerNotFoundError,
    UserPlayerNotFoundError,
)
from persistence.application.use_cases.manage_pena_membership import (
    InvalidPenaGuestPlayerDataError,
    InvalidPenaMembershipUpdateDataError,
    ManagePenaMembershipUseCase,
    PenaGuestPlayerCreate,
    PenaMembershipAccessDeniedError,
    PenaMembershipInvalidNationalityError,
    PenaMembershipPenaNotFoundError,
    PenaMembershipPlayerNotFoundError,
    PenaMembershipUpdate,
    PenaMembershipUserProfileNotFoundError,
)
from persistence.application.use_cases.manage_pena_membership import (
    PenaMembershipNotFoundError as UseCasePenaMembershipNotFoundError,
)


@dataclass
class _FakeRepo:
    should_raise_pena_not_found: bool = False
    should_raise_pena_access_denied: bool = False
    should_raise_membership_not_found: bool = False
    should_raise_player_not_found: bool = False
    should_raise_user_player_not_found: bool = False
    should_raise_invalid_nationality: bool = False
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
            raise PenaMembershipNotFoundError()
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
            raise PenaMembershipNotFoundError()
        if self.should_raise_user_player_not_found:
            raise UserPlayerNotFoundError()
        self.last_payload = {"pena_guid": pena_guid, "account_id": account_id}
        return self._sample_result()

    def update_by_account(
        self,
        *,
        pena_guid: str,
        account_id: int,
        nickname_provided: bool,
        nickname,
        role_provided: bool,
        role,
        position_provided: bool,
        position,
    ):
        if self.should_raise_pena_not_found:
            raise PenaNotFoundError()
        if self.should_raise_membership_not_found:
            raise PenaMembershipNotFoundError()
        if self.should_raise_user_player_not_found:
            raise UserPlayerNotFoundError()
        self.last_payload = {
            "pena_guid": pena_guid,
            "account_id": account_id,
            "nickname_provided": nickname_provided,
            "nickname": nickname,
            "role_provided": role_provided,
            "role": role,
            "position_provided": position_provided,
            "position": position,
        }
        return self._sample_result()

    def delete_by_account(self, *, pena_guid: str, account_id: int):
        if self.should_raise_pena_not_found:
            raise PenaNotFoundError()
        if self.should_raise_membership_not_found:
            raise PenaMembershipNotFoundError()
        if self.should_raise_user_player_not_found:
            raise UserPlayerNotFoundError()
        self.last_payload = {"pena_guid": pena_guid, "account_id": account_id}

    def update_by_player_for_admin(
        self,
        *,
        pena_guid: str,
        admin_id: int,
        player_guid: str,
        nickname_provided: bool,
        nickname,
        role_provided: bool,
        role,
        position_provided: bool,
        position,
    ):
        self._raise_maybe()
        self.last_payload = {
            "pena_guid": pena_guid,
            "admin_id": admin_id,
            "player_guid": player_guid,
            "nickname_provided": nickname_provided,
            "nickname": nickname,
            "role_provided": role_provided,
            "role": role,
            "position_provided": position_provided,
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


def test_update_for_user_positive_normalizes_blank_to_none():
    repo = _FakeRepo()
    use_case = ManagePenaMembershipUseCase(repo)

    result = use_case.update_for_user(
        pena_guid="pena-guid",
        account_id=12,
        update=PenaMembershipUpdate(
            nickname="  ",
            position="  GK ",
            nickname_provided=True,
            position_provided=True,
        ),
    )

    assert repo.last_payload == {
        "pena_guid": "pena-guid",
        "account_id": 12,
        "nickname_provided": True,
        "nickname": None,
        "role_provided": False,
        "role": None,
        "position_provided": True,
        "position": "GK",
    }
    assert result.role == "member"


def test_update_for_user_negative_rejects_empty_patch_payload():
    repo = _FakeRepo()
    use_case = ManagePenaMembershipUseCase(repo)

    with pytest.raises(InvalidPenaMembershipUpdateDataError):
        use_case.update_for_user(
            pena_guid="pena-guid",
            account_id=12,
            update=PenaMembershipUpdate(),
        )
    assert repo.last_payload is None


def test_get_for_user_maps_missing_membership_to_access_denied():
    repo = _FakeRepo(should_raise_membership_not_found=True)
    use_case = ManagePenaMembershipUseCase(repo)

    with pytest.raises(PenaMembershipAccessDeniedError):
        use_case.get_for_user(pena_guid="pena-guid", account_id=12)


def test_update_for_admin_maps_not_managed_to_access_denied():
    repo = _FakeRepo(should_raise_pena_access_denied=True)
    use_case = ManagePenaMembershipUseCase(repo)

    with pytest.raises(PenaMembershipAccessDeniedError):
        use_case.update_for_admin(
            pena_guid="pena-guid",
            admin_id=1,
            player_guid="player-guid",
            update=PenaMembershipUpdate(nickname="N", nickname_provided=True),
        )


def test_update_for_admin_maps_missing_membership_to_conflict_domain_error():
    repo = _FakeRepo(should_raise_membership_not_found=True)
    use_case = ManagePenaMembershipUseCase(repo)

    with pytest.raises(UseCasePenaMembershipNotFoundError):
        use_case.update_for_admin(
            pena_guid="pena-guid",
            admin_id=1,
            player_guid="player-guid",
            update=PenaMembershipUpdate(position="CM", position_provided=True),
        )


def test_get_for_player_maps_pena_and_player_not_found():
    use_case_pena = ManagePenaMembershipUseCase(_FakeRepo(should_raise_pena_not_found=True))
    with pytest.raises(PenaMembershipPenaNotFoundError):
        use_case_pena.get_for_player(pena_guid="pena-guid", player_guid="player-guid")

    use_case_player = ManagePenaMembershipUseCase(_FakeRepo(should_raise_player_not_found=True))
    with pytest.raises(PenaMembershipPlayerNotFoundError):
        use_case_player.get_for_player(pena_guid="pena-guid", player_guid="player-guid")


def test_remove_for_user_maps_user_profile_not_found():
    repo = _FakeRepo(should_raise_user_player_not_found=True)
    use_case = ManagePenaMembershipUseCase(repo)

    with pytest.raises(PenaMembershipUserProfileNotFoundError):
        use_case.remove_for_user(pena_guid="pena-guid", account_id=12)


def test_create_guest_for_admin_positive_normalizes_blank_to_none():
    repo = _FakeRepo()
    use_case = ManagePenaMembershipUseCase(repo)

    result = use_case.create_guest_for_admin(
        pena_guid="pena-guid",
        admin_id=7,
        data=PenaGuestPlayerCreate(
            name="  Guest  ",
            surname1="  Player  ",
            surname2="   ",
            nationality="  Spain ",
            nickname="  Invitado  ",
            position="  ",
        ),
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


def test_create_guest_for_admin_rejects_invalid_payload():
    repo = _FakeRepo()
    use_case = ManagePenaMembershipUseCase(repo)

    with pytest.raises(InvalidPenaGuestPlayerDataError):
        use_case.create_guest_for_admin(
            pena_guid="pena-guid",
            admin_id=7,
            data=PenaGuestPlayerCreate(
                name=" ",
                surname1="Player",
                nationality="Spain",
            ),
        )
    assert repo.last_payload is None


def test_create_guest_for_admin_maps_invalid_nationality():
    repo = _FakeRepo(should_raise_invalid_nationality=True)
    use_case = ManagePenaMembershipUseCase(repo)

    with pytest.raises(PenaMembershipInvalidNationalityError):
        use_case.create_guest_for_admin(
            pena_guid="pena-guid",
            admin_id=7,
            data=PenaGuestPlayerCreate(
                name="Guest",
                surname1="Player",
                nationality="WrongCountry",
            ),
        )
