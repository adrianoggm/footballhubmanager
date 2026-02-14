import json
import os
import uuid
import urllib.error
import urllib.request
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

    status, active = _request("GET", f"{API_V1}/penas/{pena_guid}/seasons/active", token=admin_token)
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
