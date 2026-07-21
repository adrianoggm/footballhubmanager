import { useEffect, useMemo, useState } from 'react'

import { adminService } from '../services/adminService.js'
import { formatPlayerDisplayName } from '../components/admin/matches/lineupHelpers.js'
import { useForm } from './useForm.js'
import { useI18n } from '../i18n/useI18n.js'

// Small pure helpers duplicated from AdminDashboard.jsx (module-scope, no
// component state) so this hook doesn't need to import from the component
// that consumes it. Keep these in sync if the originals ever change.
const defaultGuestForm = () => ({
  name: '',
  surname1: '',
  surname2: '',
  nationality: 'Spain',
  nickname: '',
  role: '',
  position: '',
})

const defaultSeasonPlayerDraft = () => ({
  wins: '0',
  draws: '0',
  losses: '0',
  quality_level: '0',
  role: '',
  position: '',
})

const defaultMembershipDraft = () => ({
  nickname: '',
  role: '',
  position: '',
})

const hasLabel = (options, value) => {
  const needle = String(value || '')
    .trim()
    .toLowerCase()
  if (!needle) {
    return false
  }
  return (options || []).some(
    (item) =>
      String(item || '')
        .trim()
        .toLowerCase() === needle
  )
}

const pickPreferredLabel = (options, preferred) => {
  if (!(options || []).length) {
    return ''
  }
  const preferredLabel = (options || []).find(
    (item) =>
      String(item || '')
        .trim()
        .toLowerCase() === String(preferred || '').toLowerCase()
  )
  return preferredLabel || options[0] || ''
}

/**
 * Owns the admin "players" concern that was inlined in AdminDashboard: the
 * historical-member list, the multi-select used to register members into the
 * active season, the mutation handlers that create/edit/remove players, and
 * (issue #147, task 8) the season-player / membership EDIT dialogs plus the
 * unified remove-confirmation flow. `AdminPlayersSection` renders those dialogs
 * from the state exposed here, so the section is fully self-contained.
 *
 * Several pieces of player-adjacent state stay owned by AdminDashboard and are
 * only threaded through here as pass-through args, because they are genuinely
 * shared with things this hook does not own:
 * - `seasonRoster`/`seasonRosterLoading` (+ its loader/effect): also read by
 *   match lineups, the overview cards, and `useMatchTracking`.
 * - `penaLabels`/`labelsDraft`/draft role+position labels+colors and
 *   `handleSavePenaLabels`: saving labels also prunes `standingsFilters` and
 *   reloads standings, which are not player concerns.
 * - `guestForm`: its defaults are re-synced from `penaLabels` in AdminDashboard's
 *   pena/season loaders alongside non-player state, so ownership stays there.
 * - `claimLinkPayload`/`handleGenerateClaimLink`/`onCloseClaimLink`: come from
 *   `useInvitations`, which also powers the join-code feature used outside
 *   the players section.
 *
 * AdminDashboard's own cross-cutting loaders keep the pena/season fetch
 * lifecycle, so this hook exposes named actions (`refreshHistoricalPlayers`,
 * `clearHistoricalSelection`, `resetSeasonPlayerDialog`, `resetMembershipDialog`,
 * `syncMembershipDraftLabels`) for those loaders to update the state owned here.
 */
