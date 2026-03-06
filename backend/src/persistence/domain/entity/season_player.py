from sqlalchemy import ForeignKey, Index, PrimaryKeyConstraint
from sqlalchemy.orm import Mapped, mapped_column

from .base import Base, GuidMixin


class SeasonPlayer(GuidMixin, Base):
    __tablename__ = "season_player"

    id_player: Mapped[int] = mapped_column(ForeignKey("player.id"))
    id_pena: Mapped[int] = mapped_column(ForeignKey("pena.id"))
    id_season: Mapped[int] = mapped_column(ForeignKey("season.id"))
    id_role: Mapped[int | None] = mapped_column(ForeignKey("pena_role.id"))
    position: Mapped[str | None] = mapped_column()
    wins: Mapped[int] = mapped_column(default=0)
    losses: Mapped[int] = mapped_column(default=0)
    draws: Mapped[int] = mapped_column(default=0)
    quality_level: Mapped[float] = mapped_column(default=0.000)

    __table_args__ = (
        PrimaryKeyConstraint("id_player", "id_pena", "id_season"),
        Index("idx_seasonplayer_season", "id_season"),
        Index("idx_seasonplayer_role", "id_role"),
    )
