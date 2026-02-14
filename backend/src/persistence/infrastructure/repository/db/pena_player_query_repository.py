from persistence.application.ports.pena_player_query_repository import (
    PenaPlayerInfoResult,
    PenaPlayerQueryRepository,
    PenaPlayersPageResult,
)
from persistence.domain.entity import Pena, PenaPlayer, Player
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session


class SqlAlchemyPenaPlayerQueryRepository(PenaPlayerQueryRepository):
    def __init__(self, session: Session):
        self.session = session

    def find_by_pena_guid(
        self,
        pena_guid: str,
        *,
        name: str | None,
        surname1: str | None,
        surname2: str | None,
        nationality: str | None,
        nickname: str | None,
        position: str | None,
        search: str | None,
        page: int,
        page_size: int,
    ) -> PenaPlayersPageResult:
        stmt = (
            select(Player, PenaPlayer)
            .join(PenaPlayer, PenaPlayer.id_player == Player.id)
            .join(Pena, Pena.id == PenaPlayer.id_pena)
            .where(Pena.guid == pena_guid)
        )
        stmt = self._apply_filters(
            stmt,
            name=name,
            surname1=surname1,
            surname2=surname2,
            nationality=nationality,
            nickname=nickname,
            position=position,
            search=search,
        )

        total_stmt = (
            select(func.count())
            .select_from(Player)
            .join(PenaPlayer, PenaPlayer.id_player == Player.id)
            .join(Pena, Pena.id == PenaPlayer.id_pena)
            .where(Pena.guid == pena_guid)
        )
        total_stmt = self._apply_filters(
            total_stmt,
            name=name,
            surname1=surname1,
            surname2=surname2,
            nationality=nationality,
            nickname=nickname,
            position=position,
            search=search,
        )

        stmt = stmt.order_by(Player.surname1, Player.surname2, Player.name)
        stmt = stmt.limit(page_size).offset((page - 1) * page_size)
        rows = self.session.execute(stmt).all()
        total = int(self.session.execute(total_stmt).scalar() or 0)
        return PenaPlayersPageResult(
            items=[
                PenaPlayerInfoResult(
                    guid=player.guid,
                    name=player.name,
                    surname1=player.surname1,
                    surname2=player.surname2,
                    nationality=player.nationality,
                    nickname=link.nickname,
                    position=link.position,
                )
                for player, link in rows
            ],
            page=page,
            page_size=page_size,
            total=total,
        )

    @staticmethod
    def _apply_filters(
        stmt,
        *,
        name: str | None,
        surname1: str | None,
        surname2: str | None,
        nationality: str | None,
        nickname: str | None,
        position: str | None,
        search: str | None,
    ):
        if name:
            stmt = stmt.where(Player.name.ilike(f"%{name}%"))
        if surname1:
            stmt = stmt.where(Player.surname1.ilike(f"%{surname1}%"))
        if surname2:
            stmt = stmt.where(Player.surname2.ilike(f"%{surname2}%"))
        if nationality:
            stmt = stmt.where(Player.nationality.ilike(f"%{nationality}%"))
        if nickname:
            stmt = stmt.where(PenaPlayer.nickname.ilike(f"%{nickname}%"))
        if position:
            stmt = stmt.where(PenaPlayer.position.ilike(f"%{position}%"))
        if search:
            pattern = f"%{search}%"
            stmt = stmt.where(
                or_(
                    Player.name.ilike(pattern),
                    Player.surname1.ilike(pattern),
                    Player.surname2.ilike(pattern),
                    PenaPlayer.nickname.ilike(pattern),
                )
            )
        return stmt
