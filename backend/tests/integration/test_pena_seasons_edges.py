import json
import os
import urllib.error
import urllib.request
import uuid

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
    assert data["items"], data
    return data["items"][0]["guid"]


def _create_season(admin_token: str, pena_guid: str, *, start_date: str, end_date: str) -> str:
    status, data = _request(
        "POST",
        f"{API_V1}/penas/{pena_guid}/seasons",
        token=admin_token,
        payload={"start_date": start_date, "end_date": end_date},
    )
    assert status == 201, data
    return data["guid"]


def _link_user_to_pena(admin_token: str, pena_guid: str) -> str:
    status, link_data = _request(
        "POST",
        f"{API_V1}/penas/{pena_guid}/link-tokens",
        token=admin_token,
    )
    assert status == 200, link_data

    user_auth = _register_user()
    status, data = _request(
        "POST",
        f"{API_V1}/penas/link/consume",
        token=user_auth["token"],
        payload={"token": link_data["token"], "nickname": "EdgeUser", "position": "CM"},
    )
    assert status == 200, data
    return user_auth["token"]


def test_create_season_invalid_range_and_overlap_edge_cases():
    admin_auth = _register_admin()
    token = admin_auth["token"]
    pena_guid = _first_pena_guid(token)

    status, invalid = _request(
        "POST",
        f"{API_V1}/penas/{pena_guid}/seasons",
        token=token,
        payload={"start_date": "2025-01-01", "end_date": "2024-12-31"},
    )
    assert status == 400, invalid
    assert invalid["detail"] == "Invalid season date range"

    _create_season(
        token,
        pena_guid,
        start_date="2024-01-01",
        end_date="2024-12-31",
    )

    status, overlap = _request(
        "POST",
        f"{API_V1}/penas/{pena_guid}/seasons",
        token=token,
        payload={"start_date": "2024-12-31", "end_date": "2025-12-31"},
    )
    assert status == 409, overlap
    assert overlap["detail"] == "Season range overlaps an existing season"


def test_active_season_by_date_positive_and_negative():
    admin_auth = _register_admin()
    token = admin_auth["token"]
    pena_guid = _first_pena_guid(token)
    season_guid = _create_season(
        token,
        pena_guid,
        start_date="2024-08-01",
        end_date="2025-05-31",
    )

    status, active = _request(
        "GET",
        f"{API_V1}/penas/{pena_guid}/seasons/active?at_date=2024-12-01",
        token=token,
    )
    assert status == 200, active
    assert active["guid"] == season_guid

    status, inactive = _request(
        "GET",
        f"{API_V1}/penas/{pena_guid}/seasons/active?at_date=2026-01-01",
        token=token,
    )
    assert status == 404, inactive
    assert inactive["detail"] == "Active season not found"


def test_patch_season_negative_cases_and_overlap():
    admin_auth = _register_admin()
    token = admin_auth["token"]
    pena_guid = _first_pena_guid(token)
    season_one_guid = _create_season(
        token,
        pena_guid,
        start_date="2024-01-01",
        end_date="2024-12-31",
    )
    season_two_guid = _create_season(
        token,
        pena_guid,
        start_date="2026-01-01",
        end_date="2026-12-31",
    )

    status, empty_payload = _request(
        "PATCH",
        f"{API_V1}/penas/{pena_guid}/seasons/{season_two_guid}",
        token=token,
        payload={},
    )
    assert status == 400, empty_payload
    assert empty_payload["detail"] == "Invalid season update data"

    status, invalid_range = _request(
        "PATCH",
        f"{API_V1}/penas/{pena_guid}/seasons/{season_two_guid}",
        token=token,
        payload={"start_date": "2027-01-01", "end_date": "2026-01-01"},
    )
    assert status == 400, invalid_range
    assert invalid_range["detail"] == "Invalid season update data"

    status, null_value = _request(
        "PATCH",
        f"{API_V1}/penas/{pena_guid}/seasons/{season_two_guid}",
        token=token,
        payload={"start_date": None},
    )
    assert status == 400, null_value
    assert null_value["detail"] == "Invalid season update data"

    status, overlap = _request(
        "PATCH",
        f"{API_V1}/penas/{pena_guid}/seasons/{season_two_guid}",
        token=token,
        payload={"start_date": "2024-06-01", "end_date": "2024-10-01"},
    )
    assert status == 409, overlap
    assert overlap["detail"] == "Season range overlaps an existing season"

    status, missing = _request(
        "PATCH",
        f"{API_V1}/penas/{pena_guid}/seasons/00000000-0000-0000-0000-000000000000",
        token=token,
        payload={"end_date": "2026-11-01"},
    )
    assert status == 404, missing
    assert missing["detail"] == "Season not found"

    status, still_there = _request(
        "GET",
        f"{API_V1}/penas/{pena_guid}/seasons/{season_one_guid}",
        token=token,
    )
    assert status == 200, still_there


