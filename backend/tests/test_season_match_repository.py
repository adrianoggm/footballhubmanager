from types import SimpleNamespace
from unittest.mock import Mock

import pytest
from core.application.ports.season_competition_port import (
    MatchEventCreateData,
    MatchNotFoundError,
    MatchPlayerStatsUpdateData,
)
from core.application.services import SeasonMatchReportState
from persistence.infrastructure.repository.db.season_match_repository import (
    SqlAlchemySeasonMatchRepository,
)


def test_list_season_matches_returns_empty_page_when_no_matches():
    session = Mock()
    total_result = Mock()
    total_result.scalar.return_value = 0
    matches_result = Mock()
    matches_result.scalars.return_value = []
    session.execute.side_effect = [total_result, matches_result]

    repo = SqlAlchemySeasonMatchRepository(session)
    repo._get_pena = lambda _pena_guid: SimpleNamespace(id=11)
    repo._get_season = lambda *, pena_id, season_guid: SimpleNamespace(id=22, guid="season-guid")

    page = repo.list_season_matches(
        pena_guid="pena-guid",
        season_guid="season-guid",
        page=1,
        page_size=20,
    )

    assert page.items == []
    assert page.page == 1
    assert page.page_size == 20
    assert page.total == 0


def test_delete_match_for_admin_rolls_back_when_match_bundle_is_missing():
    session = Mock()
    repo = SqlAlchemySeasonMatchRepository(session)
    repo._get_pena = lambda _pena_guid: SimpleNamespace(id=11, id_admin=7)
    repo._get_season = lambda *, pena_id, season_guid: SimpleNamespace(id=22)
    repo._get_locked_match_teams = lambda *, season_id, match_guid: None

    with pytest.raises(MatchNotFoundError):
        repo.delete_match_for_admin(
            pena_guid="pena-guid",
            season_guid="season-guid",
            match_guid="match-guid",
            admin_id=7,
        )

    session.rollback.assert_called_once()


def test_match_report_state_uses_injected_report_service():
    session = Mock()

    class _ReportService:
        def __init__(self):
            self.calls = []

        def resolve_state(self, *, persisted_status, ended_at_epoch):
            self.calls.append(
                {
                    "persisted_status": persisted_status,
                    "ended_at_epoch": ended_at_epoch,
                }
            )
            return SeasonMatchReportState.OPEN

    report_service = _ReportService()
    repo = SqlAlchemySeasonMatchRepository(session, report_service=report_service)

    football_match = SimpleNamespace(status="closed", ended_at_epoch=123)

    assert repo._match_report_state(football_match) is SeasonMatchReportState.OPEN
    assert repo._match_status(football_match) == "open"
    assert report_service.calls == [
        {
            "persisted_status": "closed",
            "ended_at_epoch": 123,
        },
        {
            "persisted_status": "closed",
            "ended_at_epoch": 123,
        },
    ]


def test_create_match_event_for_admin_uses_team_player_player_ids():
    session = Mock()
    repo = SqlAlchemySeasonMatchRepository(session)
    football_match = SimpleNamespace(id=33, started_at_epoch=100, ended_at_epoch=None)
    home_team = SimpleNamespace(id=1)
    away_team = SimpleNamespace(id=2)
    home_team_player = SimpleNamespace(id_team=1, id_player=11)
    away_team_player = SimpleNamespace(id_team=2, id_player=22)
    repo._get_locked_admin_match_bundle = lambda **kwargs: (
        SimpleNamespace(id=44),
        SimpleNamespace(guid="season-guid"),
        football_match,
        home_team,
        away_team,
    )
    repo._load_locked_required_team_players = lambda **kwargs: (
        [home_team_player],
        [away_team_player],
    )
    repo._team_player_guid_map = lambda team_players: {
        (
            "home-player-guid" if team_players[0] is home_team_player else "away-player-guid"
        ): team_players[0]
    }
    repo._resolve_event_player = lambda **kwargs: home_team_player
    repo._resolve_related_event_player = lambda **kwargs: away_team_player
    repo._resolve_event_elapsed_seconds = lambda football_match, provided_elapsed_seconds: 55
    repo._now_epoch = lambda: 777
    repo._build_match_detail_result = lambda **kwargs: "detail-result"

    result = repo.create_match_event_for_admin(
        pena_guid="pena-guid",
        season_guid="season-guid",
        match_guid="match-guid",
        admin_id=7,
        event=MatchEventCreateData(
            event_type="goal",
            team_side="home",
            player_guid="home-player-guid",
            related_player_guid="away-player-guid",
            note="tracked",
            elapsed_seconds=None,
            value_delta=1,
        ),
    )

    added_event = session.add.call_args.args[0]
    assert added_event.id_player == 11
    assert added_event.id_related_player == 22
    assert result == "detail-result"


