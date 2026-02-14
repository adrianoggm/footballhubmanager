from auth.application.ports import AccessRepository
from persistence.domain.entity import Pena, PenaPlayer, Player
from sqlalchemy import select
from sqlalchemy.orm import Session


class SqlAlchemyAccessRepository(AccessRepository):
    def __init__(self, session: Session):
        self.session = session

    def admin_manages_pena(self, *, admin_id: int, pena_guid: str) -> bool:
        row = self.session.execute(
            select(Pena.id).where(Pena.guid == pena_guid, Pena.id_admin == admin_id)
        ).first()
        return bool(row)

    def user_belongs_to_pena(self, *, account_id: int, pena_guid: str) -> bool:
        row = self.session.execute(
            select(Pena.id)
            .join(PenaPlayer, PenaPlayer.id_pena == Pena.id)
            .join(Player, Player.id == PenaPlayer.id_player)
            .where(Pena.guid == pena_guid, Player.id_player_account == account_id)
        ).first()
        return bool(row)

    def user_owns_player(self, *, account_id: int, player_guid: str) -> bool:
        row = self.session.execute(
            select(Player.id).where(
                Player.guid == player_guid, Player.id_player_account == account_id
            )
        ).first()
        return bool(row)

    def admin_manages_player(self, *, admin_id: int, player_guid: str) -> bool:
        row = self.session.execute(
            select(Player.id)
            .join(PenaPlayer, PenaPlayer.id_player == Player.id)
            .join(Pena, Pena.id == PenaPlayer.id_pena)
            .where(Player.guid == player_guid, Pena.id_admin == admin_id)
        ).first()
        return bool(row)
