from sqlalchemy import ForeignKey, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from .base import Base


class PenaPlayer(Base):
    __tablename__ = "pena_player"

    id: Mapped[int] = mapped_column(primary_key=True)
    id_player: Mapped[int] = mapped_column(ForeignKey("player.id"))
    id_pena: Mapped[int] = mapped_column(ForeignKey("pena.id"))
    nickname: Mapped[str | None] = mapped_column()
    position: Mapped[str | None] = mapped_column()

    __table_args__ = (UniqueConstraint("id_player", "id_pena"),)