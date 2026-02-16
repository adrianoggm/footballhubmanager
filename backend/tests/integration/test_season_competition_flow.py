import json
import os
import threading
import urllib.error
import urllib.request
import uuid
from datetime import date, timedelta

API_V1 = os.getenv("TEST_API_V1", "http://127.0.0.1:8000/api/v1")


def _request(method: str, url: str, *, token: str | None = None, payload: dict | None = None):
    data = None
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    if payload is not None:
        data = json.dumps(payload).encode("utf-8")

    req = urllib.request.Request(url, method=method, headers=headers, data=data)
    try:
        with urllib.request.urlopen(req, timeout=20) as resp:
            body = resp.read().decode("utf-8")
            parsed = json.loads(body) if body else None
            return resp.status, parsed
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8")
        parsed = json.loads(body) if body else None
        return e.code, parsed


def _unique(prefix: str) -> str:
    return f"{prefix}_{uuid.uuid4().hex[:10]}"


def _register_admin():
    username = _unique("admin")
    payload = {"username": username, "password": "secret123", "name": f"Pena {username}"}
    status, data = _request("POST", f"{API_V1}/auth/admin/register", payload=payload)
    assert status == 200, data
    return data


def _register_user():
    username = _unique("user")
    payload = {
        "username": username,
        "password": "secret123",
        "name": "UserName",
        "surname1": "SurnameOne",
        "surname2": "SurnameTwo",
        "nationality": "Spain",
    }
    status, data = _request("POST", f"{API_V1}/auth/register", payload=payload)
    assert status == 200, data
    return data


def _first_pena_guid(admin_token: str) -> str:
    status, data = _request("GET", f"{API_V1}/penas", token=admin_token)
    assert status == 200, data
    return data["items"][0]["guid"]


def _player_guid_for_user(user_token: str) -> str:
    status, data = _request("GET", f"{API_V1}/players/me", token=user_token)
    assert status == 200, data
    return data["guid"]


def _link_user_to_pena(admin_token: str, pena_guid: str, user_token: str):
    status, link_data = _request(
        "POST",
        f"{API_V1}/penas/{pena_guid}/link-tokens",
        token=admin_token,
    )
    assert status == 200, link_data
    status, consume = _request(
        "POST",
        f"{API_V1}/penas/link/consume",
        token=user_token,
        payload={"token": link_data["token"], "nickname": "SeasonPlayer", "position": "CM"},
    )
    assert status == 200, consume


def _create_season(admin_token: str, pena_guid: str, *, start_date: str, end_date: str) -> str:
    status, data = _request(
        "POST",
        f"{API_V1}/penas/{pena_guid}/seasons",
        token=admin_token,
        payload={"start_date": start_date, "end_date": end_date},
    )
    assert status == 201, data
    return data["guid"]


