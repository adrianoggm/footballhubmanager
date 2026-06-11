from types import SimpleNamespace
from unittest.mock import Mock

import pytest
from core.application.ports.season_competition_port import (
    SeasonPlayerAlreadyRegisteredError,
)
from persistence.infrastructure.repository.db.season_player_repository import (
    SqlAlchemySeasonPlayerRepository,
)
from sqlalchemy.exc import IntegrityError


def _integrity_error() -> IntegrityError:
    return IntegrityError(
        "insert into season_player (id_player, id_pena, id_season) values (...)",
        {},
        Exception("duplicate key"),
    )


def test_register_player_for_admin_maps_commit_integrity_error_to_conflict():
    session = Mock()
    no_existing_row = Mock()
    no_existing_row.scalar_one_or_none.return_value = None
    role_names_row = Mock()
    role_names_row.all.return_value = []
    session.execute.side_effect = [no_existing_row, role_names_row]
    session.commit.side_effect = _integrity_error()

    repo = SqlAlchemySeasonPlayerRepository(session)

    pena = SimpleNamespace(id=11, id_admin=7)
    season = SimpleNamespace(id=22, points_win=3, points_draw=1, points_loss=0)
    player = SimpleNamespace(
        id=33,
        guid="player-guid",
        name="Player",
        surname1="One",
        surname2=None,
        nationality="Spain",
        id_player_account=77,
    )
    link = SimpleNamespace(id_player=33, id_role=9, nickname="P1", position="CM")

    repo._get_pena = lambda _pena_guid: pena
    repo._get_season = lambda *, pena_id, season_guid: season
    repo._get_player = lambda _player_guid: player
    repo._get_pena_player_link = lambda *, pena_id, player_id: link

    with pytest.raises(SeasonPlayerAlreadyRegisteredError):
        repo.register_player_for_admin(
            pena_guid="pena-guid",
            season_guid="season-guid",
            admin_id=7,
            player_guid="player-guid",
        )

    session.rollback.assert_called_once()


def test_register_players_bulk_maps_commit_integrity_error_to_conflict():
    session = Mock()

    players_result = Mock()
    players = [
        SimpleNamespace(
            id=33,
            guid="player-guid",
            name="Player",
            surname1="One",
            surname2=None,
            nationality="Spain",
            id_player_account=77,
        )
    ]
    players_result.scalars.return_value = players

    links_result = Mock()
    links_result.scalars.return_value = [
        SimpleNamespace(id_player=33, id_role=9, nickname="P1", position="CM")
    ]

    existing_result = Mock()
    existing_result.all.return_value = []
    role_names_result = Mock()
    role_names_result.all.return_value = []

    session.execute.side_effect = [players_result, links_result, existing_result, role_names_result]
    session.commit.side_effect = _integrity_error()

    repo = SqlAlchemySeasonPlayerRepository(session)
    pena = SimpleNamespace(id=11, id_admin=7)
    season = SimpleNamespace(id=22, points_win=3, points_draw=1, points_loss=0)
    repo._get_pena = lambda _pena_guid: pena
    repo._get_season = lambda *, pena_id, season_guid: season

    with pytest.raises(SeasonPlayerAlreadyRegisteredError):
        repo.register_players_for_admin_bulk(
            pena_guid="pena-guid",
            season_guid="season-guid",
            admin_id=7,
            player_guids=["player-guid"],
        )

    session.rollback.assert_called_once()
