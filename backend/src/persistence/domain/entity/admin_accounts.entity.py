from dataclasses import dataclass


@dataclass
class AdminAccounts:
    id: int
    username: str
    password: str
    name: str