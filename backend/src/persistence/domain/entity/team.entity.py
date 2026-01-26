from dataclasses import dataclass
from typing import Optional


@dataclass
class Team:
    id: int
    name: str
    id_match: Optional[int]