from dataclasses import dataclass
from unittest.mock import ANY

import pytest
from persistence.application.ports.registration_repository import (
    DuplicateUsernameError,
    RegisteredAdminResult,
)
from persistence.application.use_cases.register_admin_usecase import (
    AdminRegistration,
    InvalidAdminRegistrationDataError,
    RegisterAdminUseCase,
    UsernameAlreadyExistsError,
)


@dataclass
class _FakeRepo:
    should_raise_duplicate: bool = False
    last_payload: dict | None = None

    def register_admin(
        self, *, username: str, password_hash: str, name: str
    ) -> RegisteredAdminResult:
        if self.should_raise_duplicate:
            raise DuplicateUsernameError()
        self.last_payload = {"username": username, "password_hash": password_hash, "name": name}
        return RegisteredAdminResult(admin_id=7, admin_guid="admin-guid")


def test_register_admin_positive_normalizes_and_persists():
    repo = _FakeRepo()
    use_case = RegisterAdminUseCase(repo)

    result = use_case.execute(
        AdminRegistration(username="  admin.one  ", password="secret", name="  Admin Name ")
    )

    assert result.admin_id == 7
    assert repo.last_payload == {
        "username": "admin.one",
        "password_hash": ANY,
        "name": "Admin Name",
    }


def test_register_admin_negative_duplicate_username():
    repo = _FakeRepo(should_raise_duplicate=True)
    use_case = RegisterAdminUseCase(repo)

    with pytest.raises(UsernameAlreadyExistsError):
        use_case.execute(
            AdminRegistration(username="admin.one", password="secret", name="Admin Name")
        )


def test_register_admin_edge_empty_username():
    repo = _FakeRepo()
    use_case = RegisterAdminUseCase(repo)

    with pytest.raises(InvalidAdminRegistrationDataError):
        use_case.execute(AdminRegistration(username="   ", password="secret", name="Admin Name"))


def test_register_admin_edge_empty_name():
    repo = _FakeRepo()
    use_case = RegisterAdminUseCase(repo)

    with pytest.raises(InvalidAdminRegistrationDataError):
        use_case.execute(AdminRegistration(username="admin.one", password="secret", name="   "))
