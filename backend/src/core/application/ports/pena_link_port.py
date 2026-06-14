from dataclasses import dataclass
from typing import Protocol


@dataclass(frozen=True)
class PenaLinkTokenResult:
    token: str
    pena_guid: str
    expires_at: int
    # Set for targeted claim tokens (token bound to a specific existing guest player).
    player_guid: str | None = None


@dataclass(frozen=True)
class ClaimTokenInfoResult:
    pena_guid: str
    pena_name: str
    player_guid: str
    player_name: str
    player_nickname: str | None
    expires_at: int


@dataclass(frozen=True)
class ClaimRegistrationResult:
    account_id: int
    account_guid: str
    player_guid: str
    pena_guid: str


class PenaLinkPort(Protocol):
    def create_token_for_admin_pena(
        self, *, admin_id: int, pena_guid: str, ttl_seconds: int
    ) -> PenaLinkTokenResult: ...

    def create_claim_token_for_admin(
        self, *, admin_id: int, pena_guid: str, player_guid: str, ttl_seconds: int
    ) -> PenaLinkTokenResult: ...

    def consume_token_for_user(
        self,
        *,
        token: str,
        account_id: int,
        nickname: str | None,
        position: str | None,
    ) -> None: ...

    def inspect_claim_token(self, *, token: str) -> ClaimTokenInfoResult: ...

    def register_and_claim_player(
        self, *, token: str, username: str, password_hash: str
    ) -> ClaimRegistrationResult: ...
