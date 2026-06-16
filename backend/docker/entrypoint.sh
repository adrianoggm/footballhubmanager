#!/bin/sh
# Single image, multiple roles. The Kubernetes pre-upgrade migration Job runs
# `migrate`; the API Deployment runs `serve` (the default).
set -e

case "${1:-serve}" in
  serve)
    exec python src/main.py
    ;;
  migrate)
    exec python -m db_migrations migrate
    ;;
  stamp)
    shift
    exec python -m db_migrations stamp "$@"
    ;;
  status)
    exec python -m db_migrations status
    ;;
  *)
    # Escape hatch: run an arbitrary command (debugging, one-off scripts).
    exec "$@"
    ;;
esac
