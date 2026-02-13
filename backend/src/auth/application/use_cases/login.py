from dataclasses import dataclass

from auth.application.models import AuthAccount
from auth.application.ports import AuthAccountRepository
from auth.security import verify_password


class InvalidCredentialsError(Exception):
    pass


@dataclass(frozen=True)
class LoginPayload:
    username: str
    password: str


class LoginUserUseCase:
    def __init__(self, repository: AuthAccountRepository):
        self.repository = repository

    def execute(self, payload: LoginPayload) -> AuthAccount:
        account = self.repository.find_user_by_username(payload.username)
        if not account or not verify_password(payload.password, account.password_hash):
            raise InvalidCredentialsError()
        return account


class LoginAdminUseCase:
    def __init__(self, repository: AuthAccountRepository):
        self.repository = repository

    def execute(self, payload: LoginPayload) -> AuthAccount:
        account = self.repository.find_admin_by_username(payload.username)
        if not account or not verify_password(payload.password, account.password_hash):
            raise InvalidCredentialsError()
        return account
