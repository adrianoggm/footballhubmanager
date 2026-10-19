from datetime import date

from sqlalchemy import BigInteger, Date, DateTime, ForeignKey, String, func
from sqlalchemy.orm import Mapped, mapped_column

from .base_entity import Base, GuidMixin


class PenaTransaction(GuidMixin, Base):
    """Unified accountability ledger row: one table for income and expense.

    Replaces the former ``pena_expense`` table (migrated in ``v12.sql``). Keeping
    both movement kinds in a single table makes the ledger a single indexed scan
    and every KPI a single aggregate, instead of UNION-ing two tables.
    """

    __tablename__ = "pena_transaction"

    id: Mapped[int] = mapped_column(primary_key=True)
    id_pena: Mapped[int] = mapped_column(ForeignKey("pena.id"), nullable=False)
    # 'income' | 'expense' — sign of the movement; amount_cents stays positive.
    type: Mapped[str] = mapped_column(String(10), nullable=False)
    amount_cents: Mapped[int] = mapped_column(BigInteger, nullable=False, default=0)
    # Free-text payer/recipient ("Sergio Ramos", "Volt & Co.").
    entity: Mapped[str | None] = mapped_column(String(160))
    concept: Mapped[str] = mapped_column(String(160), nullable=False)
    category: Mapped[str | None] = mapped_column(String(80))
    note: Mapped[str | None] = mapped_column(String(255))
    occurred_on: Mapped[date] = mapped_column(Date, nullable=False)
    # Optional link to a member: an income tagged to a player pays down their dues.
    id_player: Mapped[int | None] = mapped_column(ForeignKey("player.id"))
    created_at: Mapped[DateTime] = mapped_column(
        DateTime,
        nullable=False,
        server_default=func.now(),
    )
    updated_at: Mapped[DateTime] = mapped_column(
        DateTime, nullable=False, server_default=func.now(), onupdate=func.now()
    )
