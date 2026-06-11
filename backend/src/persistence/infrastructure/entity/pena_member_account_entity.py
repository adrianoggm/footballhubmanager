from sqlalchemy import BigInteger, DateTime, ForeignKey, String, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column

from .base_entity import Base, GuidMixin


class PenaMemberAccount(GuidMixin, Base):
    __tablename__ = "pena_member_account"

    id: Mapped[int] = mapped_column(primary_key=True)
    id_pena: Mapped[int] = mapped_column(ForeignKey("pena.id"), nullable=False)
    id_player: Mapped[int] = mapped_column(ForeignKey("player.id"), nullable=False)
    debt_cents: Mapped[int] = mapped_column(BigInteger, nullable=False, default=0)
    contribution_cents: Mapped[int] = mapped_column(BigInteger, nullable=False, default=0)
    note: Mapped[str | None] = mapped_column(String(255))
    updated_at: Mapped[DateTime] = mapped_column(
        DateTime, nullable=False, server_default=func.now(), onupdate=func.now()
    )

    __table_args__ = (UniqueConstraint("id_pena", "id_player"),)
