from sqlalchemy import ForeignKey, PrimaryKeyConstraint
from sqlalchemy.orm import Mapped, mapped_column

from .base import Base, GuidMixin


class TeamPlayer(GuidMixin, Base):
    __tablename__ = "team_player"

    id_team: Mapped[int] = mapped_column(ForeignKey("team.id"))
    id_player: Mapped[int] = mapped_column(ForeignKey("player.id"))
    goals: Mapped[int] = mapped_column(default=0)
    assists: Mapped[int] = mapped_column(default=0)
    rating: Mapped[float] = mapped_column(default=0.00)
    saves: Mapped[int] = mapped_column(default=0)

    __table_args__ = (PrimaryKeyConstraint("id_team", "id_player"),)