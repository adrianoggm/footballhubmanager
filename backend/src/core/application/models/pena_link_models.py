from dataclasses import dataclass


@dataclass(frozen=True)
class PenaLinkToken:
    token: str
    pena_guid: str
    expires_at: int
    # Set for targeted claim tokens (token bound to a specific existing guest player).
    player_guid: str | None = None


@dataclass(frozen=True)
class ClaimTokenInfo:
    """Public preview of a claim token shown before the invitee registers."""

    pena_guid: str
    pena_name: str
    player_guid: str
    player_name: str
    player_nickname: str | None
    expires_at: int


@dataclass(frozen=True)
class ClaimRegistration:
    """Result of registering a brand-new account that adopts an existing guest player."""

    account_id: int
    account_guid: str
    player_guid: str
    pena_guid: str


@dataclass(frozen=True)
class ClaimLink:
    """Result of linking an existing account to a guest player (profile merge)."""

    player_guid: str
    pena_guid: str
