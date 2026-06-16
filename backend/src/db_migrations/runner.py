"""Core migration-runner logic, decoupled from the concrete engine for testing."""

from __future__ import annotations

import logging
import re
from dataclasses import dataclass
from pathlib import Path

from sqlalchemy import text
from sqlalchemy.engine import Connection, Engine

logger = logging.getLogger(__name__)

_VERSION_RE = re.compile(r"^v(\d+)\.sql$", re.IGNORECASE)

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


@dataclass(frozen=True)
class Migration:
    version: str  # numeric part as a string, e.g. "11" (matches schema_migrations)
    path: Path

    @property
    def description(self) -> str:
        return self.path.stem  # e.g. "v11"


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
    directory = Path(migrations_dir)
    migrations = [
        Migration(version=str(int(match.group(1))), path=entry)
        for entry in directory.iterdir()
        if (match := _VERSION_RE.match(entry.name))
    ]
    migrations.sort(key=lambda migration: int(migration.version))
    return migrations


def _split_statements(sql: str) -> list[str]:
    """Split a `.sql` file into individual statements.

    The DDL files use only simple `;`-terminated statements (no semicolons inside
    string literals), so a plain split is safe. Fragments that are only comments
    or whitespace are dropped; leading `--` comments on a real statement are kept
    (databases ignore them).
    """
    statements: list[str] = []
    for fragment in sql.split(";"):
        body = "\n".join(
            line
            for line in fragment.splitlines()
            if line.strip() and not line.strip().startswith("--")
        ).strip()
        if body:
            statements.append(fragment.strip())
    return statements


def ensure_table(conn: Connection) -> None:
    conn.execute(text(_SCHEMA_MIGRATIONS_DDL))


def applied_versions(conn: Connection) -> set[str]:
    rows = conn.execute(text("SELECT version FROM schema_migrations")).scalars()
    return {str(value) for value in rows}


def _record(conn: Connection, version: str, description: str, *, success: bool) -> None:
    # Idempotent upsert: some legacy files (v1-v8) self-record their version, so a
    # plain INSERT could clash. DELETE+INSERT is portable and leaves one clean row.
    conn.execute(text("DELETE FROM schema_migrations WHERE version = :v"), {"v": version})
    conn.execute(
        text("INSERT INTO schema_migrations (version, description, success) VALUES (:v, :d, :s)"),
        {"v": version, "d": description[:255], "s": 1 if success else 0},
    )


def status(
    engine: Engine, migrations_dir: str | Path | None = None
) -> tuple[list[Migration], set[str]]:
    migrations = discover(find_migrations_dir(migrations_dir))
    with engine.begin() as conn:
        ensure_table(conn)
        applied = applied_versions(conn)
    return migrations, applied


def migrate(engine: Engine, migrations_dir: str | Path | None = None) -> list[str]:
    """Apply every pending migration in order. Returns the versions applied.

    Each migration runs in its own transaction together with its bookkeeping row.
    NOTE: MySQL performs an implicit commit per DDL statement, so a multi-statement
    migration that fails midway cannot be fully rolled back — fix forward. The run
    stops at the first failing migration and re-raises.
    """
    directory = find_migrations_dir(migrations_dir)
    migrations = discover(directory)
    with engine.begin() as conn:
        ensure_table(conn)
        applied = applied_versions(conn)

    pending = [migration for migration in migrations if migration.version not in applied]
    if not pending:
        logger.info("No pending migrations (%s applied).", len(applied))
        return []

    done: list[str] = []
    for migration in pending:
        statements = _split_statements(migration.path.read_text(encoding="utf-8"))
        try:
            with engine.begin() as conn:
                for statement in statements:
                    conn.exec_driver_sql(statement)
                _record(conn, migration.version, migration.description, success=True)
        except Exception:
            logger.exception("Migration %s failed; stopping.", migration.path.name)
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
    migrations = discover(find_migrations_dir(migrations_dir))
    if up_to is not None:
        migrations = [m for m in migrations if int(m.version) <= int(up_to)]

    stamped: list[str] = []
    with engine.begin() as conn:
        ensure_table(conn)
        applied = applied_versions(conn)
        for migration in migrations:
            if migration.version not in applied:
                _record(conn, migration.version, migration.description, success=True)
                stamped.append(migration.version)
    return stamped