def test_update_match_stats_for_admin_stops_live_tracking_when_closing_match():
    session = Mock()
    repo = SqlAlchemySeasonMatchRepository(session)
    football_match = SimpleNamespace(
        id=33,
        started_at_epoch=100,
        ended_at_epoch=None,
        guid="match-guid",
    )
    pena = SimpleNamespace(id=44)
    season = SimpleNamespace(id=55, guid="season-guid")
    home_team = SimpleNamespace(id=1)
    away_team = SimpleNamespace(id=2)
    home_team_player = SimpleNamespace(
        guid="home-team-player-guid",
        goals=0,
        assists=0,
        saves=0,
        rating=0,
    )
    away_team_player = SimpleNamespace(
        guid="away-team-player-guid",
        goals=0,
        assists=0,
        saves=0,
        rating=0,
    )

    repo._get_locked_admin_match_bundle = lambda **kwargs: (
        pena,
        season,
        football_match,
        home_team,
        away_team,
    )
    repo._load_locked_required_team_players = lambda **kwargs: (
        [home_team_player],
        [away_team_player],
    )
    repo._team_player_guid_map = lambda team_players: {
        (
            "home-player-guid" if team_players[0] is home_team_player else "away-player-guid"
        ): team_players[0]
    }
    repo._remove_closed_match_standings = Mock()

    def _apply_team_player_stats(roster, payload):
        for player_guid, team_player in roster.items():
            stats = payload[player_guid]
            team_player.goals = stats.goals
            team_player.assists = stats.assists
            team_player.saves = stats.saves
            team_player.rating = stats.rating

    repo._apply_team_player_stats = _apply_team_player_stats
    repo._close_match_report = Mock(
        side_effect=lambda **kwargs: setattr(kwargs["football_match"], "status", "closed")
    )
    repo._build_match_detail_result = lambda **kwargs: "detail-result"
    repo._now_epoch = lambda: 777

    result = repo.update_match_stats_for_admin(
        pena_guid="pena-guid",
        season_guid="season-guid",
        match_guid="match-guid",
        admin_id=7,
        home_players_stats=[
            MatchPlayerStatsUpdateData(
                player_guid="home-player-guid",
                goals=2,
                assists=1,
                saves=0,
                rating=8.0,
            )
        ],
        away_players_stats=[
            MatchPlayerStatsUpdateData(
                player_guid="away-player-guid",
                goals=1,
                assists=0,
                saves=3,
                rating=7.0,
            )
        ],
    )

    assert football_match.ended_at_epoch == 777
    assert football_match.status == "closed"
    assert result == "detail-result"
    repo._remove_closed_match_standings.assert_not_called()
    repo._close_match_report.assert_called_once()
    session.commit.assert_called_once()


def test_stop_match_for_admin_finalizes_tracked_stats_when_events_exist():
    session = Mock()
    repo = SqlAlchemySeasonMatchRepository(session)
    football_match = SimpleNamespace(
        id=33,
        started_at_epoch=100,
        ended_at_epoch=None,
        guid="match-guid",
    )
    pena = SimpleNamespace(id=44)
    season = SimpleNamespace(id=55, guid="season-guid")
    home_team = SimpleNamespace(id=1)
    away_team = SimpleNamespace(id=2)
    home_team_player = SimpleNamespace(
        id_player=11,
        goals=0,
        assists=0,
        saves=0,
        rating=-1.0,
    )
    away_team_player = SimpleNamespace(
        id_player=22,
        goals=0,
        assists=0,
        saves=0,
        rating=-1.0,
    )

    repo._get_locked_admin_match_bundle = lambda **kwargs: (
        pena,
        season,
        football_match,
        home_team,
        away_team,
    )
    repo._load_locked_required_team_players = lambda **kwargs: (
        [home_team_player],
        [away_team_player],
    )
    repo._list_locked_match_events = lambda **kwargs: [
        SimpleNamespace(id_player=11, event_type="goal", value_delta=1),
        SimpleNamespace(id_player=11, event_type="assist", value_delta=1),
        SimpleNamespace(id_player=22, event_type="goal", value_delta=1),
        SimpleNamespace(id_player=22, event_type="save", value_delta=3),
        SimpleNamespace(id_player=22, event_type="save", value_delta=-1),
        SimpleNamespace(id_player=22, event_type="yellow_card", value_delta=1),
    ]
    repo._remove_closed_match_standings = Mock()
    repo._close_match_report = Mock(
        side_effect=lambda **kwargs: setattr(kwargs["football_match"], "status", "closed")
    )
    repo._build_match_detail_result = lambda **kwargs: "detail-result"
    repo._now_epoch = lambda: 777

    result = repo.stop_match_for_admin(
        pena_guid="pena-guid",
        season_guid="season-guid",
        match_guid="match-guid",
        admin_id=7,
    )

    assert home_team_player.goals == 1
    assert home_team_player.assists == 1
    assert home_team_player.saves == 0
    assert home_team_player.rating == 0.0
    assert away_team_player.goals == 1
    assert away_team_player.assists == 0
    assert away_team_player.saves == 2
    assert away_team_player.rating == 0.0
    assert football_match.ended_at_epoch == 777
    assert football_match.status == "closed"
    assert result == "detail-result"
    repo._remove_closed_match_standings.assert_not_called()
    repo._close_match_report.assert_called_once()


