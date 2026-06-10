"""Value Object con el rango de fechas de una temporada.

Invariante de negocio: la fecha de inicio no puede ser posterior a la de fin.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date

from core.domain.errors import InvalidPenaSeasonDataError


@dataclass(frozen=True)
class SeasonDateRange:
    start_date: date
    end_date: date

    def __post_init__(self) -> None:
        if self.start_date > self.end_date:
            raise InvalidPenaSeasonDataError()