def test_season_competition_happy_path():
    admin_auth = _register_admin()
    admin_token = admin_auth["token"]
    pena_guid = _first_pena_guid(admin_token)

    today = date.today()
    season_guid = _create_season(
        admin_token,
        pena_guid,
        start_date=(today - timedelta(days=15)).isoformat(),
        end_date=(today + timedelta(days=15)).isoformat(),
    )

    user_one = _register_user()
    user_two = _register_user()
    user_one_player_guid = _player_guid_for_user(user_one["token"])
    user_two_player_guid = _player_guid_for_user(user_two["token"])
    _link_user_to_pena(admin_token, pena_guid, user_one["token"])
    _link_user_to_pena(admin_token, pena_guid, user_two["token"])

    status, active = _request(
        "GET", f"{API_V1}/penas/{pena_guid}/seasons/active", token=admin_token
    )
    assert status == 200, active
    assert active["guid"] == season_guid

    status, first_registered = _request(
        "POST",
        f"{API_V1}/penas/{pena_guid}/seasons/{season_guid}/players",
        token=admin_token,
        payload={"player_guid": user_one_player_guid},
    )
    assert status == 201, first_registered

    status, second_registered = _request(
        "POST",
        f"{API_V1}/penas/{pena_guid}/seasons/{season_guid}/players",
        token=admin_token,
        payload={"player_guid": user_two_player_guid},
    )
    assert status == 201, second_registered

    status, listed = _request(
        "GET",
        f"{API_V1}/penas/{pena_guid}/seasons/{season_guid}/players?order_by=points&order_dir=desc",
        token=admin_token,
    )
    assert status == 200, listed
    assert listed["total"] == 2

    status, match_created = _request(
        "POST",
        f"{API_V1}/penas/{pena_guid}/seasons/{season_guid}/matches",
        token=admin_token,
        payload={
            "home_player_guid": user_one_player_guid,
            "away_player_guid": user_two_player_guid,
            "match_date": today.isoformat(),
        },
    )
    assert status == 201, match_created
    match_guid = match_created["guid"]

    status, match_updated = _request(
        "PATCH",
        f"{API_V1}/penas/{pena_guid}/seasons/{season_guid}/matches/{match_guid}/result",
        token=admin_token,
        payload={"home_score": 2, "away_score": 1},
    )
    assert status == 200, match_updated
    assert match_updated["home_score"] == 2
    assert match_updated["away_score"] == 1

    status, standings = _request(
        "GET",
        f"{API_V1}/penas/{pena_guid}/seasons/{season_guid}/standings",
        token=admin_token,
    )
    assert status == 200, standings
    assert standings["items"][0]["player_guid"] == user_one_player_guid
    assert standings["items"][0]["points"] == 3


def test_season_competition_negative_and_edge_cases():
    admin_auth = _register_admin()
    admin_token = admin_auth["token"]
    pena_guid = _first_pena_guid(admin_token)

    status, invalid_season = _request(
        "POST",
        f"{API_V1}/penas/{pena_guid}/seasons",
        token=admin_token,
        payload={"start_date": "2025-12-31", "end_date": "2025-01-01"},
    )
    assert status == 400, invalid_season
    assert invalid_season["detail"] == "Invalid season date range"

    season_guid = _create_season(
        admin_token,
        pena_guid,
        start_date="2025-01-01",
        end_date="2025-12-31",
    )

    status, overlap = _request(
        "POST",
        f"{API_V1}/penas/{pena_guid}/seasons",
        token=admin_token,
        payload={"start_date": "2025-06-01", "end_date": "2026-01-01"},
    )
    assert status == 409, overlap
    assert overlap["detail"] == "Season range overlaps an existing season"

    user = _register_user()
    player_guid = _player_guid_for_user(user["token"])
    _link_user_to_pena(admin_token, pena_guid, user["token"])

    status, registered = _request(
        "POST",
        f"{API_V1}/penas/{pena_guid}/seasons/{season_guid}/players",
        token=admin_token,
        payload={"player_guid": player_guid},
    )
    assert status == 201, registered

    status, duplicate = _request(
        "POST",
        f"{API_V1}/penas/{pena_guid}/seasons/{season_guid}/players",
        token=admin_token,
        payload={"player_guid": player_guid},
    )
    assert status == 409, duplicate
    assert duplicate["detail"] == "Player is already registered in this season"

    status, empty_patch = _request(
        "PATCH",
        f"{API_V1}/penas/{pena_guid}/seasons/{season_guid}/players/{player_guid}",
        token=admin_token,
        payload={},
    )
    assert status == 400, empty_patch
    assert empty_patch["detail"] == "Invalid season player update data"

    status, bad_match = _request(
        "POST",
        f"{API_V1}/penas/{pena_guid}/seasons/{season_guid}/matches",
        token=admin_token,
        payload={
            "home_player_guid": player_guid,
            "away_player_guid": player_guid,
            "match_date": "2025-05-01",
        },
    )
    assert status == 400, bad_match
    assert bad_match["detail"] == "A match requires two different players"

    status, no_active = _request(
        "GET",
        f"{API_V1}/penas/{pena_guid}/seasons/active?at_date=2027-01-01",
        token=admin_token,
    )
    assert status == 404, no_active
    assert no_active["detail"] == "Active season not found"


