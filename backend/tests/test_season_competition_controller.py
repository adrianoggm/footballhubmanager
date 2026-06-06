from datetime import date

import pytest
from api.dependencies import use_cases as use_case_dependencies
from api.interface.controller.v1 import season_competition_controller as controller
from api.interface.controller.v1.model.request.season_competition_request import (
    CreateSeasonMatchDetailedRequest,
    CreateSeasonMatchEventRequest,
    CreateSeasonMatchRequest,
    MatchInsightsRequest,
    MatchPlayerStatsRequest,
    MatchTeamCreateRequest,
    MatchTeamLineupsRequest,
    MatchTeamStatsRequest,
    RegisterSeasonPlayerRequest,
    RegisterSeasonPlayersBulkRequest,
    UpdateSeasonMatchLineupsRequest,
    UpdateSeasonMatchRequest,
    UpdateSeasonMatchResultRequest,
    UpdateSeasonMatchStatsRequest,
    UpdateSeasonPlayerStatsRequest,
)
from auth.session import SessionData
from core.application.models.season_competition_models import (
    SeasonMatchDetailInfo,
    SeasonMatchesPage,
    SeasonMatchInfo,
    SeasonMatchPlayerStatsInfo,
    SeasonMatchSummaryInfo,
    SeasonMatchTeamInfo,
    SeasonPlayerInfo,
    SeasonPlayersFilters,
    SeasonPlayersPage,
)
from core.application.policies import FieldUpdate, StandingsUpdatePolicy
from core.application.use_cases.manage_season_competition_usecase import (
    InvalidSeasonInsightsDataError,
    InvalidSeasonMatchDataError,
    InvalidSeasonPlayerBatchDataError,
    InvalidSeasonPlayerUpdateDataError,
    PenaSeasonAccessDeniedError,
    PenaSeasonNotFoundError,
    PenaSeasonPenaNotFoundError,
    SeasonMatchAlreadyStartedError,
    SeasonMatchClockNotRunningError,
    SeasonMatchEventNotFoundError,
    SeasonMatchEventPlayerNotInMatchError,
    SeasonMatchInvalidPlayersError,
    SeasonMatchLineupLockedError,
    SeasonMatchNotFoundError,
    SeasonMatchPlayersNotInSeasonError,
    SeasonMatchReportClosedError,
    SeasonMatchStatsMismatchError,
    SeasonPlayerAlreadyRegisteredError,
    SeasonPlayerInMatchError,
    SeasonPlayerNotFoundError,
    SeasonPlayerNotInPenaError,
)
from fastapi import HTTPException


def _admin_session(admin_id: int = 5) -> SessionData:
    return SessionData(
        token="tok-admin",
        user_id=admin_id,
        user_guid="admin-guid",
        user_type="admin",
        expires_at=9999999999,
    )


def _player(player_guid: str = "player-1") -> SeasonPlayerInfo:
    return SeasonPlayerInfo(
        player_guid=player_guid,
        name="Ana",
        surname1="Lopez",
        surname2=None,
        nationality="ES",
        nickname="Nani",
        position="MID",
        played=3,
        goals=2,
        assists=1,
        wins=2,
        losses=1,
        draws=0,
        quality_level=7.5,
        points=6,
    )


def _players_page(total: int, page: int = 1, page_size: int = 20) -> SeasonPlayersPage:
    return SeasonPlayersPage(items=[_player()], page=page, page_size=page_size, total=total)


def _match(match_guid: str = "match-1") -> SeasonMatchInfo:
    return SeasonMatchInfo(
        guid=match_guid,
        season_guid="season-1",
        match_date=date(2025, 1, 10),
        home_player_guid="player-1",
        away_player_guid="player-2",
        home_player_name="Ana",
        away_player_name="Luis",
        status="closed",
        home_score=2,
        away_score=1,
    )


def _match_detail(match_guid: str = "match-1") -> SeasonMatchDetailInfo:
    home_player = SeasonMatchPlayerStatsInfo(
        player_guid="player-1",
        name="Ana",
        surname1="Lopez",
        surname2=None,
        nickname="Nani",
        position="MID",
        goals=2,
        assists=1,
        saves=0,
        rating=8.1,
    )
    away_player = SeasonMatchPlayerStatsInfo(
        player_guid="player-2",
        name="Luis",
        surname1="Perez",
        surname2=None,
        nickname=None,
        position="DEF",
        goals=1,
        assists=0,
        saves=0,
        rating=7.0,
    )
    home_team = SeasonMatchTeamInfo(
        team_guid="team-home",
        team_name="Home",
        score=2,
        total_assists=1,
        total_saves=0,
        average_rating=8.1,
        players=[home_player],
    )
    away_team = SeasonMatchTeamInfo(
        team_guid="team-away",
        team_name="Away",
        score=1,
        total_assists=0,
        total_saves=0,
        average_rating=7.0,
        players=[away_player],
    )
    return SeasonMatchDetailInfo(
        guid=match_guid,
        season_guid="season-1",
        match_date=date(2025, 1, 10),
        status="closed",
        tracking_status="not_started",
        started_at_epoch=None,
        ended_at_epoch=None,
        elapsed_seconds=0,
        home_team=home_team,
        away_team=away_team,
        events=[],
    )


def _matches_page(total: int, page: int = 1, page_size: int = 20) -> SeasonMatchesPage:
    summary = SeasonMatchSummaryInfo(
        guid="match-1",
        season_guid="season-1",
        match_date=date(2025, 1, 10),
        status="closed",
        home_team_name="Home",
        away_team_name="Away",
        home_score=2,
        away_score=1,
        home_players=1,
        away_players=1,
        tracking_status="not_started",
        started_at_epoch=None,
        ended_at_epoch=None,
        elapsed_seconds=0,
    )
    return SeasonMatchesPage(items=[summary], page=page, page_size=page_size, total=total)


