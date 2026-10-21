"""Plain-text email ready to be handed to a ``MailSenderPort``."""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class OutgoingEmail:
    to: str
    subject: str
    body: str
