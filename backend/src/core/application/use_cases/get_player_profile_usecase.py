from core.application.models import PenaInfo, PlayerProfile
from core.application.ports.player_profile_port import (
    PlayerProfilePort,
    PlayerProfileResult,
)


class GetPlayerProfileUseCase:
    def __init__(self, repository: PlayerProfilePort):
        self.repository = repository

    def execute_by_guid(self, player_guid: str) -> PlayerProfile | None:
        profile = self.repository.find_by_guid(player_guid)
        if not profile:
            return None
        return self._to_profile(profile)

    def execute_by_account_id(self, account_id: int) -> PlayerProfile | None:
        profile = self.repository.find_by_account_id(account_id)
        if not profile:
            return None
        return self._to_profile(profile)

    @staticmethod
    def _to_profile(profile: PlayerProfileResult) -> PlayerProfile:
        return PlayerProfile(
            guid=profile.guid,
            name=profile.name,
            surname1=profile.surname1,
            surname2=profile.surname2,
            nationality=profile.nationality,
            image_url=profile.image_url,
            penas=[PenaInfo(guid=pena.guid, name=pena.name) for pena in profile.penas],
        )
