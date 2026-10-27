"""Languages available for transactional emails."""

from __future__ import annotations

from enum import Enum


class MailLanguage(str, Enum):
    ES = "es"
    EN = "en"
