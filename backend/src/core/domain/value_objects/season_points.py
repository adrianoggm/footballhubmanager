"""Value Object con la puntuación de una temporada (victoria/empate/derrota).

Invariante de negocio (PL-02): cada valor es un entero mayor o igual que 0. Una
puntuación negativa restaría puntos por jugar y rompe la clasificación.
"""

from __future__ import annotations

from dataclasses import dataclass

from core.domain.errors import InvalidSeasonPointsError


def ensure_valid_season_points(value: object) -> int:
    # ``bool`` is an ``int`` subclass: reject it explicitly.
    if isinstance(value, bool) or not isinstance(value, int) or value < 0:
        raise InvalidSeasonPointsError()
    return value


@dataclass(frozen=True)
class SeasonPoints:
    win: int
    draw: int
    loss: int

    def __post_init__(self) -> None:
        for value in (self.win, self.draw, self.loss):
            ensure_valid_season_points(value)
