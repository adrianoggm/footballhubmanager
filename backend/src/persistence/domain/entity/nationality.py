from sqlalchemy.orm import Mapped, mapped_column

from .base import Base


class Nationality(Base):
    __tablename__ = "nationality"

    name: Mapped[str] = mapped_column(primary_key=True)
