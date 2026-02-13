import json
import os
import threading
import uuid
import urllib.error
import urllib.request


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
        "name": "Concurrent",
        "surname1": "User",
        "surname2": None,
        "nationality": "Spain",
    }
    status, data = _request("POST", f"{API_V1}/auth/register", payload=payload)
    assert status == 200, data
    return data


def _player_guid_for_user(token: str) -> str:
    status, data = _request("GET", f"{API_V1}/players/me", token=token)
    assert status == 200, data
    return data["guid"]


def test_link_token_is_single_use_under_concurrency():
    admin_auth = _register_admin()
    status, penas = _request("GET", f"{API_V1}/penas", token=admin_auth["token"])
    assert status == 200, penas
    pena_guid = penas["items"][0]["guid"]

    status, link = _request("POST", f"{API_V1}/penas/{pena_guid}/link-tokens", token=admin_auth["token"])
    assert status == 200, link
    token = link["token"]

    user_a = _register_user()
    user_b = _register_user()
    user_a_player_guid = _player_guid_for_user(user_a["token"])
    user_b_player_guid = _player_guid_for_user(user_b["token"])

    barrier = threading.Barrier(2)
    results: list[tuple[int, dict | None]] = []
    errors: list[Exception] = []
    lock = threading.Lock()

    def _consume(user_token: str):
        try:
            barrier.wait(timeout=10)
            result = _request(
                "POST",
                f"{API_V1}/penas/link/consume",
                token=user_token,
                payload={"token": token, "nickname": "Race", "position": "ST"},
            )
            with lock:
                results.append(result)
        except Exception as exc:  # pragma: no cover - defensive in integration race
            with lock:
                errors.append(exc)

    t1 = threading.Thread(target=_consume, args=(user_a["token"],))
    t2 = threading.Thread(target=_consume, args=(user_b["token"],))
    t1.start()
    t2.start()
    t1.join(timeout=20)
    t2.join(timeout=20)

    assert not errors, errors
    assert len(results) == 2, results

    statuses = sorted(status for status, _ in results)
    # Exactly one successful consume, second must fail because token is single-use.
    assert statuses == [200, 400], results

    status, players = _request("GET", f"{API_V1}/penas/{pena_guid}/players", token=admin_auth["token"])
    assert status == 200, players
    linked_guids = {item["guid"] for item in players["items"]}
    linked_count = int(user_a_player_guid in linked_guids) + int(user_b_player_guid in linked_guids)
    assert linked_count == 1, players


def test_link_token_same_user_double_consume_concurrently():
    admin_auth = _register_admin()
    status, penas = _request("GET", f"{API_V1}/penas", token=admin_auth["token"])
    assert status == 200, penas
    pena_guid = penas["items"][0]["guid"]

    status, link = _request("POST", f"{API_V1}/penas/{pena_guid}/link-tokens", token=admin_auth["token"])
    assert status == 200, link
    token = link["token"]

    user = _register_user()
    user_player_guid = _player_guid_for_user(user["token"])

    barrier = threading.Barrier(2)
    results: list[tuple[int, dict | None]] = []
    errors: list[Exception] = []
    lock = threading.Lock()

    def _consume_same_user():
        try:
            barrier.wait(timeout=10)
            result = _request(
                "POST",
                f"{API_V1}/penas/link/consume",
                token=user["token"],
                payload={"token": token, "nickname": "SameUser", "position": "CM"},
            )
            with lock:
                results.append(result)
        except Exception as exc:  # pragma: no cover - defensive in integration race
            with lock:
                errors.append(exc)

    t1 = threading.Thread(target=_consume_same_user)
    t2 = threading.Thread(target=_consume_same_user)
    t1.start()
    t2.start()
    t1.join(timeout=20)
    t2.join(timeout=20)

    assert not errors, errors
    assert len(results) == 2, results

    statuses = sorted(status for status, _ in results)
    # Same token cannot be consumed twice, even by same user.
    assert statuses == [200, 400], results

    status, players = _request("GET", f"{API_V1}/penas/{pena_guid}/players", token=admin_auth["token"])
    assert status == 200, players
    assert sum(1 for item in players["items"] if item["guid"] == user_player_guid) == 1, players


def test_link_token_already_linked_user_concurrent_consume():
    admin_auth = _register_admin()
    status, penas = _request("GET", f"{API_V1}/penas", token=admin_auth["token"])
    assert status == 200, penas
    pena_guid = penas["items"][0]["guid"]

    user = _register_user()
    user_player_guid = _player_guid_for_user(user["token"])

    # First token links the user to the pena.
    status, first_link = _request("POST", f"{API_V1}/penas/{pena_guid}/link-tokens", token=admin_auth["token"])
    assert status == 200, first_link
    status, first_consume = _request(
        "POST",
        f"{API_V1}/penas/link/consume",
        token=user["token"],
        payload={"token": first_link["token"], "nickname": "First", "position": "GK"},
    )
    assert status == 200, first_consume

    # Second token should be consumed exactly once even if user is already linked.
    status, second_link = _request("POST", f"{API_V1}/penas/{pena_guid}/link-tokens", token=admin_auth["token"])
    assert status == 200, second_link
    second_token = second_link["token"]

    barrier = threading.Barrier(2)
    results: list[tuple[int, dict | None]] = []
    errors: list[Exception] = []
    lock = threading.Lock()

    def _consume_already_linked():
        try:
            barrier.wait(timeout=10)
            result = _request(
                "POST",
                f"{API_V1}/penas/link/consume",
                token=user["token"],
                payload={"token": second_token, "nickname": "Second", "position": "CM"},
            )
            with lock:
                results.append(result)
        except Exception as exc:  # pragma: no cover - defensive in integration race
            with lock:
                errors.append(exc)

    t1 = threading.Thread(target=_consume_already_linked)
    t2 = threading.Thread(target=_consume_already_linked)
    t1.start()
    t2.start()
    t1.join(timeout=20)
    t2.join(timeout=20)

    assert not errors, errors
    assert len(results) == 2, results

    # One request sees "already linked" and consumes token; the other sees invalid token.
    statuses = sorted(status for status, _ in results)
    assert statuses == [400, 409], results

    status, players = _request("GET", f"{API_V1}/penas/{pena_guid}/players", token=admin_auth["token"])
    assert status == 200, players
    assert sum(1 for item in players["items"] if item["guid"] == user_player_guid) == 1, players