def test_season_competition_concurrent_single_player_registration_returns_conflict_not_500():
    admin_auth = _register_admin()
    admin_token = admin_auth["token"]
    pena_guid = _first_pena_guid(admin_token)

    today = date.today()
    season_guid = _create_season(
        admin_token,
        pena_guid,
        start_date=(today - timedelta(days=15)).isoformat(),
        end_date=(today + timedelta(days=15)).isoformat(),
    )

    user = _register_user()
    player_guid = _player_guid_for_user(user["token"])
    _link_user_to_pena(admin_token, pena_guid, user["token"])

    barrier = threading.Barrier(2)
    results: list[tuple[int, dict | None]] = []
    errors: list[Exception] = []
    lock = threading.Lock()

    def _register_once():
        try:
            barrier.wait(timeout=10)
            result = _request(
                "POST",
                f"{API_V1}/penas/{pena_guid}/seasons/{season_guid}/players",
                token=admin_token,
                payload={"player_guid": player_guid},
            )
            with lock:
                results.append(result)
        except Exception as exc:  # pragma: no cover - defensive in integration race
            with lock:
                errors.append(exc)

    t1 = threading.Thread(target=_register_once)
    t2 = threading.Thread(target=_register_once)
    t1.start()
    t2.start()
    t1.join(timeout=20)
    t2.join(timeout=20)

    assert not errors, errors
    assert len(results) == 2, results

    statuses = sorted(status for status, _ in results)
    assert statuses == [201, 409], results
    assert all(status < 500 for status, _ in results), results

    status, listed = _request(
        "GET",
        f"{API_V1}/penas/{pena_guid}/seasons/{season_guid}/players?page_size=20",
        token=admin_token,
    )
    assert status == 200, listed
    assert listed["total"] == 1, listed
    assert listed["items"][0]["player_guid"] == player_guid, listed


def test_season_competition_concurrent_bulk_registration_returns_conflict_not_500():
    admin_auth = _register_admin()
    admin_token = admin_auth["token"]
    pena_guid = _first_pena_guid(admin_token)

    today = date.today()
    season_guid = _create_season(
        admin_token,
        pena_guid,
        start_date=(today - timedelta(days=15)).isoformat(),
        end_date=(today + timedelta(days=15)).isoformat(),
    )

    user_one = _register_user()
    user_two = _register_user()
    player_one_guid = _player_guid_for_user(user_one["token"])
    player_two_guid = _player_guid_for_user(user_two["token"])
    _link_user_to_pena(admin_token, pena_guid, user_one["token"])
    _link_user_to_pena(admin_token, pena_guid, user_two["token"])

    payload = {"player_guids": [player_one_guid, player_two_guid]}

    barrier = threading.Barrier(2)
    results: list[tuple[int, dict | None]] = []
    errors: list[Exception] = []
    lock = threading.Lock()

    def _register_bulk_once():
        try:
            barrier.wait(timeout=10)
            result = _request(
                "POST",
                f"{API_V1}/penas/{pena_guid}/seasons/{season_guid}/players/bulk",
                token=admin_token,
                payload=payload,
            )
            with lock:
                results.append(result)
        except Exception as exc:  # pragma: no cover - defensive in integration race
            with lock:
                errors.append(exc)

    t1 = threading.Thread(target=_register_bulk_once)
    t2 = threading.Thread(target=_register_bulk_once)
    t1.start()
    t2.start()
    t1.join(timeout=20)
    t2.join(timeout=20)

    assert not errors, errors
    assert len(results) == 2, results

    statuses = sorted(status for status, _ in results)
    assert statuses == [201, 409], results
    assert all(status < 500 for status, _ in results), results

    status, listed = _request(
        "GET",
        f"{API_V1}/penas/{pena_guid}/seasons/{season_guid}/players?page_size=20",
        token=admin_token,
    )
    assert status == 200, listed
    assert listed["total"] == 2, listed
    listed_guids = {item["player_guid"] for item in listed["items"]}
    assert listed_guids == {player_one_guid, player_two_guid}, listed