def _match_payload() -> CreateSeasonMatchRequest:
    return CreateSeasonMatchRequest(
        home_player_guid="p1",
        away_player_guid="p2",
        match_date=date(2025, 1, 10),
    )


def _match_detail_payload() -> CreateSeasonMatchDetailedRequest:
    return CreateSeasonMatchDetailedRequest(
        match_date=date(2025, 1, 10),
        home_team=MatchTeamCreateRequest(team_name="Home", player_guids=["p1"]),
        away_team=MatchTeamCreateRequest(team_name="Away", player_guids=["p2"]),
    )


def _match_stats_payload() -> UpdateSeasonMatchStatsRequest:
    return UpdateSeasonMatchStatsRequest(
        home_team=MatchTeamStatsRequest(
            players=[MatchPlayerStatsRequest(player_guid="p1", goals=2, assists=1, saves=0)]
        ),
        away_team=MatchTeamStatsRequest(
            players=[MatchPlayerStatsRequest(player_guid="p2", goals=1, assists=0, saves=0)]
        ),
    )


def _lineups_payload() -> UpdateSeasonMatchLineupsRequest:
    return UpdateSeasonMatchLineupsRequest(
        home_team=MatchTeamLineupsRequest(player_guids=["p1"]),
        away_team=MatchTeamLineupsRequest(player_guids=["p2"]),
    )


class _UseCaseStub:
    def __init__(self):
        self.last_call: tuple[str, dict] | None = None
        self.error_by_method: dict[str, Exception] = {}
        self.insights_result = {"matches_analyzed": 1}

    def _call(self, method: str, **kwargs):
        self.last_call = (method, kwargs)
        error = self.error_by_method.get(method)
        if error:
            raise error

    def register_player_for_admin(self, **kwargs):
        self._call("register_player_for_admin", **kwargs)
        return _player(kwargs["player_guid"])

    def register_players_bulk_for_admin(self, **kwargs):
        self._call("register_players_bulk_for_admin", **kwargs)
        return [_player(player_guid) for player_guid in kwargs["player_guids"]]

    def update_player_stats_for_admin(self, **kwargs):
        self._call("update_player_stats_for_admin", **kwargs)
        return _player(kwargs["player_guid"])

    def unregister_player_for_admin(self, **kwargs):
        self._call("unregister_player_for_admin", **kwargs)

    def list_season_players(self, **kwargs):
        self._call("list_season_players", **kwargs)
        return _players_page(total=21, page=kwargs["page"], page_size=kwargs["page_size"])

    def create_match_for_admin(self, **kwargs):
        self._call("create_match_for_admin", **kwargs)
        return _match("match-created")

    def update_match_result_for_admin(self, **kwargs):
        self._call("update_match_result_for_admin", **kwargs)
        return _match("match-result")

    def update_match_for_admin(self, **kwargs):
        self._call("update_match_for_admin", **kwargs)
        return _match_detail("match-updated")

    def create_match_with_lineups_for_admin(self, **kwargs):
        self._call("create_match_with_lineups_for_admin", **kwargs)
        return _match_detail("match-detailed")

    def update_match_stats_for_admin(self, **kwargs):
        self._call("update_match_stats_for_admin", **kwargs)
        return _match_detail("match-stats")

    def update_match_lineups_for_admin(self, **kwargs):
        self._call("update_match_lineups_for_admin", **kwargs)
        return _match_detail("match-lineups")

    def start_match_for_admin(self, **kwargs):
        self._call("start_match_for_admin", **kwargs)
        return _match_detail("match-started")

    def stop_match_for_admin(self, **kwargs):
        self._call("stop_match_for_admin", **kwargs)
        return _match_detail("match-stopped")

    def create_match_event_for_admin(self, **kwargs):
        self._call("create_match_event_for_admin", **kwargs)
        return _match_detail("match-event-created")

    def delete_match_event_for_admin(self, **kwargs):
        self._call("delete_match_event_for_admin", **kwargs)
        return _match_detail("match-event-deleted")

    def list_season_matches(self, **kwargs):
        self._call("list_season_matches", **kwargs)
        return _matches_page(total=40, page=kwargs["page"], page_size=kwargs["page_size"])

    def get_match_detail(self, **kwargs):
        self._call("get_match_detail", **kwargs)
        return _match_detail(kwargs["match_guid"])

    def execute(self, **kwargs):
        self._call("get_match_insights", **kwargs)
        return self.insights_result

    def delete_match_for_admin(self, **kwargs):
        self._call("delete_match_for_admin", **kwargs)

    def get_standings(self, **kwargs):
        self._call("get_standings", **kwargs)
        return _players_page(total=9, page=kwargs["page"], page_size=kwargs["page_size"])


def test_helper_clean_and_page_response():
    assert controller._clean("  x  ") == "x"
    assert controller._clean("  ") is None
    page = controller._page_response(_players_page(total=21, page=2, page_size=20))
    assert page.total_pages == 2
    assert page.page == 2


def test_helper_clean_many_removes_invalid_values_and_duplicates():
    assert controller._clean_many(None) == ()
    assert controller._clean_many("MID") == ()
    assert controller._clean_many(["  MID ", "mid", "", "GK", None]) == ("MID", "GK")


def test_get_manage_season_players_use_case_builds_expected_dependencies(monkeypatch):
    captured: dict[str, object] = {}

    class _Repo:
        def __init__(self, db):
            captured["db"] = db

    class _MatchRepo:
        def __init__(self, db):
            captured["match_db"] = db

    class _UseCase:
        def __init__(self, repo):
            captured["repo_type"] = type(repo)
            self.repo = repo

    monkeypatch.setattr(use_case_dependencies, "SqlAlchemySeasonPlayerRepository", _Repo)
    monkeypatch.setattr(use_case_dependencies, "ManageSeasonPlayersUseCase", _UseCase)

    use_case = use_case_dependencies.get_manage_season_players_use_case(db="db-session")
    assert isinstance(use_case, _UseCase)
    assert captured["db"] == "db-session"
    assert captured["repo_type"] is _Repo


