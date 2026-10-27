from sqlalchemy import BigInteger, String
from sqlalchemy.orm import Mapped, mapped_column

from .base_entity import Base, GuidMixin


class AdminAccounts(GuidMixin, Base):
    __tablename__ = "admin_accounts"

    id: Mapped[int] = mapped_column(primary_key=True)
    username: Mapped[str] = mapped_column(unique=True)
    password: Mapped[str] = mapped_column()
    name: Mapped[str] = mapped_column()
    # Normalized (trimmed, lowercase). Nullable: accounts created before email
    # support have none. Unique within this table only.
    email: Mapped[str | None] = mapped_column(String(254), unique=True, nullable=True)
    # Epoch seconds of the last successful verification of ``email``; NULL = unverified.
    email_verified_at: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