def test_update_match_lineups_for_admin_keeps_closed_match_closed_and_records_audit():
    session = Mock()
    repo = SqlAlchemySeasonMatchRepository(session)
    football_match = SimpleNamespace(
        id=33,
        started_at_epoch=100,
        ended_at_epoch=150,
        guid="match-guid",
        status="closed",
        lineup_change_count=1,
        lineup_updated_at_epoch=None,
    )
    pena = SimpleNamespace(id=44)
    season = SimpleNamespace(id=55, guid="season-guid")
    home_team = SimpleNamespace(id=1)
    away_team = SimpleNamespace(id=2)
    initial_home_players = [SimpleNamespace(id_player=11, goals=2, assists=1, saves=0, rating=8.0)]
    initial_away_players = [SimpleNamespace(id_player=22, goals=1, assists=0, saves=3, rating=7.0)]
    updated_home_players = [SimpleNamespace(id_player=11, goals=2, assists=1, saves=0, rating=8.0)]
    updated_away_players = [SimpleNamespace(id_player=33, goals=0, assists=0, saves=0, rating=0.0)]

    repo._get_locked_admin_match_bundle = lambda **kwargs: (
        pena,
        season,
        football_match,
        home_team,
        away_team,
    )
    repo._load_locked_required_team_players = Mock(
        side_effect=[
            (initial_home_players, initial_away_players),
            (updated_home_players, updated_away_players),
        ]
    )
    repo._remove_closed_match_standings = Mock()
    repo._resolve_match_players = Mock(
        side_effect=[
            [SimpleNamespace(id=11, guid="home-player-guid")],
            [SimpleNamespace(id=33, guid="away-player-guid")],
        ]
    )
    repo._replace_team_players_for_closed_match = Mock()
    repo._replace_team_players_for_open_match = Mock()
    repo._close_match_report = Mock()
    repo._build_match_detail_result = lambda **kwargs: "detail-result"
    repo._now_epoch = lambda: 777

    result = repo.update_match_lineups_for_admin(
        pena_guid="pena-guid",
        season_guid="season-guid",
        match_guid="match-guid",
        admin_id=7,
        home_player_guids=["home-player-guid"],
        away_player_guids=["away-player-guid"],
    )

    assert football_match.status == "closed"
    assert football_match.lineup_change_count == 2
    assert football_match.lineup_updated_at_epoch == 777
    assert result == "detail-result"
    repo._remove_closed_match_standings.assert_called_once()
    repo._replace_team_players_for_closed_match.assert_called_once()
    repo._replace_team_players_for_open_match.assert_not_called()
    repo._close_match_report.assert_called_once()
    session.commit.assert_called_once()