def test_season_competition_access_control():
    owner_admin = _register_admin()
    owner_token = owner_admin["token"]
    pena_guid = _first_pena_guid(owner_token)
    season_guid = _create_season(
        owner_token,
        pena_guid,
        start_date="2025-01-01",
        end_date="2025-12-31",
    )

    user = _register_user()
    user_player_guid = _player_guid_for_user(user["token"])
    _link_user_to_pena(owner_token, pena_guid, user["token"])

    status, read_ok = _request(
        "GET",
        f"{API_V1}/penas/{pena_guid}/seasons/{season_guid}/players",
        token=user["token"],
    )
    assert status == 200, read_ok

    status, create_denied = _request(
        "POST",
        f"{API_V1}/penas/{pena_guid}/seasons/{season_guid}/players",
        token=user["token"],
        payload={"player_guid": user_player_guid},
    )
    assert status == 403, create_denied
    assert create_denied["detail"] == "Admin access required"

    foreign_admin = _register_admin()
    status, foreign_denied = _request(
        "POST",
        f"{API_V1}/penas/{pena_guid}/seasons/{season_guid}/players",
        token=foreign_admin["token"],
        payload={"player_guid": user_player_guid},
    )
    assert status == 403, foreign_denied
    assert foreign_denied["detail"] == "Admin does not manage this pena"


def test_season_competition_detailed_match_access_control():
    owner_admin = _register_admin()
    owner_token = owner_admin["token"]
    pena_guid = _first_pena_guid(owner_token)
    today = date.today()
    season_guid = _create_season(
        owner_token,
        pena_guid,
        start_date=(today - timedelta(days=20)).isoformat(),
        end_date=(today + timedelta(days=20)).isoformat(),
    )

    member_user = _register_user()
    second_user = _register_user()
    outsider_user = _register_user()
    foreign_admin = _register_admin()

    member_player_guid = _player_guid_for_user(member_user["token"])
    second_player_guid = _player_guid_for_user(second_user["token"])

    _link_user_to_pena(owner_token, pena_guid, member_user["token"])
    _link_user_to_pena(owner_token, pena_guid, second_user["token"])

    for player_guid in (member_player_guid, second_player_guid):
        status, registered = _request(
            "POST",
            f"{API_V1}/penas/{pena_guid}/seasons/{season_guid}/players",
            token=owner_token,
            payload={"player_guid": player_guid},
        )
        assert status == 201, registered

    status, created = _request(
        "POST",
        f"{API_V1}/penas/{pena_guid}/seasons/{season_guid}/matches/detailed",
        token=owner_token,
        payload={
            "match_date": today.isoformat(),
            "home_team": {"team_name": "Home XI", "player_guids": [member_player_guid]},
            "away_team": {"team_name": "Away XI", "player_guids": [second_player_guid]},
        },
    )
    assert status == 201, created
    match_guid = created["guid"]

    stats_payload = {
        "home_team": {
            "players": [
                {
                    "player_guid": member_player_guid,
                    "goals": 1,
                    "assists": 0,
                    "saves": 0,
                    "rating": 7.5,
                }
            ]
        },
        "away_team": {
            "players": [
                {
                    "player_guid": second_player_guid,
                    "goals": 0,
                    "assists": 0,
                    "saves": 1,
                    "rating": 6.8,
                }
            ]
        },
    }

    status, member_create_denied = _request(
        "POST",
        f"{API_V1}/penas/{pena_guid}/seasons/{season_guid}/matches/detailed",
        token=member_user["token"],
        payload={
            "match_date": today.isoformat(),
            "home_team": {"team_name": "User Home", "player_guids": [member_player_guid]},
            "away_team": {"team_name": "User Away", "player_guids": [second_player_guid]},
        },
    )
    assert status == 403, member_create_denied
    assert member_create_denied["detail"] == "Admin access required"

    status, foreign_create_denied = _request(
        "POST",
        f"{API_V1}/penas/{pena_guid}/seasons/{season_guid}/matches/detailed",
        token=foreign_admin["token"],
        payload={
            "match_date": today.isoformat(),
            "home_team": {"team_name": "Foreign Home", "player_guids": [member_player_guid]},
            "away_team": {"team_name": "Foreign Away", "player_guids": [second_player_guid]},
        },
    )
    assert status == 403, foreign_create_denied
    assert foreign_create_denied["detail"] == "Admin does not manage this pena"

    status, member_patch_denied = _request(
        "PATCH",
        f"{API_V1}/penas/{pena_guid}/seasons/{season_guid}/matches/{match_guid}/stats",
        token=member_user["token"],
        payload=stats_payload,
    )
    assert status == 403, member_patch_denied
    assert member_patch_denied["detail"] == "Admin access required"

    status, foreign_patch_denied = _request(
        "PATCH",
        f"{API_V1}/penas/{pena_guid}/seasons/{season_guid}/matches/{match_guid}/stats",
        token=foreign_admin["token"],
        payload=stats_payload,
    )
    assert status == 403, foreign_patch_denied
    assert foreign_patch_denied["detail"] == "Admin does not manage this pena"

    status, member_list = _request(
        "GET",
        f"{API_V1}/penas/{pena_guid}/seasons/{season_guid}/matches",
        token=member_user["token"],
    )
    assert status == 200, member_list
    assert any(item["guid"] == match_guid for item in member_list["items"])

    status, member_detail = _request(
        "GET",
        f"{API_V1}/penas/{pena_guid}/seasons/{season_guid}/matches/{match_guid}",
        token=member_user["token"],
    )
    assert status == 200, member_detail
    assert member_detail["guid"] == match_guid

    status, foreign_list_denied = _request(
        "GET",
        f"{API_V1}/penas/{pena_guid}/seasons/{season_guid}/matches",
        token=foreign_admin["token"],
    )
    assert status == 403, foreign_list_denied
    assert foreign_list_denied["detail"] == "Admin does not manage this pena"

    status, foreign_detail_denied = _request(
        "GET",
        f"{API_V1}/penas/{pena_guid}/seasons/{season_guid}/matches/{match_guid}",
        token=foreign_admin["token"],
    )
    assert status == 403, foreign_detail_denied
    assert foreign_detail_denied["detail"] == "Admin does not manage this pena"

    status, outsider_list_denied = _request(
        "GET",
        f"{API_V1}/penas/{pena_guid}/seasons/{season_guid}/matches",
        token=outsider_user["token"],
    )
    assert status == 403, outsider_list_denied
    assert outsider_list_denied["detail"] == "User does not belong to this pena"

    status, outsider_detail_denied = _request(
        "GET",
        f"{API_V1}/penas/{pena_guid}/seasons/{season_guid}/matches/{match_guid}",
        token=outsider_user["token"],
    )
    assert status == 403, outsider_detail_denied
    assert outsider_detail_denied["detail"] == "User does not belong to this pena"


