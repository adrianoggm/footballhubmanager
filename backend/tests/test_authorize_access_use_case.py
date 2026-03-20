from dataclasses import dataclass

import pytest
from auth.application.use_cases.authorize_access import (
    AccessDeniedError,
    AuthorizePenaAccessUseCase,
    AuthorizePlayerAccessUseCase,
    InvalidSessionTypeError,
)
from auth.session import SessionData


@dataclass
class _FakeAccessRepo:
    admin_manages_pena_result: bool = False
    user_belongs_to_pena_result: bool = False
    user_owns_player_result: bool = False
    admin_manages_player_result: bool = False

    def admin_manages_pena(self, *, admin_id: int, pena_guid: str) -> bool:
        return self.admin_manages_pena_result

    def user_belongs_to_pena(self, *, account_id: int, pena_guid: str) -> bool:
        return self.user_belongs_to_pena_result

    def user_owns_player(self, *, account_id: int, player_guid: str) -> bool:
        return self.user_owns_player_result

    def admin_manages_player(self, *, admin_id: int, player_guid: str) -> bool:
        return self.admin_manages_player_result


def _session(user_type: str, user_id: int = 10) -> SessionData:
    return SessionData(
        token="tok",
        user_id=user_id,
        user_guid="guid",
        user_type=user_type,
        expires_at=9999999999,
    )


def test_authorize_pena_access_positive_admin():
    repo = _FakeAccessRepo(admin_manages_pena_result=True)
    use_case = AuthorizePenaAccessUseCase(repo)

    use_case.execute(pena_guid="pena-guid", session=_session("admin"))


def test_authorize_pena_access_negative_admin_denied():
    repo = _FakeAccessRepo(admin_manages_pena_result=False)
    use_case = AuthorizePenaAccessUseCase(repo)

    with pytest.raises(AccessDeniedError):
        use_case.execute(pena_guid="pena-guid", session=_session("admin"))


def test_authorize_pena_access_negative_user_denied_message():
    repo = _FakeAccessRepo(user_belongs_to_pena_result=False)
    use_case = AuthorizePenaAccessUseCase(repo)

    with pytest.raises(AccessDeniedError, match="User does not belong to this pena"):
        use_case.execute(pena_guid="pena-guid", session=_session("user"))


def test_authorize_pena_access_edge_invalid_session_type():
    repo = _FakeAccessRepo()
    use_case = AuthorizePenaAccessUseCase(repo)

    with pytest.raises(InvalidSessionTypeError):
        use_case.execute(pena_guid="pena-guid", session=_session("guest"))


def test_authorize_pena_access_edge_user_member():
    repo = _FakeAccessRepo(user_belongs_to_pena_result=True)
    use_case = AuthorizePenaAccessUseCase(repo)

    use_case.execute(pena_guid="pena-guid", session=_session("user"))


def test_authorize_player_access_positive_user_owner():
    repo = _FakeAccessRepo(user_owns_player_result=True)
    use_case = AuthorizePlayerAccessUseCase(repo)

    use_case.execute(player_guid="player-guid", session=_session("user"))


def test_authorize_player_access_negative_user_denied():
    repo = _FakeAccessRepo(user_owns_player_result=False)
    use_case = AuthorizePlayerAccessUseCase(repo)

    with pytest.raises(AccessDeniedError):
        use_case.execute(player_guid="player-guid", session=_session("user"))


def test_authorize_player_access_negative_admin_denied_message():
    repo = _FakeAccessRepo(admin_manages_player_result=False)
    use_case = AuthorizePlayerAccessUseCase(repo)

    with pytest.raises(AccessDeniedError, match="Admin cannot access this player"):
        use_case.execute(player_guid="player-guid", session=_session("admin"))


def test_authorize_player_access_edge_admin_managed():
    repo = _FakeAccessRepo(admin_manages_player_result=True)
    use_case = AuthorizePlayerAccessUseCase(repo)

    use_case.execute(player_guid="player-guid", session=_session("admin"))


def test_authorize_player_access_edge_invalid_session_type():
    repo = _FakeAccessRepo()
    use_case = AuthorizePlayerAccessUseCase(repo)

    with pytest.raises(InvalidSessionTypeError):
        use_case.execute(player_guid="player-guid", session=_session("guest"))
