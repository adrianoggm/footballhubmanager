from dataclasses import dataclass
from datetime import date

import pytest
from core.application.models import MatchInsightRow
from core.application.ports.season_competition_port import (
    PenaNotFoundError,
    SeasonNotFoundError,
)
from core.application.queries.season_match_insights_query import GetSeasonMatchInsightsQuery
from core.application.queries.season_match_insights_query_handler import (
    GetSeasonMatchInsightsHandler,
)
from core.domain.errors import (
    InvalidSeasonInsightsDataError,
    PenaSeasonNotFoundError,
    PenaSeasonPenaNotFoundError,
)


@dataclass
class _FakeRepo:
    rows: list[MatchInsightRow] | None = None
    error: Exception | None = None
    last_payload: dict | None = None
    goal_event_seconds: list[int] | None = None

    def list_closed_match_insight_rows(
        self, *, pena_guid: str, season_guids: list[str], date_from=None, date_to=None
    ):
        self.last_payload = {
            "pena_guid": pena_guid,
            "season_guids": season_guids,
            "date_from": date_from,
            "date_to": date_to,
        }
        if self.error:
            raise self.error
        return list(self.rows or [])

    def list_goal_event_seconds(
        self, *, pena_guid: str, season_guids: list[str], date_from=None, date_to=None
    ):
        if self.error:
            raise self.error
        return list(self.goal_event_seconds or [])


def _handle(repo, **kwargs):
    return GetSeasonMatchInsightsHandler(repo).handle(GetSeasonMatchInsightsQuery(**kwargs))


def _row(side, guid, name, **kwargs):
    base = dict(
        season_guid="season-guid",
        match_guid="match-closed",
        match_date=date(2024, 3, 1),
        home_score=2,
        away_score=1,
        team_side=side,
        player_guid=guid,
        player_name=name,
        player_surname1=name[0],
        player_surname2=None,
        player_nickname=None,
        goals=0,
        assists=0,
        saves=0,
    )
    base.update(kwargs)
    return MatchInsightRow(**base)


def test_builds_position_breakdown_rating_distribution_and_leader_rating():
    repo = _FakeRepo(
        rows=[
            _row("home", "a", "Ana", goals=2, assists=1, player_position="DEL", rating=8.0),
            _row("home", "b", "Beto", saves=3, player_position="GK", rating=7.0),
            _row("away", "c", "Cora", goals=1, player_position="DEL", rating=6.5),
            _row("away", "d", "Dani", player_position=None, rating=0.0),
        ]
    )

    report = _handle(
        repo,
        pena_guid="pena-guid",
        season_guids=["season-guid"],
        scope="selected_season",
        matrix_size=4,
        top_pairs_size=3,
        leaders_size=3,
    )

    breakdown = {row["position"]: row for row in report["position_breakdown"]}
    assert breakdown["DEL"]["goals"] == 3
    assert breakdown["DEL"]["assists"] == 1
    assert breakdown["DEL"]["appearances"] == 2
    assert breakdown["GK"]["goals"] == 0
    assert breakdown[""]["appearances"] == 1  # null position bucketed under ""

    # 10 fixed buckets; rated entries 8.0/7.0/6.5 land in buckets 8/7/6, the 0.0 is ignored.
    distribution = {row["bucket"]: row["count"] for row in report["rating_distribution"]}
    assert len(report["rating_distribution"]) == 10
    assert distribution[8] == 1 and distribution[7] == 1 and distribution[6] == 1
    assert distribution[0] == 0

    top_scorer = report["leaders"]["scorers"][0]
    assert top_scorer["guid"] == "a"
    assert top_scorer["rating"] == 8.0


def test_builds_goal_timeline_from_event_seconds():
    # Goals at 3min, 8min (band 0), 12min (band 1), 45min (band 4).
    repo = _FakeRepo(
        rows=[
            _row("home", "a", "Ana", goals=2),
            _row("away", "c", "Cora", goals=2),
        ],
        goal_event_seconds=[180, 480, 720, 2700],
    )

    report = _handle(
        repo,
        pena_guid="pena-guid",
        season_guids=["season-guid"],
        scope="selected_season",
        matrix_size=2,
        top_pairs_size=1,
        leaders_size=1,
    )

    timeline = report["goal_timeline"]
    assert [band["goals"] for band in timeline] == [2, 1, 0, 0, 1]
    assert [band["cumulative_goals"] for band in timeline] == [2, 3, 3, 3, 4]
    assert timeline[0]["minute_from"] == 0 and timeline[0]["minute_to"] == 10
    assert timeline[4]["minute_from"] == 40


def test_goal_timeline_empty_when_no_events():
    repo = _FakeRepo(rows=[_row("home", "a", "Ana", goals=1), _row("away", "c", "Cora", goals=1)])
    report = _handle(
        repo,
        pena_guid="pena-guid",
        season_guids=["season-guid"],
        scope="selected_season",
        matrix_size=2,
        top_pairs_size=1,
        leaders_size=1,
    )
    assert report["goal_timeline"] == []


