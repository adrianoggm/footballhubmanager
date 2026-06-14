import time

import pytest
from core.domain.errors import (
    InvalidLinkTokenError,
    PenaLinkAccessDeniedError,
    PlayerAlreadyClaimedError,
    PlayerNotClaimableError,
    UserAlreadyLinkedError,
    UserProfileNotFoundError,
    UserUsernameExistsError,
)
from persistence.infrastructure.entity import (
    AdminAccounts,
    Base,
    FootballMatchEvent,
    Pena,
    PenaLinkToken,
    PenaMemberAccount,
    PenaPlayer,
    Player,
    PlayerAccount,
    SeasonPlayer,
    TeamPlayer,
)
from persistence.infrastructure.repository.db.pena_link_repository import (
    SqlAlchemyPenaLinkRepository,
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
            Pena.__table__,
            Player.__table__,
            PenaPlayer.__table__,
            PenaLinkToken.__table__,
            PenaMemberAccount.__table__,
            SeasonPlayer.__table__,
            TeamPlayer.__table__,
            FootballMatchEvent.__table__,
        ],
    )
    local_session = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    return local_session()


def _seed(db: Session, *, guest_has_account: bool = False, with_membership: bool = True) -> None:
    db.add(AdminAccounts(id=1, guid="admin-1", username="admin1", password="p", name="A"))
    db.add(AdminAccounts(id=2, guid="admin-2", username="admin2", password="p", name="B"))
    db.add(Pena(id=100, guid="pena-100", name="Los Amigos", id_admin=1))
    db.add(
        Player(
            id=200,
            guid="player-200",
            name="Ana",
            surname1="Lopez",
            surname2=None,
            nationality="Spain",
            id_player_account=999 if guest_has_account else None,
        )
    )
    if guest_has_account:
        db.add(PlayerAccount(id=999, guid="acc-999", username="taken", password="p", name="Ana"))
    if with_membership:
        db.add(
            PenaPlayer(
                id=300,
                guid="pena-player-300",
                id_player=200,
                id_pena=100,
                nickname="Nani",
                position="GK",
            )
        )
    db.commit()


def _make_token(db: Session, *, token: str, id_player: int | None, expires_in: int = 3600) -> None:
    db.add(
        PenaLinkToken(
            token=token,
            id_pena=100,
            id_player=id_player,
            expires_at=int(time.time()) + expires_in,
        )
    )
    db.commit()


# --- create_claim_token_for_admin -------------------------------------------------


def test_create_claim_token_binds_player_and_persists():
    db = _db_session()
    _seed(db)
    repo = SqlAlchemyPenaLinkRepository(db)

    result = repo.create_claim_token_for_admin(
        admin_id=1, pena_guid="pena-100", player_guid="player-200", ttl_seconds=3600
    )

    assert result.player_guid == "player-200"
    assert result.pena_guid == "pena-100"
    stored = db.execute(
        select(PenaLinkToken).where(PenaLinkToken.token == result.token)
    ).scalar_one()
    assert stored.id_player == 200
    assert stored.id_pena == 100


def test_create_claim_token_rejects_foreign_admin():
    db = _db_session()
    _seed(db)
    repo = SqlAlchemyPenaLinkRepository(db)

    with pytest.raises(PenaLinkAccessDeniedError):
        repo.create_claim_token_for_admin(
            admin_id=2, pena_guid="pena-100", player_guid="player-200", ttl_seconds=3600
        )


def test_create_claim_token_rejects_non_member_player():
    db = _db_session()
    _seed(db, with_membership=False)
    repo = SqlAlchemyPenaLinkRepository(db)

    with pytest.raises(PlayerNotClaimableError):
        repo.create_claim_token_for_admin(
            admin_id=1, pena_guid="pena-100", player_guid="player-200", ttl_seconds=3600
        )


def test_create_claim_token_rejects_already_claimed_player():
    db = _db_session()
    _seed(db, guest_has_account=True)
    repo = SqlAlchemyPenaLinkRepository(db)

    with pytest.raises(PlayerAlreadyClaimedError):
        repo.create_claim_token_for_admin(
            admin_id=1, pena_guid="pena-100", player_guid="player-200", ttl_seconds=3600
        )


# --- inspect_claim_token ----------------------------------------------------------


def test_inspect_claim_token_returns_preview():
    db = _db_session()
    _seed(db)
    _make_token(db, token="tok-claim", id_player=200)
    repo = SqlAlchemyPenaLinkRepository(db)

    info = repo.inspect_claim_token(token="tok-claim")

    assert info.pena_name == "Los Amigos"
    assert info.player_guid == "player-200"
    assert info.player_name == "Ana"
    assert info.player_nickname == "Nani"


def test_inspect_claim_token_rejects_unknown_token():
    db = _db_session()
    _seed(db)
    repo = SqlAlchemyPenaLinkRepository(db)

    with pytest.raises(InvalidLinkTokenError):
        repo.inspect_claim_token(token="missing")


def test_inspect_claim_token_rejects_generic_token():
    db = _db_session()
    _seed(db)
    _make_token(db, token="generic", id_player=None)
    repo = SqlAlchemyPenaLinkRepository(db)

    with pytest.raises(InvalidLinkTokenError):
        repo.inspect_claim_token(token="generic")


def test_inspect_claim_token_rejects_expired_token():
    db = _db_session()
    _seed(db)
    _make_token(db, token="old", id_player=200, expires_in=-10)
    repo = SqlAlchemyPenaLinkRepository(db)

    with pytest.raises(InvalidLinkTokenError):
        repo.inspect_claim_token(token="old")


# --- register_and_claim_player ----------------------------------------------------


