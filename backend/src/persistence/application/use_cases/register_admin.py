from dataclasses import dataclass

from sqlalchemy import select
from sqlalchemy.orm import Session

from auth.security import hash_password
from persistence.domain.entity import AdminAccounts


class UsernameAlreadyExistsError(Exception):
    pass


@dataclass(frozen=True)
class AdminRegistration:
    username: str
    password: str
    name: str


@dataclass(frozen=True)
class RegisteredAdmin:
    admin_id: int
    admin_guid: str


class RegisterAdminUseCase:
    def __init__(self, session: Session):
        self.session = session

    def execute(self, data: AdminRegistration) -> RegisteredAdmin:
        exists = self.session.execute(
            select(AdminAccounts.id).where(AdminAccounts.username == data.username)
        ).first()
        if exists:
            raise UsernameAlreadyExistsError()

        admin = AdminAccounts(
            username=data.username,
            password=hash_password(data.password),
            name=data.name,
        )
        self.session.add(admin)
        self.session.commit()
        self.session.refresh(admin)
        return RegisteredAdmin(admin_id=admin.id, admin_guid=admin.guid)
