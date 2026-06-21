import { useEffect, useMemo, useRef, useState } from 'react'

import { adminService } from '../services/adminService.js'
import { isLiveTrackingStatus } from '../components/common/trackingStatus.js'
import {
  buildLineupPlayerOptions,
  normalizePlayerGuids,
  setUnionSize,
} from '../components/admin/matches/lineupHelpers.js'
import {
  buildMatchLineupsDraft,
  buildMatchStatsDraft,
  defaultMatchEventDraft,
  parseMatchEventElapsedDraft,
} from '../components/admin/matches/matchDrafts.js'
import { useFetchWithStaleCheck } from './useFetchWithStaleCheck.js'

const MATCH_EVENT_TYPES_REQUIRING_PLAYER = new Set([
  'goal',
  'assist',
  'save',
  'foul',
  'yellow_card',
  'red_card',
  'sanction',
])

const parseStatsPayload = (values) => {
  const goals = Number(values.goals)
  const assists = Number(values.assists)
  const saves = Number(values.saves)
  const rating = Number(values.rating)
  const integers = [goals, assists, saves]
  const invalidIntegers = integers.some((item) => !Number.isInteger(item) || item < 0)
  if (invalidIntegers || Number.isNaN(rating) || rating < 0) {
    return null
  }
  return {
    player_guid: values.player_guid,
    goals,
    assists,
    saves,
    rating,
  }
}

/**
 * Owns the admin match-tracking concern that was inlined in AdminDashboard:
 * the season match list, the selected match + its drafts, the live
 * polling clock, and every mutate-then-refresh handler.
 *
 * The host injects the cross-feature context it cannot own here:
 * - selection context (selectedPenaGuid/selectedSeasonGuid/seasonList/initializing)
 * - shared infra (runAction/setError/onUnauthorized/showToast/t)
 * - seasonRoster (read for lineup options)
 * - refreshStandingsAndRoster: refreshes the sibling standings + roster after a
 *   match mutation changes scores. The match list refresh is internal.
 */
