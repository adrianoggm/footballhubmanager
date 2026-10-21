"""Decorator that hands delivery to a worker thread and returns immediately.

Used by the forgot-password flow: answering at the same speed whether or not an
email is actually sent keeps response timing from revealing which addresses have
an account. Delivery failures are logged by the worker, never raised to the caller.
"""

from __future__ import annotations

import logging
from concurrent.futures import Executor, ThreadPoolExecutor

from auth.domain.models.outgoing_email import OutgoingEmail
from auth.domain.ports.mail_sender_port import MailSenderPort

logger = logging.getLogger(__name__)

_DEFAULT_EXECUTOR = ThreadPoolExecutor(max_workers=2, thread_name_prefix="mail")


class BackgroundMailSender(MailSenderPort):
    def __init__(self, inner: MailSenderPort, executor: Executor | None = None) -> None:
        self._inner = inner
        self._executor = executor or _DEFAULT_EXECUTOR

    def send(self, email: OutgoingEmail) -> None:
        self._executor.submit(self._deliver, email)

    def _deliver(self, email: OutgoingEmail) -> None:
        try:
            self._inner.send(email)
        except Exception:
            # Worker thread: nobody awaits this future, so log here or the error is lost.
            logger.exception("❌ Background email delivery failed: %s", email.subject)
