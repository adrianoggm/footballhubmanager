from persistence.application.ports.nationality_query_repository import (
    NationalityQueryRepository,
)
from persistence.domain.entity import Nationality
from sqlalchemy import select
from sqlalchemy.orm import Session


class SqlAlchemyNationalityQueryRepository(NationalityQueryRepository):
    def __init__(self, session: Session):
        self.session = session

    def list_names(self) -> list[str]:
        rows = self.session.execute(select(Nationality.name).order_by(Nationality.name)).all()
        return [name for (name,) in rows]
