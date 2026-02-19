import os
from collections import Counter, defaultdict

# Required so importing `main` does not fail during test collection.
os.environ.setdefault("DB_HOST", "localhost")
os.environ.setdefault("DB_PORT", "3306")
os.environ.setdefault("DB_NAME", "footballhub")
os.environ.setdefault("DB_USER", "footballuser")
os.environ.setdefault("DB_PASSWORD", "footballpass")

from main import app


def test_routes_have_unique_method_and_path():
    routes_by_key: dict[tuple[str, str], list[str]] = defaultdict(list)
    for route in app.routes:
        path = getattr(route, "path", None)
        endpoint = getattr(route, "endpoint", None)
        methods = getattr(route, "methods", None) or set()
        if not path or endpoint is None:
            continue
        for method in methods - {"HEAD", "OPTIONS"}:
            endpoint_name = f"{endpoint.__module__}.{endpoint.__name__}"
            routes_by_key[(method, path)].append(endpoint_name)

    duplicates = {key: endpoints for key, endpoints in routes_by_key.items() if len(endpoints) > 1}
    assert not duplicates, "Duplicate method+path routes found: " + ", ".join(
        f"{method} {path} -> {endpoints}"
        for (method, path), endpoints in sorted(duplicates.items())
    )


def test_openapi_operation_ids_are_unique():
    schema = app.openapi()
    operation_ids = Counter()
    for path_item in schema.get("paths", {}).values():
        for operation in path_item.values():
            operation_id = operation.get("operationId")
            if operation_id:
                operation_ids[operation_id] += 1

    duplicates = sorted(operation_id for operation_id, count in operation_ids.items() if count > 1)
    assert not duplicates, f"Duplicate OpenAPI operation IDs found: {duplicates}"
