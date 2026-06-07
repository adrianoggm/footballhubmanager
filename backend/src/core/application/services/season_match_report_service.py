from enum import Enum


class SeasonMatchReportState(str, Enum):
    OPEN = "open"
    CLOSED = "closed"


class SeasonMatchLineupUpdateMode(str, Enum):
    OPEN_MATCH = "open_match"
    CLOSED_MATCH = "closed_match"


class SeasonMatchReportService:
    @staticmethod
    def resolve_state(
        *,
        persisted_status: str | None,
        ended_at_epoch: int | None,
    ) -> SeasonMatchReportState:
        status = str(persisted_status or "").strip().lower()
        if status == SeasonMatchReportState.OPEN.value:
            return SeasonMatchReportState.OPEN
        if status == SeasonMatchReportState.CLOSED.value:
            return SeasonMatchReportState.CLOSED
        if ended_at_epoch is not None:
            return SeasonMatchReportState.CLOSED
        return SeasonMatchReportState.OPEN

    @staticmethod
    def should_remove_closed_standings(state: SeasonMatchReportState) -> bool:
        return state is SeasonMatchReportState.CLOSED

    @staticmethod
    def should_reclose_after_lineup_update(state: SeasonMatchReportState) -> bool:
        return state is SeasonMatchReportState.CLOSED

    @staticmethod
    def lineup_update_mode(state: SeasonMatchReportState) -> SeasonMatchLineupUpdateMode:
        if state is SeasonMatchReportState.CLOSED:
            return SeasonMatchLineupUpdateMode.CLOSED_MATCH
        return SeasonMatchLineupUpdateMode.OPEN_MATCH
