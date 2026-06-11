from core.application.ports.nationality_query_port import NationalityQueryPort
from persistence.infrastructure.entity import Nationality
from sqlalchemy import select
from sqlalchemy.orm import Session


class SqlAlchemyNationalityQueryRepository(NationalityQueryPort):
    def __init__(self, session: Session):
        self.session = session

    def list_names(self) -> list[str]:
        rows = self.session.execute(select(Nationality.name).order_by(Nationality.name)).all()
        return [name for (name,) in rows]