def test_get_manage_season_matches_use_case_builds_expected_dependencies(monkeypatch):
    captured: dict[str, object] = {}

    class _Repo:
        def __init__(self, db):
            captured["db"] = db

    class _UseCase:
        def __init__(self, repo):
            captured["repo_type"] = type(repo)
            self.repo = repo

    monkeypatch.setattr(use_case_dependencies, "SqlAlchemySeasonMatchRepository", _Repo)
    monkeypatch.setattr(use_case_dependencies, "ManageSeasonMatchesUseCase", _UseCase)

    use_case = use_case_dependencies.get_manage_season_matches_use_case(db="db-session")
    assert isinstance(use_case, _UseCase)
    assert captured["db"] == "db-session"
    assert captured["repo_type"] is _Repo


def test_get_season_match_insights_use_case_builds_expected_dependencies(monkeypatch):
    captured: dict[str, object] = {}

    class _Repo:
        def __init__(self, db):
            captured["db"] = db

    class _UseCase:
        def __init__(self, repo):
            captured["repo_type"] = type(repo)
            self.repo = repo

    monkeypatch.setattr(use_case_dependencies, "SqlAlchemySeasonMatchInsightsRepository", _Repo)
    monkeypatch.setattr(use_case_dependencies, "GetSeasonMatchInsightsUseCase", _UseCase)

    use_case = controller.get_season_match_insights_use_case(db="db-session")
    assert isinstance(use_case, _UseCase)
    assert captured["db"] == "db-session"
    assert captured["repo_type"] is _Repo


def test_helper_match_detail_response_serializes_nested_data():
    response = controller._match_detail_response(_match_detail("match-nested"))
    assert response.guid == "match-nested"
    assert response.home_team.players[0].player_guid == "player-1"


def test_register_player_in_season_success():
    use_case = _UseCaseStub()
    response = controller.register_player_in_season(
        "pena-1",
        "season-1",
        payload=RegisterSeasonPlayerRequest(player_guid="player-7"),
        admin_session=_admin_session(55),
        use_case=use_case,
    )
    assert response.player_guid == "player-7"
    assert use_case.last_call == (
        "register_player_for_admin",
        {
            "pena_guid": "pena-1",
            "season_guid": "season-1",
            "admin_id": 55,
            "player_guid": "player-7",
        },
    )


def test_register_player_in_season_maps_conflict_error():
    use_case = _UseCaseStub()
    use_case.error_by_method["register_player_for_admin"] = SeasonPlayerAlreadyRegisteredError()
    with pytest.raises(HTTPException) as exc:
        controller.register_player_in_season(
            "pena-1",
            "season-1",
            payload=RegisterSeasonPlayerRequest(player_guid="player-7"),
            admin_session=_admin_session(),
            use_case=use_case,
        )
    assert exc.value.status_code == 409
    assert exc.value.detail == "Player is already registered in this season"


def test_register_players_in_season_bulk_success():
    use_case = _UseCaseStub()
    response = controller.register_players_in_season_bulk(
        "pena-1",
        "season-1",
        payload=RegisterSeasonPlayersBulkRequest(player_guids=["p1", "p2"]),
        admin_session=_admin_session(77),
        use_case=use_case,
    )
    assert response.total_registered == 2
    method, payload = use_case.last_call
    assert method == "register_players_bulk_for_admin"
    assert payload["admin_id"] == 77


def test_update_season_player_stats_sets_partial_flags():
    use_case = _UseCaseStub()
    response = controller.update_season_player_stats(
        "pena-1",
        "season-1",
        "player-1",
        payload=UpdateSeasonPlayerStatsRequest(wins=5),
        admin_session=_admin_session(11),
        use_case=use_case,
    )
    assert response.player_guid == "player-1"
    method, payload = use_case.last_call
    assert method == "update_player_stats_for_admin"
    update = payload["update"]
    assert update.wins == FieldUpdate.set(5)
    assert update.losses == FieldUpdate.keep()
    assert update.quality_level == FieldUpdate.keep()


def test_unregister_player_from_season_success():
    use_case = _UseCaseStub()
    controller.unregister_player_from_season(
        "pena-1",
        "season-1",
        "player-1",
        admin_session=_admin_session(12),
        use_case=use_case,
    )
    assert use_case.last_call[0] == "unregister_player_for_admin"


def test_list_season_players_success_and_filter_cleaning():
    use_case = _UseCaseStub()
    response = controller.list_season_players(
        "pena-1",
        "season-1",
        page=2,
        page_size=20,
        name=" Ana ",
        surname1=" ",
        surname2=None,
        nationality=" ES ",
        nickname=" Nani ",
        position=" MID ",
        search=" text ",
        order_by="goals",
        order_dir="asc",
        use_case=use_case,
        _session=object(),
    )
    assert response.total_pages == 2
    method, payload = use_case.last_call
    assert method == "list_season_players"
    filters = payload["filters"]
    assert isinstance(filters, SeasonPlayersFilters)
    assert filters.name == "Ana"
    assert filters.surname1 is None
    assert filters.search == "text"


def test_list_season_players_maps_not_found():
    use_case = _UseCaseStub()
    use_case.error_by_method["list_season_players"] = PenaSeasonNotFoundError()
    with pytest.raises(HTTPException) as exc:
        controller.list_season_players(
            "pena-1",
            "season-x",
            page=1,
            page_size=20,
            name=None,
            surname1=None,
            surname2=None,
            nationality=None,
            nickname=None,
            position=None,
            search=None,
            order_by="quality_level",
            order_dir="desc",
            use_case=use_case,
            _session=object(),
        )
    assert exc.value.status_code == 404
    assert exc.value.detail == "Season not found"


def test_create_season_match_success():
    use_case = _UseCaseStub()
    response = controller.create_season_match(
        "pena-1",
        "season-1",
        payload=CreateSeasonMatchRequest(
            home_player_guid="p1",
            away_player_guid="p2",
            match_date=date(2025, 1, 10),
        ),
        admin_session=_admin_session(),
        use_case=use_case,
    )
    assert response.guid == "match-created"


