from dataclasses import dataclass
from typing import Optional


@dataclass
class Player:
    id: int
    name: str
    surname1: str
    surname2: Optional[str]
    nationality: str
    id_player_account: Optional[int]