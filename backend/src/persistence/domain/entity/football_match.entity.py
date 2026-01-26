from dataclasses import dataclass
from datetime import date


@dataclass
class FootballMatch:  # Renamed from Match to avoid reserved keyword
    id: int
    id_home_team: int
    id_away_team: int
    match_date: date
    id_season: int