def test_season_competition_detailed_match_happy_path():
    admin_auth = _register_admin()
    admin_token = admin_auth["token"]
    pena_guid = _first_pena_guid(admin_token)

    today = date.today()
    season_guid = _create_season(
        admin_token,
        pena_guid,
        start_date=(today - timedelta(days=30)).isoformat(),
        end_date=(today + timedelta(days=30)).isoformat(),
    )

    users = [_register_user() for _ in range(4)]
    player_guids: list[str] = []
    for user in users:
        player_guid = _player_guid_for_user(user["token"])
        _link_user_to_pena(admin_token, pena_guid, user["token"])
        status, registered = _request(
            "POST",
            f"{API_V1}/penas/{pena_guid}/seasons/{season_guid}/players",
            token=admin_token,
            payload={"player_guid": player_guid},
        )
        assert status == 201, registered
        player_guids.append(player_guid)

    home_players = player_guids[:2]
    away_players = player_guids[2:]

    status, created = _request(
        "POST",
        f"{API_V1}/penas/{pena_guid}/seasons/{season_guid}/matches/detailed",
        token=admin_token,
        payload={
            "match_date": today.isoformat(),
            "home_team": {"team_name": "Red Lions", "player_guids": home_players},
            "away_team": {"team_name": "Blue Sharks", "player_guids": away_players},
        },
    )
    assert status == 201, created
    assert created["home_team"]["team_name"] == "Red Lions"
    assert created["away_team"]["team_name"] == "Blue Sharks"
    assert created["home_team"]["score"] == 0
    assert created["away_team"]["score"] == 0
    assert len(created["home_team"]["players"]) == 2
    assert len(created["away_team"]["players"]) == 2
    match_guid = created["guid"]

    status, updated = _request(
        "PATCH",
        f"{API_V1}/penas/{pena_guid}/seasons/{season_guid}/matches/{match_guid}/stats",
        token=admin_token,
        payload={
            "home_team": {
                "players": [
                    {
                        "player_guid": home_players[0],
                        "goals": 2,
                        "assists": 1,
                        "saves": 0,
                        "rating": 8.4,
                    },
                    {
                        "player_guid": home_players[1],
                        "goals": 1,
                        "assists": 1,
                        "saves": 1,
                        "rating": 7.6,
                    },
                ]
            },
            "away_team": {
                "players": [
                    {
                        "player_guid": away_players[0],
                        "goals": 1,
                        "assists": 0,
                        "saves": 2,
                        "rating": 7.0,
                    },
                    {
                        "player_guid": away_players[1],
                        "goals": 0,
                        "assists": 0,
                        "saves": 1,
                        "rating": 6.4,
                    },
                ]
            },
        },
    )
    assert status == 200, updated
    assert updated["home_team"]["score"] == 3
    assert updated["away_team"]["score"] == 1
    assert updated["home_team"]["total_assists"] == 2
    assert updated["away_team"]["total_saves"] == 3

    status, matches = _request(
        "GET",
        f"{API_V1}/penas/{pena_guid}/seasons/{season_guid}/matches",
        token=admin_token,
    )
    assert status == 200, matches
    assert matches["total"] >= 1
    assert any(item["guid"] == match_guid for item in matches["items"])

    status, detail = _request(
        "GET",
        f"{API_V1}/penas/{pena_guid}/seasons/{season_guid}/matches/{match_guid}",
        token=admin_token,
    )
    assert status == 200, detail
    assert detail["guid"] == match_guid
    assert detail["home_team"]["score"] == 3
    assert detail["away_team"]["score"] == 1
    assert len(detail["home_team"]["players"]) == 2
    assert len(detail["away_team"]["players"]) == 2

    status, standings = _request(
        "GET",
        f"{API_V1}/penas/{pena_guid}/seasons/{season_guid}/standings?page_size=20",
        token=admin_token,
    )
    assert status == 200, standings
    points_by_player = {item["player_guid"]: item["points"] for item in standings["items"]}
    assert points_by_player[home_players[0]] == 3
    assert points_by_player[home_players[1]] == 3
    assert points_by_player[away_players[0]] == 0
    assert points_by_player[away_players[1]] == 0


