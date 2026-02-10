from uuid import uuid4

from sqlalchemy import String
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class GuidMixin:
    guid: Mapped[str] = mapped_column(
        String(36),
        unique=True,
        nullable=False,
        default=lambda: str(uuid4()),
    )


class Base(DeclarativeBase):
    pass
