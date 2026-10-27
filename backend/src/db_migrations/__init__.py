"""SQL schema migrations with optional down files.

The schema is a series of ``versioning/sql/versions/vN.sql`` files, each optionally
paired with a ``vN.down.sql`` (mandatory from ``DOWN_REQUIRED_FROM_VERSION`` on).
This package tracks which versions are applied in the ``schema_migrations`` table
(with a checksum per file and a row per failed run) and applies the pending ones in
numeric order, or reverts them with ``rollback``. It is the **production**
mechanism: MySQL's docker-entrypoint init only runs on an empty data volume, so it
cannot evolve a database that already holds data.

Policy (per AGENTS.md / CLAUDE.md): raw SQL, no Alembic.
"""

from db_migrations.runner import (
    DOWN_REQUIRED_FROM_VERSION,
    Migration,
    MigrationStatus,
    MissingDownMigrationError,
    discover,
    find_migrations_dir,
    migrate,
    rollback,
    stamp,
    status,
)

__all__ = [
    "DOWN_REQUIRED_FROM_VERSION",
    "Migration",
    "MigrationStatus",
    "MissingDownMigrationError",
    "discover",
    "find_migrations_dir",
    "migrate",
    "rollback",
    "stamp",
    "status",
]
