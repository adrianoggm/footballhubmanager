from sqlalchemy import ForeignKey
from sqlalchemy.orm import Mapped, mapped_column

from .base import Base, GuidMixin


class Team(GuidMixin, Base):
    __tablename__ = "team"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column()
    id_match: Mapped[int | None] = mapped_column(ForeignKey("football_match.id"))