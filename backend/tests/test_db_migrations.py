from pathlib import Path

import pytest
from db_migrations import runner
from sqlalchemy import create_engine, text
from sqlalchemy.pool import StaticPool


def _engine():
    # StaticPool keeps a single in-memory DB across the runner's separate
    # engine.begin() connections (otherwise each connection gets a fresh DB).
    return create_engine(
        "sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool
    )


def _write(directory: Path, name: str, sql: str) -> None:
    (directory / name).write_text(sql, encoding="utf-8")


def _table_exists(engine, name: str) -> bool:
    with engine.begin() as conn:
        row = conn.execute(
            text("SELECT name FROM sqlite_master WHERE type='table' AND name=:n"), {"n": name}
        ).first()
    return row is not None


def test_discover_orders_numerically(tmp_path):
    _write(tmp_path, "v2.sql", "CREATE TABLE t2 (id INTEGER);")
    _write(tmp_path, "v10.sql", "CREATE TABLE t10 (id INTEGER);")
    _write(tmp_path, "v1.sql", "CREATE TABLE t1 (id INTEGER);")
    _write(tmp_path, "notes.txt", "ignore me")

    versions = [m.version for m in runner.discover(tmp_path)]

    assert versions == ["1", "2", "10"]  # 10 after 2, not lexicographic


def test_migrate_applies_pending_and_records(tmp_path):
    _write(tmp_path, "v1.sql", "CREATE TABLE t1 (id INTEGER);")
    _write(tmp_path, "v2.sql", "CREATE TABLE t2 (id INTEGER);")
    engine = _engine()

    applied = runner.migrate(engine, migrations_dir=tmp_path)

    assert applied == ["1", "2"]
    assert _table_exists(engine, "t1")
    assert _table_exists(engine, "t2")
    _, recorded = runner.status(engine, migrations_dir=tmp_path)
    assert recorded == {"1", "2"}


def test_migrate_is_idempotent(tmp_path):
    _write(tmp_path, "v1.sql", "CREATE TABLE t1 (id INTEGER);")
    engine = _engine()

    assert runner.migrate(engine, migrations_dir=tmp_path) == ["1"]
    # A second run finds nothing pending and does not re-run v1 (which would fail
    # with "table already exists").
    assert runner.migrate(engine, migrations_dir=tmp_path) == []


def test_migrate_only_runs_new_versions(tmp_path):
    _write(tmp_path, "v1.sql", "CREATE TABLE t1 (id INTEGER);")
    engine = _engine()
    runner.migrate(engine, migrations_dir=tmp_path)

    _write(tmp_path, "v2.sql", "CREATE TABLE t2 (id INTEGER);")
    assert runner.migrate(engine, migrations_dir=tmp_path) == ["2"]


def test_migrate_handles_multi_statement_and_comments(tmp_path):
    _write(
        tmp_path,
        "v1.sql",
        "-- header comment\nCREATE TABLE t1 (id INTEGER);\nCREATE TABLE t2 (id INTEGER);\n",
    )
    engine = _engine()

    assert runner.migrate(engine, migrations_dir=tmp_path) == ["1"]
    assert _table_exists(engine, "t1")
    assert _table_exists(engine, "t2")


def test_migrate_stops_and_raises_on_failure(tmp_path):
    _write(tmp_path, "v1.sql", "CREATE TABLE t1 (id INTEGER);")
    _write(tmp_path, "v2.sql", "THIS IS NOT VALID SQL;")
    _write(tmp_path, "v3.sql", "CREATE TABLE t3 (id INTEGER);")
    engine = _engine()

    with pytest.raises(Exception):
        runner.migrate(engine, migrations_dir=tmp_path)

    # v1 committed, v2 failed, v3 never ran.
    _, recorded = runner.status(engine, migrations_dir=tmp_path)
    assert recorded == {"1"}
    assert not _table_exists(engine, "t3")


def test_stamp_marks_applied_without_running(tmp_path):
    # If this ran it would create the table; stamping must NOT run it.
    _write(tmp_path, "v1.sql", "CREATE TABLE t1 (id INTEGER);")
    _write(tmp_path, "v2.sql", "CREATE TABLE t2 (id INTEGER);")
    engine = _engine()

    stamped = runner.stamp(engine, migrations_dir=tmp_path)

    assert stamped == ["1", "2"]
    assert not _table_exists(engine, "t1")
    assert not _table_exists(engine, "t2")
    # A subsequent migrate sees everything as applied and does nothing.
    assert runner.migrate(engine, migrations_dir=tmp_path) == []


def test_stamp_up_to_then_migrate_runs_the_rest(tmp_path):
    _write(tmp_path, "v1.sql", "CREATE TABLE t1 (id INTEGER);")
    _write(tmp_path, "v2.sql", "CREATE TABLE t2 (id INTEGER);")
    _write(tmp_path, "v3.sql", "CREATE TABLE t3 (id INTEGER);")
    engine = _engine()

    assert runner.stamp(engine, migrations_dir=tmp_path, up_to=2) == ["1", "2"]

    applied = runner.migrate(engine, migrations_dir=tmp_path)

    assert applied == ["3"]
    assert not _table_exists(engine, "t1")  # stamped, never run
    assert _table_exists(engine, "t3")  # genuinely migrated
