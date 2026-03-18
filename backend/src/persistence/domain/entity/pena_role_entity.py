from sqlalchemy import ForeignKey, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from .base_entity import Base, GuidMixin


class PenaRole(GuidMixin, Base):
    __tablename__ = "pena_role"

    id: Mapped[int] = mapped_column(primary_key=True)
    id_pena: Mapped[int] = mapped_column(ForeignKey("pena.id"))
    name: Mapped[str] = mapped_column()
    color: Mapped[str | None] = mapped_column()
    sort_order: Mapped[int] = mapped_column(default=0)

    __table_args__ = (UniqueConstraint("id_pena", "name"),)
