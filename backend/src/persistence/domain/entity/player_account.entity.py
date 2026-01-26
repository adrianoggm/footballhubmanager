from dataclasses import dataclass


@dataclass
class PlayerAccount:
    id: int
    username: str
    password: str
    name: str