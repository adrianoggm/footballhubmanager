"""Port for delivering transactional emails (verification, password reset)."""

from __future__ import annotations

from typing import Protocol

from auth.domain.models.outgoing_email import OutgoingEmail


class MailSenderPort(Protocol):
    def send(self, email: OutgoingEmail) -> None:
        """Deliver ``email``. Raises ``MailDeliveryError`` when delivery fails."""
        ...
