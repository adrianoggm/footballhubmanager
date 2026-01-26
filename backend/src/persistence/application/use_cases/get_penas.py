from dataclasses import dataclass

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from persistence.domain.entity import Pena, PenaPlayer, Player


@dataclass(frozen=True)
class PenaInfo:
    guid: str
    name: str


@dataclass(frozen=True)
class PenasPage:
    items: list[PenaInfo]
    page: int
    page_size: int
    total: int


class GetPenasUseCase:
    def __init__(self, session: Session):
        self.session = session

    def execute_for_admin(
        self,
        admin_id: int,
        *,
        page: int = 1,
        page_size: int = 20,
        search: str | None = None,
    ) -> PenasPage:
        stmt = select(Pena).where(Pena.id_admin == admin_id)
        if search:
            stmt = stmt.where(Pena.name.ilike(f"%{search}%"))

        total_stmt = select(func.count()).select_from(Pena).where(Pena.id_admin == admin_id)
        if search:
            total_stmt = total_stmt.where(Pena.name.ilike(f"%{search}%"))

        stmt = stmt.order_by(Pena.name).limit(page_size).offset((page - 1) * page_size)

        penas = self.session.execute(stmt).scalars().all()
        total = int(self.session.execute(total_stmt).scalar() or 0)
        return PenasPage(
            items=[PenaInfo(guid=pena.guid, name=pena.name) for pena in penas],
            page=page,
            page_size=page_size,
            total=total,
        )

    def execute_for_user(
        self,
        account_id: int,
        *,
        page: int = 1,
        page_size: int = 20,
        search: str | None = None,
    ) -> PenasPage:
        stmt = (
            select(Pena)
            .join(PenaPlayer, PenaPlayer.id_pena == Pena.id)
            .join(Player, Player.id == PenaPlayer.id_player)
            .where(Player.id_player_account == account_id)
            .distinct()
        )
        if search:
            stmt = stmt.where(Pena.name.ilike(f"%{search}%"))

        total_stmt = (
            select(func.count(func.distinct(Pena.id)))
            .select_from(Pena)
            .join(PenaPlayer, PenaPlayer.id_pena == Pena.id)
            .join(Player, Player.id == PenaPlayer.id_player)
            .where(Player.id_player_account == account_id)
        )
        if search:
            total_stmt = total_stmt.where(Pena.name.ilike(f"%{search}%"))

        stmt = stmt.order_by(Pena.name).limit(page_size).offset((page - 1) * page_size)

        penas = self.session.execute(stmt).scalars().all()
        total = int(self.session.execute(total_stmt).scalar() or 0)
        return PenasPage(
            items=[PenaInfo(guid=pena.guid, name=pena.name) for pena in penas],
            page=page,
            page_size=page_size,
            total=total,
        )

    def execute_by_guid(self, pena_guid: str) -> PenaInfo | None:
        pena = self.session.execute(select(Pena).where(Pena.guid == pena_guid)).scalar_one_or_none()
        if not pena:
            return None
        return PenaInfo(guid=pena.guid, name=pena.name)
