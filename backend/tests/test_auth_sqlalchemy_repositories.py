from auth.infrastructure.repositories.sqlalchemy_access_repository import SqlAlchemyAccessRepository
from auth.infrastructure.repositories.sqlalchemy_auth_account_repository import (
    SqlAlchemyAuthAccountRepository,
)
from persistence.domain.entity import AdminAccounts, Base, Pena, PenaPlayer, Player, PlayerAccount
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker


def _db_session() -> Session:
    engine = create_engine("sqlite+pysqlite:///:memory:")
    Base.metadata.create_all(
        engine,
        tables=[
            AdminAccounts.__table__,
            PlayerAccount.__table__,
            Pena.__table__,
            Player.__table__,
            PenaPlayer.__table__,
        ],
    )
    local_session = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    return local_session()


def _seed_access_graph(db: Session) -> None:
    admin_manages = AdminAccounts(id=1, guid="admin-1", username="admin1", password="p", name="A")
    admin_other = AdminAccounts(id=2, guid="admin-2", username="admin2", password="p", name="B")

    user_owner = PlayerAccount(id=10, guid="account-10", username="user10", password="p", name="U")
    user_other = PlayerAccount(id=11, guid="account-11", username="user11", password="p", name="V")

    pena = Pena(id=100, guid="pena-100", name="Pena 100", id_admin=1)
    player = Player(
        id=200,
        guid="player-200",
        name="Ana",
        surname1="Lopez",
        surname2=None,
        nationality="ES",
        id_player_account=10,
    )
    pena_player = PenaPlayer(
        id=300,
        guid="pena-player-300",
        id_player=200,
        id_pena=100,
        nickname="Nani",
        position="MID",
    )

    db.add_all([admin_manages, admin_other, user_owner, user_other, pena, player, pena_player])
    db.commit()


def test_auth_account_repository_maps_user_and_admin_accounts():
    db = _db_session()
    try:
        db.add_all(
            [
                PlayerAccount(
                    id=1,
                    guid="user-guid-1",
                    username="player-1",
                    password="user-hash",
                    name="Player One",
                ),
                AdminAccounts(
                    id=2,
                    guid="admin-guid-2",
                    username="admin-2",
                    password="admin-hash",
                    name="Admin Two",
                ),
            ]
        )
        db.commit()

        repo = SqlAlchemyAuthAccountRepository(db)

        user = repo.find_user_by_username("player-1")
        admin = repo.find_admin_by_username("admin-2")

        assert user is not None
        assert user.id == 1
        assert user.guid == "user-guid-1"
        assert user.password_hash == "user-hash"
        assert user.user_type == "user"

        assert admin is not None
        assert admin.id == 2
        assert admin.guid == "admin-guid-2"
        assert admin.password_hash == "admin-hash"
        assert admin.user_type == "admin"
    finally:
        db.close()


def test_auth_account_repository_returns_none_when_not_found():
    db = _db_session()
    try:
        repo = SqlAlchemyAuthAccountRepository(db)
        assert repo.find_user_by_username("missing-user") is None
        assert repo.find_admin_by_username("missing-admin") is None
    finally:
        db.close()


def test_access_repository_admin_and_user_checks():
    db = _db_session()
    try:
        _seed_access_graph(db)
        repo = SqlAlchemyAccessRepository(db)

        assert repo.admin_manages_pena(admin_id=1, pena_guid="pena-100") is True
        assert repo.admin_manages_pena(admin_id=2, pena_guid="pena-100") is False

        assert repo.user_belongs_to_pena(account_id=10, pena_guid="pena-100") is True
        assert repo.user_belongs_to_pena(account_id=11, pena_guid="pena-100") is False
        assert repo.user_belongs_to_pena(account_id=10, pena_guid="pena-missing") is False
    finally:
        db.close()


def test_access_repository_player_ownership_and_admin_access_checks():
    db = _db_session()
    try:
        _seed_access_graph(db)
        repo = SqlAlchemyAccessRepository(db)

        assert repo.user_owns_player(account_id=10, player_guid="player-200") is True
        assert repo.user_owns_player(account_id=11, player_guid="player-200") is False
        assert repo.user_owns_player(account_id=10, player_guid="missing") is False

        assert repo.admin_manages_player(admin_id=1, player_guid="player-200") is True
        assert repo.admin_manages_player(admin_id=2, player_guid="player-200") is False
        assert repo.admin_manages_player(admin_id=1, player_guid="missing") is False
    finally:
        db.close()
