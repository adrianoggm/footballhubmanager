"""CLI entrypoint: ``python -m db_migrations <migrate|stamp|rollback|status> [args]``.

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

    if command == "rollback":
        # The target is mandatory on purpose: nobody rolls back by accident.
        if len(args) < 2:
            print("Usage: rollback <N>  (reverts every applied version > N)", file=sys.stderr)
            return 2
        target = args[1]
        try:
            reverted = runner.rollback(engine, target)
        except runner.MissingDownMigrationError as exc:
            print(str(exc), file=sys.stderr)
            return 1
        print(
            f"Rolled back {len(reverted)} migration(s) to v{target}: "
            f"{', '.join(reverted) or 'none'}"
        )
        return 0

    if command == "status":
        report = runner.status(engine)
        for migration in report.migrations:
            if migration.version in report.drifted:
                mark = "!"
            elif migration.version in report.applied:
                mark = "x"
            else:
                mark = " "
            print(f"[{mark}] v{migration.version}  {migration.description}")
        print(
            f"\n{len(report.applied)} applied, {len(report.pending)} pending, "
            f"{len(report.drifted)} drifted"
        )
        if report.drifted:
            print(
                "DRIFT [!]: applied file(s) changed since they ran: "
                f"{', '.join(f'v{v}' for v in report.drifted)}. "
                "Never edit an applied migration; restore the file and add a new vN.sql."
            )
        return 0

    print(f"Unknown command: {command!r} (use migrate|stamp|rollback|status)", file=sys.stderr)
    return 2


if __name__ == "__main__":
    raise SystemExit(main())