def test_update_season_match_result_success():
    use_case = _UseCaseStub()
    response = controller.update_season_match_result(
        "pena-1",
        "season-1",
        "match-1",
        payload=UpdateSeasonMatchResultRequest(home_score=2, away_score=1),
        admin_session=_admin_session(66),
        use_case=use_case,
    )
    assert response.guid == "match-result"
    method, payload = use_case.last_call
    assert method == "update_match_result_for_admin"
    assert payload["update"].home_score == 2
    assert payload["update"].away_score == 1
    assert payload["update"].standings_policy is StandingsUpdatePolicy.APPLY


def test_update_season_match_success_and_partial_flags():
    use_case = _UseCaseStub()
    response = controller.update_season_match(
        "pena-1",
        "season-1",
        "match-1",
        payload=UpdateSeasonMatchRequest(home_team_name="Titans"),
        admin_session=_admin_session(),
        use_case=use_case,
    )
    assert response.guid == "match-updated"
    _, payload = use_case.last_call
    update = payload["update"]
    assert update.home_team_name == FieldUpdate.set("Titans")
    assert update.away_team_name == FieldUpdate.keep()


def test_create_season_match_with_lineups_success():
    use_case = _UseCaseStub()
    response = controller.create_season_match_with_lineups(
        "pena-1",
        "season-1",
        payload=CreateSeasonMatchDetailedRequest(
            match_date=date(2025, 1, 10),
            home_team=MatchTeamCreateRequest(team_name="Home", player_guids=["p1"]),
            away_team=MatchTeamCreateRequest(team_name="Away", player_guids=["p2"]),
        ),
        admin_session=_admin_session(),
        use_case=use_case,
    )
    assert response.guid == "match-detailed"


def test_update_season_match_stats_success():
    use_case = _UseCaseStub()
    response = controller.update_season_match_stats(
        "pena-1",
        "season-1",
        "match-1",
        payload=UpdateSeasonMatchStatsRequest(
            home_team=MatchTeamStatsRequest(
                players=[MatchPlayerStatsRequest(player_guid="p1", goals=2, assists=1, saves=0)]
            ),
            away_team=MatchTeamStatsRequest(
                players=[MatchPlayerStatsRequest(player_guid="p2", goals=1, assists=0, saves=0)]
            ),
        ),
        admin_session=_admin_session(),
        use_case=use_case,
    )
    assert response.guid == "match-stats"


def test_update_season_match_lineups_success():
    use_case = _UseCaseStub()
    response = controller.update_season_match_lineups(
        "pena-1",
        "season-1",
        "match-1",
        payload=UpdateSeasonMatchLineupsRequest(
            home_team=MatchTeamLineupsRequest(player_guids=["p1"]),
            away_team=MatchTeamLineupsRequest(player_guids=["p2"]),
        ),
        admin_session=_admin_session(),
        use_case=use_case,
    )
    assert response.guid == "match-lineups"


def test_update_season_match_lineups_maps_lineup_locked_error():
    use_case = _UseCaseStub()
    use_case.error_by_method["update_match_lineups_for_admin"] = SeasonMatchLineupLockedError()
    with pytest.raises(HTTPException) as exc:
        controller.update_season_match_lineups(
            "pena-1",
            "season-1",
            "match-1",
            payload=UpdateSeasonMatchLineupsRequest(
                home_team=MatchTeamLineupsRequest(player_guids=["p1"]),
                away_team=MatchTeamLineupsRequest(player_guids=["p2"]),
            ),
            admin_session=_admin_session(),
            use_case=use_case,
        )
    assert exc.value.status_code == 409
    assert exc.value.detail == "Cannot update lineups after match stats have been recorded"


def test_start_season_match_success():
    use_case = _UseCaseStub()
    response = controller.start_season_match(
        "pena-1",
        "season-1",
        "match-1",
        admin_session=_admin_session(19),
        use_case=use_case,
    )
    assert response.guid == "match-started"
    assert use_case.last_call == (
        "start_match_for_admin",
        {
            "pena_guid": "pena-1",
            "season_guid": "season-1",
            "match_guid": "match-1",
            "admin_id": 19,
        },
    )


def test_start_season_match_maps_clock_error():
    use_case = _UseCaseStub()
    use_case.error_by_method["start_match_for_admin"] = SeasonMatchAlreadyStartedError()
    with pytest.raises(HTTPException) as exc:
        controller.start_season_match(
            "pena-1",
            "season-1",
            "match-1",
            admin_session=_admin_session(),
            use_case=use_case,
        )
    assert exc.value.status_code == 409
    assert exc.value.detail == "Match tracking is already running or has already been started"


def test_start_season_match_maps_closed_report():
    use_case = _UseCaseStub()
    use_case.error_by_method["start_match_for_admin"] = SeasonMatchReportClosedError()
    with pytest.raises(HTTPException) as exc:
        controller.start_season_match(
            "pena-1",
            "season-1",
            "match-1",
            admin_session=_admin_session(),
            use_case=use_case,
        )
    assert exc.value.status_code == 409
    assert (
        exc.value.detail == "This match report is already closed and tracking cannot be restarted"
    )


def test_stop_season_match_success():
    use_case = _UseCaseStub()
    response = controller.stop_season_match(
        "pena-1",
        "season-1",
        "match-1",
        admin_session=_admin_session(20),
        use_case=use_case,
    )
    assert response.guid == "match-stopped"
    assert use_case.last_call == (
        "stop_match_for_admin",
        {
            "pena_guid": "pena-1",
            "season_guid": "season-1",
            "match_guid": "match-1",
            "admin_id": 20,
        },
    )


