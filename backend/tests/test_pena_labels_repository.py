"""Label lifecycle policy of the labels repository (PL-03) on SQLite."""

import json
from datetime import date

import pytest
from core.domain.errors import InvalidPenaLabelsDataError
from persistence.infrastructure.entity import (
    AdminAccounts,
    Base,
    Nationality,
    Pena,
    PenaPlayer,
    PenaRole,
    Player,
    PlayerAccount,
    Season,
    SeasonPlayer,
)
from persistence.infrastructure.repository.db.pena_labels_repository import (
    SqlAlchemyPenaLabelsRepository,
)
from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session, sessionmaker

ROLES = ["president", "member", "guest"]
POSITIONS = ["Delantero", "Portero", "Defensa"]


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
            Season.__table__,
            SeasonPlayer.__table__,
        ],
    )
    return sessionmaker(autocommit=False, autoflush=False, bind=engine)()


def _seed(db: Session) -> None:
    db.add(AdminAccounts(id=1, guid="admin-1", username="admin1", password="p", name="A"))
    db.add(PlayerAccount(id=50, guid="acc-50", username="user", password="p", name="U"))
    db.add(Nationality(name="Spain"))
    db.add(
        Pena(
            id=100,
            guid="pena-100",
            name="Los Amigos",
            id_admin=1,
            position_labels=json.dumps(POSITIONS),
            position_label_colors=json.dumps({"delantero": "#DC2626"}),
        )
    )
    for index, name in enumerate(ROLES, start=1):
        db.add(PenaRole(id=index, guid=f"role-{index}", id_pena=100, name=name, sort_order=index))
    # 60 has an account, 61 is a guest (no account). Both are "president".
    db.add(
        Player(
            id=60, guid="p-60", name="A", surname1="X", nationality="Spain", id_player_account=50
        )
    )
    db.add(Player(id=61, guid="p-61", name="B", surname1="Y", nationality="Spain"))
    db.add(
        PenaPlayer(
            id=300, guid="pp-300", id_player=60, id_pena=100, id_role=1, position="Delantero"
        )
    )
    db.add(
        PenaPlayer(id=301, guid="pp-301", id_player=61, id_pena=100, id_role=1, position="Portero")
    )
    db.add(
        Season(
            id=7, guid="s-7", id_pena=100, start_date=date(2026, 1, 1), end_date=date(2026, 6, 1)
        )
    )
    db.add(
        SeasonPlayer(
            guid="sp-60",
            id_player=60,
            id_pena=100,
            id_season=7,
            id_role=1,
            role="president",
            position="Delantero",
        )
    )
    db.add(
        SeasonPlayer(
            guid="sp-61",
            id_player=61,
            id_pena=100,
            id_season=7,
            id_role=1,
            role="president",
            position="Portero",
        )
    )
    db.commit()


def _update(repo, *, roles, positions, role_renames=None, position_renames=None, colors=None):
    return repo.update_for_admin(
        pena_guid="pena-100",
        admin_id=1,
        role_labels=roles,
        position_labels=positions,
        role_colors={},
        position_colors=colors or {},
        role_renames=role_renames or {},
        position_renames=position_renames or {},
    )


def _membership(db: Session, link_id: int) -> tuple[str | None, str | None]:
    link = db.get(PenaPlayer, link_id)
    role = db.get(PenaRole, link.id_role) if link.id_role is not None else None
    return (role.name if role else None, link.position)


def _season_row(db: Session, player_id: int) -> SeasonPlayer:
    return db.execute(select(SeasonPlayer).where(SeasonPlayer.id_player == player_id)).scalar_one()


def test_position_rename_propagates_to_players_and_season_snapshots_keeping_colour():
    db = _db_session()
    _seed(db)
    repo = SqlAlchemyPenaLabelsRepository(db)

    result = _update(
        repo,
        roles=ROLES,
        positions=["Atacante", "Portero", "Defensa"],
        position_renames={"Delantero": "Atacante"},
        colors={"Atacante": "#DC2626"},
    )

    assert result.position_labels == ["Atacante", "Portero", "Defensa"]
    assert result.position_colors["Atacante"] == "#DC2626"
    assert _membership(db, 300)[1] == "Atacante"
    assert _season_row(db, 60).position == "Atacante"


def test_removed_position_leaves_its_players_without_position():
    db = _db_session()
    _seed(db)
    repo = SqlAlchemyPenaLabelsRepository(db)

    _update(repo, roles=ROLES, positions=["Delantero", "Defensa"])

    assert _membership(db, 301)[1] is None
    assert _season_row(db, 61).position is None
    # Untouched labels stay as they were.
    assert _membership(db, 300)[1] == "Delantero"


def test_role_rename_keeps_the_role_row_and_updates_season_snapshots():
    db = _db_session()
    _seed(db)
    repo = SqlAlchemyPenaLabelsRepository(db)

    _update(
        repo,
        roles=["presidente", "member", "guest"],
        positions=POSITIONS,
        role_renames={"president": "presidente"},
    )

    assert _membership(db, 300)[0] == "presidente"
    assert db.get(PenaPlayer, 300).id_role == 1
    assert _season_row(db, 60).role == "presidente"


def test_removed_role_falls_back_to_the_default_member_role_per_membership():
    db = _db_session()
    _seed(db)
    repo = SqlAlchemyPenaLabelsRepository(db)

    _update(repo, roles=["member", "guest"], positions=POSITIONS)

    # Account holder -> member; account-less guest -> guest (never left orphaned).
    assert _membership(db, 300)[0] == "member"
    assert _membership(db, 301)[0] == "guest"
    assert _season_row(db, 60).role == "member"
    assert _season_row(db, 61).role == "guest"
    assert db.execute(select(PenaRole).where(PenaRole.name == "president")).first() is None


def test_removed_role_never_falls_back_to_the_top_role():
    db = _db_session()
    _seed(db)
    repo = SqlAlchemyPenaLabelsRepository(db)

    # Remove the guest role first, then remove president: the guest player must
    # land on "member", never on the first label of the list.
    _update(repo, roles=["captain", "member"], positions=POSITIONS)

    assert _membership(db, 301)[0] == "member"


def test_rename_onto_another_existing_role_is_rejected():
    db = _db_session()
    _seed(db)
    repo = SqlAlchemyPenaLabelsRepository(db)

    with pytest.raises(InvalidPenaLabelsDataError):
        _update(
            repo,
            roles=["member", "guest"],
            positions=POSITIONS,
            role_renames={"president": "member"},
        )
