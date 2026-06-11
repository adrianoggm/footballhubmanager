from core.application.services import (
    SeasonMatchLineupUpdateMode,
    SeasonMatchReportService,
    SeasonMatchReportState,
)


def test_resolve_state_prefers_explicit_persisted_status():
    service = SeasonMatchReportService()

    assert (
        service.resolve_state(persisted_status="open", ended_at_epoch=123)
        is SeasonMatchReportState.OPEN
    )
    assert (
        service.resolve_state(persisted_status="closed", ended_at_epoch=None)
        is SeasonMatchReportState.CLOSED
    )


def test_resolve_state_falls_back_to_end_timestamp_when_status_is_unknown():
    service = SeasonMatchReportService()

    assert (
        service.resolve_state(persisted_status=None, ended_at_epoch=None)
        is SeasonMatchReportState.OPEN
    )
    assert (
        service.resolve_state(persisted_status="weird", ended_at_epoch=123)
        is SeasonMatchReportState.CLOSED
    )


def test_closed_state_policies_are_explicit():
    service = SeasonMatchReportService()

    assert service.should_remove_closed_standings(SeasonMatchReportState.CLOSED) is True
    assert service.should_remove_closed_standings(SeasonMatchReportState.OPEN) is False
    assert service.should_reclose_after_lineup_update(SeasonMatchReportState.CLOSED) is True
    assert service.should_reclose_after_lineup_update(SeasonMatchReportState.OPEN) is False
    assert (
        service.lineup_update_mode(SeasonMatchReportState.CLOSED)
        is SeasonMatchLineupUpdateMode.CLOSED_MATCH
    )
    assert (
        service.lineup_update_mode(SeasonMatchReportState.OPEN)
        is SeasonMatchLineupUpdateMode.OPEN_MATCH
    )
