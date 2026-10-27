from datetime import date

from core.application.ports.season_competition_port import SeasonPlayerFilters
from persistence.infrastructure.entity import (
    AdminAccounts,
    Base,
    FootballMatch,
    Pena,
    PenaPlayer,
    PenaRole,
    Player,
    Season,
    SeasonPlayer,
    Team,
    TeamPlayer,
)
from persistence.infrastructure.repository.db.season_player_repository import (
    SqlAlchemySeasonPlayerRepository,
)
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker


def _db_session() -> Session:
    engine = create_engine("sqlite+pysqlite:///:memory:")
    Base.metadata.create_all(
        engine,
        tables=[
            AdminAccounts.__table__,
            Pena.__table__,
            PenaRole.__table__,
            Player.__table__,
            PenaPlayer.__table__,
            Season.__table__,
            SeasonPlayer.__table__,
            FootballMatch.__table__,
            Team.__table__,
            TeamPlayer.__table__,
        ],
    )
    return sessionmaker(autocommit=False, autoflush=False, bind=engine)()


def _add_match(db: Session, *, match_id: int, status: str, ratings: dict[int, float]) -> None:
    home_id, away_id = match_id * 10 + 1, match_id * 10 + 2
    db.add(Team(id=home_id, name="Home", id_match=None))
    db.add(Team(id=away_id, name="Away", id_match=None))
    db.flush()
    db.add(
        FootballMatch(
            id=match_id,
            id_home_team=home_id,
            id_away_team=away_id,
            match_date=date(2026, 10, match_id),
            id_season=1,
            status=status,
        )
    )
    db.flush()
    db.get(Team, home_id).id_match = match_id
    db.get(Team, away_id).id_match = match_id
    for player_id, rating in ratings.items():
        db.add(TeamPlayer(id_team=home_id, id_player=player_id, rating=rating))


def _seed(db: Session) -> None:
    db.add(AdminAccounts(id=1, guid="admin-1", username="admin", password="p", name="A"))
    db.add(Pena(id=1, guid="pena-1", name="Pena", id_admin=1))
    db.add(
        Season(
            id=1,
            guid="season-1",
            id_pena=1,
            start_date=date(2026, 9, 1),
            end_date=date(2027, 6, 30),
        )
    )
    for player_id, name in ((1, "Gema"), (2, "Nora")):
        db.add(
            Player(
                id=player_id,
                guid=f"player-{player_id}",
                name=name,
                surname1="X",
                nationality="Spain",
            )
        )
        db.add(SeasonPlayer(id_player=player_id, id_pena=1, id_season=1, wins=1))
    db.flush()
    # Unrated players are stored with rating 0 once a match is closed (-1 while open).
    _add_match(db, match_id=1, status="closed", ratings={1: 0.0, 2: 0.0})
    _add_match(db, match_id=2, status="closed", ratings={1: 9.0, 2: 0.0})
    _add_match(db, match_id=3, status="open", ratings={1: -1.0, 2: -1.0})
    db.commit()


def _standings_by_name(db: Session) -> dict[str, float]:
    page = SqlAlchemySeasonPlayerRepository(db).get_standings(
        pena_guid="pena-1",
        season_guid="season-1",
        filters=SeasonPlayerFilters(),
        page=1,
        page_size=20,
    )
    return {item.name: item.average_rating for item in page.items}


# MT-13: Gema (0 + 9) / 2 showed 4.5 because unrated closed matches counted as 0.
def test_standings_average_rating_ignores_unrated_matches():
    db = _db_session()
    _seed(db)

    averages = _standings_by_name(db)

    assert averages["Gema"] == 9.0
    assert averages["Nora"] == 0.0
