"""CLI entrypoint: ``python -m db_migrations <migrate|stamp|status> [args]``.

Used by the backend image entrypoint (the Kubernetes pre-upgrade migration Job
runs ``migrate``; ``stamp`` baselines an existing database once).
"""

from __future__ import annotations

import logging
import sys


def main(argv: list[str] | None = None) -> int:
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s %(message)s")
    args = list(sys.argv[1:] if argv is None else argv)
    command = args[0] if args else "status"

    # Imported lazily so `status`/help never require a live DB to *parse* args.
    from db_migrations import runner
    from persistence.module import engine

    if command == "migrate":
        applied = runner.migrate(engine)
        print(f"Applied {len(applied)} migration(s): {', '.join(applied) or 'none'}")
        return 0

    if command == "stamp":
        rest = [arg for arg in args[1:] if arg != "--version"]
        up_to = rest[0] if rest else None
        stamped = runner.stamp(engine, up_to=up_to)
        scope = f"up to v{up_to}" if up_to else "current head"
        print(f"Stamped {len(stamped)} version(s) ({scope}): {', '.join(stamped) or 'none'}")
        return 0

    if command == "status":
        migrations, applied = runner.status(engine)
        for migration in migrations:
            mark = "x" if migration.version in applied else " "
            print(f"[{mark}] v{migration.version}  {migration.description}")
        pending = [m.version for m in migrations if m.version not in applied]
        print(f"\n{len(applied)} applied, {len(pending)} pending")
        return 0

    print(f"Unknown command: {command!r} (use migrate|stamp|status)", file=sys.stderr)
    return 2


if __name__ == "__main__":
    raise SystemExit(main())
