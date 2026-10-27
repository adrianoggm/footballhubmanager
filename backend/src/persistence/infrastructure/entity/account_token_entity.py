from sqlalchemy import BigInteger, String
from sqlalchemy.orm import Mapped, mapped_column

from .base_entity import Base


class AccountToken(Base):
    """Single-use email-verification / password-reset token.

    Only the sha256 hex digest of the token is persisted, never the raw value.
    """

    __tablename__ = "account_token"

    token_hash: Mapped[str] = mapped_column(String(64), primary_key=True)
    purpose: Mapped[str] = mapped_column(String(30))
    account_type: Mapped[str] = mapped_column(String(20))
    account_id: Mapped[int] = mapped_column()
    # Email address being verified (EMAIL_VERIFICATION only).
    email: Mapped[str | None] = mapped_column(String(254), nullable=True)
    expires_at: Mapped[int] = mapped_column(BigInteger)
    created_at: Mapped[int] = mapped_column(BigInteger)
