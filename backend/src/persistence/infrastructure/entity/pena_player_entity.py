from sqlalchemy import ForeignKey, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from .base_entity import Base, GuidMixin


class PenaPlayer(GuidMixin, Base):
    __tablename__ = "pena_player"

    id: Mapped[int] = mapped_column(primary_key=True)
    id_player: Mapped[int] = mapped_column(ForeignKey("player.id"))
    id_pena: Mapped[int] = mapped_column(ForeignKey("pena.id"))
    nickname: Mapped[str | None] = mapped_column()
    id_role: Mapped[int | None] = mapped_column(ForeignKey("pena_role.id"))
    position: Mapped[str | None] = mapped_column()

    __table_args__ = (UniqueConstraint("id_player", "id_pena"),)
