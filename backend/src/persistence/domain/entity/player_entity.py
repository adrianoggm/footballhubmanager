from sqlalchemy import ForeignKey
from sqlalchemy.orm import Mapped, mapped_column

from .base_entity import Base, GuidMixin


class Player(GuidMixin, Base):
    __tablename__ = "player"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column()
    surname1: Mapped[str] = mapped_column()
    surname2: Mapped[str | None] = mapped_column()
    nationality: Mapped[str] = mapped_column()
    id_player_account: Mapped[int | None] = mapped_column(ForeignKey("player_account.id"))
