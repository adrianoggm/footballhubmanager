"""Core migration-runner logic, decoupled from the concrete engine for testing."""

from __future__ import annotations

import hashlib
import logging
import re
from dataclasses import dataclass, field
from pathlib import Path

from sqlalchemy import inspect, text
from sqlalchemy.engine import Connection, Engine

logger = logging.getLogger(__name__)

_VERSION_RE = re.compile(r"^v(\d+)\.sql$", re.IGNORECASE)
_DOWN_RE = re.compile(r"^v(\d+)\.down\.sql$", re.IGNORECASE)

# From this version onward every vN.sql must ship a paired vN.down.sql (enforced by
# a unit test that scans the real versions directory).
DOWN_REQUIRED_FROM_VERSION = 13

# Portable across MySQL (prod) and SQLite (tests). On an existing prod DB the
# table already exists (created by v1.sql), so IF NOT EXISTS is a no-op there.
_SCHEMA_MIGRATIONS_DDL = """
CREATE TABLE IF NOT EXISTS schema_migrations (
    version VARCHAR(50) PRIMARY KEY,
    description VARCHAR(255),
    success TINYINT NOT NULL DEFAULT 1,
    applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
)
"""

# Columns added after the table first shipped. Existing databases (created by v1.sql
# or actual.sql) get them via ALTER TABLE ... ADD COLUMN when missing, which is the
# only portable approach across MySQL and SQLite.
_ADDED_COLUMNS: dict[str, str] = {
    "checksum": "CHAR(64) NULL",
    "error": "TEXT NULL",
}

# Failure messages are stored truncated: enough to diagnose, never a full dump.
_MAX_ERROR_LENGTH = 2000


def file_checksum(path: Path) -> str:
    """sha256 hex of a migration file, with CRLF normalized so OS checkouts agree."""
    return hashlib.sha256(path.read_bytes().replace(b"\r\n", b"\n")).hexdigest()


@dataclass(frozen=True)
class Migration:
    version: str  # numeric part as a string, e.g. "11" (matches schema_migrations)
    path: Path
    down_path: Path | None = None  # optional paired vN.down.sql, used by rollback

    @property
    def description(self) -> str:
        return self.path.stem  # e.g. "v11"

    @property
    def checksum(self) -> str:
        return file_checksum(self.path)


@dataclass(frozen=True)
class MigrationStatus:
    migrations: list[Migration]
    applied: set[str]
    # Applied versions whose recorded checksum no longer matches the file on disk.
    drifted: list[str] = field(default_factory=list)
    # Versions whose last run failed (success=0) -> truncated error. Still pending.
    failed: dict[str, str | None] = field(default_factory=dict)

    @property
    def pending(self) -> list[str]:
        return [m.version for m in self.migrations if m.version not in self.applied]


def find_migrations_dir(explicit: str | Path | None = None) -> Path:
    """Locate ``versioning/sql/versions`` from an override or by walking upward.

    Works both inside the image (``/app/versioning/sql/versions``) and from a dev
    checkout (``<repo>/versioning/sql/versions``).
    """
    if explicit:
        return Path(explicit)
    here = Path(__file__).resolve()
    for parent in here.parents:
        candidate = parent / "versioning" / "sql" / "versions"
        if candidate.is_dir():
            return candidate
    raise FileNotFoundError("Could not locate versioning/sql/versions (set MIGRATIONS_DIR)")


def discover(migrations_dir: str | Path) -> list[Migration]:
    """List the up migrations (``vN.sql``) with their optional ``vN.down.sql``."""
    entries = list(Path(migrations_dir).iterdir())
    downs = {
        str(int(match.group(1))): entry
        for entry in entries
        if (match := _DOWN_RE.match(entry.name))
    }
    migrations: list[Migration] = []
    for entry in entries:
        match = _VERSION_RE.match(entry.name)
        if match:
            version = str(int(match.group(1)))
            migrations.append(Migration(version=version, path=entry, down_path=downs.get(version)))
    migrations.sort(key=lambda migration: int(migration.version))
    return migrations


