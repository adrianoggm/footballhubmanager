from dataclasses import dataclass

from auth.domain.errors import InvalidCredentialsError
from auth.domain.models.auth_account import AuthAccount
from auth.domain.ports.auth_account_repository_port import AuthAccountRepositoryPort
from auth.security import verify_password

# Re-exportado por conveniencia: el use case lo lanza, pero su hogar canónico
# es auth.domain.errors.
__all__ = ["InvalidCredentialsError", "LoginPayload", "LoginUserUseCase", "LoginAdminUseCase"]


@dataclass(frozen=True)
class LoginPayload:
    username: str
    password: str


class LoginUserUseCase:
    def __init__(self, repository: AuthAccountRepositoryPort):
        self.repository = repository

    def execute(self, payload: LoginPayload) -> AuthAccount:
        account = self.repository.find_user_by_username(payload.username)
        if not account or not verify_password(payload.password, account.password_hash):
            raise InvalidCredentialsError()
        return account


class LoginAdminUseCase:
    def __init__(self, repository: AuthAccountRepositoryPort):
        self.repository = repository

    def execute(self, payload: LoginPayload) -> AuthAccount:
        account = self.repository.find_admin_by_username(payload.username)
        if not account or not verify_password(payload.password, account.password_hash):
            raise InvalidCredentialsError()
        return account
