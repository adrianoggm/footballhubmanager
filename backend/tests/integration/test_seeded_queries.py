import json
import os
import urllib.error
import urllib.request

API_V1 = os.getenv("TEST_API_V1", "http://127.0.0.1:8000/api/v1")

CI_ADMIN_USERNAME = "ci_admin"
CI_ADMIN_PASSWORD = "ci_admin_pass"
CI_PENA_ONE_GUID = "00000000-0000-0000-0000-000000009101"
CI_PENA_ONE_SEASON_GUID = "00000000-0000-0000-0000-000000009151"
CI_USER_NAME = "CI"


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


def _admin_token() -> str:
    status, data = _request(
        "POST",
        f"{API_V1}/auth/admin/login",
        payload={"username": CI_ADMIN_USERNAME, "password": CI_ADMIN_PASSWORD},
    )
    assert status == 200, data
    return data["token"]


def test_seeded_admin_can_list_seeded_penas():
    token = _admin_token()
    status, data = _request("GET", f"{API_V1}/penas", token=token)

    assert status == 200, data
    guids = {item["guid"] for item in data["items"]}
    assert "00000000-0000-0000-0000-000000009101" in guids
    assert "00000000-0000-0000-0000-000000009102" in guids


def test_seeded_pena_players_query_returns_seeded_membership():
    token = _admin_token()
    status, data = _request("GET", f"{API_V1}/penas/{CI_PENA_ONE_GUID}/players", token=token)

    assert status == 200, data
    assert any(
        item["name"] == CI_USER_NAME and item["nickname"] == "SeedNick" and item["position"] == "GK"
        for item in data["items"]
    )


def test_seeded_pena_seasons_query_returns_seeded_season():
    token = _admin_token()
    status, data = _request("GET", f"{API_V1}/penas/{CI_PENA_ONE_GUID}/seasons", token=token)

    assert status == 200, data
    guids = {item["guid"] for item in data["items"]}
    assert CI_PENA_ONE_SEASON_GUID in guids


def test_seeded_pena_active_season_query_returns_seeded_season():
    token = _admin_token()
    status, data = _request(
        "GET",
        f"{API_V1}/penas/{CI_PENA_ONE_GUID}/seasons/active?at_date=2025-02-01",
        token=token,
    )

    assert status == 200, data
    assert data["guid"] == CI_PENA_ONE_SEASON_GUID