export function useAdminPlayers({
  selectedPenaGuid,
  selectedSeasonGuid,
  selectedSeasonLabel,
  selectedSeason,
  seasonList,
  loading,

  // Season roster: owned by AdminDashboard (shared with match lineups/tracking).
  seasonRoster,
  seasonRosterLoading,
  setSeasonRoster,

  // Pena labels + the labels-editor draft: owned by AdminDashboard.
  penaLabels,
  labelsDraft,
  draftRoleLabels,
  draftPositionLabels,
  draftRoleColors,
  draftPositionColors,
  onLabelsDraftField,
  onLabelColorDraftChange,
  handleSavePenaLabels,

  // Guest-creation form: owned by AdminDashboard.
  guestForm,
  setGuestForm,
  onGuestField,

  nationalities,

  // Claim-link invitation state: owned by AdminDashboard via useInvitations.
  claimLinkPayload,
  handleGenerateClaimLink,
  onCloseClaimLink,

  // Cross-cutting infra.
  runAction,
  setError,
  loadPenaData,
  loadSeasonRoster,
  loadStandings,
}) {
  const { t, language } = useI18n()

  const [historicalPlayers, setHistoricalPlayers] = useState([])
  const [selectedHistoricalGuids, setSelectedHistoricalGuids] = useState([])

  // Player Directory toolbar state (issue #147): search + filters + sort + page.
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState([])
  const [positionFilter, setPositionFilter] = useState([])
  const [statusFilter, setStatusFilter] = useState('all')
  const [sort, setSort] = useState('name_asc')
  const [page, setPage] = useState(1)

  // Season-player / membership EDIT dialogs + unified remove-confirm (task 8).
  const [editingSeasonPlayer, setEditingSeasonPlayer] = useState(null)
  const {
    values: seasonPlayerDraft,
    setValues: setSeasonPlayerDraft,
    onField: onSeasonPlayerDraftField,
  } = useForm(defaultSeasonPlayerDraft)
  const [editingMembershipPlayer, setEditingMembershipPlayer] = useState(null)
  const {
    values: membershipDraft,
    setValues: setMembershipDraft,
    onField: onMembershipDraftField,
  } = useForm(defaultMembershipDraft)
  // { kind: 'season' | 'membership', player } | null
  const [confirmState, setConfirmState] = useState(null)

  const registeredSeasonPlayerGuids = useMemo(
    () => new Set((seasonRoster || []).map((player) => player.player_guid)),
    [seasonRoster]
  )

  const availableHistoricalPlayers = useMemo(
    () =>
      historicalPlayers
        .filter((player) => !registeredSeasonPlayerGuids.has(player.guid))
        .sort((left, right) =>
          formatPlayerDisplayName(left).localeCompare(formatPlayerDisplayName(right))
        ),
    [historicalPlayers, registeredSeasonPlayerGuids]
  )

  const seasonRosterGuids = useMemo(
    () => new Set((seasonRoster || []).map((player) => player.player_guid)),
    [seasonRoster]
  )

  // Keep the multi-select pruned to whatever is still eligible for
  // registration (mirrors the effect that used to live in AdminDashboard).
  useEffect(() => {
    const availableGuids = new Set(availableHistoricalPlayers.map((player) => player.guid))
    setSelectedHistoricalGuids((current) => current.filter((guid) => availableGuids.has(guid)))
  }, [availableHistoricalPlayers])

  const handleSelectHistoricalPlayers = (guids) => {
    const next = Array.isArray(guids) ? guids : typeof guids === 'string' ? guids.split(',') : []
    setSelectedHistoricalGuids(next)
  }

  // Resolves `true` once the mutation has actually run to completion and
  // `false` if the request never fired (guard clause) or `runAction` caught an
  // error, so callers (issue #147, task: header-dialog auto-close) can close
  // the dialog on success while leaving it open when there was a failure.
  const handleRegisterHistoricalPlayersInSeason = async () => {
    if (!selectedPenaGuid || !selectedSeasonGuid || !selectedHistoricalGuids.length) {
      return false
    }
    const totalSelected = selectedHistoricalGuids.length
    let succeeded = false
    await runAction(
      async () => {
        await adminService.registerSeasonPlayersBulk(
          selectedPenaGuid,
          selectedSeasonGuid,
          selectedHistoricalGuids
        )
        setSelectedHistoricalGuids([])
        await loadPenaData(selectedPenaGuid)
        succeeded = true
      },
      t('dashboard.admin.notices.playersAdded', {
        count: totalSelected,
        suffix: totalSelected === 1 ? '' : language === 'es' ? 'es' : 's',
      })
    )
    return succeeded
  }

  const handleRegisterSinglePlayerInSeason = async (playerGuid) => {
    if (!selectedPenaGuid || !selectedSeasonGuid || !playerGuid) {
      return
    }
    await runAction(
      async () => {
        await adminService.registerSeasonPlayersBulk(selectedPenaGuid, selectedSeasonGuid, [
          playerGuid,
        ])
        await loadPenaData(selectedPenaGuid)
      },
      t('dashboard.admin.notices.playersAdded', { count: 1, suffix: '' })
    )
  }

  // The Player Directory row that fires this is a historical member (`.guid`),
  // not a season roster entry. Resolve the roster entry so the draft shows the
  // real season stats and `saveSeasonPlayer` has a `player_guid` to update.
  const handleEditSeasonPlayer = (player) => {
    const targetGuid = player.player_guid || player.guid
    const rosterEntry =
      (seasonRoster || []).find((entry) => entry.player_guid === targetGuid) || player
    setEditingSeasonPlayer(rosterEntry)
    setSeasonPlayerDraft({
      wins: String(rosterEntry.wins ?? 0),
      draws: String(rosterEntry.draws ?? 0),
      losses: String(rosterEntry.losses ?? 0),
      quality_level: String(rosterEntry.quality_level ?? 0),
      role: rosterEntry.role || player.role || '',
      position: rosterEntry.position || player.position || '',
    })
  }

  const closeEditSeason = () => {
    if (loading) {
      return
    }
    setEditingSeasonPlayer(null)
    setSeasonPlayerDraft(defaultSeasonPlayerDraft)
  }

  const saveSeasonPlayer = async () => {
    if (!selectedPenaGuid || !selectedSeasonGuid || !editingSeasonPlayer?.player_guid) {
      return
    }
    const wins = Number(seasonPlayerDraft.wins)
    const draws = Number(seasonPlayerDraft.draws)
    const losses = Number(seasonPlayerDraft.losses)
    const qualityLevel = Number(seasonPlayerDraft.quality_level)
    const invalid =
      !Number.isInteger(wins) ||
      wins < 0 ||
      !Number.isInteger(draws) ||
      draws < 0 ||
      !Number.isInteger(losses) ||
      losses < 0 ||
      Number.isNaN(qualityLevel) ||
      qualityLevel < 0
    if (invalid) {
      setError(new Error(t('dashboard.admin.errors.invalidSeasonPlayerStats')))
      return
    }
    await runAction(async () => {
      await adminService.updateSeasonPlayerStats(
        selectedPenaGuid,
        selectedSeasonGuid,
        editingSeasonPlayer.player_guid,
        {
          wins,
          draws,
          losses,
          quality_level: qualityLevel,
          role: seasonPlayerDraft.role.trim() || null,
          position: seasonPlayerDraft.position.trim() || null,
        }
      )
      await Promise.all([
        loadSeasonRoster(selectedPenaGuid, selectedSeasonGuid).then(setSeasonRoster),
        loadStandings(selectedPenaGuid, selectedSeasonGuid),
      ])
      setEditingSeasonPlayer(null)
      setSeasonPlayerDraft(defaultSeasonPlayerDraft)
    }, t('dashboard.admin.notices.seasonPlayerUpdated'))
  }

  // Same success/failure resolution contract as
  // `handleRegisterHistoricalPlayersInSeason` above.
  const handleCreateGuestPlayer = async (registerInSelectedSeason) => {
    if (!selectedPenaGuid) {
      return false
    }
    if (registerInSelectedSeason && !selectedSeasonGuid) {
      setError(new Error(t('dashboard.admin.errors.selectedSeasonRequired')))
      return false
    }
    let succeeded = false
    await runAction(
      async () => {
        const created = await adminService.createGuestPlayer(selectedPenaGuid, {
          name: guestForm.name,
          surname1: guestForm.surname1,
          surname2: guestForm.surname2 || null,
          nationality: guestForm.nationality,
          nickname: guestForm.nickname || null,
          role: guestForm.role || null,
          position: guestForm.position || null,
        })
        if (registerInSelectedSeason && selectedSeasonGuid) {
          await adminService.registerSeasonPlayer(
            selectedPenaGuid,
            selectedSeasonGuid,
            created.player_guid
          )
        }
        setGuestForm((prev) => ({
          ...defaultGuestForm(),
          nationality: prev.nationality || 'Spain',
          role: pickPreferredLabel(penaLabels.role_labels, 'guest'),
        }))
        await loadPenaData(selectedPenaGuid)
        if (registerInSelectedSeason && selectedSeasonGuid) {
          await Promise.all([
            loadSeasonRoster(selectedPenaGuid, selectedSeasonGuid).then(setSeasonRoster),
            loadStandings(selectedPenaGuid, selectedSeasonGuid),
          ])
        }
        succeeded = true
      },
      registerInSelectedSeason
        ? t('dashboard.admin.notices.guestCreatedAdded')
        : t('dashboard.admin.notices.guestCreated')
    )
    return succeeded
  }

  const handleEditMembershipPlayer = (player) => {
    setEditingMembershipPlayer(player)
    setMembershipDraft({
      nickname: player.nickname || '',
      role: player.role || '',
      position: player.position || '',
    })
  }

  const closeEditMembership = () => {
    if (loading) {
      return
    }
    setEditingMembershipPlayer(null)
    setMembershipDraft(defaultMembershipDraft)
  }

  const saveMembershipPlayer = async () => {
    if (!selectedPenaGuid || !editingMembershipPlayer?.guid) {
      return
    }
    await runAction(async () => {
      await adminService.updatePenaPlayerMembership(
        selectedPenaGuid,
        editingMembershipPlayer.guid,
        {
          nickname: membershipDraft.nickname.trim() || null,
          role: membershipDraft.role.trim() || null,
          position: membershipDraft.position.trim() || null,
        }
      )
      await loadPenaData(selectedPenaGuid)
      setEditingMembershipPlayer(null)
      setMembershipDraft(defaultMembershipDraft)
    }, t('dashboard.admin.notices.membershipUpdatedByAdmin'))
  }

  const handleRequestRemoveSeasonPlayer = (player) => {
    setConfirmState({ kind: 'season', player })
  }

  const handleRequestRemoveMembershipPlayer = (player) => {
    setConfirmState({ kind: 'membership', player })
  }

  const cancelConfirm = () => {
    if (loading) {
      return
    }
    setConfirmState(null)
  }

  const confirmRemove = async () => {
    if (!confirmState) {
      return
    }
    const { kind, player } = confirmState
    if (kind === 'season') {
      // Directory rows carry `.guid`; legacy roster entries carry `.player_guid`.
      const playerGuid = player.player_guid || player.guid
      if (!selectedPenaGuid || !selectedSeasonGuid || !playerGuid) {
        return
      }
      setConfirmState(null)
      await runAction(async () => {
        await adminService.unregisterSeasonPlayer(selectedPenaGuid, selectedSeasonGuid, playerGuid)
        await Promise.all([
          loadSeasonRoster(selectedPenaGuid, selectedSeasonGuid).then(setSeasonRoster),
          loadStandings(selectedPenaGuid, selectedSeasonGuid),
        ])
      }, t('dashboard.admin.notices.seasonPlayerRemoved'))
      return
    }
    if (!selectedPenaGuid || !player?.guid) {
      return
    }
    setConfirmState(null)
    await runAction(async () => {
      await adminService.removePenaPlayerMembership(selectedPenaGuid, player.guid)
      await loadPenaData(selectedPenaGuid)
    }, t('dashboard.admin.notices.membershipRemovedByAdmin'))
  }

  // Named actions for AdminDashboard's cross-cutting pena/season loaders, which
  // still own the fetch lifecycle and must update the state owned here.
  const refreshHistoricalPlayers = (list) => {
    setHistoricalPlayers(list || [])
  }

  const clearHistoricalSelection = () => {
    setSelectedHistoricalGuids([])
  }

  const resetSeasonPlayerDialog = () => {
    setEditingSeasonPlayer(null)
    setSeasonPlayerDraft(defaultSeasonPlayerDraft)
    setConfirmState((current) => (current?.kind === 'season' ? null : current))
  }

  const resetMembershipDialog = () => {
    setEditingMembershipPlayer(null)
    setMembershipDraft(defaultMembershipDraft)
    setConfirmState((current) => (current?.kind === 'membership' ? null : current))
  }

  const syncMembershipDraftLabels = (labels) => {
    setMembershipDraft((prev) => ({
      ...prev,
      role: hasLabel(labels?.role_labels, prev.role) ? prev.role : '',
      position: hasLabel(labels?.position_labels, prev.position) ? prev.position : '',
    }))
  }

  // Bundle in the SAME shape AdminPlayersSection consumes.
  const state = {
    selectedSeason,
    selectedSeasonLabel,
    seasonList,
    selectedHistoricalGuids,
    availableHistoricalPlayers,
    loading,
    selectedSeasonGuid,
    seasonRosterLoading,
    seasonRoster,
    historicalPlayers,
    penaLabels,
    labelsDraft,
    draftRoleLabels,
    draftPositionLabels,
    draftRoleColors,
    draftPositionColors,
    guestForm,
    nationalities,
    claimLinkPayload,
  }

  const actions = {
    handleSelectHistoricalPlayers,
    handleRegisterHistoricalPlayersInSeason,
    handleRegisterSinglePlayerInSeason,
    handleEditSeasonPlayer,
    handleRequestRemoveSeasonPlayer,
    onGuestField,
    handleCreateGuestPlayer,
    handleEditMembershipPlayer,
    handleRequestRemoveMembershipPlayer,
    handleGenerateClaimLink,
    onCloseClaimLink,
    onLabelsDraftField,
    onLabelColorDraftChange,
    handleSavePenaLabels,
  }

  return {
    players: historicalPlayers,
    seasonRosterGuids,
    state,
    actions,
    toolbar: { search, roleFilter, positionFilter, statusFilter, sort, page },
    toolbarActions: {
      setSearch,
      setRoleFilter,
      setPositionFilter,
      setStatusFilter,
      setSort,
      setPage,
    },

    // Dialog state owned here (task 8); the section renders the dialogs from it.
    editingSeasonPlayer,
    seasonPlayerDraft,
    onSeasonPlayerDraftField,
    saveSeasonPlayer,
    closeEditSeason,
    editingMembershipPlayer,
    membershipDraft,
    onMembershipDraftField,
    saveMembershipPlayer,
    closeEditMembership,
    confirmState,
    confirmRemove,
    cancelConfirm,
    claimLinkPayload,

    // Named actions for AdminDashboard's cross-cutting loaders (replace the
    // former raw `setHistoricalPlayers` / `setSelectedHistoricalGuids` escape
    // hatches and the inline dialog-state resets).
    refreshHistoricalPlayers,
    clearHistoricalSelection,
    resetSeasonPlayerDialog,
    resetMembershipDialog,
    syncMembershipDraftLabels,
  }
}
