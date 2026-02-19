import json
import os
import urllib.error
import urllib.request
import uuid
from datetime import date, timedelta

API_ROOT = os.getenv("TEST_API_ROOT", "http://127.0.0.1:8000/api")
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
    return data, payload


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
    return data, payload


def _player_guid_for_user(token: str) -> str:
    status, data = _request("GET", f"{API_V1}/players/me", token=token)
    assert status == 200, data
    return data["guid"]


def test_health_and_nationalities_catalog_available():
    status, data = _request("GET", f"{API_ROOT}/")
    assert status == 200
    assert data["status"] == "ok"

    status, data = _request("GET", f"{API_V1}/catalogs/nationalities")
    assert status == 200
    assert isinstance(data, list)
    assert "Spain" in data


def test_admin_register_creates_default_pena():
    admin_auth, admin_payload = _register_admin()
    status, penas = _request("GET", f"{API_V1}/penas", token=admin_auth["token"])

    assert status == 200
    assert penas["total"] >= 1
    assert any(item["name"] == admin_payload["name"] for item in penas["items"])


def test_link_token_happy_path_end_to_end():
    admin_auth, _ = _register_admin()
    status, penas = _request("GET", f"{API_V1}/penas", token=admin_auth["token"])
    assert status == 200
    pena_guid = penas["items"][0]["guid"]

    status, link = _request(
        "POST", f"{API_V1}/penas/{pena_guid}/link-tokens", token=admin_auth["token"]
    )
    assert status == 200
    token = link["token"]

    user_auth, user_payload = _register_user()
    status, consume = _request(
        "POST",
        f"{API_V1}/penas/link/consume",
        token=user_auth["token"],
        payload={"token": token, "nickname": "Killer", "position": "GK"},
    )
    assert status == 200, consume

    status, players = _request(
        "GET", f"{API_V1}/penas/{pena_guid}/players", token=admin_auth["token"]
    )
    assert status == 200
    assert any(
        p["name"] == user_payload["name"] and p["nickname"] == "Killer" and p["position"] == "GK"
        for p in players["items"]
    )


def test_link_token_invalid_token_returns_400():
    user_auth, _ = _register_user()
    status, data = _request(
        "POST",
        f"{API_V1}/penas/link/consume",
        token=user_auth["token"],
        payload={"token": "invalid-token", "nickname": "Killer", "position": "GK"},
    )
    assert status == 400
    assert data["detail"] == "Invalid or expired link token"


def test_admin_can_create_and_query_pena_seasons():
    admin_auth, _ = _register_admin()
    status, penas = _request("GET", f"{API_V1}/penas", token=admin_auth["token"])
    assert status == 200, penas
    pena_guid = penas["items"][0]["guid"]
    today = date.today()
    start = (today - timedelta(days=10)).isoformat()
    end = (today + timedelta(days=10)).isoformat()

    status, created = _request(
        "POST",
        f"{API_V1}/penas/{pena_guid}/seasons",
        token=admin_auth["token"],
        payload={"start_date": start, "end_date": end},
    )
    assert status == 201, created
    season_guid = created["guid"]

    status, listing = _request(
        "GET", f"{API_V1}/penas/{pena_guid}/seasons", token=admin_auth["token"]
    )
    assert status == 200, listing
    assert any(item["guid"] == season_guid for item in listing["items"])

    status, detail = _request(
        "GET",
        f"{API_V1}/penas/{pena_guid}/seasons/{season_guid}",
        token=admin_auth["token"],
    )
    assert status == 200, detail
    assert detail["guid"] == season_guid

    status, active = _request(
        "GET",
        f"{API_V1}/penas/{pena_guid}/seasons/active",
        token=admin_auth["token"],
    )
    assert status == 200, active
    assert active["guid"] == season_guid

    new_end = (today + timedelta(days=20)).isoformat()
    status, updated = _request(
        "PATCH",
        f"{API_V1}/penas/{pena_guid}/seasons/{season_guid}",
        token=admin_auth["token"],
        payload={"end_date": new_end},
    )
    assert status == 200, updated
    assert updated["end_date"] == new_end

    status, _ = _request(
        "DELETE",
        f"{API_V1}/penas/{pena_guid}/seasons/{season_guid}",
        token=admin_auth["token"],
    )
    assert status == 204

    status, deleted_detail = _request(
        "GET",
        f"{API_V1}/penas/{pena_guid}/seasons/{season_guid}",
        token=admin_auth["token"],
    )
    assert status == 404, deleted_detail