def _split_statements(sql: str) -> list[str]:
    """Split a `.sql` file into individual statements.

    The DDL files use only simple `;`-terminated statements (no semicolons inside
    string literals). Full-line `--` comments are dropped before splitting, so a
    `;` inside a comment cannot cut a statement in half.
    """
    code = "\n".join(line for line in sql.splitlines() if not line.strip().startswith("--"))
    return [fragment.strip() for fragment in code.split(";") if fragment.strip()]


def ensure_table(conn: Connection) -> None:
    """Create ``schema_migrations`` if absent and add any column it is missing."""
    conn.execute(text(_SCHEMA_MIGRATIONS_DDL))
    existing = {column["name"].lower() for column in inspect(conn).get_columns("schema_migrations")}
    for name, ddl in _ADDED_COLUMNS.items():
        if name not in existing:
            conn.exec_driver_sql(f"ALTER TABLE schema_migrations ADD COLUMN {name} {ddl}")
            logger.info("Added column schema_migrations.%s", name)


def applied_versions(conn: Connection) -> set[str]:
    return set(_applied_checksums(conn))


def _applied_checksums(conn: Connection) -> dict[str, str | None]:
    # Only successful rows count as applied; failed rows (success=0) stay pending.
    rows = conn.execute(text("SELECT version, checksum FROM schema_migrations WHERE success = 1"))
    return {str(version): checksum for version, checksum in rows}


def _failed_versions(conn: Connection) -> dict[str, str | None]:
    rows = conn.execute(text("SELECT version, error FROM schema_migrations WHERE success = 0"))
    return {str(version): error for version, error in rows}


def _drifted(migrations: list[Migration], stored: dict[str, str | None]) -> list[str]:
    # Legacy rows with a NULL checksum are not drift: they get backfilled instead.
    return [
        m.version
        for m in migrations
        if stored.get(m.version) is not None and stored[m.version] != m.checksum
    ]


def _backfill_checksums(conn: Connection, migrations: list[Migration]) -> None:
    """Record the current file checksum on applied rows that predate checksums."""
    stored = _applied_checksums(conn)
    for migration in migrations:
        if migration.version in stored and stored[migration.version] is None:
            conn.execute(
                text("UPDATE schema_migrations SET checksum = :c WHERE version = :v"),
                {"c": migration.checksum, "v": migration.version},
            )


def _replace_row(conn: Connection, migration: Migration, success: int, error: str | None) -> None:
    # Idempotent upsert: some legacy files (v1-v8) self-record their version, and a
    # retried version replaces its failed row. DELETE+INSERT is portable and leaves
    # exactly one row per version.
    conn.execute(text("DELETE FROM schema_migrations WHERE version = :v"), {"v": migration.version})
    conn.execute(
        text(
            "INSERT INTO schema_migrations (version, description, success, checksum, error) "
            "VALUES (:v, :d, :s, :c, :e)"
        ),
        {
            "v": migration.version,
            "d": migration.description[:255],
            "s": success,
            "c": migration.checksum,
            "e": error,
        },
    )


def _record_applied(conn: Connection, migration: Migration) -> None:
    _replace_row(conn, migration, success=1, error=None)


def _record_failure(conn: Connection, migration: Migration, error: BaseException) -> None:
    _replace_row(conn, migration, success=0, error=str(error)[:_MAX_ERROR_LENGTH])


def _record_failure_safely(engine: Engine, migration: Migration, error: BaseException) -> None:
    """Persist the failure row; never mask the original migration error."""
    try:
        with engine.begin() as conn:
            _record_failure(conn, migration, error)
    except Exception:
        logger.exception("Could not record the failure of %s", migration.path.name)


def status(engine: Engine, migrations_dir: str | Path | None = None) -> MigrationStatus:
    migrations = discover(find_migrations_dir(migrations_dir))
    with engine.begin() as conn:
        ensure_table(conn)
        stored = _applied_checksums(conn)
        failed = _failed_versions(conn)
    return MigrationStatus(
        migrations=migrations,
        applied=set(stored),
        drifted=_drifted(migrations, stored),
        failed=failed,
    )


