"""Custom Prometheus collectors for business metrics.

The default HTTP instrumentation (request rate, latency, in-flight) is wired in
``main.py``. This adds the one signal that does not fall out of HTTP traffic: how
many users are currently logged in.

It is computed at scrape time (count of non-expired ``user_session`` rows) rather
than maintained as an event-driven counter — a login/logout counter drifts whenever
a session expires silently or a process crashes, while a count-at-scrape is always
the truth. ponytail: count-at-scrape; switch to event counters only if the per-scrape
query ever shows up as load.
"""

import logging
import time
from typing import Callable, Iterator

from persistence.infrastructure.entity import UserSession
from prometheus_client.core import GaugeMetricFamily
from prometheus_client.registry import Collector
from sqlalchemy import func, select
from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)


def register_once(registry, collector) -> None:
    """Register a collector, tolerating a repeat registration.

    ``python src/main.py`` runs the module as ``__main__`` and then uvicorn
    re-imports it as ``main`` to serve ``main:app`` — so module-level registration
    runs twice against the shared default registry. The second one would raise
    "Duplicated timeseries"; swallow it (the metric is already there).
    """
    try:
        registry.register(collector)
    except ValueError:
        logger.debug("collector already registered, skipping duplicate")


class ActiveSessionsCollector(Collector):
    """Exposes ``footballhub_active_sessions`` — non-expired user sessions."""

    def __init__(self, session_factory: Callable[[], Session]):
        self._session_factory = session_factory

    def collect(self) -> Iterator[GaugeMetricFamily]:
        gauge = GaugeMetricFamily(
            "footballhub_active_sessions",
            "Number of non-expired user sessions (logged-in users) at scrape time.",
        )
        try:
            now_ts = int(time.time())
            with self._session_factory() as db:
                count = db.execute(
                    select(func.count())
                    .select_from(UserSession)
                    .where(UserSession.expires_at > now_ts)
                ).scalar_one()
            gauge.add_metric([], float(count))
        except Exception as exc:
            # A scrape must never 500 because the DB blipped: drop the sample this
            # round (the metric goes stale, Prometheus already alerts on that) and
            # keep serving the rest of /metrics.
            logger.warning("active_sessions metric unavailable: %s", exc)
        yield gauge