def test_rating_distribution_empty_when_no_ratings():
    repo = _FakeRepo(
        rows=[
            _row("home", "a", "Ana", goals=1),
            _row("away", "c", "Cora", goals=1),
        ]
    )
    report = _handle(
        repo,
        pena_guid="pena-guid",
        season_guids=["season-guid"],
        scope="selected_season",
        matrix_size=2,
        top_pairs_size=1,
        leaders_size=1,
    )
    assert report["rating_distribution"] == []


def test_validates_payload():
    with pytest.raises(InvalidSeasonInsightsDataError):
        _handle(_FakeRepo(), pena_guid="pena-guid", season_guids=[])


def test_maps_repository_not_found_errors():
    with pytest.raises(PenaSeasonPenaNotFoundError):
        _handle(_FakeRepo(error=PenaNotFoundError()), pena_guid="pena-guid", season_guids=["s"])
    with pytest.raises(PenaSeasonNotFoundError):
        _handle(_FakeRepo(error=SeasonNotFoundError()), pena_guid="pena-guid", season_guids=["s"])


def test_computes_report_from_closed_matches():
    repo = _FakeRepo(
        rows=[
            MatchInsightRow(
                season_guid="season-guid",
                match_guid="match-closed",
                match_date=date(2024, 3, 1),
                home_score=2,
                away_score=1,
                team_side="home",
                player_guid="player-a",
                player_name="Ana",
                player_surname1="A",
                player_surname2=None,
                player_nickname="Anita",
                goals=1,
                assists=1,
                saves=0,
            ),
            MatchInsightRow(
                season_guid="season-guid",
                match_guid="match-closed",
                match_date=date(2024, 3, 1),
                home_score=2,
                away_score=1,
                team_side="home",
                player_guid="player-b",
                player_name="Beto",
                player_surname1="B",
                player_surname2=None,
                player_nickname=None,
                goals=1,
                assists=0,
                saves=1,
            ),
            MatchInsightRow(
                season_guid="season-guid",
                match_guid="match-closed",
                match_date=date(2024, 3, 1),
                home_score=2,
                away_score=1,
                team_side="away",
                player_guid="player-c",
                player_name="Cora",
                player_surname1="C",
                player_surname2=None,
                player_nickname=None,
                goals=1,
                assists=1,
                saves=0,
            ),
            MatchInsightRow(
                season_guid="season-guid",
                match_guid="match-closed",
                match_date=date(2024, 3, 1),
                home_score=2,
                away_score=1,
                team_side="away",
                player_guid="player-d",
                player_name="Dani",
                player_surname1="D",
                player_surname2=None,
                player_nickname=None,
                goals=0,
                assists=0,
                saves=0,
            ),
        ]
    )

    report = _handle(
        repo,
        pena_guid="pena-guid",
        season_guids=["season-guid"],
        scope="selected_season",
        matrix_size=4,
        top_pairs_size=3,
        leaders_size=2,
    )

    assert report["scope"] == "selected_season"
    assert report["season_guids"] == ["season-guid"]
    assert report["matches_analyzed"] == 1
    assert report["goals_per_match"] == 3.0
    assert report["assists_per_match"] == 2.0
    assert report["saves_per_match"] == 1.0
    assert len(report["timeline_by_match"]) == 1
    assert report["timeline_by_match"][0]["label"] == "M1"
    assert report["timeline_by_match"][0]["match_index"] == 1
    assert report["timeline_by_match"][0]["running_goals_per_match"] == 3.0
    assert report["top_teammates_by_player"][0]["player_guid"] == "player-a"
    assert report["top_teammates_by_player"][0]["partner_guid"] == "player-b"
    assert report["top_teammates_by_player"][0]["player_label"] == "Anita"
    assert report["top_teammates_by_player"][0]["partner_label"] == "Beto B"
    assert report["matrix_rows"][0]["player"] == {
        "guid": "player-a",
        "label": "Anita",
        "appearances": 1,
    }
    assert report["matrix_rows"][0]["cells"][1] == {
        "player_guid": "player-a",
        "teammate_guid": "player-b",
        "same_player": False,
        "matches": 1,
        "wins": 1,
        "draws": 0,
        "losses": 0,
        "win_rate": 1.0,
    }
    assert len(report["leaders"]["scorers"]) == 2
    first_pair = report["top_pairs"][0]
    assert first_pair["left_win_rate"] == 1.0  # player-a won its only match
    assert first_pair["right_win_rate"] == 1.0
    assert first_pair["left_label"] and first_pair["right_label"]
    assert repo.last_payload["pena_guid"] == "pena-guid"
    assert repo.last_payload["season_guids"] == ["season-guid"]


