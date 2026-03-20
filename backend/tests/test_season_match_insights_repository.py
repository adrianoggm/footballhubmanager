from datetime import date
from types import SimpleNamespace
from unittest.mock import Mock

import pytest
from persistence.application.ports.season_competition_port import (
    MatchInsightRowResult,
    SeasonNotFoundError,
)
from persistence.infrastructure.repository.db.season_match_insights_repository import (
    SqlAlchemySeasonMatchInsightsRepository,
)


def test_list_closed_match_insight_rows_raises_when_any_season_is_missing():
    session = Mock()
    pena_result = Mock()
    pena_result.scalar_one_or_none.return_value = SimpleNamespace(id=11)
    season_rows = Mock()
    season_rows.all.return_value = [SimpleNamespace(id=21, guid="season-1")]
    session.execute.side_effect = [pena_result, season_rows]

    repo = SqlAlchemySeasonMatchInsightsRepository(session)

    with pytest.raises(SeasonNotFoundError):
        repo.list_closed_match_insight_rows(
            pena_guid="pena-guid",
            season_guids=["season-1", "season-2"],
        )

    session.rollback.assert_called_once()


def test_list_closed_match_insight_rows_maps_query_rows():
    session = Mock()
    pena_result = Mock()
    pena_result.scalar_one_or_none.return_value = SimpleNamespace(id=11)
    season_rows = Mock()
    season_rows.all.return_value = [SimpleNamespace(id=21, guid="season-1")]
    match_rows = Mock()
    match_rows.all.return_value = [
        SimpleNamespace(
            season_guid="season-1",
            match_guid="match-1",
            match_date=date(2024, 3, 1),
            home_team_id=100,
            away_team_id=200,
            home_score=2,
            away_score=1,
            team_id=100,
            player_guid="player-1",
            player_name="Ana",
            player_surname1="Lopez",
            player_surname2=None,
            player_nickname="Nani",
            player_position="GK",
            goals=1,
            assists=0,
            saves=2,
            rating="7.5",
        ),
        SimpleNamespace(
            season_guid="season-1",
            match_guid="match-1",
            match_date=date(2024, 3, 1),
            home_team_id=100,
            away_team_id=200,
            home_score=2,
            away_score=1,
            team_id=200,
            player_guid="player-2",
            player_name="Luis",
            player_surname1="Perez",
            player_surname2=None,
            player_nickname=None,
            player_position="DEF",
            goals=0,
            assists=1,
            saves=0,
            rating=None,
        ),
    ]
    session.execute.side_effect = [pena_result, season_rows, match_rows]

    repo = SqlAlchemySeasonMatchInsightsRepository(session)

    result = repo.list_closed_match_insight_rows(
        pena_guid="pena-guid",
        season_guids=["season-1"],
    )

    assert result == [
        MatchInsightRowResult(
            season_guid="season-1",
            match_guid="match-1",
            match_date=date(2024, 3, 1),
            home_score=2,
            away_score=1,
            team_side="home",
            player_guid="player-1",
            player_name="Ana",
            player_surname1="Lopez",
            player_surname2=None,
            player_nickname="Nani",
            goals=1,
            assists=0,
            saves=2,
            player_position="GK",
            rating=7.5,
        ),
        MatchInsightRowResult(
            season_guid="season-1",
            match_guid="match-1",
            match_date=date(2024, 3, 1),
            home_score=2,
            away_score=1,
            team_side="away",
            player_guid="player-2",
            player_name="Luis",
            player_surname1="Perez",
            player_surname2=None,
            player_nickname=None,
            goals=0,
            assists=1,
            saves=0,
            player_position="DEF",
            rating=0.0,
        ),
    ]
