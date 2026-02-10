from dataclasses import dataclass

from sqlalchemy import select
from sqlalchemy.orm import Session

from persistence.domain.entity import Pena, PenaPlayer, Player


@dataclass(frozen=True)
class PenaInfo:
    guid: str
    name: str


@dataclass(frozen=True)
class PlayerProfile:
    guid: str
    name: str
    surname1: str
    surname2: str | None
    nationality: str
    penas: list[PenaInfo]


class GetPlayerProfileUseCase:
    def __init__(self, session: Session):
        self.session = session

    def execute_by_guid(self, player_guid: str) -> PlayerProfile | None:
        player = self.session.execute(
            select(Player).where(Player.guid == player_guid)
        ).scalar_one_or_none()
        if not player:
            return None
        return self._build_profile(player)

    def execute_by_account_id(self, account_id: int) -> PlayerProfile | None:
        player = self.session.execute(
            select(Player).where(Player.id_player_account == account_id)
        ).scalar_one_or_none()
        if not player:
            return None
        return self._build_profile(player)

    def _build_profile(self, player: Player) -> PlayerProfile:
        penas = self.session.execute(
            select(Pena)
            .join(PenaPlayer, PenaPlayer.id_pena == Pena.id)
            .where(PenaPlayer.id_player == player.id)
            .order_by(Pena.name)
        ).scalars().all()
        return PlayerProfile(
            guid=player.guid,
            name=player.name,
            surname1=player.surname1,
            surname2=player.surname2,
            nationality=player.nationality,
            penas=[PenaInfo(guid=pena.guid, name=pena.name) for pena in penas],
        )
