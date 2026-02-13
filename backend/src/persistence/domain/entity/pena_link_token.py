from sqlalchemy import ForeignKey
from sqlalchemy.orm import Mapped, mapped_column

from .base import Base


class PenaLinkToken(Base):
    __tablename__ = "pena_link_token"

    token: Mapped[str] = mapped_column(primary_key=True)
    id_pena: Mapped[int] = mapped_column(ForeignKey("pena.id"))
    expires_at: Mapped[int] = mapped_column()
