"""Handlers de lectura de membership. Traducen los errores de contrato del
repositorio a errores de dominio (la semántica depende del contexto)."""

from __future__ import annotations

from core.application.models import PenaMembershipInfo
from core.application.ports.pena_membership_port import (
    InvalidRoleLabelError as RepositoryInvalidRoleLabelError,
)
from core.application.ports.pena_membership_port import (
    PenaMembershipNotFoundError as RepositoryPenaMembershipNotFoundError,
)
from core.application.ports.pena_membership_port import (
    PenaMembershipPort,
    PenaMembershipResult,
)
from core.application.ports.pena_membership_port import (
    PenaNotFoundError as RepositoryPenaNotFoundError,
)
from core.application.ports.pena_membership_port import (
    PlayerNotFoundError as RepositoryPlayerNotFoundError,
)
from core.application.ports.pena_membership_port import (
    UserPlayerNotFoundError as RepositoryUserPlayerNotFoundError,
)
from core.application.queries.pena_membership_queries import (
    GetPenaMembershipForPlayerQuery,
    GetPenaMembershipForUserQuery,
)
from core.domain.errors import (
    InvalidPenaMembershipUpdateDataError,
    PenaMembershipAccessDeniedError,
    PenaMembershipNotFoundError,
    PenaMembershipPenaNotFoundError,
    PenaMembershipPlayerNotFoundError,
    PenaMembershipUserProfileNotFoundError,
)


def to_membership_info(membership: PenaMembershipResult) -> PenaMembershipInfo:
    return PenaMembershipInfo(
        pena_guid=membership.pena_guid,
        player_guid=membership.player_guid,
        name=membership.name,
        surname1=membership.surname1,
        surname2=membership.surname2,
        nationality=membership.nationality,
        nickname=membership.nickname,
        role=membership.role,
        position=membership.position,
    )


class GetPenaMembershipForPlayerHandler:
    def __init__(self, repository: PenaMembershipPort) -> None:
        self._repository = repository

    def handle(self, query: GetPenaMembershipForPlayerQuery) -> PenaMembershipInfo:
        try:
            membership = self._repository.get_by_pena_and_player(
                pena_guid=query.pena_guid, player_guid=query.player_guid
            )
        except RepositoryPenaNotFoundError as exc:
            raise PenaMembershipPenaNotFoundError() from exc
        except RepositoryPlayerNotFoundError as exc:
            raise PenaMembershipPlayerNotFoundError() from exc
        except RepositoryPenaMembershipNotFoundError as exc:
            raise PenaMembershipNotFoundError() from exc
        return to_membership_info(membership)


class GetPenaMembershipForUserHandler:
    def __init__(self, repository: PenaMembershipPort) -> None:
        self._repository = repository

    def handle(self, query: GetPenaMembershipForUserQuery) -> PenaMembershipInfo:
        try:
            membership = self._repository.get_by_pena_and_account(
                pena_guid=query.pena_guid, account_id=query.account_id
            )
        except RepositoryPenaNotFoundError as exc:
            raise PenaMembershipPenaNotFoundError() from exc
        except RepositoryUserPlayerNotFoundError as exc:
            raise PenaMembershipUserProfileNotFoundError() from exc
        except RepositoryPenaMembershipNotFoundError as exc:
            raise PenaMembershipAccessDeniedError() from exc
        except RepositoryInvalidRoleLabelError as exc:
            raise InvalidPenaMembershipUpdateDataError() from exc
        return to_membership_info(membership)