export function useMatchTracking({
  selectedPenaGuid,
  selectedSeasonGuid,
  seasonRoster,
  seasonList,
  initializing,
  runAction,
  setError,
  onUnauthorized,
  showToast,
  t,
  refreshStandingsAndRoster,
}) {
  const seasonMatchesFetch = useFetchWithStaleCheck()
  // Synchronous single-flight guard for match-event creation. `loading` flips
  // asynchronously, so two taps in the same tick both pass it; this ref blocks
  // the duplicate dispatch immediately.
  const matchEventBusyRef = useRef(false)

  const [deletingMatchGuid, setDeletingMatchGuid] = useState('')
  const [pendingDeleteMatch, setPendingDeleteMatch] = useState(null)
  const [seasonMatches, setSeasonMatches] = useState([])
  const [hiddenDeletedMatchGuids, setHiddenDeletedMatchGuids] = useState([])
  const [seasonMatchesLoading, setSeasonMatchesLoading] = useState(false)
  const [selectedMatchGuid, setSelectedMatchGuid] = useState('')
  const [selectedMatchDetail, setSelectedMatchDetail] = useState(null)
  const [matchLineupsDraft, setMatchLineupsDraft] = useState(null)
  const [matchStatsDraft, setMatchStatsDraft] = useState(null)
  const [matchEventDraft, setMatchEventDraft] = useState(defaultMatchEventDraft)
  const [matchStatsLoading, setMatchStatsLoading] = useState(false)
  const [deletingMatchEventGuid, setDeletingMatchEventGuid] = useState('')

  const matchEditorLineupPlayers = useMemo(
    () =>
      buildLineupPlayerOptions(
        seasonRoster,
        selectedMatchDetail?.home_team?.players || [],
        selectedMatchDetail?.away_team?.players || []
      ),
    [seasonRoster, selectedMatchDetail]
  )

  const matchEventPlayerGuids = useMemo(
    () => ({
      home: new Set(
        (selectedMatchDetail?.home_team?.players || []).map((player) => player.player_guid)
      ),
      away: new Set(
        (selectedMatchDetail?.away_team?.players || []).map((player) => player.player_guid)
      ),
      all: new Set([
        ...(selectedMatchDetail?.home_team?.players || []).map((player) => player.player_guid),
        ...(selectedMatchDetail?.away_team?.players || []).map((player) => player.player_guid),
      ]),
    }),
    [selectedMatchDetail]
  )

  const matchDraftHomeGuids = useMemo(
    () => normalizePlayerGuids(matchLineupsDraft?.home_player_guids),
    [matchLineupsDraft]
  )

  const matchDraftAwayGuids = useMemo(
    () => normalizePlayerGuids(matchLineupsDraft?.away_player_guids),
    [matchLineupsDraft]
  )

  const hiddenDeletedMatchGuidSet = useMemo(
    () => new Set(hiddenDeletedMatchGuids),
    [hiddenDeletedMatchGuids]
  )

  const visibleSeasonMatches = useMemo(
    () => seasonMatches.filter((match) => !hiddenDeletedMatchGuidSet.has(match.guid)),
    [seasonMatches, hiddenDeletedMatchGuidSet]
  )

  const overviewSeasonMatches = useMemo(
    () =>
      [...visibleSeasonMatches]
        .sort((left, right) => {
          if (left.match_date === right.match_date) {
            return String(right.guid || '').localeCompare(String(left.guid || ''))
          }
          return String(right.match_date || '').localeCompare(String(left.match_date || ''))
        })
        .slice(0, 5),
    [visibleSeasonMatches]
  )

  const overviewMatchesSummary = useMemo(() => {
    const total = visibleSeasonMatches.length
    const closed = visibleSeasonMatches.filter(
      (match) => String(match.status || '').toLowerCase() === 'closed'
    ).length
    return {
      total,
      closed,
      open: Math.max(0, total - closed),
    }
  }, [visibleSeasonMatches])

  // Clears the current selection + drafts. The season match list is reset by the
  // loading effect below when the pena/season context changes, so callers that
  // switch context only need to clear the selection.
  const resetSelection = () => {
    setSelectedMatchGuid('')
    setSelectedMatchDetail(null)
    setMatchLineupsDraft(null)
    setMatchStatsDraft(null)
    setMatchEventDraft(defaultMatchEventDraft())
    setDeletingMatchEventGuid('')
  }

  const closeMatchEditor = () => {
    resetSelection()
  }

  const loadSeasonMatches = async (penaGuid, seasonGuid) =>
    seasonMatchesFetch.run(async ({ isStale }) => {
      if (!seasonGuid) {
        if (isStale()) {
          return
        }
        setSeasonMatches([])
        setHiddenDeletedMatchGuids([])
        setSelectedMatchGuid('')
        setSelectedMatchDetail(null)
        setMatchLineupsDraft(null)
        setMatchStatsDraft(null)
        setMatchEventDraft(defaultMatchEventDraft())
        setDeletingMatchEventGuid('')
        return
      }
      const matchesPage = await adminService.listSeasonMatches(penaGuid, seasonGuid, {
        pageSize: 100,
      })
      if (isStale()) {
        return
      }
      const nextMatches = matchesPage.items || []
      setSeasonMatches(nextMatches)
      const stillExists = nextMatches.some((item) => item.guid === selectedMatchGuid)
      if (!stillExists) {
        setSelectedMatchGuid('')
        setSelectedMatchDetail(null)
        setMatchLineupsDraft(null)
        setMatchStatsDraft(null)
        setMatchEventDraft(defaultMatchEventDraft())
        setDeletingMatchEventGuid('')
      }
    })

  const loadMatchDetail = async (penaGuid, seasonGuid, matchGuid) => {
    const detail = await adminService.getMatchDetail(penaGuid, seasonGuid, matchGuid)
    setSelectedMatchGuid(matchGuid)
    setSelectedMatchDetail(detail)
    setMatchLineupsDraft(buildMatchLineupsDraft(detail))
    setMatchStatsDraft(buildMatchStatsDraft(detail))
    setMatchEventDraft(defaultMatchEventDraft())
    setDeletingMatchEventGuid('')
    return detail
  }

  // While a match is being tracked, poll its detail so another admin's
  // pause/stop/events don't leave this client's clock/score stale. This only
  // refreshes selectedMatchDetail so in-progress edits survive.
  const selectedTrackingStatus = selectedMatchDetail?.tracking_status
  useEffect(() => {
    const status = String(selectedTrackingStatus || '').toLowerCase()
    const isTiming = ['live', 'in_progress', 'paused'].includes(status)
    if (!selectedPenaGuid || !selectedSeasonGuid || !selectedMatchGuid || !isTiming) {
      return undefined
    }
    let cancelled = false
    const intervalId = setInterval(async () => {
      try {
        const detail = await adminService.getMatchDetail(
          selectedPenaGuid,
          selectedSeasonGuid,
          selectedMatchGuid
        )
        // Stale guard: ignore if the selection changed while the request was in flight.
        if (cancelled || detail?.guid !== selectedMatchGuid) {
          return
        }
        setSelectedMatchDetail(detail)
      } catch {
        // Transient poll failure: keep the last good detail; the next tick retries.
      }
    }, 5000)
    return () => {
      cancelled = true
      clearInterval(intervalId)
    }
  }, [selectedPenaGuid, selectedSeasonGuid, selectedMatchGuid, selectedTrackingStatus])

  // Season matches feed the always-visible "season matches" summary card, so they
  // load for every section once a pena + season are selected.
  useEffect(() => {
    // A pena/season context change invalidates any optimistic delete hides.
    setHiddenDeletedMatchGuids([])
    if (!selectedPenaGuid || !selectedSeasonGuid || initializing) {
      setSeasonMatches([])
      setSelectedMatchGuid('')
      setSelectedMatchDetail(null)
      setMatchLineupsDraft(null)
      setMatchStatsDraft(null)
      setSeasonMatchesLoading(false)
      return
    }
    if (!seasonList.some((season) => season.guid === selectedSeasonGuid)) {
      setSeasonMatches([])
      setSelectedMatchGuid('')
      setSelectedMatchDetail(null)
      setMatchLineupsDraft(null)
      setMatchStatsDraft(null)
      setSeasonMatchesLoading(false)
      return
    }

    let activeRequest = true
    setSeasonMatchesLoading(true)
    ;(async () => {
      try {
        await loadSeasonMatches(selectedPenaGuid, selectedSeasonGuid)
      } catch (requestError) {
        if (!activeRequest) {
          return
        }
        if (requestError?.status === 401) {
          await onUnauthorized()
          return
        }
        setError(requestError)
      } finally {
        if (activeRequest) {
          setSeasonMatchesLoading(false)
        }
      }
    })()

    return () => {
      activeRequest = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPenaGuid, selectedSeasonGuid, seasonList, initializing])

  const onMatchLineupsDraftChange = ({ homePlayerGuids, awayPlayerGuids }) => {
    setMatchLineupsDraft((prev) => {
      if (!prev) {
        return prev
      }
      return {
        ...prev,
        home_player_guids: homePlayerGuids,
        away_player_guids: awayPlayerGuids,
      }
    })
  }

  const onMatchEventDraftField = (name) => (event) => {
    const value = event.target.value
    setMatchEventDraft((prev) => {
      const next = {
        ...(prev || defaultMatchEventDraft()),
        [name]: value,
      }
      if (name === 'team_side') {
        const allowedPlayers =
          value === 'home'
            ? matchEventPlayerGuids.home
            : value === 'away'
              ? matchEventPlayerGuids.away
              : matchEventPlayerGuids.all
        if (next.player_guid && !allowedPlayers.has(next.player_guid)) {
          next.player_guid = ''
        }
      }
      if (name === 'player_guid' && value && next.related_player_guid === value) {
        next.related_player_guid = ''
      }
      return next
    })
  }

  const onMatchStatsDraftField = (teamKey, playerGuid, field) => (event) => {
    const value = event.target.value
    setMatchStatsDraft((prev) => {
      if (!prev) {
        return prev
      }
      return {
        ...prev,
        [teamKey]: {
          ...prev[teamKey],
          players: (prev[teamKey]?.players || []).map((player) =>
            player.player_guid === playerGuid ? { ...player, [field]: value } : player
          ),
        },
      }
    })
  }

  const handleOpenMatchStats = async (matchGuid) => {
    if (!selectedPenaGuid || !selectedSeasonGuid || !matchGuid) {
      return
    }
    setMatchStatsLoading(true)
    setError(null)
    try {
      await loadMatchDetail(selectedPenaGuid, selectedSeasonGuid, matchGuid)
    } catch (requestError) {
      if (requestError?.status === 401) {
        await onUnauthorized()
        return
      }
      setError(requestError)
    } finally {
      setMatchStatsLoading(false)
    }
  }

  const handleRequestDeleteSeasonMatch = (match) => {
    if (!match?.guid) {
      return
    }
    setPendingDeleteMatch(match)
  }

  const handleCancelDeleteSeasonMatch = () => {
    if (deletingMatchGuid) {
      return
    }
    setPendingDeleteMatch(null)
  }

  const handleDeleteSeasonMatch = async () => {
    const match = pendingDeleteMatch
    if (!selectedPenaGuid || !selectedSeasonGuid || !match?.guid) {
      return
    }
    setPendingDeleteMatch(null)

    const previousSeasonMatches = seasonMatches
    const previousSelectedMatchGuid = selectedMatchGuid
    const previousSelectedMatchDetail = selectedMatchDetail
    const previousMatchLineupsDraft = matchLineupsDraft
    const previousMatchStatsDraft = matchStatsDraft
    const previousMatchEventDraft = matchEventDraft
    const previousDeletingMatchEventGuid = deletingMatchEventGuid
    const deletedWasSelected = selectedMatchGuid === match.guid

    // Cancel any in-flight matches fetch to avoid stale overwrite.
    seasonMatchesFetch.invalidate()

    // Optimistic update: remove from table right away.
    setHiddenDeletedMatchGuids((current) =>
      current.includes(match.guid) ? current : [...current, match.guid]
    )
    setSeasonMatches((current) => current.filter((item) => item.guid !== match.guid))
    if (deletedWasSelected) {
      setSelectedMatchGuid('')
      setSelectedMatchDetail(null)
      setMatchLineupsDraft(null)
      setMatchStatsDraft(null)
      setMatchEventDraft(defaultMatchEventDraft())
      setDeletingMatchEventGuid('')
    }

    setDeletingMatchGuid(match.guid)
    setError(null)
    try {
      if (import.meta.env.DEV) {
        console.debug('[AdminDashboard] delete request start', { matchGuid: match.guid })
      }
      await adminService.deleteSeasonMatch(selectedPenaGuid, selectedSeasonGuid, match.guid)
      if (import.meta.env.DEV) {
        console.debug('[AdminDashboard] delete request success', { matchGuid: match.guid })
      }
      try {
        await refreshStandingsAndRoster(selectedPenaGuid, selectedSeasonGuid)
      } catch (refreshError) {
        if (refreshError?.status === 401) {
          await onUnauthorized()
          return
        }
        setError(refreshError)
      }
      showToast(t('dashboard.admin.notices.matchDeleted'), 'success')
    } catch (deleteError) {
      // Rollback optimistic state only if delete itself failed.
      setHiddenDeletedMatchGuids((current) => current.filter((guid) => guid !== match.guid))
      setSeasonMatches(previousSeasonMatches)
      if (deletedWasSelected) {
        setSelectedMatchGuid(previousSelectedMatchGuid)
        setSelectedMatchDetail(previousSelectedMatchDetail)
        setMatchLineupsDraft(previousMatchLineupsDraft)
        setMatchStatsDraft(previousMatchStatsDraft)
        setMatchEventDraft(previousMatchEventDraft)
        setDeletingMatchEventGuid(previousDeletingMatchEventGuid)
      }
      if (deleteError?.status === 401) {
        await onUnauthorized()
        return
      }
      if (import.meta.env.DEV) {
        console.debug('[AdminDashboard] delete request error', {
          matchGuid: match.guid,
          status: deleteError?.status,
          message: deleteError?.message,
        })
      }
      setError(deleteError)
    } finally {
      setDeletingMatchGuid('')
    }
  }

  const handleSaveMatchLineups = async () => {
    if (!selectedPenaGuid || !selectedSeasonGuid || !selectedMatchGuid || !matchLineupsDraft) {
      return
    }
    const homePlayerGuids = normalizePlayerGuids(matchLineupsDraft.home_player_guids)
    const awayPlayerGuids = normalizePlayerGuids(matchLineupsDraft.away_player_guids)
    if (!homePlayerGuids.length || !awayPlayerGuids.length) {
      setError(new Error(t('dashboard.admin.errors.lineupsRequired')))
      return
    }
    if (
      setUnionSize(homePlayerGuids, awayPlayerGuids) !==
      homePlayerGuids.length + awayPlayerGuids.length
    ) {
      setError(new Error(t('dashboard.admin.errors.lineupsOverlap')))
      return
    }

    await runAction(
      async () => {
        const updated = await adminService.updateMatchLineups(
          selectedPenaGuid,
          selectedSeasonGuid,
          selectedMatchGuid,
          {
            home_team: { player_guids: homePlayerGuids },
            away_team: { player_guids: awayPlayerGuids },
          }
        )
        setSelectedMatchDetail(updated)
        setMatchLineupsDraft(buildMatchLineupsDraft(updated))
        setMatchStatsDraft(buildMatchStatsDraft(updated))
        await Promise.all([
          refreshStandingsAndRoster(selectedPenaGuid, selectedSeasonGuid),
          loadSeasonMatches(selectedPenaGuid, selectedSeasonGuid),
        ])
      },
      {
        message: t('dashboard.admin.notices.lineupsUpdatedWarning'),
        severity: 'warning',
      }
    )
  }

  const handleStartMatch = async () => {
    if (!selectedPenaGuid || !selectedSeasonGuid || !selectedMatchGuid) {
      return
    }

    await runAction(async () => {
      const updated = await adminService.startMatch(
        selectedPenaGuid,
        selectedSeasonGuid,
        selectedMatchGuid
      )
      setSelectedMatchDetail(updated)
      setMatchLineupsDraft(buildMatchLineupsDraft(updated))
      setMatchStatsDraft(buildMatchStatsDraft(updated))
      await loadSeasonMatches(selectedPenaGuid, selectedSeasonGuid)
    }, t('dashboard.admin.notices.matchTrackingStarted'))
  }

  const handleStopMatch = async () => {
    if (!selectedPenaGuid || !selectedSeasonGuid || !selectedMatchGuid) {
      return
    }

    await runAction(async () => {
      const updated = await adminService.stopMatch(
        selectedPenaGuid,
        selectedSeasonGuid,
        selectedMatchGuid
      )
      setSelectedMatchDetail(updated)
      setMatchLineupsDraft(buildMatchLineupsDraft(updated))
      setMatchStatsDraft(buildMatchStatsDraft(updated))
      await loadSeasonMatches(selectedPenaGuid, selectedSeasonGuid)
    }, t('dashboard.admin.notices.matchTrackingStopped'))
  }

  const handlePauseMatch = async () => {
    if (!selectedPenaGuid || !selectedSeasonGuid || !selectedMatchGuid) {
      return
    }

    await runAction(async () => {
      const updated = await adminService.pauseMatch(
        selectedPenaGuid,
        selectedSeasonGuid,
        selectedMatchGuid
      )
      setSelectedMatchDetail(updated)
      await loadSeasonMatches(selectedPenaGuid, selectedSeasonGuid)
    }, t('dashboard.admin.notices.matchTrackingPaused'))
  }

  const handleResumeMatch = async () => {
    if (!selectedPenaGuid || !selectedSeasonGuid || !selectedMatchGuid) {
      return
    }

    await runAction(async () => {
      const updated = await adminService.resumeMatch(
        selectedPenaGuid,
        selectedSeasonGuid,
        selectedMatchGuid
      )
      setSelectedMatchDetail(updated)
      await loadSeasonMatches(selectedPenaGuid, selectedSeasonGuid)
    }, t('dashboard.admin.notices.matchTrackingResumed'))
  }

  const handleSetGoalkeeperRotation = async (rotationSeconds) => {
    if (!selectedPenaGuid || !selectedSeasonGuid || !selectedMatchGuid) {
      return
    }

    await runAction(async () => {
      const updated = await adminService.setGoalkeeperRotation(
        selectedPenaGuid,
        selectedSeasonGuid,
        selectedMatchGuid,
        rotationSeconds
      )
      setSelectedMatchDetail(updated)
      await loadSeasonMatches(selectedPenaGuid, selectedSeasonGuid)
    }, t('dashboard.admin.notices.goalkeeperRotationUpdated'))
  }

  const createMatchEventAndRefresh = async ({
    eventType,
    teamSide,
    playerGuid = '',
    relatedPlayerGuid = '',
    note = '',
    elapsedSeconds = null,
    valueDelta = 1,
    successMessage,
    resetDraft = false,
  }) => {
    if (!selectedPenaGuid || !selectedSeasonGuid || !selectedMatchGuid) {
      return
    }
    // Drop duplicate dispatches from a double-tap before `loading` flips.
    if (matchEventBusyRef.current) {
      return
    }
    matchEventBusyRef.current = true
    try {
      await runAction(async () => {
        const updated = await adminService.createMatchEvent(
          selectedPenaGuid,
          selectedSeasonGuid,
          selectedMatchGuid,
          {
            event_type: eventType,
            team_side: teamSide,
            player_guid: playerGuid || null,
            related_player_guid: relatedPlayerGuid || null,
            note: note || null,
            elapsed_seconds: elapsedSeconds,
            value_delta: valueDelta,
          }
        )
        setSelectedMatchDetail(updated)
        setMatchLineupsDraft(buildMatchLineupsDraft(updated))
        setMatchStatsDraft(buildMatchStatsDraft(updated))
        if (resetDraft) {
          setMatchEventDraft(defaultMatchEventDraft())
        }
        await loadSeasonMatches(selectedPenaGuid, selectedSeasonGuid)
      }, successMessage)
    } finally {
      matchEventBusyRef.current = false
    }
  }

  const handleQuickMatchEvent = async ({
    eventType,
    teamSide,
    playerGuid,
    valueDelta,
    elapsedSeconds = null,
  }) => {
    if (!selectedMatchDetail) {
      return
    }
    if (!isLiveTrackingStatus(selectedMatchDetail.tracking_status)) {
      setError(new Error(t('dashboard.admin.errors.matchTrackingLiveRequired')))
      return
    }
    await createMatchEventAndRefresh({
      eventType,
      teamSide,
      playerGuid,
      valueDelta,
      // Stamp the live minute so quick goals/saves land on the timeline.
      elapsedSeconds,
      successMessage: t('dashboard.admin.notices.matchEventCreated'),
    })
  }

  const handleCreateMatchEvent = async () => {
    if (!selectedPenaGuid || !selectedSeasonGuid || !selectedMatchGuid || !selectedMatchDetail) {
      return
    }

    const elapsed = parseMatchEventElapsedDraft(matchEventDraft)
    if (!elapsed.isValid) {
      setError(new Error(t('dashboard.admin.errors.invalidMatchEventElapsed')))
      return
    }
    if (!isLiveTrackingStatus(selectedMatchDetail.tracking_status) && !elapsed.hasValue) {
      setError(new Error(t('dashboard.admin.errors.matchEventElapsedRequired')))
      return
    }

    const eventType = String(matchEventDraft.event_type || '')
      .trim()
      .toLowerCase()
    const playerGuid = String(matchEventDraft.player_guid || '').trim()
    const relatedPlayerGuid = String(matchEventDraft.related_player_guid || '').trim()
    const valueDelta = Number(matchEventDraft.value_delta || 1)
    if (![1, -1].includes(valueDelta)) {
      setError(new Error(t('dashboard.admin.errors.invalidMatchEventDelta')))
      return
    }
    if (MATCH_EVENT_TYPES_REQUIRING_PLAYER.has(eventType) && !playerGuid) {
      setError(new Error(t('dashboard.admin.errors.matchEventPlayerRequired')))
      return
    }
    if (playerGuid && relatedPlayerGuid && playerGuid === relatedPlayerGuid) {
      setError(new Error(t('dashboard.admin.errors.matchEventPlayersMustDiffer')))
      return
    }

    await createMatchEventAndRefresh({
      eventType: matchEventDraft.event_type,
      teamSide: matchEventDraft.team_side,
      playerGuid,
      relatedPlayerGuid,
      note: String(matchEventDraft.note || '').trim(),
      elapsedSeconds: elapsed.value,
      valueDelta,
      successMessage: t('dashboard.admin.notices.matchEventCreated'),
      resetDraft: true,
    })
  }

  const handleDeleteMatchEvent = async (eventGuid) => {
    if (!selectedPenaGuid || !selectedSeasonGuid || !selectedMatchGuid || !eventGuid) {
      return
    }

    setDeletingMatchEventGuid(eventGuid)
    // Reset in finally so the row never gets stuck "deleting" on error.
    try {
      await runAction(async () => {
        const updated = await adminService.deleteMatchEvent(
          selectedPenaGuid,
          selectedSeasonGuid,
          selectedMatchGuid,
          eventGuid
        )
        setSelectedMatchDetail(updated)
        setMatchLineupsDraft(buildMatchLineupsDraft(updated))
        setMatchStatsDraft(buildMatchStatsDraft(updated))
        await loadSeasonMatches(selectedPenaGuid, selectedSeasonGuid)
      }, t('dashboard.admin.notices.matchEventDeleted'))
    } finally {
      setDeletingMatchEventGuid('')
    }
  }

  const handleSaveMatchStats = async () => {
    if (!selectedPenaGuid || !selectedSeasonGuid || !selectedMatchGuid || !matchStatsDraft) {
      return
    }

    const homePlayers = (matchStatsDraft.home_team?.players || []).map(parseStatsPayload)
    const awayPlayers = (matchStatsDraft.away_team?.players || []).map(parseStatsPayload)
    if (
      !homePlayers.length ||
      !awayPlayers.length ||
      homePlayers.some((item) => !item) ||
      awayPlayers.some((item) => !item)
    ) {
      setError(new Error(t('dashboard.admin.errors.invalidMatchStats')))
      return
    }

    await runAction(async () => {
      const updated = await adminService.updateMatchStats(
        selectedPenaGuid,
        selectedSeasonGuid,
        selectedMatchGuid,
        {
          home_team: { players: homePlayers },
          away_team: { players: awayPlayers },
        }
      )
      setSelectedMatchDetail(updated)
      setMatchStatsDraft(buildMatchStatsDraft(updated))
      await Promise.all([
        refreshStandingsAndRoster(selectedPenaGuid, selectedSeasonGuid),
        loadSeasonMatches(selectedPenaGuid, selectedSeasonGuid),
      ])
    }, t('dashboard.admin.notices.matchStatsUpdated'))
  }

  return {
    // state / derived
    seasonMatchesLoading,
    visibleSeasonMatches,
    overviewSeasonMatches,
    overviewMatchesSummary,
    selectedMatchGuid,
    deletingMatchGuid,
    pendingDeleteMatch,
    matchStatsLoading,
    selectedMatchDetail,
    matchLineupsDraft,
    matchStatsDraft,
    matchEventDraft,
    deletingMatchEventGuid,
    matchEditorLineupPlayers,
    matchDraftHomeGuids,
    matchDraftAwayGuids,
    // actions
    loadSeasonMatches,
    handleOpenMatchStats,
    handleRequestDeleteSeasonMatch,
    handleCancelDeleteSeasonMatch,
    handleDeleteSeasonMatch,
    onMatchLineupsDraftChange,
    handleSaveMatchLineups,
    onMatchEventDraftField,
    handleStartMatch,
    handleStopMatch,
    handlePauseMatch,
    handleResumeMatch,
    handleSetGoalkeeperRotation,
    handleQuickMatchEvent,
    handleCreateMatchEvent,
    handleDeleteMatchEvent,
    onMatchStatsDraftField,
    handleSaveMatchStats,
    closeMatchEditor,
    resetSelection,
  }
}
