from __future__ import annotations

from core.application.models import PenaInfo, PlayerProfile
from core.application.ports.player_profile_port import PlayerProfilePort, PlayerProfileResult
from core.application.queries.player_profile_queries import (
    GetPlayerProfileByAccountIdQuery,
    GetPlayerProfileByGuidQuery,
)


def to_player_profile(profile: PlayerProfileResult) -> PlayerProfile:
    return PlayerProfile(
        guid=profile.guid,
        name=profile.name,
        surname1=profile.surname1,
        surname2=profile.surname2,
        nationality=profile.nationality,
        image_url=profile.image_url,
        penas=[PenaInfo(guid=pena.guid, name=pena.name) for pena in profile.penas],
    )


class GetPlayerProfileByGuidHandler:
    def __init__(self, repository: PlayerProfilePort) -> None:
        self._repository = repository

    def handle(self, query: GetPlayerProfileByGuidQuery) -> PlayerProfile | None:
        profile = self._repository.find_by_guid(query.player_guid)
        return to_player_profile(profile) if profile else None


class GetPlayerProfileByAccountIdHandler:
    def __init__(self, repository: PlayerProfilePort) -> None:
        self._repository = repository

    def handle(self, query: GetPlayerProfileByAccountIdQuery) -> PlayerProfile | None:
        profile = self._repository.find_by_account_id(query.account_id)
        return to_player_profile(profile) if profile else None