def test_register_and_claim_adopts_existing_guest_player():
    db = _db_session()
    _seed(db)
    _make_token(db, token="tok-claim", id_player=200)
    repo = SqlAlchemyPenaLinkRepository(db)

    result = repo.register_and_claim_player(
        token="tok-claim", username="ana", password_hash="hashed"
    )
    db.commit()

    assert result.player_guid == "player-200"
    assert result.pena_guid == "pena-100"
    # The existing guest player is adopted - no second player row is created.
    players = db.execute(select(Player)).scalars().all()
    assert len(players) == 1
    assert players[0].id_player_account == result.account_id
    # Token is consumed.
    assert db.execute(select(PenaLinkToken)).first() is None


def test_register_and_claim_rejects_invalid_token():
    db = _db_session()
    _seed(db)
    repo = SqlAlchemyPenaLinkRepository(db)

    with pytest.raises(InvalidLinkTokenError):
        repo.register_and_claim_player(token="missing", username="ana", password_hash="h")


def test_register_and_claim_rejects_already_claimed_and_consumes_token():
    db = _db_session()
    _seed(db, guest_has_account=True)
    _make_token(db, token="stale", id_player=200)
    repo = SqlAlchemyPenaLinkRepository(db)

    with pytest.raises(PlayerAlreadyClaimedError):
        repo.register_and_claim_player(token="stale", username="ana", password_hash="h")
    assert db.execute(select(PenaLinkToken)).first() is None


def test_register_and_claim_rejects_duplicate_username_and_keeps_token():
    db = _db_session()
    _seed(db)
    db.add(PlayerAccount(id=500, guid="acc-500", username="ana", password="p", name="Other"))
    db.commit()
    _make_token(db, token="tok-claim", id_player=200)
    repo = SqlAlchemyPenaLinkRepository(db)

    with pytest.raises(UserUsernameExistsError):
        repo.register_and_claim_player(token="tok-claim", username="ana", password_hash="h")

    # Token survives so the invitee can retry with a different username.
    assert db.execute(select(PenaLinkToken).where(PenaLinkToken.token == "tok-claim")).first()
    player = db.execute(select(Player).where(Player.id == 200)).scalar_one()
    assert player.id_player_account is None


# --- link_existing_account_to_player ----------------------------------------------


def _seed_existing_account(db: Session, *, member_of_pena: bool = False) -> None:
    db.add(PlayerAccount(id=50, guid="acc-50", username="real", password="p", name="Real"))
    db.add(
        Player(
            id=60,
            guid="own-60",
            name="Real",
            surname1="User",
            surname2=None,
            nationality="Spain",
            id_player_account=50,
        )
    )
    if member_of_pena:
        db.add(
            PenaPlayer(
                id=301,
                guid="pena-player-301",
                id_player=60,
                id_pena=100,
                nickname="Mine",
                position="DEF",
            )
        )
    db.commit()


def test_link_existing_account_merges_guest_into_own_player():
    db = _db_session()
    _seed(db)
    _seed_existing_account(db)
    # Guest carries history beyond the membership: it must move, not vanish.
    db.add(
        SeasonPlayer(
            guid="sp-1", id_player=200, id_pena=100, id_season=1, wins=3, losses=1, draws=0
        )
    )
    db.add(PenaMemberAccount(id=1, guid="ma-1", id_pena=100, id_player=200, debt_cents=500))
    db.commit()
    _make_token(db, token="tok-link", id_player=200)
    repo = SqlAlchemyPenaLinkRepository(db)

    result = repo.link_existing_account_to_player(token="tok-link", account_id=50)

    assert result.player_guid == "own-60"
    assert result.pena_guid == "pena-100"
    # Guest player profile is removed - no duplicate remains.
    assert db.execute(select(Player).where(Player.id == 200)).first() is None
    # All of the guest's participation records now point to the account's player.
    assert db.execute(select(PenaPlayer.id_player).where(PenaPlayer.id_pena == 100)).scalar() == 60
    assert db.execute(select(SeasonPlayer.id_player)).scalar() == 60
    assert db.execute(select(PenaMemberAccount.id_player)).scalar() == 60
    assert db.execute(select(PenaLinkToken)).first() is None


def test_link_existing_account_rejects_when_already_member():
    db = _db_session()
    _seed(db)
    _seed_existing_account(db, member_of_pena=True)
    _make_token(db, token="tok-link", id_player=200)
    repo = SqlAlchemyPenaLinkRepository(db)

    with pytest.raises(UserAlreadyLinkedError):
        repo.link_existing_account_to_player(token="tok-link", account_id=50)
    # Nothing is merged: the guest profile is left intact.
    assert db.execute(select(Player).where(Player.id == 200)).first() is not None


def test_link_existing_account_rejects_invalid_token():
    db = _db_session()
    _seed(db)
    _seed_existing_account(db)
    repo = SqlAlchemyPenaLinkRepository(db)

    with pytest.raises(InvalidLinkTokenError):
        repo.link_existing_account_to_player(token="missing", account_id=50)


def test_link_existing_account_rejects_already_claimed_guest():
    db = _db_session()
    _seed(db, guest_has_account=True)
    _seed_existing_account(db)
    _make_token(db, token="stale", id_player=200)
    repo = SqlAlchemyPenaLinkRepository(db)

    with pytest.raises(PlayerAlreadyClaimedError):
        repo.link_existing_account_to_player(token="stale", account_id=50)
    assert db.execute(select(PenaLinkToken)).first() is None


def test_link_existing_account_requires_own_player():
    db = _db_session()
    _seed(db)
    _make_token(db, token="tok-link", id_player=200)
    repo = SqlAlchemyPenaLinkRepository(db)

    with pytest.raises(UserProfileNotFoundError):
        repo.link_existing_account_to_player(token="tok-link", account_id=9999)
