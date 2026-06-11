import pytest
from auth.application.use_cases import login as login_module
from auth.domain.models.auth_account import AuthAccount


class _FakeRepo:
    def __init__(
        self,
        *,
        user_account: AuthAccount | None = None,
        admin_account: AuthAccount | None = None,
    ):
        self.user_account = user_account
        self.admin_account = admin_account
        self.last_user_username: str | None = None
        self.last_admin_username: str | None = None

    def find_user_by_username(self, username: str) -> AuthAccount | None:
        self.last_user_username = username
        return self.user_account

    def find_admin_by_username(self, username: str) -> AuthAccount | None:
        self.last_admin_username = username
        return self.admin_account


def _user_account() -> AuthAccount:
    return AuthAccount(
        id=10,
        guid="user-guid-10",
        username="user-10",
        password_hash="hashed-user",
        user_type="user",
    )


def _admin_account() -> AuthAccount:
    return AuthAccount(
        id=20,
        guid="admin-guid-20",
        username="admin-20",
        password_hash="hashed-admin",
        user_type="admin",
    )


def test_login_user_returns_account_when_credentials_are_valid(monkeypatch):
    account = _user_account()
    repo = _FakeRepo(user_account=account)
    use_case = login_module.LoginUserUseCase(repo)
    monkeypatch.setattr(login_module, "verify_password", lambda _plain, _hash: True)

    result = use_case.execute(login_module.LoginPayload(username="alice", password="secret"))

    assert result == account
    assert repo.last_user_username == "alice"


def test_login_user_raises_when_user_does_not_exist(monkeypatch):
    repo = _FakeRepo(user_account=None)
    use_case = login_module.LoginUserUseCase(repo)

    verify_calls: list[tuple[str, str]] = []
    monkeypatch.setattr(
        login_module,
        "verify_password",
        lambda plain, password_hash: verify_calls.append((plain, password_hash)) or True,
    )

    with pytest.raises(login_module.InvalidCredentialsError):
        use_case.execute(login_module.LoginPayload(username="missing", password="secret"))

    assert repo.last_user_username == "missing"
    assert verify_calls == []


def test_login_user_raises_when_password_is_invalid(monkeypatch):
    repo = _FakeRepo(user_account=_user_account())
    use_case = login_module.LoginUserUseCase(repo)
    monkeypatch.setattr(login_module, "verify_password", lambda _plain, _hash: False)

    with pytest.raises(login_module.InvalidCredentialsError):
        use_case.execute(login_module.LoginPayload(username="alice", password="wrong"))


def test_login_admin_returns_account_when_credentials_are_valid(monkeypatch):
    account = _admin_account()
    repo = _FakeRepo(admin_account=account)
    use_case = login_module.LoginAdminUseCase(repo)
    monkeypatch.setattr(login_module, "verify_password", lambda _plain, _hash: True)

    result = use_case.execute(login_module.LoginPayload(username="root", password="secret"))

    assert result == account
    assert repo.last_admin_username == "root"


def test_login_admin_raises_when_admin_does_not_exist(monkeypatch):
    repo = _FakeRepo(admin_account=None)
    use_case = login_module.LoginAdminUseCase(repo)

    verify_calls: list[tuple[str, str]] = []
    monkeypatch.setattr(
        login_module,
        "verify_password",
        lambda plain, password_hash: verify_calls.append((plain, password_hash)) or True,
    )

    with pytest.raises(login_module.InvalidCredentialsError):
        use_case.execute(login_module.LoginPayload(username="missing-admin", password="secret"))

    assert repo.last_admin_username == "missing-admin"
    assert verify_calls == []


def test_login_admin_raises_when_password_is_invalid(monkeypatch):
    repo = _FakeRepo(admin_account=_admin_account())
    use_case = login_module.LoginAdminUseCase(repo)
    monkeypatch.setattr(login_module, "verify_password", lambda _plain, _hash: False)

    with pytest.raises(login_module.InvalidCredentialsError):
        use_case.execute(login_module.LoginPayload(username="root", password="wrong"))
