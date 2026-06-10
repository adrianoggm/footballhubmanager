from sqlalchemy import BigInteger, DateTime, ForeignKey, String, func
from sqlalchemy.orm import Mapped, mapped_column

from .base_entity import Base


class PenaAccountability(Base):
    __tablename__ = "pena_accountability"

    id_pena: Mapped[int] = mapped_column(ForeignKey("pena.id"), primary_key=True)
    currency: Mapped[str] = mapped_column(String(12), nullable=False, default="EUR")
    balance_cents: Mapped[int] = mapped_column(BigInteger, nullable=False, default=0)
    reserve_cents: Mapped[int] = mapped_column(BigInteger, nullable=False, default=0)
    budget_visibility: Mapped[str] = mapped_column(String(20), nullable=False, default="summary")
    expenses_visibility: Mapped[str] = mapped_column(String(20), nullable=False, default="summary")
    updated_at: Mapped[DateTime] = mapped_column(
        DateTime, nullable=False, server_default=func.now(), onupdate=func.now()
    )