def test_stop_season_match_maps_clock_error():
    use_case = _UseCaseStub()
    use_case.error_by_method["stop_match_for_admin"] = SeasonMatchClockNotRunningError()
    with pytest.raises(HTTPException) as exc:
        controller.stop_season_match(
            "pena-1",
            "season-1",
            "match-1",
            admin_session=_admin_session(),
            use_case=use_case,
        )
    assert exc.value.status_code == 409
    assert exc.value.detail == "Match tracking is not currently running"


def test_create_season_match_event_success():
    use_case = _UseCaseStub()
    response = controller.create_season_match_event(
        "pena-1",
        "season-1",
        "match-1",
        payload=CreateSeasonMatchEventRequest(
            event_type="goal",
            team_side="home",
            player_guid="p1",
            related_player_guid="p2",
            note="Volley finish",
            elapsed_seconds=125,
            value_delta=-1,
        ),
        admin_session=_admin_session(21),
        use_case=use_case,
    )
    assert response.guid == "match-event-created"
    method, payload = use_case.last_call
    assert method == "create_match_event_for_admin"
    assert payload["pena_guid"] == "pena-1"
    assert payload["season_guid"] == "season-1"
    assert payload["match_guid"] == "match-1"
    assert payload["admin_id"] == 21
    assert payload["data"].event_type == "goal"
    assert payload["data"].team_side == "home"
    assert payload["data"].player_guid == "p1"
    assert payload["data"].related_player_guid == "p2"
    assert payload["data"].note == "Volley finish"
    assert payload["data"].elapsed_seconds == 125
    assert payload["data"].value_delta == -1


@pytest.mark.parametrize(
    ("error", "status_code", "detail"),
    [
        (
            SeasonMatchReportClosedError(),
            409,
            "The official match report is closed, so the timeline is read-only",
        ),
        (
            SeasonMatchClockNotRunningError(),
            409,
            "Start the match or provide a manual elapsed time before logging events",
        ),
        (
            SeasonMatchEventPlayerNotInMatchError(),
            409,
            "Event players must belong to the selected match",
        ),
    ],
)
def test_create_season_match_event_maps_domain_errors(error, status_code, detail):
    use_case = _UseCaseStub()
    use_case.error_by_method["create_match_event_for_admin"] = error
    with pytest.raises(HTTPException) as exc:
        controller.create_season_match_event(
            "pena-1",
            "season-1",
            "match-1",
            payload=CreateSeasonMatchEventRequest(
                event_type="goal",
                team_side="home",
                player_guid="p1",
            ),
            admin_session=_admin_session(),
            use_case=use_case,
        )
    assert exc.value.status_code == status_code
    assert exc.value.detail == detail


def test_delete_season_match_event_success():
    use_case = _UseCaseStub()
    response = controller.delete_season_match_event(
        "pena-1",
        "season-1",
        "match-1",
        "event-1",
        admin_session=_admin_session(22),
        use_case=use_case,
    )
    assert response.guid == "match-event-deleted"
    assert use_case.last_call == (
        "delete_match_event_for_admin",
        {
            "pena_guid": "pena-1",
            "season_guid": "season-1",
            "match_guid": "match-1",
            "event_guid": "event-1",
            "admin_id": 22,
        },
    )


def test_delete_season_match_event_maps_not_found():
    use_case = _UseCaseStub()
    use_case.error_by_method["delete_match_event_for_admin"] = SeasonMatchEventNotFoundError()
    with pytest.raises(HTTPException) as exc:
        controller.delete_season_match_event(
            "pena-1",
            "season-1",
            "match-1",
            "event-1",
            admin_session=_admin_session(),
            use_case=use_case,
        )
    assert exc.value.status_code == 404
    assert exc.value.detail == "Match event not found"


def test_delete_season_match_event_maps_closed_report():
    use_case = _UseCaseStub()
    use_case.error_by_method["delete_match_event_for_admin"] = SeasonMatchReportClosedError()
    with pytest.raises(HTTPException) as exc:
        controller.delete_season_match_event(
            "pena-1",
            "season-1",
            "match-1",
            "event-1",
            admin_session=_admin_session(),
            use_case=use_case,
        )
    assert exc.value.status_code == 409
    assert (
        exc.value.detail
        == "The official match report is closed, so timeline events cannot be removed"
    )


def test_list_season_matches_success():
    use_case = _UseCaseStub()
    response = controller.list_season_matches(
        "pena-1",
        "season-1",
        page=2,
        page_size=20,
        use_case=use_case,
        _session=object(),
    )
    assert response.total_pages == 2
    assert response.items[0].guid == "match-1"


def test_get_season_match_detail_success_and_not_found_mapping():
    use_case = _UseCaseStub()
    response = controller.get_season_match_detail(
        "pena-1",
        "season-1",
        "match-22",
        use_case=use_case,
        _session=object(),
    )
    assert response.guid == "match-22"

    use_case.error_by_method["get_match_detail"] = SeasonMatchNotFoundError()
    with pytest.raises(HTTPException) as exc:
        controller.get_season_match_detail(
            "pena-1",
            "season-1",
            "missing",
            use_case=use_case,
            _session=object(),
        )
    assert exc.value.status_code == 404
    assert exc.value.detail == "Match not found"


def test_get_match_insights_success_and_bad_request_mapping():
    use_case = _UseCaseStub()
    result = controller.get_match_insights(
        "pena-1",
        payload=MatchInsightsRequest(season_guids=["season-1"]),
        use_case=use_case,
        _session=object(),
    )
    assert result == {"matches_analyzed": 1}

    use_case.error_by_method["get_match_insights"] = InvalidSeasonInsightsDataError()
    with pytest.raises(HTTPException) as exc:
        controller.get_match_insights(
            "pena-1",
            payload=MatchInsightsRequest(season_guids=["season-1"]),
            use_case=use_case,
            _session=object(),
        )
    assert exc.value.status_code == 400
    assert exc.value.detail == "Invalid match insights request"


