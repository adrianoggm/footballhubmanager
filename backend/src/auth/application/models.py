from dataclasses import dataclass


@dataclass(frozen=True)
class AuthAccount:
    id: int
    guid: str
    username: str
    password_hash: str
    user_type: str