def test_update_match_lineups_for_admin_uses_open_replacement_path_for_open_match():
    session = Mock()
    repo = SqlAlchemySeasonMatchRepository(session)
    football_match = SimpleNamespace(
        id=33,
        started_at_epoch=None,
        ended_at_epoch=None,
        guid="match-guid",
        status="open",
        lineup_change_count=0,
        lineup_updated_at_epoch=None,
    )
    pena = SimpleNamespace(id=44)
    season = SimpleNamespace(id=55, guid="season-guid")
    home_team = SimpleNamespace(id=1)
    away_team = SimpleNamespace(id=2)
    initial_home_players = [SimpleNamespace(id_player=11, goals=0, assists=0, saves=0, rating=-1.0)]
    initial_away_players = [SimpleNamespace(id_player=22, goals=0, assists=0, saves=0, rating=-1.0)]

    repo._get_locked_admin_match_bundle = lambda **kwargs: (
        pena,
        season,
        football_match,
        home_team,
        away_team,
    )
    repo._load_locked_required_team_players = Mock(
        return_value=(initial_home_players, initial_away_players)
    )
    repo._remove_closed_match_standings = Mock()
    repo._resolve_match_players = Mock(
        side_effect=[
            [SimpleNamespace(id=11, guid="home-player-guid")],
            [SimpleNamespace(id=22, guid="away-player-guid")],
        ]
    )
    repo._replace_team_players_for_closed_match = Mock()
    repo._replace_team_players_for_open_match = Mock()
    repo._close_match_report = Mock()
    repo._build_match_detail_result = lambda **kwargs: "detail-result"
    repo._now_epoch = lambda: 777

    result = repo.update_match_lineups_for_admin(
        pena_guid="pena-guid",
        season_guid="season-guid",
        match_guid="match-guid",
        admin_id=7,
        home_player_guids=["home-player-guid"],
        away_player_guids=["away-player-guid"],
    )

    assert football_match.status == "open"
    assert football_match.lineup_change_count == 1
    assert football_match.lineup_updated_at_epoch == 777
    assert result == "detail-result"
    repo._remove_closed_match_standings.assert_not_called()
    repo._replace_team_players_for_open_match.assert_called_once()
    repo._replace_team_players_for_closed_match.assert_not_called()
    repo._close_match_report.assert_not_called()
    session.commit.assert_called_once()


def test_update_match_stats_for_admin_reverts_closed_match_before_reclosing():
    session = Mock()
    repo = SqlAlchemySeasonMatchRepository(session)
    football_match = SimpleNamespace(
        id=33,
        started_at_epoch=100,
        ended_at_epoch=150,
        guid="match-guid",
        status="closed",
    )
    pena = SimpleNamespace(id=44)
    season = SimpleNamespace(id=55, guid="season-guid")
    home_team = SimpleNamespace(id=1)
    away_team = SimpleNamespace(id=2)
    home_team_player = SimpleNamespace(
        guid="home-team-player-guid",
        goals=2,
        assists=1,
        saves=0,
        rating=8.0,
    )
    away_team_player = SimpleNamespace(
        guid="away-team-player-guid",
        goals=1,
        assists=0,
        saves=3,
        rating=7.0,
    )

    repo._get_locked_admin_match_bundle = lambda **kwargs: (
        pena,
        season,
        football_match,
        home_team,
        away_team,
    )
    repo._load_locked_required_team_players = lambda **kwargs: (
        [home_team_player],
        [away_team_player],
    )
    repo._team_player_guid_map = lambda team_players: {
        (
            "home-player-guid" if team_players[0] is home_team_player else "away-player-guid"
        ): team_players[0]
    }
    repo._remove_closed_match_standings = Mock()

    def _apply_team_player_stats(roster, payload):
        for player_guid, team_player in roster.items():
            stats = payload[player_guid]
            team_player.goals = stats.goals
            team_player.assists = stats.assists
            team_player.saves = stats.saves
            team_player.rating = stats.rating

    repo._apply_team_player_stats = _apply_team_player_stats
    repo._close_match_report = Mock()
    repo._build_match_detail_result = lambda **kwargs: "detail-result"

    result = repo.update_match_stats_for_admin(
        pena_guid="pena-guid",
        season_guid="season-guid",
        match_guid="match-guid",
        admin_id=7,
        home_players_stats=[
            MatchPlayerStatsUpdateData(
                player_guid="home-player-guid",
                goals=3,
                assists=1,
                saves=0,
                rating=8.5,
            )
        ],
        away_players_stats=[
            MatchPlayerStatsUpdateData(
                player_guid="away-player-guid",
                goals=0,
                assists=0,
                saves=2,
                rating=6.5,
            )
        ],
    )

    assert result == "detail-result"
    repo._remove_closed_match_standings.assert_called_once()
    repo._close_match_report.assert_called_once()
    session.commit.assert_called_once()