def test_delete_season_match_success_and_pena_not_found_mapping():
    use_case = _UseCaseStub()
    controller.delete_season_match(
        "pena-1",
        "season-1",
        "match-1",
        admin_session=_admin_session(9),
        use_case=use_case,
    )
    assert use_case.last_call[0] == "delete_match_for_admin"

    use_case.error_by_method["delete_match_for_admin"] = PenaSeasonPenaNotFoundError()
    with pytest.raises(HTTPException) as exc:
        controller.delete_season_match(
            "pena-1",
            "season-1",
            "match-1",
            admin_session=_admin_session(),
            use_case=use_case,
        )
    assert exc.value.status_code == 404
    assert exc.value.detail == "Pena not found"


def test_get_season_standings_success():
    use_case = _UseCaseStub()
    response = controller.get_season_standings(
        "pena-1",
        "season-1",
        page=1,
        page_size=10,
        use_case=use_case,
        _session=object(),
    )
    assert response.page == 1
    assert response.total == 9
    assert response.total_pages == 1


def test_create_season_match_maps_invalid_players_error():
    use_case = _UseCaseStub()
    use_case.error_by_method["create_match_for_admin"] = SeasonMatchInvalidPlayersError()
    with pytest.raises(HTTPException) as exc:
        controller.create_season_match(
            "pena-1",
            "season-1",
            payload=_match_payload(),
            admin_session=_admin_session(),
            use_case=use_case,
        )
    assert exc.value.status_code == 400
    assert exc.value.detail == "A match requires two different players"


@pytest.mark.parametrize(
    ("error", "status_code", "detail"),
    [
        (PenaSeasonPenaNotFoundError(), 404, "Pena not found"),
        (PenaSeasonNotFoundError(), 404, "Season not found"),
        (PenaSeasonAccessDeniedError(), 403, "Admin does not manage this pena"),
        (SeasonPlayerNotFoundError(), 404, "Player not found"),
        (SeasonPlayerNotInPenaError(), 409, "Player is not linked to this pena"),
    ],
)
def test_register_player_in_season_maps_domain_errors(error, status_code, detail):
    use_case = _UseCaseStub()
    use_case.error_by_method["register_player_for_admin"] = error

    with pytest.raises(HTTPException) as exc:
        controller.register_player_in_season(
            "pena-1",
            "season-1",
            payload=RegisterSeasonPlayerRequest(player_guid="player-7"),
            admin_session=_admin_session(),
            use_case=use_case,
        )

    assert exc.value.status_code == status_code
    assert exc.value.detail == detail


@pytest.mark.parametrize(
    ("error", "status_code", "detail"),
    [
        (InvalidSeasonPlayerBatchDataError(), 400, "Invalid bulk player registration data"),
        (PenaSeasonPenaNotFoundError(), 404, "Pena not found"),
        (PenaSeasonNotFoundError(), 404, "Season not found"),
        (PenaSeasonAccessDeniedError(), 403, "Admin does not manage this pena"),
        (SeasonPlayerNotFoundError(), 404, "Player not found"),
        (SeasonPlayerNotInPenaError(), 409, "Player is not linked to this pena"),
        (SeasonPlayerAlreadyRegisteredError(), 409, "Player is already registered in this season"),
    ],
)
def test_register_players_in_season_bulk_maps_domain_errors(error, status_code, detail):
    use_case = _UseCaseStub()
    use_case.error_by_method["register_players_bulk_for_admin"] = error

    with pytest.raises(HTTPException) as exc:
        controller.register_players_in_season_bulk(
            "pena-1",
            "season-1",
            payload=RegisterSeasonPlayersBulkRequest(player_guids=["player-1"]),
            admin_session=_admin_session(),
            use_case=use_case,
        )

    assert exc.value.status_code == status_code
    assert exc.value.detail == detail


@pytest.mark.parametrize(
    ("error", "status_code", "detail"),
    [
        (InvalidSeasonPlayerUpdateDataError(), 400, "Invalid season player update data"),
        (PenaSeasonPenaNotFoundError(), 404, "Pena not found"),
        (PenaSeasonNotFoundError(), 404, "Season not found"),
        (PenaSeasonAccessDeniedError(), 403, "Admin does not manage this pena"),
        (SeasonPlayerNotFoundError(), 404, "Player is not registered in this season"),
    ],
)
def test_update_season_player_stats_maps_domain_errors(error, status_code, detail):
    use_case = _UseCaseStub()
    use_case.error_by_method["update_player_stats_for_admin"] = error

    with pytest.raises(HTTPException) as exc:
        controller.update_season_player_stats(
            "pena-1",
            "season-1",
            "player-1",
            payload=UpdateSeasonPlayerStatsRequest(wins=2),
            admin_session=_admin_session(),
            use_case=use_case,
        )

    assert exc.value.status_code == status_code
    assert exc.value.detail == detail


@pytest.mark.parametrize(
    ("error", "status_code", "detail"),
    [
        (PenaSeasonPenaNotFoundError(), 404, "Pena not found"),
        (PenaSeasonNotFoundError(), 404, "Season not found"),
        (PenaSeasonAccessDeniedError(), 403, "Admin does not manage this pena"),
        (SeasonPlayerNotFoundError(), 404, "Player is not registered in this season"),
        (SeasonPlayerInMatchError(), 409, "Player already has matches in this season"),
    ],
)
def test_unregister_player_from_season_maps_domain_errors(error, status_code, detail):
    use_case = _UseCaseStub()
    use_case.error_by_method["unregister_player_for_admin"] = error

    with pytest.raises(HTTPException) as exc:
        controller.unregister_player_from_season(
            "pena-1",
            "season-1",
            "player-1",
            admin_session=_admin_session(),
            use_case=use_case,
        )

    assert exc.value.status_code == status_code
    assert exc.value.detail == detail