def test_membership_user_can_update_get_status_and_leave():
    admin_auth, _ = _register_admin()
    status, penas = _request("GET", f"{API_V1}/penas", token=admin_auth["token"])
    assert status == 200, penas
    pena_guid = penas["items"][0]["guid"]

    status, link = _request(
        "POST", f"{API_V1}/penas/{pena_guid}/link-tokens", token=admin_auth["token"]
    )
    assert status == 200, link

    user_auth, _ = _register_user()
    status, consume = _request(
        "POST",
        f"{API_V1}/penas/link/consume",
        token=user_auth["token"],
        payload={"token": link["token"], "nickname": "Before", "position": "GK"},
    )
    assert status == 200, consume

    status, updated = _request(
        "PATCH",
        f"{API_V1}/penas/{pena_guid}/players/me",
        token=user_auth["token"],
        payload={"nickname": "After", "position": "CM"},
    )
    assert status == 200, updated
    assert updated["nickname"] == "After"
    assert updated["position"] == "CM"
    assert updated["role"] == "member"

    status, mine = _request(
        "GET", f"{API_V1}/players/me/penas/{pena_guid}", token=user_auth["token"]
    )
    assert status == 200, mine
    assert mine["nickname"] == "After"
    assert mine["position"] == "CM"

    status, _ = _request(
        "DELETE", f"{API_V1}/penas/{pena_guid}/players/me", token=user_auth["token"]
    )
    assert status == 204

    status, mine_after = _request(
        "GET", f"{API_V1}/players/me/penas/{pena_guid}", token=user_auth["token"]
    )
    assert status == 403, mine_after
    assert mine_after["detail"] == "User does not belong to this pena"


def test_membership_admin_can_update_get_and_remove_player():
    admin_auth, _ = _register_admin()
    status, penas = _request("GET", f"{API_V1}/penas", token=admin_auth["token"])
    assert status == 200, penas
    pena_guid = penas["items"][0]["guid"]

    status, link = _request(
        "POST", f"{API_V1}/penas/{pena_guid}/link-tokens", token=admin_auth["token"]
    )
    assert status == 200, link

    user_auth, _ = _register_user()
    player_guid = _player_guid_for_user(user_auth["token"])
    status, consume = _request(
        "POST",
        f"{API_V1}/penas/link/consume",
        token=user_auth["token"],
        payload={"token": link["token"], "nickname": "UserNick", "position": "ST"},
    )
    assert status == 200, consume

    status, updated = _request(
        "PATCH",
        f"{API_V1}/penas/{pena_guid}/players/{player_guid}",
        token=admin_auth["token"],
        payload={"nickname": "AdminNick", "position": "RW"},
    )
    assert status == 200, updated
    assert updated["nickname"] == "AdminNick"
    assert updated["position"] == "RW"

    status, detail = _request(
        "GET",
        f"{API_V1}/penas/{pena_guid}/players/{player_guid}",
        token=admin_auth["token"],
    )
    assert status == 200, detail
    assert detail["nickname"] == "AdminNick"
    assert detail["position"] == "RW"

    status, _ = _request(
        "DELETE",
        f"{API_V1}/penas/{pena_guid}/players/{player_guid}",
        token=admin_auth["token"],
    )
    assert status == 204

    status, data = _request(
        "DELETE",
        f"{API_V1}/penas/{pena_guid}/players/{player_guid}",
        token=admin_auth["token"],
    )
    assert status == 409, data
    assert data["detail"] == "Player is not linked to this pena"


def test_admin_can_create_guest_player_and_register_in_active_season():
    admin_auth, _ = _register_admin()
    status, penas = _request("GET", f"{API_V1}/penas", token=admin_auth["token"])
    assert status == 200, penas
    pena_guid = penas["items"][0]["guid"]

    today = date.today()
    start = (today - timedelta(days=7)).isoformat()
    end = (today + timedelta(days=30)).isoformat()
    status, season = _request(
        "POST",
        f"{API_V1}/penas/{pena_guid}/seasons",
        token=admin_auth["token"],
        payload={"start_date": start, "end_date": end},
    )
    assert status == 201, season
    season_guid = season["guid"]

    status, guest = _request(
        "POST",
        f"{API_V1}/penas/{pena_guid}/players",
        token=admin_auth["token"],
        payload={
            "name": "Guest",
            "surname1": "Player",
            "surname2": None,
            "nationality": "Spain",
            "nickname": "Invitado",
            "position": "CM",
        },
    )
    assert status == 201, guest
    guest_player_guid = guest["player_guid"]

    status, register = _request(
        "POST",
        f"{API_V1}/penas/{pena_guid}/seasons/{season_guid}/players",
        token=admin_auth["token"],
        payload={"player_guid": guest_player_guid},
    )
    assert status == 201, register

    status, standings = _request(
        "GET",
        f"{API_V1}/penas/{pena_guid}/seasons/{season_guid}/standings",
        token=admin_auth["token"],
    )
    assert status == 200, standings
    assert any(item["player_guid"] == guest_player_guid for item in standings["items"])
