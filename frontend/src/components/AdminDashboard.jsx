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
  Typography,
} from '@mui/material'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useAdminMatches } from '../hooks/useAdminMatches.js'
import { useAdminPlayers } from '../hooks/useAdminPlayers.js'
import { useAdminSeasons } from '../hooks/useAdminSeasons.js'
import { useI18n } from '../i18n/useI18n.js'
import { compareMatchInsightSummaries } from '../services/matchInsights.js'
import { adminService } from '../services/adminService.js'
import MatchDetailViewer from './MatchDetailViewer.jsx'
import AdminInsightsSection from './admin/AdminInsightsSection.jsx'
import AdminMatchesSection from './admin/AdminMatchesSection.jsx'
import AdminPlayersSection from './admin/AdminPlayersSection.jsx'
import AdminSeasonsSection from './admin/AdminSeasonsSection.jsx'

const todayIso = () => new Date().toISOString().slice(0, 10)

const defaultSeasonForm = () => ({
  start_date: todayIso(),
  end_date: todayIso(),
  points_win: 3,
  points_draw: 1,
  points_loss: 0,
})

const defaultMatchForm = () => ({
  match_date: todayIso(),
  home_team_name: '',
  away_team_name: '',
  home_player_guids: [],
  away_player_guids: [],
})

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

const DEFAULT_LABEL_COLOR = '#64748B'
const HEX_COLOR_RE = /^#?[0-9a-fA-F]{6}$/
const DEFAULT_ROLE_LABEL_COLORS = {
  president: '#B45309',
  coordinator: '#1D4ED8',
  member: '#15803D',
  guest: '#64748B',
}
const DEFAULT_POSITION_LABEL_COLORS = {
  attacker: '#DC2626',
  defender: '#2563EB',
  midfielder: '#16A34A',
  polivalent: '#7C3AED',
  keeper: '#EA580C',
}

const normalizeHexColor = (value) => {
  const normalized = String(value || '').trim()
  if (!HEX_COLOR_RE.test(normalized)) {
    return null
  }
  const withHash = normalized.startsWith('#') ? normalized : `#${normalized}`
  return withHash.toUpperCase()
}

const normalizeLabelArray = (values) => {
  const seen = new Set()
  return (Array.isArray(values) ? values : [])
    .map((item) => String(item || '').trim())
    .filter((item) => {
      if (!item) {
        return false
      }
      const key = item.toLowerCase()
      if (seen.has(key)) {
        return false
      }
      seen.add(key)
      return true
    })
}

const defaultColorForLabel = (label, defaults) =>
  normalizeHexColor(
    defaults[
      String(label || '')
        .trim()
        .toLowerCase()
    ]
  ) ||
  normalizeHexColor(DEFAULT_LABEL_COLOR) ||
  '#64748B'

const normalizeLabelColorMap = (labels, rawColors = {}, defaults = {}) => {
  const byKey = {}
  Object.entries(rawColors || {}).forEach(([rawLabel, rawColor]) => {
    const key = String(rawLabel || '')
      .trim()
      .toLowerCase()
    const color = normalizeHexColor(rawColor)
    if (!key || !color) {
      return
    }
    byKey[key] = color
  })
  const output = {}
  labels.forEach((label) => {
    const key = String(label || '')
      .trim()
      .toLowerCase()
    if (!key) {
      return
    }
    output[label] = byKey[key] || defaultColorForLabel(label, defaults)
  })
  return output
}

const sanitizePenaLabels = (payload = {}) => {
  const role_labels = normalizeLabelArray(
    payload.role_labels || ['president', 'coordinator', 'member', 'guest']
  )
  const position_labels = normalizeLabelArray(
    payload.position_labels || ['attacker', 'defender', 'midfielder', 'polivalent', 'keeper']
  )
  const role_colors = normalizeLabelColorMap(
    role_labels,
    payload.role_colors || {},
    DEFAULT_ROLE_LABEL_COLORS
  )
  const position_colors = normalizeLabelColorMap(
    position_labels,
    payload.position_colors || {},
    DEFAULT_POSITION_LABEL_COLORS
  )
  return {
    role_labels,
    position_labels,
    role_colors,
    position_colors,
  }
}

const defaultPenaLabels = () => sanitizePenaLabels()

const defaultLabelsDraft = (labels = defaultPenaLabels()) => ({
  role_labels: (labels.role_labels || []).join(', '),
  position_labels: (labels.position_labels || []).join(', '),
  role_colors: { ...(labels.role_colors || {}) },
  position_colors: { ...(labels.position_colors || {}) },
})

const splitGuids = (value) =>
  value
    .split(/[\n,]/g)
    .map((item) => item.trim())
    .filter(Boolean)

const normalizeLabelList = (value) => {
  const seen = new Set()
  return value
    .split(/[\n,]/g)
    .map((item) => item.trim())
    .filter((item) => {
      if (!item) {
        return false
      }
      const key = item.toLowerCase()
      if (seen.has(key)) {
        return false
      }
      seen.add(key)
      return true
    })
}

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

const normalizeFilterValues = (value) => {
  const source = Array.isArray(value)
    ? value
    : String(value || '')
        .split(',')
        .map((item) => item.trim())
  return Array.from(
    new Set(
      source
        .map((item) =>
          String(item || '')
            .trim()
            .toLowerCase()
        )
        .filter(Boolean)
    )
  )
}

const renderFilterValue = (selected, emptyLabel) => {
  const values = Array.isArray(selected)
    ? selected.map((item) => String(item || '').trim()).filter(Boolean)
    : []
  return values.length ? values.join(', ') : emptyLabel
}

const pruneFilterValues = (selectedValues, allowedLabels) => {
  const allowed = new Set(
    (allowedLabels || [])
      .map((item) =>
        String(item || '')
          .trim()
          .toLowerCase()
      )
      .filter(Boolean)
  )
  return normalizeFilterValues(selectedValues).filter((item) => allowed.has(item))
}

const defaultLabelFilters = () => ({
  role: [],
  position: [],
})

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

const normalizePlayerGuids = (value) => {
  if (Array.isArray(value)) {
    return Array.from(new Set(value.map((item) => String(item || '').trim()).filter(Boolean)))
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

const formatDecimal = (value, digits = 2) => Number(value || 0).toFixed(digits)

const formatSignedDecimal = (value, digits = 2) => {
  const numeric = Number(value || 0)
  const prefix = numeric >= 0 ? '+' : ''
  return `${prefix}${numeric.toFixed(digits)}`
}

const formatPercent = (value) => `${Math.round(Number(value || 0) * 100)}%`

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
      end_date: addDaysIso(startDate, 90),
    }
  }
  return {
    start_date: addDaysIso(latestSeasonEndDate, 1),
    end_date: addDaysIso(latestSeasonEndDate, 90),
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
        label: formatPlayerDisplayName(player) || guid,
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
    rating: String(player.rating ?? 0),
  })),
})

const buildMatchStatsDraft = (detail) => ({
  home_team: buildTeamStatsDraft(detail?.home_team),
  away_team: buildTeamStatsDraft(detail?.away_team),
})