def test_season_competition_detailed_match_stats_mismatch():
    admin_auth = _register_admin()
    admin_token = admin_auth["token"]
    pena_guid = _first_pena_guid(admin_token)

    today = date.today()
    season_guid = _create_season(
        admin_token,
        pena_guid,
        start_date=(today - timedelta(days=30)).isoformat(),
        end_date=(today + timedelta(days=30)).isoformat(),
    )

    user_one = _register_user()
    user_two = _register_user()
    player_one = _player_guid_for_user(user_one["token"])
    player_two = _player_guid_for_user(user_two["token"])
    _link_user_to_pena(admin_token, pena_guid, user_one["token"])
    _link_user_to_pena(admin_token, pena_guid, user_two["token"])

    status, first_registered = _request(
        "POST",
        f"{API_V1}/penas/{pena_guid}/seasons/{season_guid}/players",
        token=admin_token,
        payload={"player_guid": player_one},
    )
    assert status == 201, first_registered
    status, second_registered = _request(
        "POST",
        f"{API_V1}/penas/{pena_guid}/seasons/{season_guid}/players",
        token=admin_token,
        payload={"player_guid": player_two},
    )
    assert status == 201, second_registered

    status, created = _request(
        "POST",
        f"{API_V1}/penas/{pena_guid}/seasons/{season_guid}/matches/detailed",
        token=admin_token,
        payload={
            "match_date": today.isoformat(),
            "home_team": {"team_name": "Red", "player_guids": [player_one]},
            "away_team": {"team_name": "Blue", "player_guids": [player_two]},
        },
    )
    assert status == 201, created
    match_guid = created["guid"]

    status, mismatch = _request(
        "PATCH",
        f"{API_V1}/penas/{pena_guid}/seasons/{season_guid}/matches/{match_guid}/stats",
        token=admin_token,
        payload={
            "home_team": {
                "players": [
                    {
                        "player_guid": "not-in-lineup-guid",
                        "goals": 1,
                        "assists": 0,
                        "saves": 0,
                        "rating": 7.0,
                    }
                ]
            },
            "away_team": {
                "players": [
                    {
                        "player_guid": player_two,
                        "goals": 0,
                        "assists": 0,
                        "saves": 0,
                        "rating": 6.5,
                    }
                ]
            },
        },
    )
    assert status == 409, mismatch
    assert mismatch["detail"] == "Stats payload must match the exact match lineup"


