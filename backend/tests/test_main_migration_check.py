from pathlib import Path

import main
import pytest
from db_migrations.runner import Migration


def _status(monkeypatch, migrations, applied):
    monkeypatch.setattr(
        "db_migrations.runner.status", lambda _engine, *a, **k: (migrations, applied)
    )


def test_verify_passes_when_up_to_date(monkeypatch):
    _status(monkeypatch, [Migration("1", Path("v1.sql"))], {"1"})
    # No exception regardless of strict mode.
    monkeypatch.setenv("STRICT_MIGRATION_CHECK", "true")
    main._verify_schema_migrations()


def test_verify_warns_when_pending_and_not_strict(monkeypatch):
    _status(monkeypatch, [Migration("1", Path("v1.sql")), Migration("2", Path("v2.sql"))], {"1"})
    monkeypatch.delenv("STRICT_MIGRATION_CHECK", raising=False)
    # Pending v2 but not strict -> warning only, no raise.
    main._verify_schema_migrations()


def test_verify_raises_when_pending_and_strict(monkeypatch):
    _status(monkeypatch, [Migration("1", Path("v1.sql")), Migration("2", Path("v2.sql"))], {"1"})
    monkeypatch.setenv("STRICT_MIGRATION_CHECK", "1")
    with pytest.raises(RuntimeError, match="Pending schema migrations: 2"):
        main._verify_schema_migrations()


def test_verify_is_non_fatal_when_status_errors(monkeypatch):
    def _boom(_engine, *a, **k):
        raise RuntimeError("db unreachable")

    monkeypatch.setattr("db_migrations.runner.status", _boom)
    monkeypatch.setenv("STRICT_MIGRATION_CHECK", "true")
    # A problem reaching migration metadata must not crash startup.
    main._verify_schema_migrations()


@pytest.mark.parametrize(
    ("value", "expected"),
    [("true", True), ("1", True), ("yes", True), ("on", True), ("false", False), ("", False)],
)
def test_strict_flag_parsing(monkeypatch, value, expected):
    monkeypatch.setenv("STRICT_MIGRATION_CHECK", value)
    assert main._strict_migration_check() is expected
