"""Forward-only SQL schema migrations.

The schema is a series of ``versioning/sql/versions/vN.sql`` files. This package
tracks which versions are applied in the ``schema_migrations`` table and applies
the pending ones in numeric order. It is the **production** mechanism: MySQL's
docker-entrypoint init only runs on an empty data volume, so it cannot evolve a
database that already holds data.

Policy (per AGENTS.md / CLAUDE.md): raw SQL, no Alembic.
"""

from db_migrations.runner import Migration, discover, find_migrations_dir, migrate, stamp, status

__all__ = ["Migration", "discover", "find_migrations_dir", "migrate", "stamp", "status"]