def test_season_competition_bulk_register_and_unregister_player():
    admin_auth = _register_admin()
    admin_token = admin_auth["token"]
    pena_guid = _first_pena_guid(admin_token)

    today = date.today()
    season_guid = _create_season(
        admin_token,
        pena_guid,
        start_date=(today - timedelta(days=30)).isoformat(),
        end_date=(today + timedelta(days=30)).isoformat(),
    )

    users = [_register_user() for _ in range(3)]
    player_guids: list[str] = []
    for user in users:
        player_guid = _player_guid_for_user(user["token"])
        _link_user_to_pena(admin_token, pena_guid, user["token"])
        player_guids.append(player_guid)

    status, bulk_registered = _request(
        "POST",
        f"{API_V1}/penas/{pena_guid}/seasons/{season_guid}/players/bulk",
        token=admin_token,
        payload={"player_guids": player_guids},
    )
    assert status == 201, bulk_registered
    assert bulk_registered["total_registered"] == 3
    assert len(bulk_registered["items"]) == 3

    status, removed = _request(
        "DELETE",
        f"{API_V1}/penas/{pena_guid}/seasons/{season_guid}/players/{player_guids[2]}",
        token=admin_token,
    )
    assert status == 204, removed

    status, listed = _request(
        "GET",
        f"{API_V1}/penas/{pena_guid}/seasons/{season_guid}/players?page_size=20",
        token=admin_token,
    )
    assert status == 200, listed
    assert listed["total"] == 2

    status, created_match = _request(
        "POST",
        f"{API_V1}/penas/{pena_guid}/seasons/{season_guid}/matches/detailed",
        token=admin_token,
        payload={
            "match_date": today.isoformat(),
            "home_team": {"team_name": "Home", "player_guids": [player_guids[0]]},
            "away_team": {"team_name": "Away", "player_guids": [player_guids[1]]},
        },
    )
    assert status == 201, created_match

    status, in_match = _request(
        "DELETE",
        f"{API_V1}/penas/{pena_guid}/seasons/{season_guid}/players/{player_guids[0]}",
        token=admin_token,
    )
    assert status == 409, in_match
    assert in_match["detail"] == "Player already has matches in this season"