def test_list_season_players_sets_role_and_position_filters_for_single_values():
    use_case = _UseCaseStub()
    controller.list_season_players(
        "pena-1",
        "season-1",
        page=1,
        page_size=20,
        name=None,
        surname1=None,
        surname2=None,
        nationality=None,
        nickname=None,
        role=[" MID ", "mid"],
        position=[" GK "],
        search=None,
        order_by="quality_level",
        order_dir="desc",
        use_case=use_case,
        _session=object(),
    )

    method, payload = use_case.last_call
    assert method == "list_season_players"
    filters = payload["filters"]
    assert filters.role == "MID"
    assert filters.roles == ("MID",)
    assert filters.position == "GK"
    assert filters.positions == ("GK",)


def test_list_season_players_maps_pena_not_found():
    use_case = _UseCaseStub()
    use_case.error_by_method["list_season_players"] = PenaSeasonPenaNotFoundError()

    with pytest.raises(HTTPException) as exc:
        controller.list_season_players(
            "pena-1",
            "season-1",
            page=1,
            page_size=20,
            name=None,
            surname1=None,
            surname2=None,
            nationality=None,
            nickname=None,
            role=None,
            position=None,
            search=None,
            order_by="quality_level",
            order_dir="desc",
            use_case=use_case,
            _session=object(),
        )

    assert exc.value.status_code == 404
    assert exc.value.detail == "Pena not found"


@pytest.mark.parametrize(
    ("error", "status_code", "detail"),
    [
        (PenaSeasonPenaNotFoundError(), 404, "Pena not found"),
        (PenaSeasonNotFoundError(), 404, "Season not found"),
        (PenaSeasonAccessDeniedError(), 403, "Admin does not manage this pena"),
        (
            SeasonMatchPlayersNotInSeasonError(),
            409,
            "Both players must be registered in this season",
        ),
        (SeasonPlayerNotFoundError(), 404, "Player not found"),
    ],
)
def test_create_season_match_maps_domain_errors(error, status_code, detail):
    use_case = _UseCaseStub()
    use_case.error_by_method["create_match_for_admin"] = error

    with pytest.raises(HTTPException) as exc:
        controller.create_season_match(
            "pena-1",
            "season-1",
            payload=_match_payload(),
            admin_session=_admin_session(),
            use_case=use_case,
        )

    assert exc.value.status_code == status_code
    assert exc.value.detail == detail


@pytest.mark.parametrize(
    ("error", "status_code", "detail"),
    [
        (InvalidSeasonPlayerUpdateDataError(), 400, "Invalid match result data"),
        (
            InvalidSeasonMatchDataError(),
            400,
            "Manual match result updates are disabled. Use match stats endpoint",
        ),
        (PenaSeasonPenaNotFoundError(), 404, "Pena not found"),
        (PenaSeasonNotFoundError(), 404, "Season not found"),
        (PenaSeasonAccessDeniedError(), 403, "Admin does not manage this pena"),
        (SeasonMatchNotFoundError(), 404, "Match not found"),
    ],
)
def test_update_season_match_result_maps_domain_errors(error, status_code, detail):
    use_case = _UseCaseStub()
    use_case.error_by_method["update_match_result_for_admin"] = error

    with pytest.raises(HTTPException) as exc:
        controller.update_season_match_result(
            "pena-1",
            "season-1",
            "match-1",
            payload=UpdateSeasonMatchResultRequest(home_score=2, away_score=1),
            admin_session=_admin_session(),
            use_case=use_case,
        )

    assert exc.value.status_code == status_code
    assert exc.value.detail == detail


@pytest.mark.parametrize(
    ("error", "status_code", "detail"),
    [
        (InvalidSeasonMatchDataError(), 400, "Invalid match update data"),
        (PenaSeasonPenaNotFoundError(), 404, "Pena not found"),
        (PenaSeasonNotFoundError(), 404, "Season not found"),
        (PenaSeasonAccessDeniedError(), 403, "Admin does not manage this pena"),
        (SeasonMatchNotFoundError(), 404, "Match not found"),
    ],
)
def test_update_season_match_maps_domain_errors(error, status_code, detail):
    use_case = _UseCaseStub()
    use_case.error_by_method["update_match_for_admin"] = error

    with pytest.raises(HTTPException) as exc:
        controller.update_season_match(
            "pena-1",
            "season-1",
            "match-1",
            payload=UpdateSeasonMatchRequest(home_team_name="Titans"),
            admin_session=_admin_session(),
            use_case=use_case,
        )

    assert exc.value.status_code == status_code
    assert exc.value.detail == detail


@pytest.mark.parametrize(
    ("error", "status_code", "detail"),
    [
        (InvalidSeasonMatchDataError(), 400, "Invalid match data"),
        (PenaSeasonPenaNotFoundError(), 404, "Pena not found"),
        (PenaSeasonNotFoundError(), 404, "Season not found"),
        (PenaSeasonAccessDeniedError(), 403, "Admin does not manage this pena"),
        (SeasonMatchInvalidPlayersError(), 400, "A match cannot repeat players across lineups"),
        (
            SeasonMatchPlayersNotInSeasonError(),
            409,
            "All called-up players must be registered in this season",
        ),
        (SeasonPlayerNotFoundError(), 404, "Player not found"),
    ],
)
def test_create_season_match_with_lineups_maps_domain_errors(error, status_code, detail):
    use_case = _UseCaseStub()
    use_case.error_by_method["create_match_with_lineups_for_admin"] = error

    with pytest.raises(HTTPException) as exc:
        controller.create_season_match_with_lineups(
            "pena-1",
            "season-1",
            payload=_match_detail_payload(),
            admin_session=_admin_session(),
            use_case=use_case,
        )

    assert exc.value.status_code == status_code
    assert exc.value.detail == detail


