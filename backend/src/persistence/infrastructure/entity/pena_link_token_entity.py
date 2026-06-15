from sqlalchemy import ForeignKey
from sqlalchemy.orm import Mapped, mapped_column

from .base_entity import Base


class PenaLinkToken(Base):
    __tablename__ = "pena_link_token"

    token: Mapped[str] = mapped_column(primary_key=True)
    id_pena: Mapped[int] = mapped_column(ForeignKey("pena.id"))
    # When set, this token claims a specific existing guest player (adopt-on-register)
    # instead of creating a fresh membership. NULL keeps the legacy generic join token.
    id_player: Mapped[int | None] = mapped_column(ForeignKey("player.id"))
    expires_at: Mapped[int] = mapped_column()
