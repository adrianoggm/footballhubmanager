from sqlalchemy import ForeignKey
from sqlalchemy.orm import Mapped, mapped_column

from .base import Base, GuidMixin


class Pena(GuidMixin, Base):
    __tablename__ = "pena"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column()
    position_labels: Mapped[str | None] = mapped_column()
    position_label_colors: Mapped[str | None] = mapped_column()
    id_admin: Mapped[int] = mapped_column(ForeignKey("admin_accounts.id"))
