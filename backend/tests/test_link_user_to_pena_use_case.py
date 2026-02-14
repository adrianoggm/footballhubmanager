from dataclasses import dataclass

import pytest
from persistence.application.ports.pena_link_repository import (
    InvalidOrExpiredLinkTokenError,
    UserAlreadyLinkedToPenaError,
    UserPlayerNotFoundError,
)
from persistence.application.use_cases.link_user_to_pena import (
    InvalidLinkTokenError,
    LinkUserToPenaUseCase,
    UserAlreadyLinkedError,
    UserProfileNotFoundError,
)


@dataclass
class _FakeRepo:
    should_raise_invalid: bool = False
    should_raise_already_linked: bool = False
    should_raise_user_not_found: bool = False
    last_payload: dict | None = None

    def consume_token_for_user(self, *, token: str, account_id: int, nickname, position):
        if self.should_raise_invalid:
            raise InvalidOrExpiredLinkTokenError()
        if self.should_raise_already_linked:
            raise UserAlreadyLinkedToPenaError()
        if self.should_raise_user_not_found:
            raise UserPlayerNotFoundError()
        self.last_payload = {
            "token": token,
            "account_id": account_id,
            "nickname": nickname,
            "position": position,
        }


def test_link_user_positive_normalizes_payload():
    repo = _FakeRepo()
    use_case = LinkUserToPenaUseCase(repo)

    use_case.execute(
        token="  token-123  ",
        account_id=4,
        nickname="  Killer  ",
        position="  GK  ",
    )

    assert repo.last_payload == {
        "token": "token-123",
        "account_id": 4,
        "nickname": "Killer",
        "position": "GK",
    }


def test_link_user_negative_maps_invalid_token():
    repo = _FakeRepo(should_raise_invalid=True)
    use_case = LinkUserToPenaUseCase(repo)

    with pytest.raises(InvalidLinkTokenError):
        use_case.execute(token="token-123", account_id=4, nickname=None, position=None)


def test_link_user_edge_blank_token_rejected_before_repo():
    repo = _FakeRepo()
    use_case = LinkUserToPenaUseCase(repo)

    with pytest.raises(InvalidLinkTokenError):
        use_case.execute(token="   ", account_id=4, nickname=None, position=None)
    assert repo.last_payload is None


def test_link_user_edge_blank_optional_fields_become_none():
    repo = _FakeRepo()
    use_case = LinkUserToPenaUseCase(repo)

    use_case.execute(token="token-123", account_id=4, nickname="   ", position=" ")

    assert repo.last_payload == {
        "token": "token-123",
        "account_id": 4,
        "nickname": None,
        "position": None,
    }


def test_link_user_maps_already_linked_error():
    repo = _FakeRepo(should_raise_already_linked=True)
    use_case = LinkUserToPenaUseCase(repo)

    with pytest.raises(UserAlreadyLinkedError):
        use_case.execute(token="token-123", account_id=4, nickname=None, position=None)


def test_link_user_maps_user_profile_not_found_error():
    repo = _FakeRepo(should_raise_user_not_found=True)
    use_case = LinkUserToPenaUseCase(repo)

    with pytest.raises(UserProfileNotFoundError):
        use_case.execute(token="token-123", account_id=4, nickname=None, position=None)
