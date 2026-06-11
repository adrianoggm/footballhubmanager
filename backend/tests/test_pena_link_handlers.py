from dataclasses import dataclass

import pytest
from core.application.commands.pena_link_command_handlers import (
    GeneratePenaLinkTokenHandler,
    LinkUserToPenaHandler,
)
from core.application.commands.pena_link_commands import (
    GeneratePenaLinkTokenCommand,
    LinkUserToPenaCommand,
)
from core.application.ports.pena_link_port import PenaLinkTokenResult
from core.domain.errors import (
    InvalidLinkTokenError,
    PenaLinkAccessDeniedError,
    UserAlreadyLinkedError,
    UserProfileNotFoundError,
)


@dataclass
class _GenerateRepo:
    should_raise_access_denied: bool = False
    last_payload: dict | None = None

    def create_token_for_admin_pena(self, *, admin_id: int, pena_guid: str, ttl_seconds: int):
        if self.should_raise_access_denied:
            raise PenaLinkAccessDeniedError()
        self.last_payload = {
            "admin_id": admin_id,
            "pena_guid": pena_guid,
            "ttl_seconds": ttl_seconds,
        }
        return PenaLinkTokenResult(token="tok-1", pena_guid=pena_guid, expires_at=1700000000)


@dataclass
class _ConsumeRepo:
    should_raise_invalid: bool = False
    should_raise_already_linked: bool = False
    should_raise_user_not_found: bool = False
    last_payload: dict | None = None

    def consume_token_for_user(self, *, token: str, account_id: int, nickname, position):
        if self.should_raise_invalid:
            raise InvalidLinkTokenError()
        if self.should_raise_already_linked:
            raise UserAlreadyLinkedError()
        if self.should_raise_user_not_found:
            raise UserProfileNotFoundError()
        self.last_payload = {
            "token": token,
            "account_id": account_id,
            "nickname": nickname,
            "position": position,
        }


def test_generate_handler_returns_token_data():
    repo = _GenerateRepo()
    result = GeneratePenaLinkTokenHandler(repo).handle(
        GeneratePenaLinkTokenCommand(admin_id=3, pena_guid="pena-guid", ttl_seconds=3600)
    )

    assert result.token == "tok-1"
    assert result.pena_guid == "pena-guid"
    assert result.expires_at == 1700000000
    assert repo.last_payload["ttl_seconds"] == 3600


def test_generate_handler_propagates_access_denied():
    repo = _GenerateRepo(should_raise_access_denied=True)
    with pytest.raises(PenaLinkAccessDeniedError):
        GeneratePenaLinkTokenHandler(repo).handle(
            GeneratePenaLinkTokenCommand(admin_id=3, pena_guid="pena-guid", ttl_seconds=3600)
        )


def test_link_handler_normalizes_payload():
    repo = _ConsumeRepo()
    LinkUserToPenaHandler(repo).handle(
        LinkUserToPenaCommand(
            token="  token-123  ", account_id=4, nickname="  Killer  ", position="  GK  "
        )
    )

    assert repo.last_payload == {
        "token": "token-123",
        "account_id": 4,
        "nickname": "Killer",
        "position": "GK",
    }


def test_link_handler_rejects_blank_token_before_repo():
    repo = _ConsumeRepo()
    with pytest.raises(InvalidLinkTokenError):
        LinkUserToPenaHandler(repo).handle(
            LinkUserToPenaCommand(token="   ", account_id=4, nickname=None, position=None)
        )
    assert repo.last_payload is None


def test_link_handler_blank_optional_fields_become_none():
    repo = _ConsumeRepo()
    LinkUserToPenaHandler(repo).handle(
        LinkUserToPenaCommand(token="token-123", account_id=4, nickname="   ", position=" ")
    )

    assert repo.last_payload == {
        "token": "token-123",
        "account_id": 4,
        "nickname": None,
        "position": None,
    }


def test_link_handler_propagates_invalid_token():
    repo = _ConsumeRepo(should_raise_invalid=True)
    with pytest.raises(InvalidLinkTokenError):
        LinkUserToPenaHandler(repo).handle(
            LinkUserToPenaCommand(token="token-123", account_id=4, nickname=None, position=None)
        )


def test_link_handler_propagates_already_linked():
    repo = _ConsumeRepo(should_raise_already_linked=True)
    with pytest.raises(UserAlreadyLinkedError):
        LinkUserToPenaHandler(repo).handle(
            LinkUserToPenaCommand(token="token-123", account_id=4, nickname=None, position=None)
        )


def test_link_handler_propagates_user_profile_not_found():
    repo = _ConsumeRepo(should_raise_user_not_found=True)
    with pytest.raises(UserProfileNotFoundError):
        LinkUserToPenaHandler(repo).handle(
            LinkUserToPenaCommand(token="token-123", account_id=4, nickname=None, position=None)
        )
