import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Divider,
  Grid,
  LinearProgress,
  MenuItem,
  Stack,
  Tab,
  Tabs,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TableContainer,
  TextField,
  Typography
} from '@mui/material'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useI18n } from '../i18n/useI18n.js'
import { adminService } from '../services/adminService.js'
import LineupDragBuilder from './LineupDragBuilder.jsx'

const todayIso = () => new Date().toISOString().slice(0, 10)

const defaultSeasonForm = () => ({
  start_date: todayIso(),
  end_date: todayIso(),
  points_win: 3,
  points_draw: 1,
  points_loss: 0
})

const defaultMatchForm = () => ({
  match_date: todayIso(),
  home_team_name: '',
  away_team_name: '',
  home_player_guids: [],
  away_player_guids: []
})

const defaultGuestForm = () => ({
  name: '',
  surname1: '',
  surname2: '',
  nationality: 'Spain',
  nickname: '',
  position: ''
})

const splitGuids = (value) =>
  value
    .split(/[\n,]/g)
    .map((item) => item.trim())
    .filter(Boolean)

const normalizePlayerGuids = (value) => {
  if (Array.isArray(value)) {
    return Array.from(
      new Set(value.map((item) => String(item || '').trim()).filter(Boolean))
    )
  }
  if (typeof value === 'string') {
    return Array.from(new Set(splitGuids(value)))
  }
  return []
}

const setUnionSize = (left, right) => new Set([...left, ...right]).size

const formatDate = (value) => {
  if (!value) {
    return '-'
  }
  const asDate = new Date(`${value}T00:00:00`)
  return asDate.toLocaleDateString()
}

const formatEpochSeconds = (value) => {
  if (!value) {
    return '-'
  }
  return new Date(value * 1000).toLocaleString()
}

const addDaysIso = (isoDate, days) => {
  const [year, month, day] = isoDate.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}

const getLatestSeasonEndDate = (seasons) => {
  if (!seasons.length) {
    return null
  }
  return seasons.reduce(
    (latest, season) => (!latest || season.end_date > latest ? season.end_date : latest),
    null
  )
}

const buildNextSeasonDateRange = (seasons) => {
  const latestSeasonEndDate = getLatestSeasonEndDate(seasons)
  if (!latestSeasonEndDate) {
    const startDate = todayIso()
    return {
      start_date: startDate,
      end_date: addDaysIso(startDate, 90)
    }
  }
  return {
    start_date: addDaysIso(latestSeasonEndDate, 1),
    end_date: addDaysIso(latestSeasonEndDate, 90)
  }
}

const mapDashboardErrorMessage = (error, t) => {
  const raw = String(error?.message || '').toLowerCase()
  if (!raw) {
    return t('dashboard.common.errors.generic')
  }
  if (error?.status === 403 || raw.includes('forbidden')) {
    return t('dashboard.common.errors.forbidden')
  }
  if (raw.includes('failed to fetch') || raw.includes('network')) {
    return t('dashboard.common.errors.network')
  }
  return error.message
}

const formatPlayerDisplayName = (player) => {
  const fullName = [player.name, player.surname1, player.surname2].filter(Boolean).join(' ')
  if (player.nickname && fullName) {
    return `${player.nickname} (${fullName})`
  }
  if (player.nickname) {
    return player.nickname
  }
  return fullName || player.player_guid || player.guid || ''
}

const buildLineupPlayerOptions = (...groups) => {
  const byGuid = new Map()
  groups
    .flat()
    .filter(Boolean)
    .forEach((player) => {
      const guid = String(player.player_guid || player.guid || '').trim()
      if (!guid || byGuid.has(guid)) {
        return
      }
      byGuid.set(guid, {
        guid,
        label: formatPlayerDisplayName(player) || guid
      })
    })
  return Array.from(byGuid.values())
}

const buildTeamStatsDraft = (team) => ({
  players: (team?.players || []).map((player) => ({
    player_guid: player.player_guid,
    goals: String(player.goals ?? 0),
    assists: String(player.assists ?? 0),
    saves: String(player.saves ?? 0),
    rating: String(player.rating ?? 0)
  }))
})

const buildMatchStatsDraft = (detail) => ({
  home_team: buildTeamStatsDraft(detail?.home_team),
  away_team: buildTeamStatsDraft(detail?.away_team)
})

const buildMatchLineupsDraft = (detail) => ({
  home_player_guids: (detail?.home_team?.players || []).map((player) => player.player_guid),
  away_player_guids: (detail?.away_team?.players || []).map((player) => player.player_guid)
})

const collectPagedItems = async (fetchPage) => {
  const items = []
  let page = 1
  while (true) {
    const response = await fetchPage(page)
    const pageItems = response.items || []
    items.push(...pageItems)
    const totalPages = Number(response.total_pages || 0)
    if (totalPages && page >= totalPages) {
      break
    }
    if (!totalPages && !pageItems.length) {
      break
    }
    page += 1
  }
  return items
}