def migrate(engine: Engine, migrations_dir: str | Path | None = None) -> list[str]:
    """Apply every pending migration in order. Returns the versions applied.

    Each migration runs in its own transaction together with its bookkeeping row.
    NOTE: MySQL performs an implicit commit per DDL statement, so a multi-statement
    migration that fails midway cannot be fully rolled back — fix forward. The run
    stops at the first failing migration, records a ``success=0`` row with the
    truncated error (in a fresh transaction) and re-raises. A failed version is
    not "applied": the next ``migrate`` retries it, and a successful retry replaces
    the failed row.
    """
    directory = find_migrations_dir(migrations_dir)
    migrations = discover(directory)
    with engine.begin() as conn:
        ensure_table(conn)
        _backfill_checksums(conn, migrations)
        applied = applied_versions(conn)
        failed = _failed_versions(conn)

    pending = [migration for migration in migrations if migration.version not in applied]
    if not pending:
        logger.info("No pending migrations (%s applied).", len(applied))
        return []
    if failed:
        logger.warning("Retrying previously failed migration(s): %s", ", ".join(sorted(failed)))

    done: list[str] = []
    for migration in pending:
        statements = _split_statements(migration.path.read_text(encoding="utf-8"))
        try:
            with engine.begin() as conn:
                for statement in statements:
                    conn.exec_driver_sql(statement)
                _record_applied(conn, migration)
        except Exception as exc:
            logger.exception("Migration %s failed; stopping.", migration.path.name)
            _record_failure_safely(engine, migration, exc)
            raise
        logger.info("Applied migration %s", migration.path.name)
        done.append(migration.version)
    return done


def stamp(
    engine: Engine, migrations_dir: str | Path | None = None, up_to: str | int | None = None
) -> list[str]:
    """Mark migrations as applied WITHOUT running them.

    One-time baseline for an existing database whose schema was already created
    (e.g. from ``actual.sql`` or by hand) so ``migrate`` does not try to re-apply
    versions that are physically present. ``up_to`` limits to ``version <= up_to``
    (default: every discovered version = current head).
    """
    discovered = discover(find_migrations_dir(migrations_dir))
    migrations = discovered
    if up_to is not None:
        migrations = [m for m in discovered if int(m.version) <= int(up_to)]

    stamped: list[str] = []
    with engine.begin() as conn:
        ensure_table(conn)
        _backfill_checksums(conn, discovered)
        applied = applied_versions(conn)
        for migration in migrations:
            if migration.version not in applied:
                _record_applied(conn, migration)
                stamped.append(migration.version)
    return stamped


class MissingDownMigrationError(RuntimeError):
    """A rollback was requested past a version that has no ``vN.down.sql``."""


def rollback(
    engine: Engine, to_version: str | int, migrations_dir: str | Path | None = None
) -> list[str]:
    """Revert every applied migration newer than ``to_version``, newest first.

    All-or-nothing precheck: if ANY version to revert lacks a down file (or its up
    file is gone), nothing is executed. Each down file then runs in its own
    transaction together with the deletion of its ``schema_migrations`` row; the
    run stops at the first failure and re-raises. ``to_version=0`` reverts all.
    Returns the versions rolled back, in the order they were reverted.
    """
    target = int(to_version)
    if target < 0:
        raise ValueError("to_version must be >= 0")
    downs = {
        m.version: m.down_path
        for m in discover(find_migrations_dir(migrations_dir))
        if m.down_path is not None
    }
    with engine.begin() as conn:
        ensure_table(conn)
        applied = applied_versions(conn)

    to_revert = sorted((v for v in applied if int(v) > target), key=int, reverse=True)
    missing = [version for version in to_revert if version not in downs]
    if missing:
        raise MissingDownMigrationError(
            f"Cannot roll back to v{target}: no down file for "
            f"{', '.join(f'v{v}' for v in missing)}. Nothing was rolled back."
        )

    reverted: list[str] = []
    for version in to_revert:
        down_path = downs[version]
        statements = _split_statements(down_path.read_text(encoding="utf-8"))
        try:
            with engine.begin() as conn:
                for statement in statements:
                    conn.exec_driver_sql(statement)
                conn.execute(
                    text("DELETE FROM schema_migrations WHERE version = :v"), {"v": version}
                )
        except Exception:
            logger.exception("Rollback %s failed; stopping.", down_path.name)
            raise
        logger.info("Rolled back migration %s", down_path.name)
        reverted.append(version)
    return reverted
