from dataclasses import dataclass
from typing import Optional


@dataclass
class PenaPlayer:
    id: int
    id_player: int
    id_pena: int
    nickname: Optional[str]
    position: Optional[str]