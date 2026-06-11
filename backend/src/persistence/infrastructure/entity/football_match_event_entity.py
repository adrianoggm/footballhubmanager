from sqlalchemy import ForeignKey
from sqlalchemy.orm import Mapped, mapped_column

from .base_entity import Base, GuidMixin


class FootballMatchEvent(GuidMixin, Base):
    __tablename__ = "football_match_event"

    id: Mapped[int] = mapped_column(primary_key=True)
    id_match: Mapped[int] = mapped_column(ForeignKey("football_match.id"))
    event_type: Mapped[str] = mapped_column()
    team_side: Mapped[str] = mapped_column()
    elapsed_seconds: Mapped[int] = mapped_column()
    value_delta: Mapped[int] = mapped_column(default=1)
    id_player: Mapped[int | None] = mapped_column(ForeignKey("player.id"), nullable=True)
    id_related_player: Mapped[int | None] = mapped_column(
        ForeignKey("player.id"),
        nullable=True,
    )
    note: Mapped[str | None] = mapped_column(nullable=True)
    recorded_at_epoch: Mapped[int] = mapped_column()
