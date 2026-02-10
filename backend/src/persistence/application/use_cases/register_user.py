from dataclasses import dataclass

from sqlalchemy.exc import IntegrityError
from sqlalchemy import select
from sqlalchemy.orm import Session

from auth.security import hash_password
from persistence.domain.entity import Player, PlayerAccount


class UsernameAlreadyExistsError(Exception):
    pass


@dataclass(frozen=True)
class UserRegistration:
    username: str
    password: str
    name: str
    surname1: str
    surname2: str | None
    nationality: str


@dataclass(frozen=True)
class RegisteredUser:
    account_id: int
    account_guid: str
    player_guid: str


class RegisterUserUseCase:
    def __init__(self, session: Session):
        self.session = session

    def execute(self, data: UserRegistration) -> RegisteredUser:
        exists = self.session.execute(
            select(PlayerAccount.id).where(PlayerAccount.username == data.username)
        ).first()
        if exists:
            raise UsernameAlreadyExistsError()

        try:
            account = PlayerAccount(
                username=data.username,
                password=hash_password(data.password),
                name=data.name,
            )
            self.session.add(account)
            self.session.flush()

            player = Player(
                name=data.name,
                surname1=data.surname1,
                surname2=data.surname2,
                nationality=data.nationality,
                id_player_account=account.id,
            )
            self.session.add(player)
            self.session.commit()
            self.session.refresh(account)
            self.session.refresh(player)
        except IntegrityError as exc:
            self.session.rollback()
            raise UsernameAlreadyExistsError() from exc
        return RegisteredUser(
            account_id=account.id,
            account_guid=account.guid,
            player_guid=player.guid,
        )
