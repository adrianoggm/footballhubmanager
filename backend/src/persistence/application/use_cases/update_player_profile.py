from dataclasses import dataclass

from sqlalchemy.orm import Session

from persistence.application.use_cases.get_player_profile import (
    GetPlayerProfileUseCase,
    PlayerProfile,
)
from persistence.domain.entity import Player


@dataclass(frozen=True)
class PlayerUpdate:
    name: str | None = None
    surname1: str | None = None
    surname2: str | None = None
    nationality: str | None = None


class UpdatePlayerProfileUseCase:
    def __init__(self, session: Session):
        self.session = session
        self._getter = GetPlayerProfileUseCase(session)

    def execute_by_guid(self, player_guid: str, update: PlayerUpdate) -> PlayerProfile | None:
        player = self.session.query(Player).filter(Player.guid == player_guid).one_or_none()
        if not player:
            return None
        self._apply_update(player, update)
        self.session.commit()
        return self._getter.execute_by_guid(player_guid)

    def execute_by_account_id(self, account_id: int, update: PlayerUpdate) -> PlayerProfile | None:
        player = (
            self.session.query(Player)
            .filter(Player.id_player_account == account_id)
            .one_or_none()
        )
        if not player:
            return None
        self._apply_update(player, update)
        self.session.commit()
        return self._getter.execute_by_guid(player.guid)

    @staticmethod
    def _apply_update(player: Player, update: PlayerUpdate) -> None:
        if update.name is not None:
            player.name = update.name
        if update.surname1 is not None:
            player.surname1 = update.surname1
        if update.surname2 is not None:
            player.surname2 = update.surname2
        if update.nationality is not None:
            player.nationality = update.nationality
