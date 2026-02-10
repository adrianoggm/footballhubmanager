from dataclasses import dataclass

from persistence.application.ports.pena_link_repository import (
    PenaLinkRepository,
    PenaLinkTokenResult,
    PenaNotManagedByAdminError,
)


class PenaAccessDeniedError(Exception):
    pass


@dataclass(frozen=True)
class PenaLinkToken:
    token: str
    pena_guid: str
    expires_at: int


class GeneratePenaLinkTokenUseCase:
    def __init__(self, repository: PenaLinkRepository):
        self.repository = repository

    def execute(self, *, admin_id: int, pena_guid: str, ttl_seconds: int) -> PenaLinkToken:
        try:
            created = self.repository.create_token_for_admin_pena(
                admin_id=admin_id, pena_guid=pena_guid, ttl_seconds=ttl_seconds
            )
        except PenaNotManagedByAdminError as exc:
            raise PenaAccessDeniedError() from exc
        return PenaLinkToken(
            token=created.token,
            pena_guid=created.pena_guid,
            expires_at=created.expires_at,
        )
