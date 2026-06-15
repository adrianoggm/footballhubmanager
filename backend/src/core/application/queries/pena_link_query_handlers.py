from __future__ import annotations

from core.application.models import ClaimTokenInfo
from core.application.ports.pena_link_port import PenaLinkPort
from core.application.queries.pena_link_queries import InspectClaimTokenQuery
from core.domain.errors import InvalidLinkTokenError


class InspectClaimTokenHandler:
    def __init__(self, repository: PenaLinkPort) -> None:
        self._repository = repository

    def handle(self, query: InspectClaimTokenQuery) -> ClaimTokenInfo:
        token = query.token.strip()
        if not token:
            raise InvalidLinkTokenError()
        result = self._repository.inspect_claim_token(token=token)
        return ClaimTokenInfo(
            pena_guid=result.pena_guid,
            pena_name=result.pena_name,
            player_guid=result.player_guid,
            player_name=result.player_name,
            player_nickname=result.player_nickname,
            expires_at=result.expires_at,
        )
