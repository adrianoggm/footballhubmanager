from datetime import date

from sqlalchemy import ForeignKey, Index
from sqlalchemy.orm import Mapped, mapped_column

from .base import Base, GuidMixin


class Season(GuidMixin, Base):
    __tablename__ = "season"

    id: Mapped[int] = mapped_column(primary_key=True)
    id_pena: Mapped[int] = mapped_column(ForeignKey("pena.id"))
    start_date: Mapped[date] = mapped_column()
    end_date: Mapped[date] = mapped_column()
    points_win: Mapped[int] = mapped_column(default=3)
    points_draw: Mapped[int] = mapped_column(default=1)
    points_loss: Mapped[int] = mapped_column(default=0)

    __table_args__ = (Index("idx_season_pena", "id_pena"),)
