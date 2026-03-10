from sqlalchemy.orm import Mapped, mapped_column

from .base_entity import Base


class UserSession(Base):
    __tablename__ = "user_session"

    token: Mapped[str] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column()
    user_guid: Mapped[str] = mapped_column()
    user_type: Mapped[str] = mapped_column()
    expires_at: Mapped[int] = mapped_column()