const buildMatchLineupsDraft = (detail) => ({
  home_player_guids: (detail?.home_team?.players || []).map((player) => player.player_guid),
  away_player_guids: (detail?.away_team?.players || []).map((player) => player.player_guid),
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
  const penaDataRequestIdRef = useRef(0)
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
  const [overviewMatchGuid, setOverviewMatchGuid] = useState('')
  const [overviewMatchDetail, setOverviewMatchDetail] = useState(null)
  const [overviewMatchLoading, setOverviewMatchLoading] = useState(false)
  const [insightsScope, setInsightsScope] = useState('selected_season')
  const [insightsLoading, setInsightsLoading] = useState(false)
  const [insightsReport, setInsightsReport] = useState(null)
  const [insightsComparisonReport, setInsightsComparisonReport] = useState(null)
  const [tokenPayload, setTokenPayload] = useState(null)
  const [lastCreatedMatch, setLastCreatedMatch] = useState(null)
  const [nationalities, setNationalities] = useState([])
  const overviewMatchRequestIdRef = useRef(0)
  const insightsRequestIdRef = useRef(0)

  const [seasonForm, setSeasonForm] = useState(defaultSeasonForm)
  const [importPreviousSeasonRoster, setImportPreviousSeasonRoster] = useState(true)
  const [importSourceSeasonGuid, setImportSourceSeasonGuid] = useState('')
  const [selectedSeasonForm, setSelectedSeasonForm] = useState(defaultSeasonForm)
  const [penaLabels, setPenaLabels] = useState(defaultPenaLabels)
  const [labelsDraft, setLabelsDraft] = useState(defaultLabelsDraft)
  const [memberFilters, setMemberFilters] = useState(defaultLabelFilters)
  const [standingsFilters, setStandingsFilters] = useState(defaultLabelFilters)
  const [matchForm, setMatchForm] = useState(defaultMatchForm)
  const [guestForm, setGuestForm] = useState(defaultGuestForm)
  const [pendingDeleteSeason, setPendingDeleteSeason] = useState(null)
  const [editingSeasonPlayer, setEditingSeasonPlayer] = useState(null)
  const [seasonPlayerDraft, setSeasonPlayerDraft] = useState(defaultSeasonPlayerDraft)
  const [pendingRemoveSeasonPlayer, setPendingRemoveSeasonPlayer] = useState(null)
  const [editingMembershipPlayer, setEditingMembershipPlayer] = useState(null)
  const [membershipDraft, setMembershipDraft] = useState(defaultMembershipDraft)
  const [pendingRemoveMembershipPlayer, setPendingRemoveMembershipPlayer] = useState(null)

  const historySeasons = useMemo(() => {
    if (!activeSeason) {
      return seasonList
    }
    return seasonList.filter((item) => item.guid !== activeSeason.guid)
  }, [activeSeason, seasonList])

  const latestSeasonEndDate = useMemo(() => getLatestSeasonEndDate(seasonList), [seasonList])

  const selectedSeason = useMemo(
    () => seasonList.find((item) => item.guid === selectedSeasonGuid) || null,
    [seasonList, selectedSeasonGuid]
  )

  const selectedPena = useMemo(
    () => penas.find((item) => item.guid === selectedPenaGuid) || null,
    [penas, selectedPenaGuid]
  )

  const draftRoleLabels = useMemo(
    () => normalizeLabelList(labelsDraft.role_labels || ''),
    [labelsDraft.role_labels]
  )
  const draftPositionLabels = useMemo(
    () => normalizeLabelList(labelsDraft.position_labels || ''),
    [labelsDraft.position_labels]
  )
  const draftRoleColors = useMemo(
    () =>
      normalizeLabelColorMap(
        draftRoleLabels,
        labelsDraft.role_colors || {},
        DEFAULT_ROLE_LABEL_COLORS
      ),
    [draftRoleLabels, labelsDraft.role_colors]
  )
  const draftPositionColors = useMemo(
    () =>
      normalizeLabelColorMap(
        draftPositionLabels,
        labelsDraft.position_colors || {},
        DEFAULT_POSITION_LABEL_COLORS
      ),
    [draftPositionLabels, labelsDraft.position_colors]
  )

  const seasonImportCandidates = useMemo(
    () =>
      [...seasonList].sort((left, right) => {
        if (left.end_date === right.end_date) {
          return right.start_date.localeCompare(left.start_date)
        }
        return right.end_date.localeCompare(left.end_date)
      }),
    [seasonList]
  )

  const errorMessage = useMemo(() => (error ? mapDashboardErrorMessage(error, t) : ''), [error, t])

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

  const filteredHistoricalPlayers = useMemo(() => {
    const roleFilters = normalizeFilterValues(memberFilters.role)
    const positionFilters = normalizeFilterValues(memberFilters.position)
    return historicalPlayers.filter((player) => {
      const playerRole = String(player.role || '').toLowerCase()
      const playerPosition = String(player.position || '').toLowerCase()
      if (roleFilters.length && !roleFilters.includes(playerRole)) {
        return false
      }
      if (positionFilters.length && !positionFilters.includes(playerPosition)) {
        return false
      }
      return true
    })
  }, [historicalPlayers, memberFilters.position, memberFilters.role])

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

  const insightsComparison = useMemo(
    () => compareMatchInsightSummaries(insightsReport, insightsComparisonReport),
    [insightsReport, insightsComparisonReport]
  )

  const {
    selectedSeasonDateErrors,
    onSelectedSeasonField,
    validateSelectedSeasonForm,
    resetSelectedSeasonDateErrors,
  } = useAdminSeasons({
    setSelectedSeasonForm,
    t,
  })

  const onSeasonField = (name) => (event) => {
    const value = name.startsWith('points_') ? Number(event.target.value) : event.target.value
    setSeasonForm((prev) => ({ ...prev, [name]: value }))
  }

  const onMatchField = (name) => (event) => {
    setMatchForm((prev) => ({ ...prev, [name]: event.target.value }))
  }

  const onMatchFormLineupsChange = ({ homePlayerGuids, awayPlayerGuids }) => {
    setMatchForm((prev) => ({
      ...prev,
      home_player_guids: homePlayerGuids,
      away_player_guids: awayPlayerGuids,
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
        away_player_guids: awayPlayerGuids,
      }
    })
  }

  const onGuestField = (name) => (event) => {
    setGuestForm((prev) => ({ ...prev, [name]: event.target.value }))
  }

  const onSeasonPlayerDraftField = (name) => (event) => {
    setSeasonPlayerDraft((prev) => ({ ...prev, [name]: event.target.value }))
  }

  const onMembershipDraftField = (name) => (event) => {
    setMembershipDraft((prev) => ({ ...prev, [name]: event.target.value }))
  }

  const onLabelsDraftField = (name) => (event) => {
    setLabelsDraft((prev) => ({ ...prev, [name]: event.target.value }))
  }

  const onLabelColorDraftChange = (group, label) => (event) => {
    const color = normalizeHexColor(event.target.value) || defaultColorForLabel(label, {})
    setLabelsDraft((prev) => ({
      ...prev,
      [group]: {
        ...(prev[group] || {}),
        [label]: color,
      },
    }))
  }

  const onMemberFilterField = (name) => (event) => {
    const nextValue = normalizeFilterValues(event.target.value)
    setMemberFilters((prev) => ({
      ...prev,
      [name]: nextValue,
    }))
  }

  const onStandingsFilterField = (name) => (event) => {
    const nextValue = normalizeFilterValues(event.target.value)
    const nextFilters = { ...standingsFilters, [name]: nextValue }
    setStandingsFilters(nextFilters)
    if (selectedPenaGuid && selectedSeasonGuid) {
      runAction(() => loadStandings(selectedPenaGuid, selectedSeasonGuid, nextFilters), '')
    }
  }

  const onImportPreviousSeasonRosterChange = (event) => {
    setImportPreviousSeasonRoster(event.target.checked)
  }

  const onImportSourceSeasonGuidChange = (event) => {
    setImportSourceSeasonGuid(event.target.value)
  }

  const handleSavePenaLabels = async () => {
    if (!selectedPenaGuid) {
      return
    }
    const roleLabels = normalizeLabelList(labelsDraft.role_labels)
    const positionLabels = normalizeLabelList(labelsDraft.position_labels)
    const roleColors = normalizeLabelColorMap(
      roleLabels,
      labelsDraft.role_colors || {},
      DEFAULT_ROLE_LABEL_COLORS
    )
    const positionColors = normalizeLabelColorMap(
      positionLabels,
      labelsDraft.position_colors || {},
      DEFAULT_POSITION_LABEL_COLORS
    )
    if (!roleLabels.length || !positionLabels.length) {
      setError(new Error(t('dashboard.admin.errors.invalidPenaLabels')))
      return
    }

    await runAction(async () => {
      const updatedRaw = await adminService.updatePenaLabels(selectedPenaGuid, {
        role_labels: roleLabels,
        position_labels: positionLabels,
        role_colors: roleColors,
        position_colors: positionColors,
      })
      const updated = sanitizePenaLabels(updatedRaw)
      setPenaLabels(updated)
      setLabelsDraft(defaultLabelsDraft(updated))
      setGuestForm((prev) => ({
        ...prev,
        role: hasLabel(updated.role_labels, prev.role)
          ? prev.role
          : pickPreferredLabel(updated.role_labels, 'guest'),
        position: hasLabel(updated.position_labels, prev.position) ? prev.position : '',
      }))
      setMembershipDraft((prev) => ({
        ...prev,
        role: hasLabel(updated.role_labels, prev.role) ? prev.role : '',
        position: hasLabel(updated.position_labels, prev.position) ? prev.position : '',
      }))
      setMemberFilters((prev) => ({
        role: pruneFilterValues(prev.role, updated.role_labels),
        position: pruneFilterValues(prev.position, updated.position_labels),
      }))
      const nextStandingsFilters = {
        role: pruneFilterValues(standingsFilters.role, updated.role_labels),
        position: pruneFilterValues(standingsFilters.position, updated.position_labels),
      }
      setStandingsFilters(nextStandingsFilters)
      if (selectedSeasonGuid) {
        await loadStandings(selectedPenaGuid, selectedSeasonGuid, nextStandingsFilters)
      }
    }, t('dashboard.admin.notices.labelsUpdated'))
  }

  const closeMatchEditor = () => {
    setSelectedMatchGuid('')
    setSelectedMatchDetail(null)
    setMatchLineupsDraft(null)
    setMatchStatsDraft(null)
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

  const loadStandings = async (penaGuid, seasonGuid, filters = standingsFilters) => {
    const standingsPage = await adminService.listStandings(penaGuid, seasonGuid, {
      pageSize: 10,
      role: normalizeFilterValues(filters.role),
      position: normalizeFilterValues(filters.position),
    })
    setStandings(standingsPage.items || [])
  }

  const loadHistoricalPlayers = async (penaGuid) =>
    collectPagedItems((page) => adminService.listPenaPlayers(penaGuid, { page, pageSize: 100 }))

  const loadSeasonRoster = async (penaGuid, seasonGuid) => {
    if (!seasonGuid) {
      return []
    }
    return collectPagedItems((page) =>
      adminService.listSeasonPlayers(penaGuid, seasonGuid, {
        page,
        pageSize: 100,
        orderBy: 'points',
        orderDir: 'desc',
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
    const matchesPage = await adminService.listSeasonMatches(penaGuid, seasonGuid, {
      pageSize: 100,
    })
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
    const requestId = penaDataRequestIdRef.current + 1
    penaDataRequestIdRef.current = requestId
    const isStale = () => requestId !== penaDataRequestIdRef.current

    try {
      const [active, seasonsPage, penaPlayers, labelsRaw] = await Promise.all([
        adminService.getActiveSeason(penaGuid).catch((requestError) => {
          if (requestError.status === 404) {
            return null
          }
          throw requestError
        }),
        adminService.listSeasons(penaGuid, { pageSize: 100 }),
        loadHistoricalPlayers(penaGuid),
        adminService.getPenaLabels(penaGuid).catch(() => defaultPenaLabels()),
      ])
      if (isStale()) {
        return
      }
      const labels = sanitizePenaLabels(labelsRaw)

      const seasonItems = seasonsPage.items || []
      setActiveSeason(active)
      setSeasonList(seasonItems)
      setHistoricalPlayers(penaPlayers)
      setPenaLabels(labels)
      setLabelsDraft(defaultLabelsDraft(labels))
      setMemberFilters(defaultLabelFilters())
      setStandingsFilters(defaultLabelFilters())

      const nextRange = buildNextSeasonDateRange(seasonItems)
      const pointsReference = active || seasonItems[0]
      setSeasonForm({
        ...nextRange,
        points_win: pointsReference?.points_win ?? 3,
        points_draw: pointsReference?.points_draw ?? 1,
        points_loss: pointsReference?.points_loss ?? 0,
      })

      const fallbackSeasonGuid = active?.guid || seasonItems[0]?.guid || ''
      const resolvedSeasonGuid =
        selectedSeasonGuid && seasonItems.some((item) => item.guid === selectedSeasonGuid)
          ? selectedSeasonGuid
          : fallbackSeasonGuid
      setSelectedSeasonGuid(resolvedSeasonGuid)
      setSelectedHistoricalGuids([])
      setEditingMembershipPlayer(null)
      setMembershipDraft(defaultMembershipDraft)
      setPendingRemoveMembershipPlayer(null)
      setGuestForm((prev) => ({
        ...prev,
        role: hasLabel(labels.role_labels, prev.role)
          ? prev.role
          : pickPreferredLabel(labels.role_labels, 'guest'),
      }))

      if (resolvedSeasonGuid) {
        const standingsPage = await adminService.listStandings(penaGuid, resolvedSeasonGuid, {
          pageSize: 10,
        })
        if (isStale()) {
          return
        }
        setStandings(standingsPage.items || [])
      } else {
        setStandings([])
      }
    } catch (requestError) {
      if (isStale()) {
        return
      }
      throw requestError
    }
  }

  const loadDashboard = async () => {
    setInitializing(true)
    setError(null)
    try {
      const [penaPage, catalogNationalities] = await Promise.all([
        adminService.getPenas({ pageSize: 50 }),
        adminService.getNationalities().catch(() => []),
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
        const fallbackLabels = defaultPenaLabels()
        setPenaLabels(fallbackLabels)
        setLabelsDraft(defaultLabelsDraft(fallbackLabels))
        setMemberFilters(defaultLabelFilters())
        setStandingsFilters(defaultLabelFilters())
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
    runAction(() => loadPenaData(selectedPenaGuid), '')
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
    overviewMatchRequestIdRef.current += 1
    setOverviewMatchGuid('')
    setOverviewMatchDetail(null)
    setOverviewMatchLoading(false)
  }, [selectedPenaGuid, selectedSeasonGuid])

  useEffect(() => {
    insightsRequestIdRef.current += 1
    setInsightsReport(null)
    setInsightsComparisonReport(null)
    setInsightsLoading(false)
  }, [selectedPenaGuid, selectedSeasonGuid, insightsScope])

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

  useEffect(() => {
    if (!seasonImportCandidates.length) {
      setImportSourceSeasonGuid('')
      return
    }
    setImportSourceSeasonGuid((currentGuid) => {
      if (currentGuid && seasonImportCandidates.some((item) => item.guid === currentGuid)) {
        return currentGuid
      }
      return seasonImportCandidates[0].guid
    })
  }, [seasonImportCandidates])

  useEffect(() => {
    if (!selectedSeason) {
      setSelectedSeasonForm(defaultSeasonForm)
      resetSelectedSeasonDateErrors()
      return
    }
    setSelectedSeasonForm({
      start_date: selectedSeason.start_date,
      end_date: selectedSeason.end_date,
      points_win: selectedSeason.points_win,
      points_draw: selectedSeason.points_draw,
      points_loss: selectedSeason.points_loss,
    })
    resetSelectedSeasonDateErrors()
  }, [selectedSeason, resetSelectedSeasonDateErrors])

  const applySeasonContext = (nextSeasonGuid) => {
    setSelectedSeasonGuid(nextSeasonGuid)
    setSelectedHistoricalGuids([])
    setHiddenDeletedMatchGuids([])
    setPendingDeleteSeason(null)
    setEditingSeasonPlayer(null)
    setSeasonPlayerDraft(defaultSeasonPlayerDraft)
    setPendingRemoveSeasonPlayer(null)
    setMatchForm((prev) => ({
      ...prev,
      home_player_guids: [],
      away_player_guids: [],
    }))
    setSelectedMatchGuid('')
    setSelectedMatchDetail(null)
    setMatchLineupsDraft(null)
    setMatchStatsDraft(null)
    if (!nextSeasonGuid) {
      setStandings([])
      setSeasonMatches([])
    }
  }

  const selectSeason = (nextSeasonGuid) => {
    applySeasonContext(nextSeasonGuid)
    if (!selectedPenaGuid || !nextSeasonGuid) {
      return
    }
    runAction(() => loadStandings(selectedPenaGuid, nextSeasonGuid), '')
  }

  const handleCreateSeason = async () => {
    if (!selectedPenaGuid) {
      return
    }
    await runAction(async () => {
      const createdSeason = await adminService.createSeason(selectedPenaGuid, seasonForm)

      let importedCount = 0
      if (importPreviousSeasonRoster && importSourceSeasonGuid) {
        const [sourcePlayers, existingSeasonPlayers] = await Promise.all([
          loadSeasonRoster(selectedPenaGuid, importSourceSeasonGuid),
          loadSeasonRoster(selectedPenaGuid, createdSeason.guid),
        ])
        const existingSeasonGuidSet = new Set(
          existingSeasonPlayers.map((item) => item.player_guid).filter(Boolean)
        )
        const sourcePlayerGuids = Array.from(
          new Set(
            sourcePlayers
              .map((item) => item.player_guid)
              .filter((guid) => guid && !existingSeasonGuidSet.has(guid))
          )
        )
        if (sourcePlayerGuids.length) {
          await adminService.registerSeasonPlayersBulk(
            selectedPenaGuid,
            createdSeason.guid,
            sourcePlayerGuids,
            { sourceSeasonGuid: importSourceSeasonGuid }
          )
          importedCount = sourcePlayerGuids.length
        }
      }

      await loadPenaData(selectedPenaGuid)
      applySeasonContext(createdSeason.guid)
      await loadStandings(selectedPenaGuid, createdSeason.guid)
      setNotice(
        importedCount
          ? t('dashboard.admin.notices.seasonCreatedWithImported', { count: importedCount })
          : t('dashboard.admin.notices.seasonCreated')
      )
    }, '')
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
      end_date: endDate,
    }))
  }

  const handleUpdateSelectedSeason = async () => {
    if (!selectedPenaGuid || !selectedSeasonGuid) {
      return
    }
    if (!validateSelectedSeasonForm(selectedSeasonForm)) {
      return
    }
    const pointsValues = [
      selectedSeasonForm.points_win,
      selectedSeasonForm.points_draw,
      selectedSeasonForm.points_loss,
    ]
    const pointsValid = pointsValues.every((item) => Number.isInteger(item) && item >= 0)
    if (!pointsValid) {
      setError(new Error(t('dashboard.admin.errors.invalidSeasonPoints')))
      return
    }
    await runAction(async () => {
      await adminService.updateSeason(selectedPenaGuid, selectedSeasonGuid, selectedSeasonForm)
      await loadPenaData(selectedPenaGuid)
      await loadStandings(selectedPenaGuid, selectedSeasonGuid)
    }, t('dashboard.admin.notices.seasonUpdated'))
  }

  const handleRequestDeleteSelectedSeason = () => {
    if (!selectedSeason) {
      return
    }
    setPendingDeleteSeason(selectedSeason)
  }

  const handleCancelDeleteSeason = () => {
    if (loading) {
      return
    }
    setPendingDeleteSeason(null)
  }

  const handleDeleteSeason = async () => {
    if (!selectedPenaGuid || !pendingDeleteSeason?.guid) {
      return
    }
    const seasonToDelete = pendingDeleteSeason
    setPendingDeleteSeason(null)
    await runAction(async () => {
      await adminService.deleteSeason(selectedPenaGuid, seasonToDelete.guid)
      await loadPenaData(selectedPenaGuid)
    }, t('dashboard.admin.notices.seasonDeleted'))
  }

  const handleCreateDetailedMatch = async () => {
    if (!selectedPenaGuid || !selectedSeasonGuid) {
      setError(new Error(t('dashboard.admin.errors.selectedSeasonRequired')))
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
      const created = await adminService.createDetailedMatch(selectedPenaGuid, selectedSeasonGuid, {
        match_date: matchForm.match_date,
        home_team: {
          team_name: matchForm.home_team_name,
          player_guids: homeLineup,
        },
        away_team: {
          team_name: matchForm.away_team_name,
          player_guids: awayLineup,
        },
      })
      setLastCreatedMatch(created)
      await Promise.all([
        loadStandings(selectedPenaGuid, selectedSeasonGuid),
        loadSeasonMatches(selectedPenaGuid, selectedSeasonGuid),
      ])
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

  const handleCreateGuestPlayer = async (registerInSelectedSeason) => {
    if (!selectedPenaGuid) {
      return
    }
    if (registerInSelectedSeason && !selectedSeasonGuid) {
      setError(new Error(t('dashboard.admin.errors.selectedSeasonRequired')))
      return
    }
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
      },
      registerInSelectedSeason
        ? t('dashboard.admin.notices.guestCreatedAdded')
        : t('dashboard.admin.notices.guestCreated')
    )
  }

  const handleSeasonSelection = (event) => {
    selectSeason(event.target.value)
  }

  const handleSelectSeasonFromHistory = (seasonGuid) => {
    selectSeason(selectedSeasonGuid === seasonGuid ? '' : seasonGuid)
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
    await runAction(
      async () => {
        await adminService.registerSeasonPlayersBulk(
          selectedPenaGuid,
          selectedSeasonGuid,
          selectedHistoricalGuids
        )
        setSelectedHistoricalGuids([])
        await loadPenaData(selectedPenaGuid)
      },
      t('dashboard.admin.notices.playersAdded', {
        count: totalSelected,
        suffix: totalSelected === 1 ? '' : language === 'es' ? 'es' : 's',
      })
    )
  }

  const handleEditSeasonPlayer = (player) => {
    setEditingSeasonPlayer(player)
    setSeasonPlayerDraft({
      wins: String(player.wins ?? 0),
      draws: String(player.draws ?? 0),
      losses: String(player.losses ?? 0),
      quality_level: String(player.quality_level ?? 0),
      role: player.role || '',
      position: player.position || '',
    })
  }

  const handleCloseEditSeasonPlayer = () => {
    if (loading) {
      return
    }
    setEditingSeasonPlayer(null)
    setSeasonPlayerDraft(defaultSeasonPlayerDraft)
  }

  const handleSaveSeasonPlayer = async () => {
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

  const handleRequestRemoveSeasonPlayer = (player) => {
    setPendingRemoveSeasonPlayer(player)
  }

  const handleCancelRemoveSeasonPlayer = () => {
    if (loading) {
      return
    }
    setPendingRemoveSeasonPlayer(null)
  }

  const handleRemoveSeasonPlayer = async () => {
    if (!selectedPenaGuid || !selectedSeasonGuid || !pendingRemoveSeasonPlayer?.player_guid) {
      return
    }
    const playerToRemove = pendingRemoveSeasonPlayer
    setPendingRemoveSeasonPlayer(null)
    await runAction(async () => {
      await adminService.unregisterSeasonPlayer(
        selectedPenaGuid,
        selectedSeasonGuid,
        playerToRemove.player_guid
      )
      await Promise.all([
        loadSeasonRoster(selectedPenaGuid, selectedSeasonGuid).then(setSeasonRoster),
        loadStandings(selectedPenaGuid, selectedSeasonGuid),
      ])
    }, t('dashboard.admin.notices.seasonPlayerRemoved'))
  }

  const handleEditMembershipPlayer = (player) => {
    setEditingMembershipPlayer(player)
    setMembershipDraft({
      nickname: player.nickname || '',
      role: player.role || '',
      position: player.position || '',
    })
  }

  const handleCloseEditMembershipPlayer = () => {
    if (loading) {
      return
    }
    setEditingMembershipPlayer(null)
    setMembershipDraft(defaultMembershipDraft)
  }

  const handleSaveMembershipPlayer = async () => {
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

  const handleRequestRemoveMembershipPlayer = (player) => {
    setPendingRemoveMembershipPlayer(player)
  }

  const handleCancelRemoveMembershipPlayer = () => {
    if (loading) {
      return
    }
    setPendingRemoveMembershipPlayer(null)
  }

  const handleRemoveMembershipPlayer = async () => {
    if (!selectedPenaGuid || !pendingRemoveMembershipPlayer?.guid) {
      return
    }
    const playerToRemove = pendingRemoveMembershipPlayer
    setPendingRemoveMembershipPlayer(null)
    await runAction(async () => {
      await adminService.removePenaPlayerMembership(selectedPenaGuid, playerToRemove.guid)
      await loadPenaData(selectedPenaGuid)
    }, t('dashboard.admin.notices.membershipRemovedByAdmin'))
  }

  const handleRefreshStandings = async () => {
    if (!selectedPenaGuid || !selectedSeasonGuid) {
      return
    }
    await runAction(
      () => loadStandings(selectedPenaGuid, selectedSeasonGuid, standingsFilters),
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

  const handleOpenOverviewMatchDetail = async (matchGuid) => {
    if (!selectedPenaGuid || !selectedSeasonGuid || !matchGuid) {
      return
    }
    const requestId = overviewMatchRequestIdRef.current + 1
    overviewMatchRequestIdRef.current = requestId
    setOverviewMatchGuid(matchGuid)
    setOverviewMatchLoading(true)
    setError(null)
    try {
      const detail = await adminService.getMatchDetail(
        selectedPenaGuid,
        selectedSeasonGuid,
        matchGuid
      )
      if (requestId !== overviewMatchRequestIdRef.current) {
        return
      }
      setOverviewMatchDetail(detail)
    } catch (requestError) {
      if (requestId !== overviewMatchRequestIdRef.current) {
        return
      }
      if (requestError?.status === 401) {
        await onLogout()
        return
      }
      setError(requestError)
    } finally {
      if (requestId === overviewMatchRequestIdRef.current) {
        setOverviewMatchLoading(false)
      }
    }
  }

  const handleCloseOverviewMatchDetail = () => {
    overviewMatchRequestIdRef.current += 1
    setOverviewMatchGuid('')
    setOverviewMatchDetail(null)
    setOverviewMatchLoading(false)
  }

  const loadScopeInsightReport = async (penaGuid, scope) => {
    const seasonGuids =
      scope === 'all_seasons'
        ? seasonList.map((season) => season.guid).filter(Boolean)
        : [selectedSeasonGuid].filter(Boolean)

    if (!seasonGuids.length) {
      return null
    }
    return adminService.getMatchInsights(penaGuid, {
      scope,
      season_guids: seasonGuids,
    })
  }

  const handleRefreshInsights = async () => {
    if (!selectedPenaGuid || !selectedSeasonGuid) {
      return
    }

    const requestId = insightsRequestIdRef.current + 1
    insightsRequestIdRef.current = requestId

    setInsightsLoading(true)
    setError(null)

    const comparisonScope = insightsScope === 'selected_season' ? 'all_seasons' : 'selected_season'
    try {
      const [primaryReport, comparisonReport] = await Promise.all([
        loadScopeInsightReport(selectedPenaGuid, insightsScope),
        seasonList.length > 1 || comparisonScope === 'selected_season'
          ? loadScopeInsightReport(selectedPenaGuid, comparisonScope)
          : Promise.resolve(null),
      ])
      if (requestId !== insightsRequestIdRef.current) {
        return
      }
      setInsightsReport(primaryReport)
      setInsightsComparisonReport(comparisonReport)
    } catch (requestError) {
      if (requestError?.status === 401) {
        await onLogout()
        return
      }
      setError(requestError)
    } finally {
      if (requestId === insightsRequestIdRef.current) {
        setInsightsLoading(false)
      }
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
        await Promise.all([
          loadStandings(selectedPenaGuid, selectedSeasonGuid),
          loadSeasonRoster(selectedPenaGuid, selectedSeasonGuid).then(setSeasonRoster),
        ])
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

    await runAction(async () => {
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
        loadStandings(selectedPenaGuid, selectedSeasonGuid),
        loadSeasonRoster(selectedPenaGuid, selectedSeasonGuid).then(setSeasonRoster),
        loadSeasonMatches(selectedPenaGuid, selectedSeasonGuid),
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
          ),
        },
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
      rating,
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
        loadStandings(selectedPenaGuid, selectedSeasonGuid),
        loadSeasonRoster(selectedPenaGuid, selectedSeasonGuid).then(setSeasonRoster),
        loadSeasonMatches(selectedPenaGuid, selectedSeasonGuid),
      ])
    }, t('dashboard.admin.notices.matchStatsUpdated'))
  }

  const activeSeasonLabel = activeSeason
    ? `${formatDate(activeSeason.start_date)} - ${formatDate(activeSeason.end_date)}`
    : t('dashboard.admin.status.noActiveSeason')

  const selectedSeasonLabel = selectedSeason
    ? `${formatDate(selectedSeason.start_date)} - ${formatDate(selectedSeason.end_date)}`
    : t('dashboard.admin.status.noSeasonSelected')

  const playersSection = useAdminPlayers({
    state: {
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
      filteredHistoricalPlayers,
      penaLabels,
      labelsDraft,
      draftRoleLabels,
      draftPositionLabels,
      draftRoleColors,
      draftPositionColors,
      memberFilters,
      guestForm,
      nationalities,
    },
    actions: {
      handleSelectHistoricalPlayers,
      handleRegisterHistoricalPlayersInSeason,
      handleEditSeasonPlayer,
      handleRequestRemoveSeasonPlayer,
      onGuestField,
      handleCreateGuestPlayer,
      handleEditMembershipPlayer,
      handleRequestRemoveMembershipPlayer,
      onMemberFilterField,
      onLabelsDraftField,
      onLabelColorDraftChange,
      handleSavePenaLabels,
    },
    helpers: {
      t,
      formatPlayerDisplayName,
    },
  })

  const matchesSection = useAdminMatches({
    state: {
      selectedSeasonGuid,
      seasonRosterLoading,
      seasonRoster,
      createMatchLineupPlayers,
      matchFormHomeGuids,
      matchFormAwayGuids,
      matchForm,
      loading,
      lastCreatedMatch,
      seasonMatchesLoading,
      visibleSeasonMatches,
      selectedMatchGuid,
      deletingMatchGuid,
      matchStatsLoading,
      selectedMatchDetail,
      matchLineupsDraft,
      matchStatsDraft,
      matchEditorLineupPlayers,
      matchDraftHomeGuids,
      matchDraftAwayGuids,
    },
    actions: {
      onMatchField,
      onMatchFormLineupsChange,
      handleCreateDetailedMatch,
      handleOpenMatchStats,
      handleRequestDeleteSeasonMatch,
      onMatchLineupsDraftChange,
      handleSaveMatchLineups,
      onMatchStatsDraftField,
      handleSaveMatchStats,
      closeMatchEditor,
    },
    helpers: {
      t,
      formatDate,
      formatPlayerDisplayName,
    },
  })

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
            'linear-gradient(135deg, rgba(255,255,250,0.95) 0%, rgba(230,245,239,0.72) 70%, rgba(255,238,217,0.62) 100%)',
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
                <Button
                  variant="outlined"
                  onClick={() => runAction(loadDashboard, '')}
                  disabled={loading}
                >
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
                      {activeSeason?.guid === season.guid
                        ? t('dashboard.admin.seasonActiveSuffix')
                        : ''}
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

      {!selectedPenaGuid && <Alert severity="info">{t('dashboard.admin.noLinkedPenaInfo')}</Alert>}

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
                  {activeSeason
                    ? t('dashboard.admin.status.configured')
                    : t('dashboard.admin.status.missing')}
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
                        <strong>{t('dashboard.admin.overview.codeLabel')}:</strong>{' '}
                        {tokenPayload.token}
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
                  <Typography variant="h6">
                    {t('dashboard.admin.overview.quickActionsTitle')}
                  </Typography>
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
                        date: formatDate(lastCreatedMatch.match_date),
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
                    <Typography variant="h6">
                      {t('dashboard.admin.overview.standingsSnapshotTitle')}
                    </Typography>
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
                            <TableCell align="right">{t('dashboard.admin.table.w')}</TableCell>
                            <TableCell align="right">{t('dashboard.admin.table.d')}</TableCell>
                            <TableCell align="right">{t('dashboard.admin.table.l')}</TableCell>
                            <TableCell align="right">{t('dashboard.admin.table.goals')}</TableCell>
                            <TableCell align="right">
                              {t('dashboard.admin.table.assists')}
                            </TableCell>
                            <TableCell align="right">{t('dashboard.admin.table.pts')}</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {standings.slice(0, 5).map((player) => (
                            <TableRow key={player.player_guid}>
                              <TableCell>
                                {player.nickname || `${player.name} ${player.surname1}`}
                              </TableCell>
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
                    <Box>
                      <Typography variant="h6">
                        {t('dashboard.admin.overview.seasonMatchesSnapshotTitle')}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {t('dashboard.admin.overview.seasonMatchesSnapshotDescription')}
                      </Typography>
                    </Box>
                    <Button variant="text" onClick={() => setActiveSection('matches')}>
                      {t('dashboard.admin.overview.createMatch')}
                    </Button>
                  </Stack>

                  {!selectedSeasonGuid && (
                    <Typography variant="body2" color="text.secondary">
                      {t('dashboard.admin.overview.selectSeasonToLoad')}
                    </Typography>
                  )}

                  {selectedSeasonGuid && (
                    <>
                      <Stack direction="row" flexWrap="wrap" gap={1}>
                        <Chip
                          size="small"
                          color="primary"
                          label={t('dashboard.admin.overview.totalMatchesChip', {
                            total: overviewMatchesSummary.total,
                          })}
                        />
                        <Chip
                          size="small"
                          color="warning"
                          label={t('dashboard.admin.overview.openMatchesChip', {
                            open: overviewMatchesSummary.open,
                          })}
                        />
                        <Chip
                          size="small"
                          color="success"
                          label={t('dashboard.admin.overview.closedMatchesChip', {
                            closed: overviewMatchesSummary.closed,
                          })}
                        />
                      </Stack>

                      {!overviewSeasonMatches.length && (
                        <Typography variant="body2" color="text.secondary">
                          {t('dashboard.admin.overview.noMatchesForSeason')}
                        </Typography>
                      )}

                      {overviewSeasonMatches.length > 0 && (
                        <TableContainer>
                          <Table size="small">
                            <TableHead>
                              <TableRow>
                                <TableCell>{t('dashboard.admin.matches.date')}</TableCell>
                                <TableCell>{t('dashboard.admin.matches.home')}</TableCell>
                                <TableCell>{t('dashboard.admin.matches.away')}</TableCell>
                                <TableCell>{t('dashboard.admin.matches.status')}</TableCell>
                                <TableCell>{t('dashboard.admin.matches.result')}</TableCell>
                                <TableCell>{t('dashboard.admin.matches.actions')}</TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {overviewSeasonMatches.map((match) => {
                                const isClosed =
                                  String(match.status || '').toLowerCase() === 'closed'
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
                                    <TableCell>
                                      {match.home_score} - {match.away_score}
                                    </TableCell>
                                    <TableCell>
                                      <Button
                                        size="small"
                                        variant="text"
                                        onClick={() => handleOpenOverviewMatchDetail(match.guid)}
                                        disabled={overviewMatchLoading}
                                      >
                                        {t('dashboard.common.matchDetail.viewAction')}
                                      </Button>
                                    </TableCell>
                                  </TableRow>
                                )
                              })}
                            </TableBody>
                          </Table>
                        </TableContainer>
                      )}
                    </>
                  )}
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {selectedPenaGuid && activeSection === 'seasons' && (
        <AdminSeasonsSection
          state={{
            activeSeason,
            selectedSeason,
            activeSeasonLabel,
            selectedSeasonLabel,
            latestSeasonEndDate,
            seasonForm,
            importPreviousSeasonRoster,
            importSourceSeasonGuid,
            seasonImportCandidates,
            loading,
            historySeasons,
            selectedSeasonGuid,
            selectedSeasonForm,
            selectedSeasonDateErrors,
          }}
          actions={{
            onSeasonField,
            handlePrefillNextSeason,
            onImportPreviousSeasonRosterChange,
            onImportSourceSeasonGuidChange,
            handleCreateSeason,
            onSelectedSeasonField,
            handleUpdateSelectedSeason,
            handleRequestDeleteSelectedSeason,
            handleSelectSeasonFromHistory,
          }}
          helpers={{
            t,
            formatDate,
          }}
        />
      )}

      {selectedPenaGuid && activeSection === 'players' && (
        <AdminPlayersSection
          state={playersSection.state}
          actions={playersSection.actions}
          helpers={playersSection.helpers}
        />
      )}

      {selectedPenaGuid && activeSection === 'matches' && (
        <AdminMatchesSection
          state={matchesSection.state}
          actions={matchesSection.actions}
          helpers={matchesSection.helpers}
        />
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

              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                <TextField
                  select
                  size="small"
                  label={t('dashboard.admin.members.filterRole')}
                  value={standingsFilters.role}
                  onChange={onStandingsFilterField('role')}
                  InputLabelProps={{ shrink: true }}
                  SelectProps={{
                    multiple: true,
                    displayEmpty: true,
                    renderValue: (selected) =>
                      renderFilterValue(selected, t('dashboard.admin.members.filterAllRoles')),
                  }}
                  fullWidth
                >
                  {penaLabels.role_labels.map((roleLabel) => (
                    <MenuItem key={roleLabel} value={roleLabel.toLowerCase()}>
                      {roleLabel}
                    </MenuItem>
                  ))}
                </TextField>
                <TextField
                  select
                  size="small"
                  label={t('dashboard.admin.members.filterPosition')}
                  value={standingsFilters.position}
                  onChange={onStandingsFilterField('position')}
                  InputLabelProps={{ shrink: true }}
                  SelectProps={{
                    multiple: true,
                    displayEmpty: true,
                    renderValue: (selected) =>
                      renderFilterValue(selected, t('dashboard.admin.members.filterAllPositions')),
                  }}
                  fullWidth
                >
                  {penaLabels.position_labels.map((positionLabel) => (
                    <MenuItem key={positionLabel} value={positionLabel.toLowerCase()}>
                      {positionLabel}
                    </MenuItem>
                  ))}
                </TextField>
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
                        <TableCell>{t('dashboard.admin.members.role')}</TableCell>
                        <TableCell>{t('dashboard.admin.members.position')}</TableCell>
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
                          <TableCell>
                            {player.nickname || `${player.name} ${player.surname1}`}
                          </TableCell>
                          <TableCell>
                            {player.role ? (
                              <Chip
                                size="small"
                                label={player.role}
                                sx={{
                                  backgroundColor: player.role_color || DEFAULT_LABEL_COLOR,
                                  color: '#fff',
                                }}
                              />
                            ) : (
                              '-'
                            )}
                          </TableCell>
                          <TableCell>
                            {player.position ? (
                              <Chip
                                size="small"
                                label={player.position}
                                sx={{
                                  backgroundColor: player.position_color || DEFAULT_LABEL_COLOR,
                                  color: '#fff',
                                }}
                              />
                            ) : (
                              '-'
                            )}
                          </TableCell>
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
                          <TableCell colSpan={10}>
                            {t('dashboard.admin.standings.noSeasonPlayers')}
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}

              <Divider />
              <AdminInsightsSection
                state={{
                  selectedSeasonGuid,
                  insightsScope,
                  insightsLoading,
                  insightsReport,
                  insightsComparisonReport,
                  insightsComparison,
                }}
                actions={{
                  onInsightsScopeChange: setInsightsScope,
                  onRefreshInsights: handleRefreshInsights,
                }}
                helpers={{
                  t,
                  formatDecimal,
                  formatSignedDecimal,
                  formatPercent,
                }}
              />
            </Stack>
          </CardContent>
        </Card>
      )}

      <Dialog
        open={Boolean(overviewMatchGuid)}
        onClose={handleCloseOverviewMatchDetail}
        fullWidth
        maxWidth="lg"
      >
        <DialogTitle>{t('dashboard.common.matchDetail.dialogTitle')}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            {overviewMatchLoading && <LinearProgress />}
            {!overviewMatchLoading && overviewMatchDetail && (
              <MatchDetailViewer detail={overviewMatchDetail} t={t} formatDate={formatDate} />
            )}
            {!overviewMatchLoading && !overviewMatchDetail && (
              <Typography variant="body2" color="text.secondary">
                {t('dashboard.common.matchDetail.noData')}
              </Typography>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseOverviewMatchDetail}>
            {t('dashboard.common.matchDetail.closeAction')}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={Boolean(pendingDeleteSeason)}
        onClose={handleCancelDeleteSeason}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>{t('dashboard.admin.seasons.deleteSeasonTitle')}</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {pendingDeleteSeason
              ? t('dashboard.admin.seasons.deleteSeasonConfirm', {
                  season: `${formatDate(pendingDeleteSeason.start_date)} - ${formatDate(pendingDeleteSeason.end_date)}`,
                })
              : ''}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancelDeleteSeason} disabled={loading}>
            {t('dashboard.admin.seasons.cancelDeleteSeason')}
          </Button>
          <Button onClick={handleDeleteSeason} color="error" variant="contained" disabled={loading}>
            {t('dashboard.admin.seasons.deleteSelectedSeason')}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={Boolean(editingSeasonPlayer)}
        onClose={handleCloseEditSeasonPlayer}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>{t('dashboard.admin.players.editSeasonPlayerTitle')}</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            {editingSeasonPlayer
              ? t('dashboard.admin.players.editSeasonPlayerDescription', {
                  player: formatPlayerDisplayName(editingSeasonPlayer),
                })
              : ''}
          </DialogContentText>
          <Stack spacing={1.5}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
              <TextField
                select
                label={t('dashboard.admin.members.role')}
                value={seasonPlayerDraft.role}
                onChange={onSeasonPlayerDraftField('role')}
                fullWidth
              >
                <MenuItem value="">{t('dashboard.admin.members.roleNone')}</MenuItem>
                {seasonPlayerDraft.role &&
                  !hasLabel(penaLabels.role_labels, seasonPlayerDraft.role) && (
                    <MenuItem value={seasonPlayerDraft.role}>{seasonPlayerDraft.role}</MenuItem>
                  )}
                {penaLabels.role_labels.map((roleLabel) => (
                  <MenuItem key={roleLabel} value={roleLabel}>
                    {roleLabel}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                select
                label={t('dashboard.admin.members.position')}
                value={seasonPlayerDraft.position}
                onChange={onSeasonPlayerDraftField('position')}
                fullWidth
              >
                <MenuItem value="">{t('dashboard.admin.members.positionNone')}</MenuItem>
                {seasonPlayerDraft.position &&
                  !hasLabel(penaLabels.position_labels, seasonPlayerDraft.position) && (
                    <MenuItem value={seasonPlayerDraft.position}>
                      {seasonPlayerDraft.position}
                    </MenuItem>
                  )}
                {penaLabels.position_labels.map((positionLabel) => (
                  <MenuItem key={positionLabel} value={positionLabel}>
                    {positionLabel}
                  </MenuItem>
                ))}
              </TextField>
            </Stack>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
              <TextField
                type="number"
                label={t('dashboard.admin.table.w')}
                value={seasonPlayerDraft.wins}
                onChange={onSeasonPlayerDraftField('wins')}
                inputProps={{ min: 0 }}
                fullWidth
              />
              <TextField
                type="number"
                label={t('dashboard.admin.table.d')}
                value={seasonPlayerDraft.draws}
                onChange={onSeasonPlayerDraftField('draws')}
                inputProps={{ min: 0 }}
                fullWidth
              />
              <TextField
                type="number"
                label={t('dashboard.admin.table.l')}
                value={seasonPlayerDraft.losses}
                onChange={onSeasonPlayerDraftField('losses')}
                inputProps={{ min: 0 }}
                fullWidth
              />
            </Stack>
            <TextField
              type="number"
              label={t('dashboard.admin.players.qualityLevel')}
              value={seasonPlayerDraft.quality_level}
              onChange={onSeasonPlayerDraftField('quality_level')}
              inputProps={{ min: 0, step: 0.1 }}
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseEditSeasonPlayer} disabled={loading}>
            {t('dashboard.admin.players.cancelEditSeasonPlayer')}
          </Button>
          <Button onClick={handleSaveSeasonPlayer} variant="contained" disabled={loading}>
            {t('dashboard.admin.players.saveSeasonPlayer')}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={Boolean(pendingRemoveSeasonPlayer)}
        onClose={handleCancelRemoveSeasonPlayer}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>{t('dashboard.admin.players.removeSeasonPlayerTitle')}</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {pendingRemoveSeasonPlayer
              ? t('dashboard.admin.players.removeSeasonPlayerConfirm', {
                  player: formatPlayerDisplayName(pendingRemoveSeasonPlayer),
                })
              : ''}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancelRemoveSeasonPlayer} disabled={loading}>
            {t('dashboard.admin.players.cancelRemoveSeasonPlayer')}
          </Button>
          <Button
            onClick={handleRemoveSeasonPlayer}
            variant="contained"
            color="error"
            disabled={loading}
          >
            {t('dashboard.admin.players.removeFromSeason')}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={Boolean(editingMembershipPlayer)}
        onClose={handleCloseEditMembershipPlayer}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>{t('dashboard.admin.members.editTitle')}</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            {editingMembershipPlayer
              ? t('dashboard.admin.members.editDescription', {
                  player: [
                    editingMembershipPlayer.name,
                    editingMembershipPlayer.surname1,
                    editingMembershipPlayer.surname2,
                  ]
                    .filter(Boolean)
                    .join(' '),
                })
              : ''}
          </DialogContentText>
          <Stack spacing={1.5}>
            <TextField
              label={t('dashboard.admin.members.nickname')}
              value={membershipDraft.nickname}
              onChange={onMembershipDraftField('nickname')}
              fullWidth
            />
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
              <TextField
                select
                label={t('dashboard.admin.members.role')}
                value={membershipDraft.role}
                onChange={onMembershipDraftField('role')}
                fullWidth
              >
                <MenuItem value="">{t('dashboard.admin.members.roleNone')}</MenuItem>
                {membershipDraft.role &&
                  !hasLabel(penaLabels.role_labels, membershipDraft.role) && (
                    <MenuItem value={membershipDraft.role}>{membershipDraft.role}</MenuItem>
                  )}
                {penaLabels.role_labels.map((roleLabel) => (
                  <MenuItem key={roleLabel} value={roleLabel}>
                    {roleLabel}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                select
                label={t('dashboard.admin.members.position')}
                value={membershipDraft.position}
                onChange={onMembershipDraftField('position')}
                fullWidth
              >
                <MenuItem value="">{t('dashboard.admin.members.positionNone')}</MenuItem>
                {membershipDraft.position &&
                  !hasLabel(penaLabels.position_labels, membershipDraft.position) && (
                    <MenuItem value={membershipDraft.position}>{membershipDraft.position}</MenuItem>
                  )}
                {penaLabels.position_labels.map((positionLabel) => (
                  <MenuItem key={positionLabel} value={positionLabel}>
                    {positionLabel}
                  </MenuItem>
                ))}
              </TextField>
            </Stack>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseEditMembershipPlayer} disabled={loading}>
            {t('dashboard.admin.members.cancelEdit')}
          </Button>
          <Button onClick={handleSaveMembershipPlayer} variant="contained" disabled={loading}>
            {t('dashboard.admin.members.saveEdit')}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={Boolean(pendingRemoveMembershipPlayer)}
        onClose={handleCancelRemoveMembershipPlayer}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>{t('dashboard.admin.members.removeTitle')}</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {pendingRemoveMembershipPlayer
              ? t('dashboard.admin.members.removeConfirm', {
                  player: [
                    pendingRemoveMembershipPlayer.name,
                    pendingRemoveMembershipPlayer.surname1,
                    pendingRemoveMembershipPlayer.surname2,
                  ]
                    .filter(Boolean)
                    .join(' '),
                })
              : ''}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancelRemoveMembershipPlayer} disabled={loading}>
            {t('dashboard.admin.members.cancelRemove')}
          </Button>
          <Button
            onClick={handleRemoveMembershipPlayer}
            variant="contained"
            color="error"
            disabled={loading}
          >
            {t('dashboard.admin.members.remove')}
          </Button>
        </DialogActions>
      </Dialog>

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
                  date: formatDate(pendingDeleteMatch.match_date),
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