def test_season_competition_update_lineups_and_delete_match():
    admin_auth = _register_admin()
    admin_token = admin_auth["token"]
    pena_guid = _first_pena_guid(admin_token)

    today = date.today()
    season_guid = _create_season(
        admin_token,
        pena_guid,
        start_date=(today - timedelta(days=30)).isoformat(),
        end_date=(today + timedelta(days=30)).isoformat(),
    )

    users = [_register_user() for _ in range(4)]
    player_guids: list[str] = []
    for user in users:
        player_guid = _player_guid_for_user(user["token"])
        _link_user_to_pena(admin_token, pena_guid, user["token"])
        player_guids.append(player_guid)

    status, bulk_registered = _request(
        "POST",
        f"{API_V1}/penas/{pena_guid}/seasons/{season_guid}/players/bulk",
        token=admin_token,
        payload={"player_guids": player_guids},
    )
    assert status == 201, bulk_registered

    status, created = _request(
        "POST",
        f"{API_V1}/penas/{pena_guid}/seasons/{season_guid}/matches/detailed",
        token=admin_token,
        payload={
            "match_date": today.isoformat(),
            "home_team": {"team_name": "Initial Home", "player_guids": player_guids[:2]},
            "away_team": {"team_name": "Initial Away", "player_guids": player_guids[2:]},
        },
    )
    assert status == 201, created
    match_guid = created["guid"]

    status, updated_match = _request(
        "PATCH",
        f"{API_V1}/penas/{pena_guid}/seasons/{season_guid}/matches/{match_guid}",
        token=admin_token,
        payload={
            "match_date": (today - timedelta(days=1)).isoformat(),
            "home_team_name": "Edited Home",
            "away_team_name": "Edited Away",
        },
    )
    assert status == 200, updated_match
    assert updated_match["home_team"]["team_name"] == "Edited Home"
    assert updated_match["away_team"]["team_name"] == "Edited Away"

    new_home = [player_guids[0], player_guids[2]]
    new_away = [player_guids[1], player_guids[3]]
    status, updated_lineups = _request(
        "PATCH",
        f"{API_V1}/penas/{pena_guid}/seasons/{season_guid}/matches/{match_guid}/lineups",
        token=admin_token,
        payload={
            "home_team": {"player_guids": new_home},
            "away_team": {"player_guids": new_away},
        },
    )
    assert status == 200, updated_lineups
    assert {item["player_guid"] for item in updated_lineups["home_team"]["players"]} == set(
        new_home
    )
    assert {item["player_guid"] for item in updated_lineups["away_team"]["players"]} == set(
        new_away
    )

    status, stats_updated = _request(
        "PATCH",
        f"{API_V1}/penas/{pena_guid}/seasons/{season_guid}/matches/{match_guid}/stats",
        token=admin_token,
        payload={
            "home_team": {
                "players": [
                    {
                        "player_guid": new_home[0],
                        "goals": 2,
                        "assists": 1,
                        "saves": 0,
                        "rating": 8.0,
                    },
                    {
                        "player_guid": new_home[1],
                        "goals": 0,
                        "assists": 0,
                        "saves": 1,
                        "rating": 7.0,
                    },
                ]
            },
            "away_team": {
                "players": [
                    {
                        "player_guid": new_away[0],
                        "goals": 1,
                        "assists": 0,
                        "saves": 0,
                        "rating": 7.0,
                    },
                    {
                        "player_guid": new_away[1],
                        "goals": 0,
                        "assists": 0,
                        "saves": 1,
                        "rating": 6.0,
                    },
                ]
            },
        },
    )
    assert status == 200, stats_updated
    assert stats_updated["home_team"]["score"] == 2
    assert stats_updated["away_team"]["score"] == 1

    status, locked = _request(
        "PATCH",
        f"{API_V1}/penas/{pena_guid}/seasons/{season_guid}/matches/{match_guid}/lineups",
        token=admin_token,
        payload={
            "home_team": {"player_guids": player_guids[:2]},
            "away_team": {"player_guids": player_guids[2:]},
        },
    )
    assert status == 409, locked
    assert locked["detail"] == "Cannot update lineups after match stats have been recorded"

    status, deleted = _request(
        "DELETE",
        f"{API_V1}/penas/{pena_guid}/seasons/{season_guid}/matches/{match_guid}",
        token=admin_token,
    )
    assert status == 204, deleted

    status, deleted_detail = _request(
        "GET",
        f"{API_V1}/penas/{pena_guid}/seasons/{season_guid}/matches/{match_guid}",
        token=admin_token,
    )
    assert status == 404, deleted_detail
    assert deleted_detail["detail"] == "Match not found"

    status, standings = _request(
        "GET",
        f"{API_V1}/penas/{pena_guid}/seasons/{season_guid}/standings?page_size=20",
        token=admin_token,
    )
    assert status == 200, standings
    points_by_player = {item["player_guid"]: item["points"] for item in standings["items"]}
    assert points_by_player[new_home[0]] == 0
    assert points_by_player[new_home[1]] == 0
    assert points_by_player[new_away[0]] == 0
    assert points_by_player[new_away[1]] == 0
