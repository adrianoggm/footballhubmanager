from datetime import date

from sqlalchemy import ForeignKey, Index
from sqlalchemy.orm import Mapped, mapped_column

from .base import Base


class Season(Base):
    __tablename__ = "season"

    id: Mapped[int] = mapped_column(primary_key=True)
    id_pena: Mapped[int] = mapped_column(ForeignKey("pena.id"))
    start_date: Mapped[date] = mapped_column()
    end_date: Mapped[date] = mapped_column()

    __table_args__ = (Index("idx_season_pena", "id_pena"),)