export default function AdminDashboard({ session, onLogout }) {
  const { language, t } = useI18n()
  const seasonMatchesRequestIdRef = useRef(0)
  const [loading, setLoading] = useState(false)
  const [deletingMatchGuid, setDeletingMatchGuid] = useState('')
  const [pendingDeleteMatch, setPendingDeleteMatch] = useState(null)
  const [initializing, setInitializing] = useState(true)
  const [error, setError] = useState(null)
  const [notice, setNotice] = useState('')

  const [penas, setPenas] = useState([])
  const [selectedPenaGuid, setSelectedPenaGuid] = useState('')
  const [activeSection, setActiveSection] = useState('overview')

  const [activeSeason, setActiveSeason] = useState(null)
  const [seasonList, setSeasonList] = useState([])
  const [selectedSeasonGuid, setSelectedSeasonGuid] = useState('')
  const [seasonRoster, setSeasonRoster] = useState([])
  const [seasonRosterLoading, setSeasonRosterLoading] = useState(false)
  const [historicalPlayers, setHistoricalPlayers] = useState([])
  const [selectedHistoricalGuids, setSelectedHistoricalGuids] = useState([])
  const [standings, setStandings] = useState([])
  const [seasonMatches, setSeasonMatches] = useState([])
  const [hiddenDeletedMatchGuids, setHiddenDeletedMatchGuids] = useState([])
  const [seasonMatchesLoading, setSeasonMatchesLoading] = useState(false)
  const [selectedMatchGuid, setSelectedMatchGuid] = useState('')
  const [selectedMatchDetail, setSelectedMatchDetail] = useState(null)
  const [matchLineupsDraft, setMatchLineupsDraft] = useState(null)
  const [matchStatsDraft, setMatchStatsDraft] = useState(null)
  const [matchStatsLoading, setMatchStatsLoading] = useState(false)
  const [tokenPayload, setTokenPayload] = useState(null)
  const [lastCreatedMatch, setLastCreatedMatch] = useState(null)
  const [nationalities, setNationalities] = useState([])

  const [seasonForm, setSeasonForm] = useState(defaultSeasonForm)
  const [pointsForm, setPointsForm] = useState({
    points_win: 3,
    points_draw: 1,
    points_loss: 0
  })
  const [matchForm, setMatchForm] = useState(defaultMatchForm)
  const [guestForm, setGuestForm] = useState(defaultGuestForm)

  const historySeasons = useMemo(() => {
    if (!activeSeason) {
      return seasonList
    }
    return seasonList.filter((item) => item.guid !== activeSeason.guid)
  }, [activeSeason, seasonList])

  const latestSeasonEndDate = useMemo(
    () => getLatestSeasonEndDate(seasonList),
    [seasonList]
  )

  const selectedSeason = useMemo(
    () => seasonList.find((item) => item.guid === selectedSeasonGuid) || null,
    [seasonList, selectedSeasonGuid]
  )

  const selectedPena = useMemo(
    () => penas.find((item) => item.guid === selectedPenaGuid) || null,
    [penas, selectedPenaGuid]
  )

  const errorMessage = useMemo(
    () => (error ? mapDashboardErrorMessage(error, t) : ''),
    [error, t]
  )

  const registeredSeasonPlayerGuids = useMemo(
    () => new Set(seasonRoster.map((player) => player.player_guid)),
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

  const createMatchLineupPlayers = useMemo(
    () => buildLineupPlayerOptions(seasonRoster),
    [seasonRoster]
  )

  const matchEditorLineupPlayers = useMemo(
    () =>
      buildLineupPlayerOptions(
        seasonRoster,
        selectedMatchDetail?.home_team?.players || [],
        selectedMatchDetail?.away_team?.players || []
      ),
    [seasonRoster, selectedMatchDetail]
  )

  const matchFormHomeGuids = useMemo(
    () => normalizePlayerGuids(matchForm.home_player_guids),
    [matchForm.home_player_guids]
  )

  const matchFormAwayGuids = useMemo(
    () => normalizePlayerGuids(matchForm.away_player_guids),
    [matchForm.away_player_guids]
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
    () =>
      seasonMatches.filter((match) => !hiddenDeletedMatchGuidSet.has(match.guid)),
    [seasonMatches, hiddenDeletedMatchGuidSet]
  )

  const onSeasonField = (name) => (event) => {
    const value = name.startsWith('points_') ? Number(event.target.value) : event.target.value
    setSeasonForm((prev) => ({ ...prev, [name]: value }))
  }

  const onPointsField = (name) => (event) => {
    setPointsForm((prev) => ({ ...prev, [name]: Number(event.target.value) }))
  }

  const onMatchField = (name) => (event) => {
    setMatchForm((prev) => ({ ...prev, [name]: event.target.value }))
  }

  const onMatchFormLineupsChange = ({ homePlayerGuids, awayPlayerGuids }) => {
    setMatchForm((prev) => ({
      ...prev,
      home_player_guids: homePlayerGuids,
      away_player_guids: awayPlayerGuids
    }))
  }

  const onMatchLineupsDraftChange = ({ homePlayerGuids, awayPlayerGuids }) => {
    setMatchLineupsDraft((prev) => {
      if (!prev) {
        return prev
      }
      return {
        ...prev,
        home_player_guids: homePlayerGuids,
        away_player_guids: awayPlayerGuids
      }
    })
  }

  const onGuestField = (name) => (event) => {
    setGuestForm((prev) => ({ ...prev, [name]: event.target.value }))
  }

  const runAction = async (action, successMessage) => {
    setLoading(true)
    setError(null)
    setNotice('')
    try {
      await action()
      if (successMessage) {
        setNotice(successMessage)
      }
    } catch (actionError) {
      if (actionError?.status === 401) {
        await onLogout()
        return
      }
      setError(actionError)
    } finally {
      setLoading(false)
    }
  }

  const loadStandings = async (penaGuid, seasonGuid) => {
    const standingsPage = await adminService.listStandings(penaGuid, seasonGuid, { pageSize: 10 })
    setStandings(standingsPage.items || [])
  }

  const loadHistoricalPlayers = async (penaGuid) =>
    collectPagedItems((page) =>
      adminService.listPenaPlayers(penaGuid, { page, pageSize: 100 })
    )

  const loadSeasonRoster = async (penaGuid, seasonGuid) => {
    if (!seasonGuid) {
      return []
    }
    return collectPagedItems((page) =>
      adminService.listSeasonPlayers(penaGuid, seasonGuid, {
        page,
        pageSize: 100,
        orderBy: 'points',
        orderDir: 'desc'
      })
    )
  }

  const loadSeasonMatches = async (penaGuid, seasonGuid) => {
    const requestId = seasonMatchesRequestIdRef.current + 1
    seasonMatchesRequestIdRef.current = requestId

    if (!seasonGuid) {
      if (requestId !== seasonMatchesRequestIdRef.current) {
        return
      }
      setSeasonMatches([])
      setHiddenDeletedMatchGuids([])
      setSelectedMatchGuid('')
      setSelectedMatchDetail(null)
      setMatchLineupsDraft(null)
      setMatchStatsDraft(null)
      return
    }
    const matchesPage = await adminService.listSeasonMatches(penaGuid, seasonGuid, { pageSize: 100 })
    if (requestId !== seasonMatchesRequestIdRef.current) {
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
    }
  }

  const loadMatchDetail = async (penaGuid, seasonGuid, matchGuid) => {
    const detail = await adminService.getMatchDetail(penaGuid, seasonGuid, matchGuid)
    setSelectedMatchGuid(matchGuid)
    setSelectedMatchDetail(detail)
    setMatchLineupsDraft(buildMatchLineupsDraft(detail))
    setMatchStatsDraft(buildMatchStatsDraft(detail))
    return detail
  }

  const loadPenaData = async (penaGuid) => {
    const [active, seasonsPage, penaPlayers] = await Promise.all([
      adminService.getActiveSeason(penaGuid).catch((requestError) => {
        if (requestError.status === 404) {
          return null
        }
        throw requestError
      }),
      adminService.listSeasons(penaGuid, { pageSize: 100 }),
      loadHistoricalPlayers(penaGuid)
    ])

    const seasonItems = seasonsPage.items || []
    setActiveSeason(active)
    setSeasonList(seasonItems)
    setHistoricalPlayers(penaPlayers)

    const nextRange = buildNextSeasonDateRange(seasonItems)
    const pointsReference = active || seasonItems[0]
    setSeasonForm({
      ...nextRange,
      points_win: pointsReference?.points_win ?? 3,
      points_draw: pointsReference?.points_draw ?? 1,
      points_loss: pointsReference?.points_loss ?? 0
    })

    const fallbackSeasonGuid = active?.guid || seasonItems[0]?.guid || ''
    setSelectedSeasonGuid((currentGuid) => {
      if (currentGuid && seasonItems.some((item) => item.guid === currentGuid)) {
        return currentGuid
      }
      return fallbackSeasonGuid
    })
    setSelectedHistoricalGuids([])

    if (active) {
      setPointsForm({
        points_win: active.points_win,
        points_draw: active.points_draw,
        points_loss: active.points_loss
      })
      await loadStandings(penaGuid, active.guid)
    } else {
      setStandings([])
    }
  }

  const loadDashboard = async () => {
    setInitializing(true)
    setError(null)
    try {
      const [penaPage, catalogNationalities] = await Promise.all([
        adminService.getPenas({ pageSize: 50 }),
        adminService.getNationalities().catch(() => [])
      ])
      const penaItems = penaPage.items || []
      setPenas(penaItems)
      setNationalities(catalogNationalities)
      if (catalogNationalities.length && !catalogNationalities.includes(guestForm.nationality)) {
        setGuestForm((prev) => ({ ...prev, nationality: catalogNationalities[0] }))
      }

      const defaultPena = selectedPenaGuid || penaItems[0]?.guid || ''
      setSelectedPenaGuid(defaultPena)

      if (defaultPena) {
        await loadPenaData(defaultPena)
      } else {
        setActiveSeason(null)
        setSeasonList([])
        setStandings([])
        setSeasonMatches([])
        setSelectedMatchGuid('')
        setSelectedMatchDetail(null)
        setMatchLineupsDraft(null)
        setMatchStatsDraft(null)
      }
    } catch (requestError) {
      if (requestError?.status === 401) {
        await onLogout()
        return
      }
      setError(requestError)
    } finally {
      setInitializing(false)
    }
  }

  useEffect(() => {
    loadDashboard()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!selectedPenaGuid || initializing) {
      return
    }
    runAction(
      () => loadPenaData(selectedPenaGuid),
      ''
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPenaGuid])

  useEffect(() => {
    if (!selectedPenaGuid || !selectedSeasonGuid || initializing) {
      setSeasonRoster([])
      setSeasonRosterLoading(false)
      return
    }
    if (!seasonList.some((season) => season.guid === selectedSeasonGuid)) {
      setSeasonRoster([])
      setSeasonRosterLoading(false)
      return
    }

    let activeRequest = true
    setSeasonRosterLoading(true)
    ;(async () => {
      try {
        const rosterItems = await loadSeasonRoster(selectedPenaGuid, selectedSeasonGuid)
        if (!activeRequest) {
          return
        }
        setSeasonRoster(rosterItems)
      } catch (requestError) {
        if (!activeRequest) {
          return
        }
        if (requestError?.status === 401) {
          await onLogout()
          return
        }
        setError(requestError)
      } finally {
        if (activeRequest) {
          setSeasonRosterLoading(false)
        }
      }
    })()

    return () => {
      activeRequest = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPenaGuid, selectedSeasonGuid, seasonList, initializing])

  useEffect(() => {
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
          await onLogout()
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

  useEffect(() => {
    const availableGuids = new Set(availableHistoricalPlayers.map((player) => player.guid))
    setSelectedHistoricalGuids((current) => current.filter((guid) => availableGuids.has(guid)))
  }, [availableHistoricalPlayers])

  const handleCreateSeason = async () => {
    if (!selectedPenaGuid) {
      return
    }
    await runAction(async () => {
      await adminService.createSeason(selectedPenaGuid, seasonForm)
      await loadPenaData(selectedPenaGuid)
    }, t('dashboard.admin.notices.seasonCreated'))
  }

  const handlePrefillNextSeason = () => {
    if (!latestSeasonEndDate) {
      return
    }
    const startDate = addDaysIso(latestSeasonEndDate, 1)
    const endDate = addDaysIso(latestSeasonEndDate, 90)
    setSeasonForm((prev) => ({
      ...prev,
      start_date: startDate,
      end_date: endDate
    }))
  }

  const handleUpdateSeasonPoints = async () => {
    if (!selectedPenaGuid || !activeSeason) {
      return
    }
    await runAction(async () => {
      await adminService.updateSeason(selectedPenaGuid, activeSeason.guid, pointsForm)
      await loadPenaData(selectedPenaGuid)
    }, t('dashboard.admin.notices.seasonPointsUpdated'))
  }

  const handleCreateDetailedMatch = async () => {
    if (!selectedPenaGuid || !activeSeason) {
      return
    }
    const homeLineup = normalizePlayerGuids(matchForm.home_player_guids)
    const awayLineup = normalizePlayerGuids(matchForm.away_player_guids)
    if (!homeLineup.length || !awayLineup.length) {
      setError(new Error(t('dashboard.admin.errors.lineupsRequired')))
      return
    }
    if (setUnionSize(homeLineup, awayLineup) !== homeLineup.length + awayLineup.length) {
      setError(new Error(t('dashboard.admin.errors.lineupsOverlap')))
      return
    }
    await runAction(async () => {
      const created = await adminService.createDetailedMatch(selectedPenaGuid, activeSeason.guid, {
        match_date: matchForm.match_date,
        home_team: {
          team_name: matchForm.home_team_name,
          player_guids: homeLineup
        },
        away_team: {
          team_name: matchForm.away_team_name,
          player_guids: awayLineup
        }
      })
      setLastCreatedMatch(created)
      await loadPenaData(selectedPenaGuid)
      if (selectedSeasonGuid) {
        await loadSeasonMatches(selectedPenaGuid, selectedSeasonGuid)
      }
    }, t('dashboard.admin.notices.detailedMatchCreated'))
  }

  const handleGenerateJoinCode = async () => {
    if (!selectedPenaGuid) {
      return
    }
    await runAction(async () => {
      const token = await adminService.createLinkToken(selectedPenaGuid)
      setTokenPayload(token)
    }, t('dashboard.admin.notices.joinCodeGenerated'))
  }

  const handleCreateGuestPlayer = async (registerInActiveSeason) => {
    if (!selectedPenaGuid) {
      return
    }
    if (registerInActiveSeason && !activeSeason) {
      setError(new Error(t('dashboard.admin.errors.activeSeasonRequired')))
      return
    }
    await runAction(async () => {
      const created = await adminService.createGuestPlayer(selectedPenaGuid, {
        name: guestForm.name,
        surname1: guestForm.surname1,
        surname2: guestForm.surname2 || null,
        nationality: guestForm.nationality,
        nickname: guestForm.nickname || null,
        position: guestForm.position || null
      })
      if (registerInActiveSeason && activeSeason) {
        await adminService.registerSeasonPlayer(selectedPenaGuid, activeSeason.guid, created.player_guid)
      }
      setGuestForm((prev) => ({
        ...defaultGuestForm(),
        nationality: prev.nationality || 'Spain'
      }))
      await loadPenaData(selectedPenaGuid)
    }, registerInActiveSeason
      ? t('dashboard.admin.notices.guestCreatedAdded')
      : t('dashboard.admin.notices.guestCreated'))
  }

  const handleSeasonSelection = (event) => {
    const nextSeasonGuid = event.target.value
    setSelectedSeasonGuid(nextSeasonGuid)
    setSelectedHistoricalGuids([])
    setHiddenDeletedMatchGuids([])
    setMatchForm((prev) => ({
      ...prev,
      home_player_guids: [],
      away_player_guids: []
    }))
    setSelectedMatchGuid('')
    setSelectedMatchDetail(null)
    setMatchLineupsDraft(null)
    setMatchStatsDraft(null)
    if (!selectedPenaGuid || !nextSeasonGuid) {
      setStandings([])
      setSeasonMatches([])
      return
    }
    runAction(
      () => loadStandings(selectedPenaGuid, nextSeasonGuid),
      ''
    )
  }

  const handleSelectHistoricalPlayers = (event) => {
    const value = event.target.value
    setSelectedHistoricalGuids(typeof value === 'string' ? value.split(',') : value)
  }

  const handleRegisterHistoricalPlayersInSeason = async () => {
    if (!selectedPenaGuid || !selectedSeasonGuid || !selectedHistoricalGuids.length) {
      return
    }
    const totalSelected = selectedHistoricalGuids.length
    await runAction(async () => {
      await adminService.registerSeasonPlayersBulk(
        selectedPenaGuid,
        selectedSeasonGuid,
        selectedHistoricalGuids
      )
      setSelectedHistoricalGuids([])
      await loadPenaData(selectedPenaGuid)
    }, t('dashboard.admin.notices.playersAdded', {
      count: totalSelected,
      suffix: totalSelected === 1 ? '' : language === 'es' ? 'es' : 's'
    }))
  }

  const handleRefreshStandings = async () => {
    if (!selectedPenaGuid || !selectedSeasonGuid) {
      return
    }
    await runAction(
      () => loadStandings(selectedPenaGuid, selectedSeasonGuid),
      t('dashboard.admin.notices.standingsUpdated')
    )
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
        await onLogout()
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
    const deletedWasSelected = selectedMatchGuid === match.guid

    // Cancel any in-flight matches fetch to avoid stale overwrite.
    seasonMatchesRequestIdRef.current += 1

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
    }

    setDeletingMatchGuid(match.guid)
    setError(null)
    setNotice('')
    try {
      if (import.meta.env.DEV) {
        console.debug('[AdminDashboard] delete request start', { matchGuid: match.guid })
      }
      await adminService.deleteSeasonMatch(selectedPenaGuid, selectedSeasonGuid, match.guid)
      if (import.meta.env.DEV) {
        console.debug('[AdminDashboard] delete request success', { matchGuid: match.guid })
      }
      try {
        await loadStandings(selectedPenaGuid, selectedSeasonGuid)
      } catch (refreshError) {
        if (refreshError?.status === 401) {
          await onLogout()
          return
        }
        setError(refreshError)
      }
      setNotice(t('dashboard.admin.notices.matchDeleted'))
    } catch (deleteError) {
      // Rollback optimistic state only if delete itself failed.
      setHiddenDeletedMatchGuids((current) => current.filter((guid) => guid !== match.guid))
      setSeasonMatches(previousSeasonMatches)
      if (deletedWasSelected) {
        setSelectedMatchGuid(previousSelectedMatchGuid)
        setSelectedMatchDetail(previousSelectedMatchDetail)
        setMatchLineupsDraft(previousMatchLineupsDraft)
        setMatchStatsDraft(previousMatchStatsDraft)
      }
      if (deleteError?.status === 401) {
        await onLogout()
        return
      }
      if (import.meta.env.DEV) {
        console.debug('[AdminDashboard] delete request error', {
          matchGuid: match.guid,
          status: deleteError?.status,
          message: deleteError?.message
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
    if (setUnionSize(homePlayerGuids, awayPlayerGuids) !== homePlayerGuids.length + awayPlayerGuids.length) {
      setError(new Error(t('dashboard.admin.errors.lineupsOverlap')))
      return
    }

    await runAction(async () => {
      const updated = await adminService.updateMatchLineups(
        selectedPenaGuid,
        selectedSeasonGuid,
        selectedMatchGuid,
        {
          home_team: { player_guids: homePlayerGuids },
          away_team: { player_guids: awayPlayerGuids }
        }
      )
      setSelectedMatchDetail(updated)
      setMatchLineupsDraft(buildMatchLineupsDraft(updated))
      setMatchStatsDraft(buildMatchStatsDraft(updated))
      await Promise.all([
        loadStandings(selectedPenaGuid, selectedSeasonGuid),
        loadSeasonMatches(selectedPenaGuid, selectedSeasonGuid)
      ])
    }, t('dashboard.admin.notices.lineupsUpdated'))
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
          )
        }
      }
    })
  }

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
      rating
    }
  }

  const handleSaveMatchStats = async () => {
    if (!selectedPenaGuid || !selectedSeasonGuid || !selectedMatchGuid || !matchStatsDraft) {
      return
    }

    const homePlayers = (matchStatsDraft.home_team?.players || []).map(parseStatsPayload)
    const awayPlayers = (matchStatsDraft.away_team?.players || []).map(parseStatsPayload)
    if (!homePlayers.length || !awayPlayers.length || homePlayers.some((item) => !item) || awayPlayers.some((item) => !item)) {
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
          away_team: { players: awayPlayers }
        }
      )
      setSelectedMatchDetail(updated)
      setMatchStatsDraft(buildMatchStatsDraft(updated))
      await Promise.all([
        loadStandings(selectedPenaGuid, selectedSeasonGuid),
        loadSeasonMatches(selectedPenaGuid, selectedSeasonGuid)
      ])
    }, t('dashboard.admin.notices.matchStatsUpdated'))
  }

  const activeSeasonLabel = activeSeason
    ? `${formatDate(activeSeason.start_date)} - ${formatDate(activeSeason.end_date)}`
    : t('dashboard.admin.status.noActiveSeason')

  const selectedSeasonLabel = selectedSeason
    ? `${formatDate(selectedSeason.start_date)} - ${formatDate(selectedSeason.end_date)}`
    : t('dashboard.admin.status.noSeasonSelected')

  if (initializing) {
    return (
      <Stack spacing={2}>
        <Typography variant="h5">{t('dashboard.admin.panelTitle')}</Typography>
        <LinearProgress />
      </Stack>
    )
  }

  return (
    <Stack spacing={3}>
      <Card
        sx={{
          border: '1px solid rgba(15, 23, 42, 0.08)',
          background:
            'linear-gradient(135deg, rgba(255,255,250,0.95) 0%, rgba(230,245,239,0.72) 70%, rgba(255,238,217,0.62) 100%)'
        }}
      >
        <CardContent>
          <Stack spacing={2.5}>
            <Stack
              direction={{ xs: 'column', md: 'row' }}
              spacing={2}
              alignItems={{ md: 'center' }}
              justifyContent="space-between"
            >
              <Box>
                <Typography variant="h4" sx={{ fontWeight: 700 }}>
                  {t('dashboard.admin.panelTitle')}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {t('dashboard.common.loggedAs')} <strong>{session?.user_guid || '-'}</strong>
                </Typography>
              </Box>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.25}>
                <Button variant="outlined" onClick={() => runAction(loadDashboard, '')} disabled={loading}>
                  {t('dashboard.common.refreshData')}
                </Button>
                <Button variant="text" onClick={onLogout} disabled={loading}>
                  {t('dashboard.common.logout')}
                </Button>
              </Stack>
            </Stack>

            <Grid container spacing={1.5}>
              <Grid item xs={12} md={6}>
                <TextField
                  select
                  size="small"
                  label={t('dashboard.admin.currentPena')}
                  value={selectedPenaGuid}
                  onChange={(event) => setSelectedPenaGuid(event.target.value)}
                  fullWidth
                >
                  {penas.map((pena) => (
                    <MenuItem key={pena.guid} value={pena.guid}>
                      {pena.name}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  select
                  size="small"
                  label={t('dashboard.admin.referenceSeason')}
                  value={selectedSeasonGuid}
                  onChange={handleSeasonSelection}
                  disabled={!seasonList.length}
                  fullWidth
                >
                  {seasonList.map((season) => (
                    <MenuItem key={season.guid} value={season.guid}>
                      {formatDate(season.start_date)} - {formatDate(season.end_date)}
                      {activeSeason?.guid === season.guid ? t('dashboard.admin.seasonActiveSuffix') : ''}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
            </Grid>

            <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
              <Chip
                size="small"
                color="secondary"
                label={t('dashboard.admin.chips.pena', { name: selectedPena?.name || '-' })}
              />
              <Chip
                size="small"
                color={activeSeason ? 'success' : 'warning'}
                label={t('dashboard.admin.chips.activeSeason', { season: activeSeasonLabel })}
              />
              <Chip
                size="small"
                color="primary"
                label={t('dashboard.admin.chips.selectedSeason', { season: selectedSeasonLabel })}
              />
            </Stack>

            <Tabs
              value={activeSection}
              onChange={(_, value) => setActiveSection(value)}
              variant="scrollable"
              scrollButtons="auto"
            >
              <Tab value="overview" label={t('dashboard.admin.tabs.overview')} />
              <Tab value="seasons" label={t('dashboard.admin.tabs.seasons')} />
              <Tab value="players" label={t('dashboard.admin.tabs.players')} />
              <Tab value="matches" label={t('dashboard.admin.tabs.matches')} />
              <Tab value="standings" label={t('dashboard.admin.tabs.standings')} />
            </Tabs>
          </Stack>
        </CardContent>
      </Card>

      {loading && <LinearProgress />}
      {error && <Alert severity="error">{errorMessage}</Alert>}
      {notice && <Alert severity="success">{notice}</Alert>}

      {!selectedPenaGuid && (
        <Alert severity="info">{t('dashboard.admin.noLinkedPenaInfo')}</Alert>
      )}

      {selectedPenaGuid && activeSection === 'overview' && (
        <Grid container spacing={2.5}>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Typography variant="overline" color="text.secondary">
                  {t('dashboard.admin.overview.currentPena')}
                </Typography>
                <Typography variant="h6">{selectedPena?.name || '-'}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Typography variant="overline" color="text.secondary">
                  {t('dashboard.admin.overview.activeSeason')}
                </Typography>
                <Typography variant="h6">
                  {activeSeason ? t('dashboard.admin.status.configured') : t('dashboard.admin.status.missing')}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Typography variant="overline" color="text.secondary">
                  {t('dashboard.admin.overview.totalSeasons')}
                </Typography>
                <Typography variant="h6">{seasonList.length}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Typography variant="overline" color="text.secondary">
                  {t('dashboard.admin.overview.seasonPlayers')}
                </Typography>
                <Typography variant="h6">{seasonRoster.length}</Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={5}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Stack spacing={2}>
                  <Typography variant="h6">{t('dashboard.admin.overview.inviteTitle')}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {t('dashboard.admin.overview.inviteDescription')}
                  </Typography>
                  <Button
                    variant="contained"
                    color="secondary"
                    onClick={handleGenerateJoinCode}
                    disabled={loading}
                  >
                    {t('dashboard.admin.overview.generateJoinCode')}
                  </Button>
                  {tokenPayload && (
                    <Alert severity="info">
                      <Typography variant="body2">
                        <strong>{t('dashboard.admin.overview.codeLabel')}:</strong> {tokenPayload.token}
                      </Typography>
                      <Typography variant="body2">
                        <strong>{t('dashboard.admin.overview.expiresLabel')}:</strong>{' '}
                        {formatEpochSeconds(tokenPayload.expires_at)}
                      </Typography>
                    </Alert>
                  )}
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={7}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Stack spacing={2}>
                  <Typography variant="h6">{t('dashboard.admin.overview.quickActionsTitle')}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {t('dashboard.admin.overview.quickActionsDescription')}
                  </Typography>
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                    <Button variant="outlined" onClick={() => setActiveSection('seasons')}>
                      {t('dashboard.admin.overview.manageSeasons')}
                    </Button>
                    <Button variant="outlined" onClick={() => setActiveSection('players')}>
                      {t('dashboard.admin.overview.managePlayers')}
                    </Button>
                    <Button variant="outlined" onClick={() => setActiveSection('matches')}>
                      {t('dashboard.admin.overview.createMatch')}
                    </Button>
                    <Button variant="outlined" onClick={() => setActiveSection('standings')}>
                      {t('dashboard.admin.overview.viewStandings')}
                    </Button>
                  </Stack>
                  {lastCreatedMatch ? (
                    <Alert severity="success">
                      {t('dashboard.admin.overview.lastMatchCreated', {
                        guid: lastCreatedMatch.guid,
                        date: formatDate(lastCreatedMatch.match_date)
                      })}
                    </Alert>
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      {t('dashboard.admin.overview.noDetailedMatch')}
                    </Typography>
                  )}
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Stack spacing={2}>
                  <Stack
                    direction={{ xs: 'column', sm: 'row' }}
                    alignItems={{ sm: 'center' }}
                    justifyContent="space-between"
                    spacing={1}
                  >
                    <Typography variant="h6">{t('dashboard.admin.overview.standingsSnapshotTitle')}</Typography>
                    <Button
                      variant="text"
                      onClick={handleRefreshStandings}
                      disabled={loading || !selectedSeasonGuid}
                    >
                      {t('dashboard.admin.overview.refreshStandings')}
                    </Button>
                  </Stack>
                  {!selectedSeasonGuid && (
                    <Typography variant="body2" color="text.secondary">
                      {t('dashboard.admin.overview.selectSeasonToLoad')}
                    </Typography>
                  )}
                  {selectedSeasonGuid && (
                    <TableContainer>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell>{t('dashboard.admin.table.player')}</TableCell>
                            <TableCell align="right">{t('dashboard.admin.table.played')}</TableCell>
                            <TableCell align="right">{t('dashboard.admin.table.goals')}</TableCell>
                            <TableCell align="right">{t('dashboard.admin.table.assists')}</TableCell>
                            <TableCell align="right">{t('dashboard.admin.table.w')}</TableCell>
                            <TableCell align="right">{t('dashboard.admin.table.d')}</TableCell>
                            <TableCell align="right">{t('dashboard.admin.table.l')}</TableCell>
                            <TableCell align="right">{t('dashboard.admin.table.pts')}</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {standings.slice(0, 5).map((player) => (
                            <TableRow key={player.player_guid}>
                              <TableCell>{player.nickname || `${player.name} ${player.surname1}`}</TableCell>
                              <TableCell align="right">
                                {player.played ?? player.wins + player.draws + player.losses}
                              </TableCell>
                              <TableCell align="right">{player.goals ?? 0}</TableCell>
                              <TableCell align="right">{player.assists ?? 0}</TableCell>
                              <TableCell align="right">{player.wins}</TableCell>
                              <TableCell align="right">{player.draws}</TableCell>
                              <TableCell align="right">{player.losses}</TableCell>
                              <TableCell align="right">{player.points}</TableCell>
                            </TableRow>
                          ))}
                          {!standings.length && (
                            <TableRow>
                              <TableCell colSpan={8}>
                                {t('dashboard.admin.overview.noStandingsForSeason')}
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  )}
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {selectedPenaGuid && activeSection === 'seasons' && (
        <Grid container spacing={2.5}>
          <Grid item xs={12} md={8}>
            <Card>
              <CardContent>
                <Stack spacing={2.5}>
                  <Stack direction="row" alignItems="center" spacing={1.25}>
                    <Typography variant="h6">{t('dashboard.admin.seasons.configTitle')}</Typography>
                    {activeSeason && <Chip size="small" color="secondary" label={activeSeasonLabel} />}
                  </Stack>

                  {!activeSeason && (
                    <Alert severity="warning">
                      {t('dashboard.admin.seasons.noActiveWarning')}
                    </Alert>
                  )}

                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                    <TextField
                      type="date"
                      label={t('dashboard.admin.seasons.startDate')}
                      InputLabelProps={{ shrink: true }}
                      value={seasonForm.start_date}
                      onChange={onSeasonField('start_date')}
                      fullWidth
                    />
                    <TextField
                      type="date"
                      label={t('dashboard.admin.seasons.endDate')}
                      InputLabelProps={{ shrink: true }}
                      value={seasonForm.end_date}
                      onChange={onSeasonField('end_date')}
                      fullWidth
                    />
                  </Stack>

                  {latestSeasonEndDate && (
                    <Button variant="text" onClick={handlePrefillNextSeason} disabled={loading}>
                      {t('dashboard.admin.seasons.useAfterLatest')}
                    </Button>
                  )}

                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                    <TextField
                      type="number"
                      label={t('dashboard.admin.seasons.winPoints')}
                      value={seasonForm.points_win}
                      onChange={onSeasonField('points_win')}
                      fullWidth
                    />
                    <TextField
                      type="number"
                      label={t('dashboard.admin.seasons.drawPoints')}
                      value={seasonForm.points_draw}
                      onChange={onSeasonField('points_draw')}
                      fullWidth
                    />
                    <TextField
                      type="number"
                      label={t('dashboard.admin.seasons.lossPoints')}
                      value={seasonForm.points_loss}
                      onChange={onSeasonField('points_loss')}
                      fullWidth
                    />
                  </Stack>

                  <Button variant="contained" onClick={handleCreateSeason} disabled={loading}>
                    {t('dashboard.admin.seasons.createSeason')}
                  </Button>
                  <Typography variant="caption" color="text.secondary">
                    {t('dashboard.admin.seasons.overlapHint')}
                  </Typography>

                  <Divider />

                  <Typography variant="subtitle1">{t('dashboard.admin.seasons.scoringRulesTitle')}</Typography>
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                    <TextField
                      type="number"
                      label={t('dashboard.admin.seasons.winPoints')}
                      value={pointsForm.points_win}
                      onChange={onPointsField('points_win')}
                      fullWidth
                      disabled={!activeSeason}
                    />
                    <TextField
                      type="number"
                      label={t('dashboard.admin.seasons.drawPoints')}
                      value={pointsForm.points_draw}
                      onChange={onPointsField('points_draw')}
                      fullWidth
                      disabled={!activeSeason}
                    />
                    <TextField
                      type="number"
                      label={t('dashboard.admin.seasons.lossPoints')}
                      value={pointsForm.points_loss}
                      onChange={onPointsField('points_loss')}
                      fullWidth
                      disabled={!activeSeason}
                    />
                  </Stack>
                  <Button
                    variant="outlined"
                    onClick={handleUpdateSeasonPoints}
                    disabled={loading || !activeSeason}
                  >
                    {t('dashboard.admin.seasons.saveScoringRules')}
                  </Button>
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={4}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Stack spacing={1.5}>
                  <Typography variant="h6">{t('dashboard.admin.seasons.historyTitle')}</Typography>
                  {!historySeasons.length && (
                    <Typography variant="body2" color="text.secondary">
                      {t('dashboard.admin.seasons.noHistory')}
                    </Typography>
                  )}
                  {historySeasons.map((season) => (
                    <Box
                      key={season.guid}
                      sx={{
                        p: 1.5,
                        borderRadius: 2,
                        border: '1px solid rgba(15,23,42,0.08)',
                        backgroundColor: 'rgba(255,255,255,0.6)'
                      }}
                    >
                      <Typography variant="body2">
                        {formatDate(season.start_date)} - {formatDate(season.end_date)}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {t('dashboard.admin.seasons.historyPoints', {
                          win: season.points_win,
                          draw: season.points_draw,
                          loss: season.points_loss
                        })}
                      </Typography>
                    </Box>
                  ))}
                </Stack>
              </CardContent>
            </Card>
          </Grid>

        </Grid>
      )}

      {selectedPenaGuid && activeSection === 'players' && (
        <Grid container spacing={2.5}>
          <Grid item xs={12} md={8}>
            <Card>
              <CardContent>
                <Stack spacing={2}>
                  <Stack
                    direction={{ xs: 'column', sm: 'row' }}
                    alignItems={{ sm: 'center' }}
                    justifyContent="space-between"
                    spacing={1.5}
                  >
                    <Typography variant="h6">{t('dashboard.admin.players.squadTitle')}</Typography>
                    {selectedSeason && <Chip size="small" color="primary" label={selectedSeasonLabel} />}
                  </Stack>

                  {!seasonList.length && (
                    <Typography variant="body2" color="text.secondary">
                      {t('dashboard.admin.players.createSeasonFirst')}
                    </Typography>
                  )}

                  <TextField
                    select
                    label={t('dashboard.admin.players.historicalMembersLabel')}
                    value={selectedHistoricalGuids}
                    onChange={handleSelectHistoricalPlayers}
                    SelectProps={{
                      multiple: true,
                      renderValue: (selected) =>
                        t('dashboard.admin.players.selectedCount', {
                          count: selected.length
                        })
                    }}
                    disabled={loading || !selectedSeasonGuid || !availableHistoricalPlayers.length}
                    helperText={
                      !selectedSeasonGuid
                        ? t('dashboard.admin.players.helperSelectSeason')
                        : availableHistoricalPlayers.length
                          ? t('dashboard.admin.players.helperSome')
                          : t('dashboard.admin.players.helperNone')
                    }
                    fullWidth
                  >
                    {availableHistoricalPlayers.map((player) => (
                      <MenuItem key={player.guid} value={player.guid}>
                        {formatPlayerDisplayName(player)}
                      </MenuItem>
                    ))}
                  </TextField>

                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                    <Button
                      variant="contained"
                      onClick={handleRegisterHistoricalPlayersInSeason}
                      disabled={loading || !selectedSeasonGuid || !selectedHistoricalGuids.length}
                    >
                      {t('dashboard.admin.players.addSelectedToSeason')}
                    </Button>
                    <Typography variant="body2" color="text.secondary">
                      {t('dashboard.admin.players.registeredAvailable', {
                        registered: seasonRoster.length,
                        available: availableHistoricalPlayers.length
                      })}
                    </Typography>
                  </Stack>

                  {seasonRosterLoading && <LinearProgress />}

                  {selectedSeasonGuid && !seasonRosterLoading && (
                    <TableContainer>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell>{t('dashboard.admin.table.player')}</TableCell>
                            <TableCell align="right">{t('dashboard.admin.table.played')}</TableCell>
                            <TableCell align="right">{t('dashboard.admin.table.goals')}</TableCell>
                            <TableCell align="right">{t('dashboard.admin.table.assists')}</TableCell>
                            <TableCell align="right">{t('dashboard.admin.table.w')}</TableCell>
                            <TableCell align="right">{t('dashboard.admin.table.d')}</TableCell>
                            <TableCell align="right">{t('dashboard.admin.table.l')}</TableCell>
                            <TableCell align="right">{t('dashboard.admin.table.pts')}</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {seasonRoster.map((player) => (
                            <TableRow key={player.player_guid}>
                              <TableCell>{formatPlayerDisplayName(player)}</TableCell>
                              <TableCell align="right">
                                {player.played ?? player.wins + player.draws + player.losses}
                              </TableCell>
                              <TableCell align="right">{player.goals ?? 0}</TableCell>
                              <TableCell align="right">{player.assists ?? 0}</TableCell>
                              <TableCell align="right">{player.wins}</TableCell>
                              <TableCell align="right">{player.draws}</TableCell>
                              <TableCell align="right">{player.losses}</TableCell>
                              <TableCell align="right">{player.points}</TableCell>
                            </TableRow>
                          ))}
                          {!seasonRoster.length && (
                            <TableRow>
                              <TableCell colSpan={8}>
                                {t('dashboard.admin.players.noPlayersInSeason')}
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  )}
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={4}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Stack spacing={2}>
                  <Typography variant="h6">{t('dashboard.admin.guest.title')}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {t('dashboard.admin.guest.description')}
                  </Typography>
                  <TextField
                    label={t('dashboard.admin.guest.name')}
                    value={guestForm.name}
                    onChange={onGuestField('name')}
                    fullWidth
                  />
                  <TextField
                    label={t('dashboard.admin.guest.surname1')}
                    value={guestForm.surname1}
                    onChange={onGuestField('surname1')}
                    fullWidth
                  />
                  <TextField
                    label={t('dashboard.admin.guest.surname2')}
                    value={guestForm.surname2}
                    onChange={onGuestField('surname2')}
                    fullWidth
                  />
                  {nationalities.length > 0 ? (
                    <TextField
                      select
                      label={t('dashboard.admin.guest.nationality')}
                      value={guestForm.nationality}
                      onChange={onGuestField('nationality')}
                      fullWidth
                    >
                      {nationalities.map((nationality) => (
                        <MenuItem key={nationality} value={nationality}>
                          {nationality}
                        </MenuItem>
                      ))}
                    </TextField>
                  ) : (
                    <TextField
                      label={t('dashboard.admin.guest.nationality')}
                      value={guestForm.nationality}
                      onChange={onGuestField('nationality')}
                      fullWidth
                    />
                  )}
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                    <TextField
                      label={t('dashboard.admin.guest.nickname')}
                      value={guestForm.nickname}
                      onChange={onGuestField('nickname')}
                      fullWidth
                    />
                    <TextField
                      label={t('dashboard.admin.guest.position')}
                      value={guestForm.position}
                      onChange={onGuestField('position')}
                      fullWidth
                    />
                  </Stack>
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                    <Button
                      variant="outlined"
                      onClick={() => handleCreateGuestPlayer(false)}
                      disabled={loading}
                    >
                      {t('dashboard.admin.guest.createGuest')}
                    </Button>
                    <Button
                      variant="contained"
                      onClick={() => handleCreateGuestPlayer(true)}
                      disabled={loading || !activeSeason}
                    >
                      {t('dashboard.admin.guest.createAndAdd')}
                    </Button>
                  </Stack>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {selectedPenaGuid && activeSection === 'matches' && (
        <Grid container spacing={2.5}>
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Stack spacing={2}>
                  <Typography variant="h6">{t('dashboard.admin.matches.title')}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {t('dashboard.admin.matches.description')}
                  </Typography>
                  <TextField
                    type="date"
                    label={t('dashboard.admin.matches.matchDate')}
                    InputLabelProps={{ shrink: true }}
                    value={matchForm.match_date}
                    onChange={onMatchField('match_date')}
                    disabled={!activeSeason}
                  />
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                    <TextField
                      label={t('dashboard.admin.matches.homeTeam')}
                      value={matchForm.home_team_name}
                      onChange={onMatchField('home_team_name')}
                      placeholder={t('dashboard.admin.matches.homeTeamPlaceholder')}
                      disabled={!activeSeason}
                      fullWidth
                    />
                    <TextField
                      label={t('dashboard.admin.matches.awayTeam')}
                      value={matchForm.away_team_name}
                      onChange={onMatchField('away_team_name')}
                      placeholder={t('dashboard.admin.matches.awayTeamPlaceholder')}
                      disabled={!activeSeason}
                      fullWidth
                    />
                  </Stack>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                    {t('dashboard.admin.matches.lineupHelperTitle')}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {t('dashboard.admin.matches.lineupHelperDescription')}
                  </Typography>
                  {!selectedSeasonGuid && (
                    <Typography variant="body2" color="text.secondary">
                      {t('dashboard.admin.matches.lineupHelperSelectSeason')}
                    </Typography>
                  )}
                  {selectedSeasonGuid && seasonRosterLoading && <LinearProgress />}
                  {selectedSeasonGuid && !seasonRosterLoading && !seasonRoster.length && (
                    <Typography variant="body2" color="text.secondary">
                      {t('dashboard.admin.matches.noPlayersAvailable')}
                    </Typography>
                  )}
                  {selectedSeasonGuid && !seasonRosterLoading && seasonRoster.length > 0 && (
                    <LineupDragBuilder
                      players={createMatchLineupPlayers}
                      homeGuids={matchFormHomeGuids}
                      awayGuids={matchFormAwayGuids}
                      onChange={onMatchFormLineupsChange}
                      availableTitle={t('dashboard.admin.matches.availablePlayers')}
                      homeTitle={matchForm.home_team_name || t('dashboard.admin.matches.homeLineup')}
                      awayTitle={matchForm.away_team_name || t('dashboard.admin.matches.awayLineup')}
                      helperText={t('dashboard.admin.matches.lineupBoardHint')}
                      emptyText={t('dashboard.admin.matches.lineupEmpty')}
                      addHomeText={t('dashboard.admin.matches.addToHome')}
                      addAwayText={t('dashboard.admin.matches.addToAway')}
                      moveHomeText={t('dashboard.admin.matches.moveToHome')}
                      moveAwayText={t('dashboard.admin.matches.moveToAway')}
                      removeText={t('dashboard.admin.matches.removeFromLineup')}
                      disabled={loading || !activeSeason}
                    />
                  )}
                  <Button
                    variant="contained"
                    onClick={handleCreateDetailedMatch}
                    disabled={loading || !activeSeason}
                  >
                    {t('dashboard.admin.matches.createDetailedMatch')}
                  </Button>
                  {lastCreatedMatch && (
                    <Alert severity="success">
                      {t('dashboard.admin.matches.matchCreated', {
                        guid: lastCreatedMatch.guid,
                        date: formatDate(lastCreatedMatch.match_date)
                      })}
                    </Alert>
                  )}
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Stack spacing={2}>
                  <Typography variant="h6">{t('dashboard.admin.matches.seasonMatchesTitle')}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {t('dashboard.admin.matches.seasonMatchesDescription')}
                  </Typography>
                  {seasonMatchesLoading && <LinearProgress />}
                  {!selectedSeasonGuid && (
                    <Typography variant="body2" color="text.secondary">
                      {t('dashboard.admin.overview.selectSeasonToLoad')}
                    </Typography>
                  )}
                  {selectedSeasonGuid && !seasonMatchesLoading && !visibleSeasonMatches.length && (
                    <Typography variant="body2" color="text.secondary">
                      {t('dashboard.admin.matches.noMatchesYet')}
                    </Typography>
                  )}
                  {selectedSeasonGuid && !seasonMatchesLoading && visibleSeasonMatches.length > 0 && (
                    <TableContainer>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell>{t('dashboard.admin.matches.date')}</TableCell>
                            <TableCell>{t('dashboard.admin.matches.home')}</TableCell>
                            <TableCell>{t('dashboard.admin.matches.away')}</TableCell>
                            <TableCell>{t('dashboard.admin.matches.status')}</TableCell>
                            <TableCell>{t('dashboard.admin.matches.result')}</TableCell>
                            <TableCell>{t('dashboard.admin.matches.resultSource')}</TableCell>
                            <TableCell>{t('dashboard.admin.matches.actions')}</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {visibleSeasonMatches.map((match) => {
                            const status = String(match.status || 'open').toLowerCase()
                            const isClosed = status === 'closed'

                            return (
                              <TableRow key={match.guid}>
                                <TableCell>{formatDate(match.match_date)}</TableCell>
                                <TableCell>{match.home_team_name}</TableCell>
                                <TableCell>{match.away_team_name}</TableCell>
                                <TableCell>
                                  <Chip
                                    size="small"
                                    color={isClosed ? 'success' : 'warning'}
                                    label={
                                      isClosed
                                        ? t('dashboard.admin.matches.statusClosed')
                                        : t('dashboard.admin.matches.statusOpen')
                                    }
                                  />
                                </TableCell>
                                <TableCell>{match.home_score} - {match.away_score}</TableCell>
                                <TableCell>
                                  <Typography variant="body2" color="text.secondary">
                                    {t('dashboard.admin.matches.scoreFromStats')}
                                  </Typography>
                                </TableCell>
                                <TableCell>
                                  <Stack direction="row" spacing={1}>
                                    <Button
                                      variant={selectedMatchGuid === match.guid ? 'contained' : 'text'}
                                      size="small"
                                      onClick={(event) => {
                                        event.stopPropagation()
                                        handleOpenMatchStats(match.guid)
                                      }}
                                      disabled={matchStatsLoading || deletingMatchGuid === match.guid}
                                    >
                                      {t('dashboard.admin.matches.manageMatch')}
                                    </Button>
                                    <Button
                                      variant="text"
                                      color="error"
                                      size="small"
                                      onClick={(event) => {
                                        event.stopPropagation()
                                        handleRequestDeleteSeasonMatch(match)
                                      }}
                                      disabled={deletingMatchGuid === match.guid}
                                    >
                                      {t('dashboard.admin.matches.deleteMatch')}
                                    </Button>
                                  </Stack>
                                </TableCell>
                              </TableRow>
                            )
                          })}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  )}

                  {selectedSeasonGuid && matchStatsLoading && <LinearProgress />}
                  {selectedSeasonGuid &&
                    !matchStatsLoading &&
                    selectedMatchDetail &&
                    matchLineupsDraft &&
                    matchStatsDraft && (
                    <Card variant="outlined" sx={{ mt: 1 }}>
                      <CardContent>
                        <Stack spacing={2}>
                          <Box>
                            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                              {t('dashboard.admin.matches.statsEditorTitle', {
                                home: selectedMatchDetail.home_team.team_name,
                                away: selectedMatchDetail.away_team.team_name
                              })}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              {t('dashboard.admin.matches.statsEditorDescription')}
                            </Typography>
                          </Box>

                          <Stack direction="row" spacing={1} alignItems="center">
                            <Typography variant="body2" color="text.secondary">
                              {t('dashboard.admin.matches.status')}:
                            </Typography>
                            <Chip
                              size="small"
                              color={selectedMatchDetail.status === 'closed' ? 'success' : 'warning'}
                              label={
                                selectedMatchDetail.status === 'closed'
                                  ? t('dashboard.admin.matches.statusClosed')
                                  : t('dashboard.admin.matches.statusOpen')
                              }
                            />
                          </Stack>

                          {selectedMatchDetail.status === 'closed' && (
                            <Alert severity="warning">
                              {t('dashboard.admin.matches.lineupsReopenHint')}
                            </Alert>
                          )}

                          <LineupDragBuilder
                            players={matchEditorLineupPlayers}
                            homeGuids={matchDraftHomeGuids}
                            awayGuids={matchDraftAwayGuids}
                            onChange={onMatchLineupsDraftChange}
                            availableTitle={t('dashboard.admin.matches.availablePlayers')}
                            homeTitle={selectedMatchDetail.home_team.team_name || t('dashboard.admin.matches.homeLineup')}
                            awayTitle={selectedMatchDetail.away_team.team_name || t('dashboard.admin.matches.awayLineup')}
                            helperText={t('dashboard.admin.matches.lineupBoardHint')}
                            emptyText={t('dashboard.admin.matches.lineupEmpty')}
                            addHomeText={t('dashboard.admin.matches.addToHome')}
                            addAwayText={t('dashboard.admin.matches.addToAway')}
                            moveHomeText={t('dashboard.admin.matches.moveToHome')}
                            moveAwayText={t('dashboard.admin.matches.moveToAway')}
                            removeText={t('dashboard.admin.matches.removeFromLineup')}
                            disabled={loading || matchStatsLoading}
                          />

                          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                            <Button
                              variant="outlined"
                              onClick={handleSaveMatchLineups}
                              disabled={loading || matchStatsLoading}
                            >
                              {t('dashboard.admin.matches.saveLineups')}
                            </Button>
                          </Stack>

                          <Grid container spacing={2}>
                            {[
                              { key: 'home_team', team: selectedMatchDetail.home_team },
                              { key: 'away_team', team: selectedMatchDetail.away_team }
                            ].map(({ key, team }) => (
                              <Grid key={key} item xs={12} md={6}>
                                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                                  {t('dashboard.admin.matches.teamStats', { team: team.team_name })}
                                </Typography>
                                <Table size="small">
                                  <TableHead>
                                    <TableRow>
                                      <TableCell>{t('dashboard.admin.table.player')}</TableCell>
                                      <TableCell>{t('dashboard.admin.matches.goals')}</TableCell>
                                      <TableCell>{t('dashboard.admin.matches.assists')}</TableCell>
                                      <TableCell>{t('dashboard.admin.matches.saves')}</TableCell>
                                      <TableCell>{t('dashboard.admin.matches.rating')}</TableCell>
                                    </TableRow>
                                  </TableHead>
                                  <TableBody>
                                    {team.players.map((player) => (
                                      <TableRow key={player.player_guid}>
                                        <TableCell>{formatPlayerDisplayName(player)}</TableCell>
                                        <TableCell>
                                          <TextField
                                            type="number"
                                            size="small"
                                            value={
                                              matchStatsDraft[key]?.players.find((item) => item.player_guid === player.player_guid)?.goals ??
                                              '0'
                                            }
                                            onChange={onMatchStatsDraftField(key, player.player_guid, 'goals')}
                                            inputProps={{ min: 0 }}
                                            sx={{ maxWidth: 90 }}
                                          />
                                        </TableCell>
                                        <TableCell>
                                          <TextField
                                            type="number"
                                            size="small"
                                            value={
                                              matchStatsDraft[key]?.players.find((item) => item.player_guid === player.player_guid)?.assists ??
                                              '0'
                                            }
                                            onChange={onMatchStatsDraftField(key, player.player_guid, 'assists')}
                                            inputProps={{ min: 0 }}
                                            sx={{ maxWidth: 90 }}
                                          />
                                        </TableCell>
                                        <TableCell>
                                          <TextField
                                            type="number"
                                            size="small"
                                            value={
                                              matchStatsDraft[key]?.players.find((item) => item.player_guid === player.player_guid)?.saves ??
                                              '0'
                                            }
                                            onChange={onMatchStatsDraftField(key, player.player_guid, 'saves')}
                                            inputProps={{ min: 0 }}
                                            sx={{ maxWidth: 90 }}
                                          />
                                        </TableCell>
                                        <TableCell>
                                          <TextField
                                            type="number"
                                            size="small"
                                            value={
                                              matchStatsDraft[key]?.players.find((item) => item.player_guid === player.player_guid)?.rating ??
                                              '0'
                                            }
                                            onChange={onMatchStatsDraftField(key, player.player_guid, 'rating')}
                                            inputProps={{ min: 0, step: 0.1 }}
                                            sx={{ maxWidth: 90 }}
                                          />
                                        </TableCell>
                                      </TableRow>
                                    ))}
                                  </TableBody>
                                </Table>
                              </Grid>
                            ))}
                          </Grid>

                          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                            <Button
                              variant="contained"
                              onClick={handleSaveMatchStats}
                              disabled={loading || matchStatsLoading}
                            >
                              {t('dashboard.admin.matches.saveStats')}
                            </Button>
                            <Button
                              variant="text"
                              onClick={() => {
                                setSelectedMatchGuid('')
                                setSelectedMatchDetail(null)
                                setMatchLineupsDraft(null)
                                setMatchStatsDraft(null)
                              }}
                              disabled={loading}
                            >
                              {t('dashboard.admin.matches.closeEditor')}
                            </Button>
                          </Stack>
                        </Stack>
                      </CardContent>
                    </Card>
                  )}
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {selectedPenaGuid && activeSection === 'standings' && (
        <Card>
          <CardContent>
            <Stack spacing={2}>
              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                alignItems={{ sm: 'center' }}
                justifyContent="space-between"
                spacing={1.5}
              >
                <Box>
                  <Typography variant="h6">{t('dashboard.admin.standings.title')}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {t('dashboard.admin.standings.showingDataFor', { season: selectedSeasonLabel })}
                  </Typography>
                </Box>
                <Button
                  variant="outlined"
                  onClick={handleRefreshStandings}
                  disabled={loading || !selectedSeasonGuid}
                >
                  {t('dashboard.admin.overview.refreshStandings')}
                </Button>
              </Stack>

              {!selectedSeasonGuid && (
                <Typography variant="body2" color="text.secondary">
                  {t('dashboard.admin.standings.selectSeasonHeader')}
                </Typography>
              )}

              {selectedSeasonGuid && (
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>{t('dashboard.admin.table.player')}</TableCell>
                        <TableCell align="right">{t('dashboard.admin.table.played')}</TableCell>
                        <TableCell align="right">{t('dashboard.admin.table.w')}</TableCell>
                        <TableCell align="right">{t('dashboard.admin.table.d')}</TableCell>
                        <TableCell align="right">{t('dashboard.admin.table.l')}</TableCell>
                        <TableCell align="right">{t('dashboard.admin.table.goals')}</TableCell>
                        <TableCell align="right">{t('dashboard.admin.table.assists')}</TableCell>
                        <TableCell align="right">{t('dashboard.admin.table.pts')}</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {standings.map((player) => (
                        <TableRow key={player.player_guid}>
                          <TableCell>{player.nickname || `${player.name} ${player.surname1}`}</TableCell>
                          <TableCell align="right">
                            {player.played ?? player.wins + player.draws + player.losses}
                          </TableCell>
                          <TableCell align="right">{player.wins}</TableCell>
                          <TableCell align="right">{player.draws}</TableCell>
                          <TableCell align="right">{player.losses}</TableCell>
                          <TableCell align="right">{player.goals ?? 0}</TableCell>
                          <TableCell align="right">{player.assists ?? 0}</TableCell>
                          <TableCell align="right">{player.points}</TableCell>
                        </TableRow>
                      ))}
                      {!standings.length && (
                        <TableRow>
                          <TableCell colSpan={8}>{t('dashboard.admin.standings.noSeasonPlayers')}</TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </Stack>
          </CardContent>
        </Card>
      )}

      <Dialog
        open={Boolean(pendingDeleteMatch)}
        onClose={handleCancelDeleteSeasonMatch}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>{t('dashboard.admin.matches.deleteMatchTitle')}</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {pendingDeleteMatch
              ? t('dashboard.admin.matches.deleteMatchConfirm', {
                home: pendingDeleteMatch.home_team_name,
                away: pendingDeleteMatch.away_team_name,
                date: formatDate(pendingDeleteMatch.match_date)
              })
              : ''}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancelDeleteSeasonMatch} disabled={Boolean(deletingMatchGuid)}>
            {t('dashboard.admin.matches.cancelDelete')}
          </Button>
          <Button
            onClick={handleDeleteSeasonMatch}
            color="error"
            variant="contained"
            disabled={Boolean(deletingMatchGuid)}
          >
            {t('dashboard.admin.matches.deleteMatch')}
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  )
}
