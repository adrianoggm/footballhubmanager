from dataclasses import dataclass

import pytest
from core.application.commands.pena_link_command_handlers import (
    GeneratePenaClaimTokenHandler,
    GeneratePenaLinkTokenHandler,
    LinkExistingAccountToClaimHandler,
    LinkUserToPenaHandler,
    RegisterAndClaimPlayerHandler,
)
from core.application.commands.pena_link_commands import (
    GeneratePenaClaimTokenCommand,
    GeneratePenaLinkTokenCommand,
    LinkExistingAccountToClaimCommand,
    LinkUserToPenaCommand,
    RegisterAndClaimPlayerCommand,
)
from core.application.ports.pena_link_port import (
    ClaimLinkResult,
    ClaimRegistrationResult,
    ClaimTokenInfoResult,
    PenaLinkTokenResult,
)
from core.application.queries.pena_link_queries import InspectClaimTokenQuery
from core.application.queries.pena_link_query_handlers import InspectClaimTokenHandler
from core.domain.errors import (
    InvalidLinkTokenError,
    InvalidRegistrationDataError,
    PenaLinkAccessDeniedError,
    PlayerAlreadyClaimedError,
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


@dataclass
class _ClaimTokenRepo:
    last_payload: dict | None = None

    def create_claim_token_for_admin(
        self, *, admin_id: int, pena_guid: str, player_guid: str, ttl_seconds: int
    ):
        self.last_payload = {
            "admin_id": admin_id,
            "pena_guid": pena_guid,
            "player_guid": player_guid,
            "ttl_seconds": ttl_seconds,
        }
        return PenaLinkTokenResult(
            token="claim-1",
            pena_guid=pena_guid,
            expires_at=1700000000,
            player_guid=player_guid,
        )


@dataclass
class _RegisterClaimRepo:
    should_raise_already_claimed: bool = False
    last_payload: dict | None = None

    def register_and_claim_player(self, *, token: str, username: str, password_hash: str):
        if self.should_raise_already_claimed:
            raise PlayerAlreadyClaimedError()
        self.last_payload = {
            "token": token,
            "username": username,
            "password_hash": password_hash,
        }
        return ClaimRegistrationResult(
            account_id=7,
            account_guid="acc-7",
            player_guid="player-200",
            pena_guid="pena-100",
        )


@dataclass
class _InspectRepo:
    def inspect_claim_token(self, *, token: str):
        return ClaimTokenInfoResult(
            pena_guid="pena-100",
            pena_name="Los Amigos",
            player_guid="player-200",
            player_name="Ana",
            player_nickname="Nani",
            expires_at=1700000000,
        )


def test_generate_claim_handler_returns_player_bound_token():
    repo = _ClaimTokenRepo()
    result = GeneratePenaClaimTokenHandler(repo).handle(
        GeneratePenaClaimTokenCommand(
            admin_id=3, pena_guid="pena-100", player_guid="player-200", ttl_seconds=3600
        )
    )

    assert result.token == "claim-1"
    assert result.player_guid == "player-200"
    assert repo.last_payload["player_guid"] == "player-200"


def test_register_and_claim_handler_hashes_password_and_returns_result():
    repo = _RegisterClaimRepo()
    result = RegisterAndClaimPlayerHandler(repo).handle(
        RegisterAndClaimPlayerCommand(token="  tok  ", username="  ana  ", password="secret")
    )

    assert result.account_guid == "acc-7"
    assert result.player_guid == "player-200"
    assert repo.last_payload["token"] == "tok"
    assert repo.last_payload["username"] == "ana"
    # The handler hashes before reaching the repository.
    assert repo.last_payload["password_hash"] != "secret"


def test_register_and_claim_handler_rejects_blank_token():
    repo = _RegisterClaimRepo()
    with pytest.raises(InvalidLinkTokenError):
        RegisterAndClaimPlayerHandler(repo).handle(
            RegisterAndClaimPlayerCommand(token="   ", username="ana", password="secret")
        )
    assert repo.last_payload is None


def test_register_and_claim_handler_rejects_missing_credentials():
    repo = _RegisterClaimRepo()
    with pytest.raises(InvalidRegistrationDataError):
        RegisterAndClaimPlayerHandler(repo).handle(
            RegisterAndClaimPlayerCommand(token="tok", username="  ", password="secret")
        )
    with pytest.raises(InvalidRegistrationDataError):
        RegisterAndClaimPlayerHandler(repo).handle(
            RegisterAndClaimPlayerCommand(token="tok", username="ana", password="")
        )


def test_register_and_claim_handler_propagates_already_claimed():
    repo = _RegisterClaimRepo(should_raise_already_claimed=True)
    with pytest.raises(PlayerAlreadyClaimedError):
        RegisterAndClaimPlayerHandler(repo).handle(
            RegisterAndClaimPlayerCommand(token="tok", username="ana", password="secret")
        )


def test_inspect_claim_token_handler_returns_info():
    info = InspectClaimTokenHandler(_InspectRepo()).handle(InspectClaimTokenQuery(token="  tok  "))

    assert info.pena_name == "Los Amigos"
    assert info.player_name == "Ana"
    assert info.player_nickname == "Nani"


def test_inspect_claim_token_handler_rejects_blank_token():
    with pytest.raises(InvalidLinkTokenError):
        InspectClaimTokenHandler(_InspectRepo()).handle(InspectClaimTokenQuery(token="   "))


@dataclass
class _LinkAccountRepo:
    should_raise_already_linked: bool = False
    last_payload: dict | None = None

    def link_existing_account_to_player(self, *, token: str, account_id: int):
        if self.should_raise_already_linked:
            raise UserAlreadyLinkedError()
        self.last_payload = {"token": token, "account_id": account_id}
        return ClaimLinkResult(player_guid="own-60", pena_guid="pena-100")


def test_link_existing_account_handler_returns_result():
    repo = _LinkAccountRepo()
    result = LinkExistingAccountToClaimHandler(repo).handle(
        LinkExistingAccountToClaimCommand(token="  tok-link  ", account_id=50)
    )

    assert result.player_guid == "own-60"
    assert result.pena_guid == "pena-100"
    assert repo.last_payload == {"token": "tok-link", "account_id": 50}


def test_link_existing_account_handler_rejects_blank_token():
    repo = _LinkAccountRepo()
    with pytest.raises(InvalidLinkTokenError):
        LinkExistingAccountToClaimHandler(repo).handle(
            LinkExistingAccountToClaimCommand(token="   ", account_id=50)
        )
    assert repo.last_payload is None


def test_link_existing_account_handler_propagates_already_linked():
    repo = _LinkAccountRepo(should_raise_already_linked=True)
    with pytest.raises(UserAlreadyLinkedError):
        LinkExistingAccountToClaimHandler(repo).handle(
            LinkExistingAccountToClaimCommand(token="tok-link", account_id=50)
        )
