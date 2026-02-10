from dataclasses import dataclass

from persistence.application.ports.player_profile_repository import PlayerProfileRepository
from persistence.application.use_cases.get_player_profile import (
    GetPlayerProfileUseCase,
    PlayerProfile,
)


@dataclass(frozen=True)
class PlayerUpdate:
    name: str | None = None
    surname1: str | None = None
    surname2: str | None = None
    nationality: str | None = None


class UpdatePlayerProfileUseCase:
    def __init__(self, repository: PlayerProfileRepository):
        self.repository = repository

    def execute_by_guid(self, player_guid: str, update: PlayerUpdate) -> PlayerProfile | None:
        getter = GetPlayerProfileUseCase(self.repository)
        updated = self.repository.update_by_guid(
            player_guid,
            name=update.name,
            surname1=update.surname1,
            surname2=update.surname2,
            nationality=update.nationality,
        )
        if not updated:
            return None
        return getter.execute_by_guid(player_guid)

    def execute_by_account_id(self, account_id: int, update: PlayerUpdate) -> PlayerProfile | None:
        getter = GetPlayerProfileUseCase(self.repository)
        updated = self.repository.update_by_account_id(
            account_id,
            name=update.name,
            surname1=update.surname1,
            surname2=update.surname2,
            nationality=update.nationality,
        )
        if not updated:
            return None
        return getter.execute_by_account_id(account_id)
