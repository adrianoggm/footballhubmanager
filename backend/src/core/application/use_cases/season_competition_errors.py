class InvalidSeasonDataError(Exception):
    pass


class PenaSeasonPenaNotFoundError(Exception):
    pass


class PenaSeasonAccessDeniedError(Exception):
    pass


class PenaSeasonNotFoundError(Exception):
    pass


class PenaSeasonDateOverlapError(Exception):
    pass


class SeasonPlayerNotFoundError(Exception):
    pass


class SeasonPlayerNotInPenaError(Exception):
    pass


class SeasonPlayerAlreadyRegisteredError(Exception):
    pass


class InvalidSeasonPlayerUpdateDataError(Exception):
    pass


class InvalidSeasonPlayerBatchDataError(Exception):
    pass


class SeasonMatchNotFoundError(Exception):
    pass


class SeasonMatchPlayersNotInSeasonError(Exception):
    pass


class SeasonMatchInvalidPlayersError(Exception):
    pass


class InvalidSeasonMatchDataError(Exception):
    pass


class SeasonMatchStatsMismatchError(Exception):
    pass


class SeasonMatchLineupLockedError(Exception):
    pass


class SeasonMatchAlreadyStartedError(Exception):
    pass


class SeasonMatchClockNotRunningError(Exception):
    pass


class SeasonMatchEventNotFoundError(Exception):
    pass


class SeasonMatchEventPlayerNotInMatchError(Exception):
    pass


class SeasonMatchReportClosedError(Exception):
    pass


class SeasonPlayerInMatchError(Exception):
    pass


class InvalidSeasonInsightsDataError(Exception):
    pass
