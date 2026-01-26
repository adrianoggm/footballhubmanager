from dataclasses import dataclass


@dataclass
class TeamPlayer:
    id_team: int
    id_player: int
    goals: int
    assists: int
    rating: float
    saves: int