import json

import pytest
from core.application.policies import FieldUpdate
from core.application.ports.pena_membership_port import InvalidPositionLabelError
from persistence.infrastructure.entity import (
    AdminAccounts,
    Base,
    Nationality,
    Pena,
    PenaPlayer,
    PenaRole,
    Player,
    PlayerAccount,
)
from persistence.infrastructure.repository.db.pena_membership_repository import (
    SqlAlchemyPenaMembershipRepository,
)
from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session, sessionmaker


def _db_session() -> Session:
    engine = create_engine("sqlite+pysqlite:///:memory:")
    Base.metadata.create_all(
        engine,
        tables=[
            AdminAccounts.__table__,
            PlayerAccount.__table__,
            Nationality.__table__,
            Pena.__table__,
            PenaRole.__table__,
            Player.__table__,
            PenaPlayer.__table__,
        ],
    )
    return sessionmaker(autocommit=False, autoflush=False, bind=engine)()


def _seed(db: Session, *, position_labels: list[str] | None = None, stored: str | None) -> None:
    db.add(AdminAccounts(id=1, guid="admin-1", username="admin1", password="p", name="A"))
    db.add(PlayerAccount(id=50, guid="acc-50", username="user", password="p", name="U"))
    db.add(Nationality(name="Spain"))
    db.add(
        Pena(
            id=100,
            guid="pena-100",
            name="Los Amigos",
            id_admin=1,
            position_labels=json.dumps(position_labels) if position_labels is not None else None,
        )
    )
    db.add(PenaRole(id=1, guid="role-1", id_pena=100, name="member", sort_order=0))
    db.add(
        Player(
            id=60,
            guid="player-60",
            name="Real",
            surname1="User",
            surname2=None,
            nationality="Spain",
            id_player_account=50,
        )
    )
    db.add(PenaPlayer(id=300, guid="pp-300", id_player=60, id_pena=100, id_role=1, position=stored))
    db.commit()


def _stored_position(db: Session) -> str | None:
    return db.execute(select(PenaPlayer.position).where(PenaPlayer.id == 300)).scalar_one()


def test_user_update_accepts_configured_position_with_canonical_casing():
    db = _db_session()
    _seed(db, stored=None)
    repo = SqlAlchemyPenaMembershipRepository(db)

    result = repo.update_by_account(
        pena_guid="pena-100",
        account_id=50,
        nickname=FieldUpdate.keep(),
        role=FieldUpdate.keep(),
        position=FieldUpdate.set("KEEPER"),
    )

    assert result.position == "keeper"
    assert _stored_position(db) == "keeper"


def test_user_update_rejects_free_text_position():
    db = _db_session()
    _seed(db, stored="keeper")
    repo = SqlAlchemyPenaMembershipRepository(db)

    with pytest.raises(InvalidPositionLabelError):
        repo.update_by_account(
            pena_guid="pena-100",
            account_id=50,
            nickname=FieldUpdate.keep(),
            role=FieldUpdate.keep(),
            position=FieldUpdate.set("12"),
        )

    assert _stored_position(db) == "keeper"


def test_user_update_uses_pena_custom_labels_instead_of_defaults():
    db = _db_session()
    _seed(db, position_labels=["Portero", "Delantero"], stored=None)
    repo = SqlAlchemyPenaMembershipRepository(db)

    with pytest.raises(InvalidPositionLabelError):
        repo.update_by_account(
            pena_guid="pena-100",
            account_id=50,
            nickname=FieldUpdate.keep(),
            role=FieldUpdate.keep(),
            position=FieldUpdate.set("keeper"),
        )

    result = repo.update_by_account(
        pena_guid="pena-100",
        account_id=50,
        nickname=FieldUpdate.keep(),
        role=FieldUpdate.keep(),
        position=FieldUpdate.set("portero"),
    )
    assert result.position == "Portero"


def test_user_update_keeps_unchanged_legacy_position():
    db = _db_session()
    _seed(db, stored="12")
    repo = SqlAlchemyPenaMembershipRepository(db)

    result = repo.update_by_account(
        pena_guid="pena-100",
        account_id=50,
        nickname=FieldUpdate.set("Nick"),
        role=FieldUpdate.keep(),
        position=FieldUpdate.set("12"),
    )

    assert result.nickname == "Nick"
    assert result.position == "12"


def test_user_update_allows_clearing_position():
    db = _db_session()
    _seed(db, stored="12")
    repo = SqlAlchemyPenaMembershipRepository(db)

    result = repo.update_by_account(
        pena_guid="pena-100",
        account_id=50,
        nickname=FieldUpdate.keep(),
        role=FieldUpdate.keep(),
        position=FieldUpdate.set(None),
    )

    assert result.position is None


def test_admin_update_rejects_free_text_position():
    db = _db_session()
    _seed(db, stored=None)
    repo = SqlAlchemyPenaMembershipRepository(db)

    with pytest.raises(InvalidPositionLabelError):
        repo.update_by_player_for_admin(
            pena_guid="pena-100",
            admin_id=1,
            player_guid="player-60",
            nickname=FieldUpdate.keep(),
            role=FieldUpdate.keep(),
            position=FieldUpdate.set("striker"),
        )

    assert _stored_position(db) is None


def test_create_guest_rejects_free_text_position_without_creating_player():
    db = _db_session()
    _seed(db, stored=None)
    repo = SqlAlchemyPenaMembershipRepository(db)

    with pytest.raises(InvalidPositionLabelError):
        repo.create_guest_player_for_admin(
            pena_guid="pena-100",
            admin_id=1,
            name="Guest",
            surname1="Player",
            surname2=None,
            nationality="Spain",
            nickname=None,
            role=None,
            position="12",
        )

    assert db.execute(select(Player).where(Player.name == "Guest")).first() is None


def test_create_guest_accepts_configured_position():
    db = _db_session()
    _seed(db, stored=None)
    repo = SqlAlchemyPenaMembershipRepository(db)

    result = repo.create_guest_player_for_admin(
        pena_guid="pena-100",
        admin_id=1,
        name="Guest",
        surname1="Player",
        surname2=None,
        nationality="Spain",
        nickname=None,
        role=None,
        position="Defender",
    )

    assert result.position == "defender"
