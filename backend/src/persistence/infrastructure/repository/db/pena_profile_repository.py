from core.domain.errors import PenaProfileAccessDeniedError, PenaProfileNotFoundError
from core.domain.ports.pena_profile_repository_port import (
    PenaProfileRepositoryPort,
    PenaProfileResult,
)
from persistence.infrastructure.entity import Pena
from sqlalchemy import select
from sqlalchemy.orm import Session


class SqlAlchemyPenaProfileRepository(PenaProfileRepositoryPort):
    """Lado de escritura del perfil de peña. Solo persiste: la validación de la
    imagen vive en el Value Object ``ProfileImage`` (capa de dominio)."""

    def __init__(self, session: Session):
        self.session = session

    def update_for_admin(
        self, *, pena_guid: str, admin_id: int, image_url: str | None
    ) -> PenaProfileResult:
        pena = self.session.execute(select(Pena).where(Pena.guid == pena_guid)).scalar_one_or_none()
        if pena is None:
            raise PenaProfileNotFoundError()
        if pena.id_admin != admin_id:
            raise PenaProfileAccessDeniedError()
        pena.image_url = image_url or None
        self.session.commit()
        self.session.refresh(pena)
        return PenaProfileResult(guid=pena.guid, name=pena.name, image_url=pena.image_url)
