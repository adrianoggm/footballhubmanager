import json
import os
import uuid
import urllib.error
import urllib.request


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

    status, link = _request("POST", f"{API_V1}/penas/{pena_guid}/link-tokens", token=admin_auth["token"])
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

    status, players = _request("GET", f"{API_V1}/penas/{pena_guid}/players", token=admin_auth["token"])
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
