from dataclasses import dataclass
from datetime import date


@dataclass
class Season:
    id: int
    id_pena: int
    start_date: date
    end_date: date