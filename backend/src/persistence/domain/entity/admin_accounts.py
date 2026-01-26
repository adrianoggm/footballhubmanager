from sqlalchemy.orm import Mapped, mapped_column

from .base import Base, GuidMixin


class AdminAccounts(GuidMixin, Base):
    __tablename__ = "admin_accounts"

    id: Mapped[int] = mapped_column(primary_key=True)
    username: Mapped[str] = mapped_column(unique=True)
    password: Mapped[str] = mapped_column()
    name: Mapped[str] = mapped_column()