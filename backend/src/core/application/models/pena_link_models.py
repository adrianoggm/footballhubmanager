from dataclasses import dataclass


@dataclass(frozen=True)
class PenaLinkToken:
    token: str
    pena_guid: str
    expires_at: int