@pytest.mark.parametrize(
    ("error", "status_code", "detail"),
    [
        (InvalidSeasonMatchDataError(), 400, "Invalid match stats data"),
        (PenaSeasonPenaNotFoundError(), 404, "Pena not found"),
        (PenaSeasonNotFoundError(), 404, "Season not found"),
        (PenaSeasonAccessDeniedError(), 403, "Admin does not manage this pena"),
        (SeasonMatchNotFoundError(), 404, "Match not found"),
        (SeasonMatchStatsMismatchError(), 409, "Stats payload must match the exact match lineup"),
    ],
)
def test_update_season_match_stats_maps_domain_errors(error, status_code, detail):
    use_case = _UseCaseStub()
    use_case.error_by_method["update_match_stats_for_admin"] = error

    with pytest.raises(HTTPException) as exc:
        controller.update_season_match_stats(
            "pena-1",
            "season-1",
            "match-1",
            payload=_match_stats_payload(),
            admin_session=_admin_session(),
            use_case=use_case,
        )

    assert exc.value.status_code == status_code
    assert exc.value.detail == detail


@pytest.mark.parametrize(
    ("error", "status_code", "detail"),
    [
        (InvalidSeasonMatchDataError(), 400, "Invalid lineup update data"),
        (PenaSeasonPenaNotFoundError(), 404, "Pena not found"),
        (PenaSeasonNotFoundError(), 404, "Season not found"),
        (PenaSeasonAccessDeniedError(), 403, "Admin does not manage this pena"),
        (SeasonMatchNotFoundError(), 404, "Match not found"),
        (SeasonMatchInvalidPlayersError(), 400, "A match cannot repeat players across lineups"),
        (
            SeasonMatchPlayersNotInSeasonError(),
            409,
            "All called-up players must be registered in this season",
        ),
        (SeasonPlayerNotFoundError(), 404, "Player not found"),
    ],
)
def test_update_season_match_lineups_maps_domain_errors(error, status_code, detail):
    use_case = _UseCaseStub()
    use_case.error_by_method["update_match_lineups_for_admin"] = error

    with pytest.raises(HTTPException) as exc:
        controller.update_season_match_lineups(
            "pena-1",
            "season-1",
            "match-1",
            payload=_lineups_payload(),
            admin_session=_admin_session(),
            use_case=use_case,
        )

    assert exc.value.status_code == status_code
    assert exc.value.detail == detail


@pytest.mark.parametrize(
    ("error", "detail"),
    [
        (PenaSeasonPenaNotFoundError(), "Pena not found"),
        (PenaSeasonNotFoundError(), "Season not found"),
    ],
)
def test_list_season_matches_maps_not_found_errors(error, detail):
    use_case = _UseCaseStub()
    use_case.error_by_method["list_season_matches"] = error

    with pytest.raises(HTTPException) as exc:
        controller.list_season_matches(
            "pena-1",
            "season-1",
            page=1,
            page_size=20,
            use_case=use_case,
            _session=object(),
        )

    assert exc.value.status_code == 404
    assert exc.value.detail == detail


@pytest.mark.parametrize(
    ("error", "detail"),
    [
        (PenaSeasonPenaNotFoundError(), "Pena not found"),
        (PenaSeasonNotFoundError(), "Season not found"),
    ],
)
def test_get_season_match_detail_maps_pena_and_season_not_found(error, detail):
    use_case = _UseCaseStub()
    use_case.error_by_method["get_match_detail"] = error

    with pytest.raises(HTTPException) as exc:
        controller.get_season_match_detail(
            "pena-1",
            "season-1",
            "match-1",
            use_case=use_case,
            _session=object(),
        )

    assert exc.value.status_code == 404
    assert exc.value.detail == detail


@pytest.mark.parametrize(
    ("error", "detail"),
    [
        (PenaSeasonPenaNotFoundError(), "Pena not found"),
        (PenaSeasonNotFoundError(), "Season not found"),
    ],
)
def test_get_match_insights_maps_not_found_errors(error, detail):
    use_case = _UseCaseStub()
    use_case.error_by_method["get_match_insights"] = error

    with pytest.raises(HTTPException) as exc:
        controller.get_match_insights(
            "pena-1",
            payload=MatchInsightsRequest(season_guids=["season-1"]),
            use_case=use_case,
            _session=object(),
        )

    assert exc.value.status_code == 404
    assert exc.value.detail == detail


@pytest.mark.parametrize(
    ("error", "status_code", "detail"),
    [
        (InvalidSeasonMatchDataError(), 400, "Invalid match operation"),
        (PenaSeasonNotFoundError(), 404, "Season not found"),
        (PenaSeasonAccessDeniedError(), 403, "Admin does not manage this pena"),
        (SeasonMatchNotFoundError(), 404, "Match not found"),
    ],
)
def test_delete_season_match_maps_domain_errors(error, status_code, detail):
    use_case = _UseCaseStub()
    use_case.error_by_method["delete_match_for_admin"] = error

    with pytest.raises(HTTPException) as exc:
        controller.delete_season_match(
            "pena-1",
            "season-1",
            "match-1",
            admin_session=_admin_session(),
            use_case=use_case,
        )

    assert exc.value.status_code == status_code
    assert exc.value.detail == detail


def test_get_season_standings_passes_cleaned_filters():
    use_case = _UseCaseStub()
    controller.get_season_standings(
        "pena-1",
        "season-1",
        page=1,
        page_size=20,
        role=[" ATA ", "ata"],
        position=[" GK "],
        use_case=use_case,
        _session=object(),
    )

    method, payload = use_case.last_call
    assert method == "get_standings"
    filters = payload["filters"]
    assert filters.role == "ATA"
    assert filters.roles == ("ATA",)
    assert filters.position == "GK"
    assert filters.positions == ("GK",)


@pytest.mark.parametrize(
    ("error", "detail"),
    [
        (PenaSeasonPenaNotFoundError(), "Pena not found"),
        (PenaSeasonNotFoundError(), "Season not found"),
    ],
)
def test_get_season_standings_maps_not_found_errors(error, detail):
    use_case = _UseCaseStub()
    use_case.error_by_method["get_standings"] = error

    with pytest.raises(HTTPException) as exc:
        controller.get_season_standings(
            "pena-1",
            "season-1",
            page=1,
            page_size=20,
            role=None,
            position=None,
            use_case=use_case,
            _session=object(),
        )

    assert exc.value.status_code == 404
    assert exc.value.detail == detail
