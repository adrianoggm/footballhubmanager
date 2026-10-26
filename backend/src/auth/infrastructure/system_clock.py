from __future__ import annotations

import time

from auth.domain.ports.clock_port import ClockPort


class SystemClock(ClockPort):
    def now(self) -> int:
        return int(time.time())
