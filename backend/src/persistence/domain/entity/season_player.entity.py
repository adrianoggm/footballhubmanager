from dataclasses import dataclass


@dataclass
class SeasonPlayer:
    id_player: int
    id_pena: int
    id_season: int
    wins: int
    losses: int
    draws: int
    quality_level: float