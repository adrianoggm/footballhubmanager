from sqlalchemy import select
from sqlalchemy.orm import Session

from persistence.application.ports.pena_membership_repository import (
    PenaMembershipNotFoundError,
    PenaMembershipRepository,
    PenaMembershipResult,
    PenaNotFoundError,
    PenaNotManagedByAdminError,
    PlayerNotFoundError,
    UserPlayerNotFoundError,
)
from persistence.domain.entity import Pena, PenaPlayer, Player


class SqlAlchemyPenaMembershipRepository(PenaMembershipRepository):
    def __init__(self, session: Session):
        self.session = session

    def get_by_pena_and_player(self, *, pena_guid: str, player_guid: str) -> PenaMembershipResult:
        pena = self._get_pena(pena_guid)
        player = self._get_player_by_guid(player_guid)
        link = self._get_link(pena_id=pena.id, player_id=player.id, for_update=False)
        return self._to_result(pena=pena, player=player, link=link)

    def get_by_pena_and_account(self, *, pena_guid: str, account_id: int) -> PenaMembershipResult:
        pena = self._get_pena(pena_guid)
        player = self._get_player_by_account(account_id)
        link = self._get_link(pena_id=pena.id, player_id=player.id, for_update=False)
        return self._to_result(pena=pena, player=player, link=link)

    def update_by_account(
        self,
        *,
        pena_guid: str,
        account_id: int,
        nickname_provided: bool,
        nickname: str | None,
        position_provided: bool,
        position: str | None,
    ) -> PenaMembershipResult:
        pena = self._get_pena(pena_guid)
        player = self._get_player_by_account(account_id)
        link = self._get_link(pena_id=pena.id, player_id=player.id, for_update=True)

        if nickname_provided:
            link.nickname = nickname
        if position_provided:
            link.position = position

        self.session.commit()
        return self._to_result(pena=pena, player=player, link=link)

    def delete_by_account(
        self,
        *,
        pena_guid: str,
        account_id: int,
    ) -> None:
        pena = self._get_pena(pena_guid)
        player = self._get_player_by_account(account_id)
        link = self._get_link(pena_id=pena.id, player_id=player.id, for_update=True)

        self.session.delete(link)
        self.session.commit()

    def update_by_player_for_admin(
        self,
        *,
        pena_guid: str,
        admin_id: int,
        player_guid: str,
        nickname_provided: bool,
        nickname: str | None,
        position_provided: bool,
        position: str | None,
    ) -> PenaMembershipResult:
        pena = self._get_pena(pena_guid)
        if pena.id_admin != admin_id:
            self.session.rollback()
            raise PenaNotManagedByAdminError()

        player = self._get_player_by_guid(player_guid)
        link = self._get_link(pena_id=pena.id, player_id=player.id, for_update=True)

        if nickname_provided:
            link.nickname = nickname
        if position_provided:
            link.position = position

        self.session.commit()
        return self._to_result(pena=pena, player=player, link=link)

    def delete_by_player_for_admin(
        self,
        *,
        pena_guid: str,
        admin_id: int,
        player_guid: str,
    ) -> None:
        pena = self._get_pena(pena_guid)
        if pena.id_admin != admin_id:
            self.session.rollback()
            raise PenaNotManagedByAdminError()

        player = self._get_player_by_guid(player_guid)
        link = self._get_link(pena_id=pena.id, player_id=player.id, for_update=True)

        self.session.delete(link)
        self.session.commit()

    def _get_pena(self, pena_guid: str) -> Pena:
        pena = self.session.execute(select(Pena).where(Pena.guid == pena_guid)).scalar_one_or_none()
        if not pena:
            self.session.rollback()
            raise PenaNotFoundError()
        return pena

    def _get_player_by_guid(self, player_guid: str) -> Player:
        player = self.session.execute(
            select(Player).where(Player.guid == player_guid)
        ).scalar_one_or_none()
        if not player:
            self.session.rollback()
            raise PlayerNotFoundError()
        return player

    def _get_player_by_account(self, account_id: int) -> Player:
        player = self.session.execute(
            select(Player).where(Player.id_player_account == account_id)
        ).scalar_one_or_none()
        if not player:
            self.session.rollback()
            raise UserPlayerNotFoundError()
        return player

    def _get_link(self, *, pena_id: int, player_id: int, for_update: bool) -> PenaPlayer:
        stmt = select(PenaPlayer).where(PenaPlayer.id_pena == pena_id, PenaPlayer.id_player == player_id)
        if for_update:
            stmt = stmt.with_for_update()
        link = self.session.execute(stmt).scalar_one_or_none()
        if not link:
            self.session.rollback()
            raise PenaMembershipNotFoundError()
        return link

    @staticmethod
    def _to_result(*, pena: Pena, player: Player, link: PenaPlayer) -> PenaMembershipResult:
        return PenaMembershipResult(
            pena_guid=pena.guid,
            player_guid=player.guid,
            name=player.name,
            surname1=player.surname1,
            surname2=player.surname2,
            nationality=player.nationality,
            nickname=link.nickname,
            position=link.position,
        )
