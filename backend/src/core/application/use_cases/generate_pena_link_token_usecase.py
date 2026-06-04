from core.application.models import PenaLinkToken
from core.application.ports.pena_link_port import PenaLinkPort, PenaNotManagedByAdminError


class PenaAccessDeniedError(Exception):
    pass


class GeneratePenaLinkTokenUseCase:
    def __init__(self, repository: PenaLinkPort):
        self.repository = repository

    def execute(self, *, admin_id: int, pena_guid: str, ttl_seconds: int) -> PenaLinkToken:
        try:
            created = self.repository.create_token_for_admin_pena(
                admin_id=admin_id,
                pena_guid=pena_guid,
                ttl_seconds=ttl_seconds,
            )
        except PenaNotManagedByAdminError as exc:
            raise PenaAccessDeniedError() from exc
        return PenaLinkToken(
            token=created.token,
            pena_guid=created.pena_guid,
            expires_at=created.expires_at,
        )