def test_passes_date_range_to_repository():
    repo = _FakeRepo(rows=[_row("home", "a", "Ana", goals=1), _row("away", "c", "Cora", goals=1)])
    _handle(
        repo,
        pena_guid="pena-guid",
        season_guids=["season-guid"],
        scope="selected_season",
        matrix_size=2,
        top_pairs_size=1,
        leaders_size=1,
        date_from=date(2024, 1, 1),
        date_to=date(2024, 6, 30),
    )
    assert repo.last_payload["date_from"] == date(2024, 1, 1)
    assert repo.last_payload["date_to"] == date(2024, 6, 30)


def test_computes_running_timeline_metrics_across_matches():
    repo = _FakeRepo(
        rows=[
            MatchInsightRow(
                season_guid="season-a",
                match_guid="match-a",
                match_date=date(2024, 3, 1),
                home_score=1,
                away_score=0,
                team_side="home",
                player_guid="player-a",
                player_name="Ana",
                player_surname1="A",
                player_surname2=None,
                player_nickname=None,
                goals=1,
                assists=0,
                saves=0,
            ),
            MatchInsightRow(
                season_guid="season-a",
                match_guid="match-a",
                match_date=date(2024, 3, 1),
                home_score=1,
                away_score=0,
                team_side="away",
                player_guid="player-b",
                player_name="Beto",
                player_surname1="B",
                player_surname2=None,
                player_nickname=None,
                goals=0,
                assists=0,
                saves=1,
            ),
            MatchInsightRow(
                season_guid="season-b",
                match_guid="match-b",
                match_date=date(2024, 4, 1),
                home_score=2,
                away_score=1,
                team_side="home",
                player_guid="player-c",
                player_name="Cora",
                player_surname1="C",
                player_surname2=None,
                player_nickname=None,
                goals=2,
                assists=1,
                saves=0,
            ),
            MatchInsightRow(
                season_guid="season-b",
                match_guid="match-b",
                match_date=date(2024, 4, 1),
                home_score=2,
                away_score=1,
                team_side="away",
                player_guid="player-d",
                player_name="Dani",
                player_surname1="D",
                player_surname2=None,
                player_nickname=None,
                goals=1,
                assists=0,
                saves=2,
            ),
        ]
    )

    report = _handle(repo, pena_guid="pena-guid", season_guids=["season-a", "season-b"])

    first_match, second_match = report["timeline_by_match"]
    assert first_match["match_index"] == 1
    assert first_match["running_goals_per_match"] == 1.0
    assert first_match["running_assists_per_match"] == 0.0
    assert first_match["running_saves_per_match"] == 1.0
    assert second_match["match_index"] == 2
    assert second_match["running_goals_per_match"] == 2.0
    assert second_match["running_assists_per_match"] == 0.5
    assert second_match["running_saves_per_match"] == 1.5


def test_collect_match_insight_details_preserves_position_and_rating():
    repo = _FakeRepo(
        rows=[
            MatchInsightRow(
                season_guid="season-guid",
                match_guid="match-closed",
                match_date=date(2024, 3, 1),
                home_score=3,
                away_score=1,
                team_side="home",
                player_guid="player-a",
                player_name="Ana",
                player_surname1="A",
                player_surname2=None,
                player_nickname="Anita",
                goals=2,
                assists=1,
                saves=0,
                player_position="CM",
                rating=8.0,
            ),
            MatchInsightRow(
                season_guid="season-guid",
                match_guid="match-closed",
                match_date=date(2024, 3, 1),
                home_score=3,
                away_score=1,
                team_side="home",
                player_guid="player-b",
                player_name="Beto",
                player_surname1="B",
                player_surname2=None,
                player_nickname=None,
                goals=1,
                assists=0,
                saves=1,
                player_position=None,
                rating=6.0,
            ),
            MatchInsightRow(
                season_guid="season-guid",
                match_guid="match-closed",
                match_date=date(2024, 3, 1),
                home_score=3,
                away_score=1,
                team_side="away",
                player_guid="player-c",
                player_name="Cora",
                player_surname1="C",
                player_surname2=None,
                player_nickname=None,
                goals=1,
                assists=0,
                saves=2,
                player_position="GK",
                rating=7.5,
            ),
        ]
    )

    details = GetSeasonMatchInsightsHandler(repo)._collect_match_insight_details(
        pena_guid="pena-guid",
        season_guids=["season-guid"],
    )

    assert len(details) == 1
    assert details[0].home_team.players[0].position == "CM"
    assert details[0].home_team.players[0].rating == 8.0
    assert details[0].home_team.players[1].position is None
    assert details[0].away_team.players[0].position == "GK"
    assert details[0].away_team.players[0].rating == 7.5
    assert details[0].home_team.average_rating == 7.0
    assert details[0].away_team.average_rating == 7.5
