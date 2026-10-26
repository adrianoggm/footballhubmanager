"""Port for the current time, so token expiry and cooldowns are testable."""

from __future__ import annotations

from typing import Protocol


class ClockPort(Protocol):
    def now(self) -> int:
        """Current time as epoch seconds."""
        ...
