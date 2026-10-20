"""Development mail adapter: writes the whole email to the log instead of sending it.

The body includes the action link (and therefore the raw token). That is the point
of this backend: local/dev runs and tests can follow the link without an SMTP
server. Never enable it in production.
"""

from __future__ import annotations

import logging

from auth.domain.models.outgoing_email import OutgoingEmail
from auth.domain.ports.mail_sender_port import MailSenderPort

logger = logging.getLogger(__name__)


class ConsoleMailSender(MailSenderPort):
    def send(self, email: OutgoingEmail) -> None:
        logger.info(
            "📤 [console mail] To: %s | Subject: %s\n%s",
            email.to,
            email.subject,
            email.body,
        )