def test_delete_season_double_delete_edge_case():
    admin_auth = _register_admin()
    token = admin_auth["token"]
    pena_guid = _first_pena_guid(token)
    season_guid = _create_season(
        token,
        pena_guid,
        start_date="2024-01-01",
        end_date="2024-12-31",
    )

    status, _ = _request(
        "DELETE",
        f"{API_V1}/penas/{pena_guid}/seasons/{season_guid}",
        token=token,
    )
    assert status == 204

    status, deleted = _request(
        "DELETE",
        f"{API_V1}/penas/{pena_guid}/seasons/{season_guid}",
        token=token,
    )
    assert status == 404, deleted
    assert deleted["detail"] == "Season not found"


def test_user_can_read_seasons_but_cannot_mutate():
    admin_auth = _register_admin()
    admin_token = admin_auth["token"]
    pena_guid = _first_pena_guid(admin_token)
    season_guid = _create_season(
        admin_token,
        pena_guid,
        start_date="2024-01-01",
        end_date="2024-12-31",
    )
    user_token = _link_user_to_pena(admin_token, pena_guid)

    status, listing = _request("GET", f"{API_V1}/penas/{pena_guid}/seasons", token=user_token)
    assert status == 200, listing
    assert any(item["guid"] == season_guid for item in listing["items"])

    status, active = _request(
        "GET",
        f"{API_V1}/penas/{pena_guid}/seasons/active?at_date=2024-07-01",
        token=user_token,
    )
    assert status == 200, active
    assert active["guid"] == season_guid

    status, create_forbidden = _request(
        "POST",
        f"{API_V1}/penas/{pena_guid}/seasons",
        token=user_token,
        payload={"start_date": "2025-01-01", "end_date": "2025-12-31"},
    )
    assert status == 403, create_forbidden
    assert create_forbidden["detail"] == "Admin access required"

    status, update_forbidden = _request(
        "PATCH",
        f"{API_V1}/penas/{pena_guid}/seasons/{season_guid}",
        token=user_token,
        payload={"end_date": "2024-11-30"},
    )
    assert status == 403, update_forbidden
    assert update_forbidden["detail"] == "Admin access required"

    status, delete_forbidden = _request(
        "DELETE",
        f"{API_V1}/penas/{pena_guid}/seasons/{season_guid}",
        token=user_token,
    )
    assert status == 403, delete_forbidden
    assert delete_forbidden["detail"] == "Admin access required"


def test_non_member_user_cannot_read_pena_seasons():
    admin_auth = _register_admin()
    admin_token = admin_auth["token"]
    pena_guid = _first_pena_guid(admin_token)
    _create_season(
        admin_token,
        pena_guid,
        start_date="2024-01-01",
        end_date="2024-12-31",
    )

    outsider = _register_user()
    status, denied = _request("GET", f"{API_V1}/penas/{pena_guid}/seasons", token=outsider["token"])
    assert status == 403, denied
    assert denied["detail"] == "User does not belong to this pena"


def test_list_seasons_returns_newest_ranges_first_even_when_future():
    admin_auth = _register_admin()
    admin_token = admin_auth["token"]
    pena_guid = _first_pena_guid(admin_token)

    older_guid = _create_season(
        admin_token,
        pena_guid,
        start_date="2024-01-01",
        end_date="2024-12-31",
    )
    middle_guid = _create_season(
        admin_token,
        pena_guid,
        start_date="2025-01-01",
        end_date="2025-12-31",
    )
    future_guid = _create_season(
        admin_token,
        pena_guid,
        start_date="2027-01-01",
        end_date="2027-12-31",
    )

    status, listing = _request(
        "GET",
        f"{API_V1}/penas/{pena_guid}/seasons?page=1&page_size=100",
        token=admin_token,
    )
    assert status == 200, listing
    returned_guids = [item["guid"] for item in listing["items"]]
    assert returned_guids[:3] == [future_guid, middle_guid, older_guid]
    returned_end_dates = [item["end_date"] for item in listing["items"]]
    assert returned_end_dates == sorted(returned_end_dates, reverse=True)


def test_admin_cannot_manage_foreign_pena_seasons():
    owner_admin = _register_admin()
    owner_token = owner_admin["token"]
    owner_pena_guid = _first_pena_guid(owner_token)
    season_guid = _create_season(
        owner_token,
        owner_pena_guid,
        start_date="2024-01-01",
        end_date="2024-12-31",
    )

    foreign_admin = _register_admin()
    foreign_token = foreign_admin["token"]

    status, create_denied = _request(
        "POST",
        f"{API_V1}/penas/{owner_pena_guid}/seasons",
        token=foreign_token,
        payload={"start_date": "2025-01-01", "end_date": "2025-12-31"},
    )
    assert status == 403, create_denied
    assert create_denied["detail"] == "Admin does not manage this pena"

    status, update_denied = _request(
        "PATCH",
        f"{API_V1}/penas/{owner_pena_guid}/seasons/{season_guid}",
        token=foreign_token,
        payload={"end_date": "2024-11-30"},
    )
    assert status == 403, update_denied
    assert update_denied["detail"] == "Admin does not manage this pena"

    status, delete_denied = _request(
        "DELETE",
        f"{API_V1}/penas/{owner_pena_guid}/seasons/{season_guid}",
        token=foreign_token,
    )
    assert status == 403, delete_denied
    assert delete_denied["detail"] == "Admin does not manage this pena"
