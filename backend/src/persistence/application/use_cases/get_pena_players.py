from dataclasses import dataclass

from sqlalchemy import or_, select, func
from sqlalchemy.orm import Session

from persistence.domain.entity import Pena, PenaPlayer, Player


@dataclass(frozen=True)
class PenaPlayerInfo:
    guid: str
    name: str
    surname1: str
    surname2: str | None
    nationality: str
    nickname: str | None
    position: str | None


@dataclass(frozen=True)
class PenaPlayerFilters:
    name: str | None = None
    surname1: str | None = None
    surname2: str | None = None
    nationality: str | None = None
    nickname: str | None = None
    position: str | None = None
    search: str | None = None


@dataclass(frozen=True)
class PenaPlayersPage:
    items: list[PenaPlayerInfo]
    page: int
    page_size: int
    total: int


class GetPenaPlayersUseCase:
    def __init__(self, session: Session):
        self.session = session

    def execute(
        self,
        pena_guid: str,
        *,
        filters: PenaPlayerFilters | None = None,
        page: int = 1,
        page_size: int = 20,
    ) -> PenaPlayersPage:
        stmt = (
            select(Player, PenaPlayer)
            .join(PenaPlayer, PenaPlayer.id_player == Player.id)
            .join(Pena, Pena.id == PenaPlayer.id_pena)
            .where(Pena.guid == pena_guid)
        )
        stmt = self._apply_filters(stmt, filters)

        total_stmt = (
            select(func.count())
            .select_from(Player)
            .join(PenaPlayer, PenaPlayer.id_player == Player.id)
            .join(Pena, Pena.id == PenaPlayer.id_pena)
            .where(Pena.guid == pena_guid)
        )
        total_stmt = self._apply_filters(total_stmt, filters)

        stmt = stmt.order_by(Player.surname1, Player.surname2, Player.name)
        stmt = stmt.limit(page_size).offset((page - 1) * page_size)

        rows = self.session.execute(stmt).all()
        items = [
            PenaPlayerInfo(
                guid=player.guid,
                name=player.name,
                surname1=player.surname1,
                surname2=player.surname2,
                nationality=player.nationality,
                nickname=link.nickname,
                position=link.position,
            )
            for player, link in rows
        ]
        total = int(self.session.execute(total_stmt).scalar() or 0)
        return PenaPlayersPage(items=items, page=page, page_size=page_size, total=total)

    @staticmethod
    def _apply_filters(stmt, filters: PenaPlayerFilters | None):
        if not filters:
            return stmt

        if filters.name:
            stmt = stmt.where(Player.name.ilike(f"%{filters.name}%"))
        if filters.surname1:
            stmt = stmt.where(Player.surname1.ilike(f"%{filters.surname1}%"))
        if filters.surname2:
            stmt = stmt.where(Player.surname2.ilike(f"%{filters.surname2}%"))
        if filters.nationality:
            stmt = stmt.where(Player.nationality.ilike(f"%{filters.nationality}%"))
        if filters.nickname:
            stmt = stmt.where(PenaPlayer.nickname.ilike(f"%{filters.nickname}%"))
        if filters.position:
            stmt = stmt.where(PenaPlayer.position.ilike(f"%{filters.position}%"))
        if filters.search:
            pattern = f"%{filters.search}%"
            stmt = stmt.where(
                or_(
                    Player.name.ilike(pattern),
                    Player.surname1.ilike(pattern),
                    Player.surname2.ilike(pattern),
                    PenaPlayer.nickname.ilike(pattern),
                )
            )
        return stmt
