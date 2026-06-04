from core.application.ports.pena_player_query_port import (
    PenaPlayerInfoResult,
    PenaPlayerQueryPort,
    PenaPlayersPageResult,
)
from persistence.domain.entity import Pena, PenaPlayer, PenaRole, Player
from sqlalchemy import case, func, or_, select
from sqlalchemy.orm import Session


class SqlAlchemyPenaPlayerQueryRepository(PenaPlayerQueryPort):
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
        role: str | None,
        position: str | None,
        search: str | None,
        page: int,
        page_size: int,
    ) -> PenaPlayersPageResult:
        resolved_role = self._resolved_role_expression().label("resolved_role")
        stmt = (
            select(Player, PenaPlayer, resolved_role)
            .join(PenaPlayer, PenaPlayer.id_player == Player.id)
            .join(Pena, Pena.id == PenaPlayer.id_pena)
            .outerjoin(PenaRole, PenaRole.id == PenaPlayer.id_role)
            .where(Pena.guid == pena_guid)
        )
        stmt = self._apply_filters(
            stmt,
            name=name,
            surname1=surname1,
            surname2=surname2,
            nationality=nationality,
            nickname=nickname,
            role=role,
            position=position,
            search=search,
            resolved_role=resolved_role,
        )

        total_stmt = (
            select(func.count())
            .select_from(Player)
            .join(PenaPlayer, PenaPlayer.id_player == Player.id)
            .join(Pena, Pena.id == PenaPlayer.id_pena)
            .outerjoin(PenaRole, PenaRole.id == PenaPlayer.id_role)
            .where(Pena.guid == pena_guid)
        )
        total_stmt = self._apply_filters(
            total_stmt,
            name=name,
            surname1=surname1,
            surname2=surname2,
            nationality=nationality,
            nickname=nickname,
            role=role,
            position=position,
            search=search,
            resolved_role=self._resolved_role_expression(),
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
                    role=role_value,
                    position=link.position,
                )
                for player, link, role_value in rows
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
        role: str | None,
        position: str | None,
        search: str | None,
        resolved_role,
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
        if role:
            stmt = stmt.where(resolved_role.ilike(f"%{role}%"))
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
                    resolved_role.ilike(pattern),
                )
            )
        return stmt

    @staticmethod
    def _resolved_role_expression():
        return func.coalesce(
            PenaRole.name,
            case((Player.id_player_account.is_(None), "guest"), else_="member"),
        )
