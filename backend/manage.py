"""Dev convenience wrapper for the migration CLI (cross-shell, repo-root paths).

    python backend/manage.py status|migrate|stamp [N]

Inside the image the entrypoint uses `python -m db_migrations` directly (PYTHONPATH
is set there); this wrapper just puts `backend/src` on the path for local use.
"""

import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "src"))

from db_migrations.__main__ import main  # noqa: E402

if __name__ == "__main__":
    raise SystemExit(main())
