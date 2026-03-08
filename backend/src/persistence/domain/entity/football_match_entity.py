from datetime import date

from sqlalchemy import ForeignKey
from sqlalchemy.orm import Mapped, mapped_column

from .base_entity import Base, GuidMixin


class FootballMatch(GuidMixin, Base):
    __tablename__ = "football_match"

    id: Mapped[int] = mapped_column(primary_key=True)
    id_home_team: Mapped[int] = mapped_column(ForeignKey("team.id"))
    id_away_team: Mapped[int] = mapped_column(ForeignKey("team.id"))
    match_date: Mapped[date] = mapped_column()
    id_season: Mapped[int] = mapped_column(ForeignKey("season.id"))
