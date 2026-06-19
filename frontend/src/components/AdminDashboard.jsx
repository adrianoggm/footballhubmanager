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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TableContainer,
  TextField,
  Typography,
} from '@mui/material'
import { Suspense, lazy, useEffect, useMemo, useRef, useState } from 'react'
import { useAdminSeasons } from '../hooks/useAdminSeasons.js'
import { useFetchWithStaleCheck } from '../hooks/useFetchWithStaleCheck.js'
import { useForm } from '../hooks/useForm.js'
import { useInsightsReport } from '../hooks/useInsightsReport.js'
import { useMatchDetailDialog } from '../hooks/useMatchDetailDialog.js'
import { useToast } from '../context/toastContext.js'
import { useI18n } from '../i18n/useI18n.js'
import { ADMIN_DASHBOARD_SITEMAP } from '../navigation/sitemap.js'
import { compareMatchInsightSummaries } from '../services/matchInsights.js'
import { adminService } from '../services/adminService.js'
import ProfileImageField from './ProfileImageField.jsx'
import { DashboardIdentitySlot } from './dashboard/DashboardShell.jsx'
import AppearanceSettings from './dashboard/AppearanceSettings.jsx'
import MatchDetailDialog from './dashboard/MatchDetailDialog.jsx'
import { resolveDashboardIdentityImageUrl } from './dashboard/dashboardIdentity.js'
import DashboardShell from './dashboard/DashboardShell.jsx'
import AdminOverviewSection from './admin/AdminOverviewSection.jsx'
import { EditMembershipDialog, EditSeasonPlayerDialog } from './admin/PlayerEditDialogs.jsx'
import PenaSeasonSelector from './dashboard/PenaSeasonSelector.jsx'
import { ConfirmDialog, EmptyState } from './common'
import { DashboardContext } from '../context/dashboardContext.js'
import {
  DEFAULT_LABEL_COLOR,
  ROLE_LABEL_COLORS as DEFAULT_ROLE_LABEL_COLORS,
  POSITION_LABEL_COLORS as DEFAULT_POSITION_LABEL_COLORS,
} from '../theme/tokens.js'

const AdminSeasonsSection = lazy(() => import('./admin/AdminSeasonsSection.jsx'))
const AdminAccountabilitySection = lazy(() => import('./admin/AdminAccountabilitySection.jsx'))
const AdminPlayersSection = lazy(() => import('./admin/AdminPlayersSection.jsx'))
const AdminMatchesSection = lazy(() => import('./admin/AdminMatchesSection.jsx'))
const AdminStandingsSection = lazy(() => import('./admin/AdminStandingsSection.jsx'))

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

const defaultMatchEventDraft = () => ({
  event_type: 'goal',
  team_side: 'home',
  player_guid: '',
  related_player_guid: '',
  note: '',
  minute: '',
  second: '',
  value_delta: '1',
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

const defaultPenaProfileDraft = () => ({
  image_url: '',
})

const HEX_COLOR_RE = /^#?[0-9a-fA-F]{6}$/

const asText = (value) => value ?? ''

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
  DEFAULT_LABEL_COLOR

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

const ADMIN_HERO_SUBTITLE_KEY_BY_SECTION = {
  overview: 'dashboard.admin.heroSections.overview',
  seasons: 'dashboard.admin.heroSections.seasons',
  accountability: 'dashboard.admin.heroSections.accountability',
  players: 'dashboard.admin.heroSections.players',
  matches: 'dashboard.admin.heroSections.matches',
  standings: 'dashboard.admin.heroSections.standings',
}

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

// Human countdown for a season relative to today ("starts in N days" /
// "N days left" / "ended N days ago"). Empty string when dates are missing.
const seasonCountdown = (season, t) => {
  if (!season?.start_date || !season?.end_date) {
    return ''
  }
  const dayMs = 86_400_000
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const start = new Date(`${season.start_date}T00:00:00`)
  const end = new Date(`${season.end_date}T00:00:00`)
  if (today < start) {
    return t('dashboard.admin.status.startsInDays', {
      days: Math.round((start - today) / dayMs),
    })
  }
  if (today > end) {
    return t('dashboard.admin.status.endedDaysAgo', {
      days: Math.round((today - end) / dayMs),
    })
  }
  const daysLeft = Math.round((end - today) / dayMs)
  return daysLeft === 0
    ? t('dashboard.admin.status.endsToday')
    : t('dashboard.admin.status.daysLeft', { days: daysLeft })
}

const formatDecimal = (value, digits = 2) => Number(value || 0).toFixed(digits)

const formatSignedDecimal = (value, digits = 2) => {
  const numeric = Number(value || 0)
  const prefix = numeric >= 0 ? '+' : ''
  return `${prefix}${numeric.toFixed(digits)}`
}

const formatPercent = (value) => `${Math.round(Number(value || 0) * 100)}%`

const formatElapsedDuration = (value) => {
  const totalSeconds = Math.max(0, Number(value || 0))
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  if (hours > 0) {
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(
      seconds
    ).padStart(2, '0')}`
  }
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
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

const mapProfileImageErrorMessage = (error, t) => {
  const raw = String(error?.message || '').toLowerCase()
  if (raw.includes('jpg') || raw.includes('png') || raw.includes('webp')) {
    return t('dashboard.common.imageErrors.invalidType')
  }
  return t('dashboard.common.imageErrors.processing')
}

function SectionLoader() {
  return (
    <Card sx={{ width: '100%' }}>
      <CardContent>
        <LinearProgress />
      </CardContent>
    </Card>
  )
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

const parseMatchEventElapsedDraft = (draft) => {
  const minuteValue = String(draft?.minute ?? '').trim()
  const secondValue = String(draft?.second ?? '').trim()
  if (!minuteValue && !secondValue) {
    return { isValid: true, hasValue: false, value: null }
  }

  const minutes = Number(minuteValue || 0)
  const seconds = Number(secondValue || 0)
  if (
    !Number.isInteger(minutes) ||
    minutes < 0 ||
    !Number.isInteger(seconds) ||
    seconds < 0 ||
    seconds > 59
  ) {
    return { isValid: false, hasValue: true, value: null }
  }

  return {
    isValid: true,
    hasValue: true,
    value: minutes * 60 + seconds,
  }
}

const MATCH_EVENT_TYPES_REQUIRING_PLAYER = new Set([
  'goal',
  'assist',
  'save',
  'foul',
  'yellow_card',
  'red_card',
  'sanction',
])

const isLiveTrackingStatus = (value) => {
  const normalized = String(value || '')
    .trim()
    .toLowerCase()
  return normalized === 'live' || normalized === 'in_progress'
}

const collectPagedItems = async (fetchPage, { maxConcurrent = 3 } = {}) => {
  const firstResponse = await fetchPage(1)
  const firstItems = firstResponse.items || []
  const totalPages = Number(firstResponse.total_pages || 0)
  const items = [...firstItems]

  if (!totalPages) {
    let page = 2
    while (true) {
      const response = await fetchPage(page)
      const pageItems = response.items || []
      if (!pageItems.length) {
        break
      }
      items.push(...pageItems)
      page += 1
    }
    return items
  }

  if (totalPages <= 1) {
    return items
  }

  for (let startPage = 2; startPage <= totalPages; startPage += maxConcurrent) {
    const endPage = Math.min(totalPages, startPage + maxConcurrent - 1)
    const batchPages = Array.from(
      { length: endPage - startPage + 1 },
      (_, index) => startPage + index
    )
    const batchResponses = await Promise.all(batchPages.map((page) => fetchPage(page)))
    batchResponses.forEach((response) => {
      items.push(...(response.items || []))
    })
  }

  return items
}

export default function AdminDashboard({
  session,
  onLogout,
  routeSectionId = '',
  onSectionChange = null,
}) {
  const { language, t } = useI18n()
  const { showToast } = useToast()
  // FE-2: synchronous single-flight guard for match-event creation. `loading`
  // flips asynchronously, so two taps in the same tick both pass it; this ref
  // blocks the duplicate dispatch immediately.
  const matchEventBusyRef = useRef(false)
  const seasonMatchesFetch = useFetchWithStaleCheck()
  const penaDataFetch = useFetchWithStaleCheck()
  const [loading, setLoading] = useState(false)
  const [deletingMatchGuid, setDeletingMatchGuid] = useState('')
  const [pendingDeleteMatch, setPendingDeleteMatch] = useState(null)
  const [initializing, setInitializing] = useState(true)
  const [error, setError] = useState(null)
  const [penaSettingsOpen, setPenaSettingsOpen] = useState(false)

  const [penas, setPenas] = useState([])
  const [selectedPenaGuid, setSelectedPenaGuid] = useState('')
  const [activeSection, setActiveSection] = useState(routeSectionId || 'overview')

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
  const [matchEventDraft, setMatchEventDraft] = useState(defaultMatchEventDraft)
  const [matchStatsLoading, setMatchStatsLoading] = useState(false)
  const [deletingMatchEventGuid, setDeletingMatchEventGuid] = useState('')
  const [insightsScope, setInsightsScope] = useState('selected_season')
  const [tokenPayload, setTokenPayload] = useState(null)
  const [claimLinkPayload, setClaimLinkPayload] = useState(null)
  const [lastCreatedMatch, setLastCreatedMatch] = useState(null)
  const [nationalities, setNationalities] = useState([])

  // Form/draft state via the shared useForm hook. `setValues` is aliased to the
  // legacy setter names so the existing reset/merge call sites stay unchanged.
  const {
    values: seasonForm,
    setValues: setSeasonForm,
    onField: onSeasonFormField,
  } = useForm(defaultSeasonForm)
  const [importPreviousSeasonRoster, setImportPreviousSeasonRoster] = useState(true)
  const [importSourceSeasonGuid, setImportSourceSeasonGuid] = useState('')
  const [selectedSeasonForm, setSelectedSeasonForm] = useState(defaultSeasonForm)
  const [penaLabels, setPenaLabels] = useState(defaultPenaLabels)
  const {
    values: labelsDraft,
    setValues: setLabelsDraft,
    onField: onLabelsDraftField,
  } = useForm(defaultLabelsDraft)
  const [memberFilters, setMemberFilters] = useState(defaultLabelFilters)
  const [standingsFilters, setStandingsFilters] = useState(defaultLabelFilters)
  const {
    values: matchForm,
    setValues: setMatchForm,
    onField: onMatchField,
  } = useForm(defaultMatchForm)
  const {
    values: guestForm,
    setValues: setGuestForm,
    onField: onGuestField,
  } = useForm(defaultGuestForm)
  const [pendingDeleteSeason, setPendingDeleteSeason] = useState(null)
  const [editingSeasonPlayer, setEditingSeasonPlayer] = useState(null)
  const {
    values: seasonPlayerDraft,
    setValues: setSeasonPlayerDraft,
    onField: onSeasonPlayerDraftField,
  } = useForm(defaultSeasonPlayerDraft)
  const [pendingRemoveSeasonPlayer, setPendingRemoveSeasonPlayer] = useState(null)
  const [editingMembershipPlayer, setEditingMembershipPlayer] = useState(null)
  const {
    values: membershipDraft,
    setValues: setMembershipDraft,
    onField: onMembershipDraftField,
  } = useForm(defaultMembershipDraft)
  const [pendingRemoveMembershipPlayer, setPendingRemoveMembershipPlayer] = useState(null)
  const { values: penaProfileDraft, setValues: setPenaProfileDraft } =
    useForm(defaultPenaProfileDraft)

  const historySeasons = useMemo(() => {
    return [...seasonList].sort((left, right) => {
      if (left.end_date === right.end_date) {
        return String(right.start_date || '').localeCompare(String(left.start_date || ''))
      }
      return String(right.end_date || '').localeCompare(String(left.end_date || ''))
    })
  }, [seasonList])

  const latestSeasonEndDate = useMemo(() => getLatestSeasonEndDate(seasonList), [seasonList])

  const selectedSeason = useMemo(
    () => seasonList.find((item) => item.guid === selectedSeasonGuid) || null,
    [seasonList, selectedSeasonGuid]
  )

  const selectedPena = useMemo(
    () => penas.find((item) => item.guid === selectedPenaGuid) || null,
    [penas, selectedPenaGuid]
  )

  const {
    matchGuid: overviewMatchGuid,
    matchDetail: overviewMatchDetail,
    isLoading: overviewMatchLoading,
    open: openOverviewMatchDetailDialog,
    close: closeOverviewMatchDetailDialog,
    reset: resetOverviewMatchDetailDialog,
  } = useMatchDetailDialog({
    fetchDetail: (matchGuid) =>
      adminService.getMatchDetail(selectedPenaGuid, selectedSeasonGuid, matchGuid),
    onUnauthorized: onLogout,
    onError: setError,
  })

  const {
    loading: insightsLoading,
    report: insightsReport,
    comparisonReport: insightsComparisonReport,
    refresh: refreshInsightsReport,
    reset: resetInsightsReport,
  } = useInsightsReport({
    fetchInsights: ({ scope, seasonGuids }) =>
      adminService.getMatchInsights(selectedPenaGuid, {
        scope,
        season_guids: seasonGuids,
      }),
    onUnauthorized: onLogout,
    onError: setError,
  })

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
  const adminSections = useMemo(() => ADMIN_DASHBOARD_SITEMAP, [])
  const adminSectionIds = useMemo(
    () => adminSections.map((section) => section.id).filter(Boolean),
    [adminSections]
  )

  // Season-dependent sections (matches, standings) are gated until the pena has at
  // least one season. The season list is always loaded with the pena, so this is reliable.
  const hasSeason = seasonList.length > 0

  useEffect(() => {
    if (
      routeSectionId &&
      adminSectionIds.includes(routeSectionId) &&
      routeSectionId !== activeSection
    ) {
      setActiveSection(routeSectionId)
    }
  }, [activeSection, adminSectionIds, routeSectionId])

  useEffect(() => {
    if (!adminSectionIds.includes(activeSection)) {
      setActiveSection(adminSectionIds[0] || 'overview')
    }
  }, [activeSection, adminSectionIds])

  const handleSectionChange = (nextSectionId) => {
    const resolvedSectionId = adminSectionIds.includes(nextSectionId)
      ? nextSectionId
      : adminSectionIds[0] || 'overview'
    // Don't land on a season-gated section while the pena has no season; send the
    // admin to Seasons to configure one first.
    const target = adminSections.find((section) => section.id === resolvedSectionId)
    const finalSectionId = target?.requiresSeason && !hasSeason ? 'seasons' : resolvedSectionId
    setActiveSection(finalSectionId)
    if (onSectionChange) {
      onSectionChange(finalSectionId)
    }
  }

  const openPenaSettings = () => {
    setPenaProfileDraft({
      image_url: asText(selectedPena?.image_url),
    })
    setPenaSettingsOpen(true)
  }

  const shouldLoadHistoricalPlayers =
    activeSection === 'players' || activeSection === 'accountability'
  const shouldLoadPenaLabels = activeSection === 'players' || activeSection === 'standings'
  const shouldLoadStandings = activeSection === 'overview' || activeSection === 'standings'

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

  const onSeasonField = (name) =>
    onSeasonFormField(name, name.startsWith('points_') ? Number : undefined)

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
    setMatchEventDraft(defaultMatchEventDraft())
    setDeletingMatchEventGuid('')
  }

  const runAction = async (action, successMessage) => {
    setLoading(true)
    setError(null)
    try {
      await action()
      // UX-3: transient success feedback is a toast (auto-dismisses, visible
      // wherever the user is looking) instead of a static inline Alert.
      if (successMessage) {
        if (typeof successMessage === 'string') {
          showToast(successMessage, 'success')
        } else if (successMessage.message) {
          showToast(successMessage.message, successMessage.severity || 'success')
        }
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

  const loadHistoricalPlayersForPena = async (penaGuid) => loadHistoricalPlayers(penaGuid)

  const loadPenaLabelsForPena = async (penaGuid) => {
    const labelsRaw = await adminService.getPenaLabels(penaGuid).catch(() => defaultPenaLabels())
    return sanitizePenaLabels(labelsRaw)
  }

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

  const loadPenaData = async (penaGuid) =>
    penaDataFetch.run(async ({ isStale }) => {
      try {
        const [active, seasonsPage, penaPlayers, labels] = await Promise.all([
          adminService.getActiveSeason(penaGuid).catch((requestError) => {
            if (requestError.status === 404) {
              return null
            }
            throw requestError
          }),
          adminService.listSeasons(penaGuid, { pageSize: 100 }),
          shouldLoadHistoricalPlayers ? loadHistoricalPlayers(penaGuid) : Promise.resolve(null),
          shouldLoadPenaLabels
            ? adminService.getPenaLabels(penaGuid).catch(() => defaultPenaLabels())
            : Promise.resolve(null),
        ])
        if (isStale()) {
          return
        }

        const seasonItems = seasonsPage.items || []
        const nextLabels = shouldLoadPenaLabels ? sanitizePenaLabels(labels) : penaLabels
        setActiveSeason(active)
        setSeasonList(seasonItems)
        setMemberFilters(defaultLabelFilters())
        setStandingsFilters(defaultLabelFilters())

        if (shouldLoadHistoricalPlayers) {
          setHistoricalPlayers(penaPlayers || [])
        }

        if (shouldLoadPenaLabels) {
          setPenaLabels(nextLabels)
          setLabelsDraft(defaultLabelsDraft(nextLabels))
          setGuestForm((prev) => ({
            ...prev,
            role: hasLabel(nextLabels.role_labels, prev.role)
              ? prev.role
              : pickPreferredLabel(nextLabels.role_labels, 'guest'),
            position: hasLabel(nextLabels.position_labels, prev.position) ? prev.position : '',
          }))
          setMembershipDraft((prev) => ({
            ...prev,
            role: hasLabel(nextLabels.role_labels, prev.role) ? prev.role : '',
            position: hasLabel(nextLabels.position_labels, prev.position) ? prev.position : '',
          }))
        }

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
          role: hasLabel(nextLabels.role_labels, prev.role)
            ? prev.role
            : pickPreferredLabel(nextLabels.role_labels, 'guest'),
        }))
      } catch (requestError) {
        if (isStale()) {
          return
        }
        throw requestError
      }
    })

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

  const handleSavePenaProfile = async () => {
    if (!selectedPenaGuid) {
      return
    }

    await runAction(async () => {
      const updated = await adminService.updatePenaProfile(selectedPenaGuid, penaProfileDraft)
      setPenas((prev) =>
        prev.map((item) => (item.guid === updated.guid ? { ...item, ...updated } : item))
      )
      setPenaSettingsOpen(false)
    }, t('dashboard.admin.notices.penaProfileUpdated'))
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
    if (!selectedPenaGuid || initializing) {
      return
    }
    if (!shouldLoadHistoricalPlayers && !shouldLoadPenaLabels) {
      return
    }

    let activeRequest = true
    ;(async () => {
      try {
        const [players, labels] = await Promise.all([
          shouldLoadHistoricalPlayers
            ? loadHistoricalPlayersForPena(selectedPenaGuid)
            : Promise.resolve(null),
          shouldLoadPenaLabels ? loadPenaLabelsForPena(selectedPenaGuid) : Promise.resolve(null),
        ])
        if (!activeRequest) {
          return
        }

        if (shouldLoadHistoricalPlayers) {
          setHistoricalPlayers(players || [])
        }

        if (shouldLoadPenaLabels && labels) {
          setPenaLabels(labels)
          setLabelsDraft(defaultLabelsDraft(labels))
          setGuestForm((prev) => ({
            ...prev,
            role: hasLabel(labels.role_labels, prev.role)
              ? prev.role
              : pickPreferredLabel(labels.role_labels, 'guest'),
            position: hasLabel(labels.position_labels, prev.position) ? prev.position : '',
          }))
          setMembershipDraft((prev) => ({
            ...prev,
            role: hasLabel(labels.role_labels, prev.role) ? prev.role : '',
            position: hasLabel(labels.position_labels, prev.position) ? prev.position : '',
          }))
          setMemberFilters((prev) => ({
            role: pruneFilterValues(prev.role, labels.role_labels),
            position: pruneFilterValues(prev.position, labels.position_labels),
          }))
          setStandingsFilters((prev) => ({
            role: pruneFilterValues(prev.role, labels.role_labels),
            position: pruneFilterValues(prev.position, labels.position_labels),
          }))
        }
      } catch (requestError) {
        if (!activeRequest) {
          return
        }
        if (requestError?.status === 401) {
          await onLogout()
          return
        }
        setError(requestError)
      }
    })()

    return () => {
      activeRequest = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSection])

  useEffect(() => {
    if (!shouldLoadStandings) {
      setStandings([])
      return
    }
    if (!selectedPenaGuid || !selectedSeasonGuid || initializing) {
      setStandings([])
      return
    }
    if (!seasonList.some((season) => season.guid === selectedSeasonGuid)) {
      setStandings([])
      return
    }

    let activeRequest = true
    ;(async () => {
      try {
        await loadStandings(selectedPenaGuid, selectedSeasonGuid, standingsFilters)
      } catch (requestError) {
        if (!activeRequest) {
          return
        }
        if (requestError?.status === 401) {
          await onLogout()
          return
        }
        setError(requestError)
      }
    })()

    return () => {
      activeRequest = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPenaGuid, selectedSeasonGuid, seasonList, initializing, activeSection])

  // The season roster feeds the always-visible "season players" summary card,
  // so it loads for every section once a pena + season are selected.
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
    resetOverviewMatchDetailDialog()
  }, [resetOverviewMatchDetailDialog, selectedPenaGuid, selectedSeasonGuid])

  useEffect(() => {
    resetInsightsReport()
  }, [insightsScope, resetInsightsReport, selectedPenaGuid, selectedSeasonGuid])

  // Season matches feed the always-visible "season matches" summary card, so they
  // load for every section once a pena + season are selected.
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
      showToast(
        importedCount
          ? t('dashboard.admin.notices.seasonCreatedWithImported', { count: importedCount })
          : t('dashboard.admin.notices.seasonCreated'),
        'success'
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

  const handleGenerateClaimLink = async (player) => {
    if (!selectedPenaGuid || !player?.guid) {
      return
    }
    await runAction(async () => {
      const token = await adminService.createClaimToken(selectedPenaGuid, player.guid)
      setClaimLinkPayload({ ...token, player })
    }, t('dashboard.admin.notices.claimLinkGenerated'))
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
    setError(null)
    await openOverviewMatchDetailDialog(matchGuid)
  }

  const handleCloseOverviewMatchDetail = () => {
    closeOverviewMatchDetailDialog()
  }

  const handleRefreshInsights = async () => {
    if (!selectedPenaGuid || !selectedSeasonGuid) {
      return
    }

    setError(null)
    await refreshInsightsReport({
      scope: insightsScope,
      selectedSeasonGuid,
      seasonList,
    })
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
          loadStandings(selectedPenaGuid, selectedSeasonGuid),
          loadSeasonRoster(selectedPenaGuid, selectedSeasonGuid).then(setSeasonRoster),
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
    // FE-2: drop duplicate dispatches from a double-tap before `loading` flips.
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
      // FE-6: stamp the live minute so quick goals/saves land on the timeline.
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
    // FE-7: reset in finally so the row never gets stuck "deleting" on error,
    // and so a 401-triggered logout/unmount doesn't run a stray state update.
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

  // Plain view-model bundles for the section components.
  const playersSection = {
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
      claimLinkPayload,
    },
    actions: {
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
      onCloseClaimLink: () => setClaimLinkPayload(null),
      onMemberFilterField,
      onLabelsDraftField,
      onLabelColorDraftChange,
      handleSavePenaLabels,
    },
    helpers: {
      t,
      formatPlayerDisplayName,
      formatEpochSeconds,
    },
  }

  const matchesSection = {
    state: {
      selectedSeasonGuid,
      selectedSeason,
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
      matchEventDraft,
      deletingMatchEventGuid,
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
    },
    helpers: {
      t,
      formatDate,
      formatElapsedDuration,
      formatPlayerDisplayName,
    },
  }

  const adminNavItems = adminSections.map((section) => {
    const locked = Boolean(section.requiresSeason) && !hasSeason
    return {
      id: section.id,
      label: t(section.titleKey),
      icon: section.id,
      disabled: locked,
      disabledReason: locked ? t('dashboard.admin.navLockedNoSeason') : '',
    }
  })
  const activeAdminSection = adminSections.find((section) => section.id === activeSection) || null
  const activeAdminSectionLabel = activeAdminSection
    ? t(activeAdminSection.titleKey)
    : t('dashboard.admin.panelTitle')
  const activeAdminHeroSubtitle = t(
    ADMIN_HERO_SUBTITLE_KEY_BY_SECTION[activeSection] || 'dashboard.admin.heroSubtitle'
  )

  // Summary cards favor actionable season-ops info over restating context that is
  // already visible in the header (pena name, selectors).
  const selectedIsActive = Boolean(
    selectedSeason && activeSeason && selectedSeason.guid === activeSeason.guid
  )
  const adminSummaryCards = [
    {
      label: t('dashboard.admin.overview.activeSeason'),
      value: activeSeason ? activeSeasonLabel : t('dashboard.admin.status.missing'),
      helper: activeSeason
        ? seasonCountdown(activeSeason, t)
        : t('dashboard.admin.status.noActiveSeason'),
      tone: activeSeason ? 'success' : 'warning',
    },
    {
      label: t('dashboard.admin.overview.selectedSeasonCard'),
      value: selectedSeason ? selectedSeasonLabel : '-',
      helper: selectedSeason
        ? selectedIsActive
          ? t('dashboard.admin.status.sameAsActive')
          : t('dashboard.admin.status.differentFromActive')
        : t('dashboard.admin.status.noSeasonSelected'),
      tone: !selectedSeason || !selectedIsActive ? 'warning' : 'primary',
    },
    {
      label: t('dashboard.admin.overview.seasonPlayers'),
      value: selectedSeasonGuid && !seasonRosterLoading ? String(seasonRoster.length) : '-',
      helper: selectedSeason
        ? t('dashboard.admin.status.registeredInSelected')
        : t('dashboard.admin.status.noSeasonSelected'),
      tone: 'info',
    },
    {
      label: t('dashboard.admin.overview.seasonMatchesCard'),
      value:
        selectedSeasonGuid && !seasonMatchesLoading ? String(overviewMatchesSummary.total) : '-',
      helper: selectedSeason
        ? t('dashboard.admin.status.matchesOpenClosed', {
            open: overviewMatchesSummary.open,
            closed: overviewMatchesSummary.closed,
          })
        : t('dashboard.admin.status.noSeasonSelected'),
      tone: overviewMatchesSummary.open > 0 ? 'warning' : 'success',
    },
  ]

  if (initializing) {
    return (
      <Stack spacing={2}>
        <Typography variant="h5">{t('dashboard.admin.panelTitle')}</Typography>
        <LinearProgress />
      </Stack>
    )
  }

  // Guided fallback shown when a season-dependent section is reached without a season.
  const seasonGateEmptyState = (
    <EmptyState
      title={t('dashboard.admin.gating.noSeasonTitle')}
      description={t('dashboard.admin.gating.noSeasonBody')}
      action={
        <Button variant="contained" onClick={() => handleSectionChange('seasons')}>
          {t('dashboard.admin.gating.goToSeasons')}
        </Button>
      }
    />
  )

  // Selection state stays owned here; it is exposed through context so the shared
  // PenaSeasonSelector (and, in later phases, feature sections) can read it without
  // prop drilling. Cheap object — the only consumer today is the selector.
  const dashboardContextValue = {
    role: 'admin',
    loading,
    penas,
    selectedPenaGuid,
    selectedPena,
    onSelectPena: setSelectedPenaGuid,
    seasons: seasonList,
    selectedSeasonGuid,
    selectedSeason,
    activeSeason,
    onSelectSeason: selectSeason,
    labels: {
      pena: t('dashboard.admin.currentPena'),
      season: t('dashboard.admin.referenceSeason'),
      activeSuffix: t('dashboard.admin.seasonActiveSuffix'),
    },
  }

  return (
    <DashboardContext.Provider value={dashboardContextValue}>
      <DashboardShell
        brand={t('app.brand')}
        brandShort="FH"
        railLabel={t('dashboard.admin.panelTitle')}
        navItems={adminNavItems}
        activeNavId={activeSection}
        onNavChange={handleSectionChange}
        title={activeAdminSectionLabel}
        subtitle={activeAdminHeroSubtitle}
        badges={
          <>
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
          </>
        }
        headerAside={
          <Stack spacing={1.1}>
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              spacing={1}
              alignItems={{ sm: 'center' }}
              justifyContent="space-between"
            >
              <DashboardIdentitySlot
                name={selectedPena?.name || t('dashboard.admin.panelTitle')}
                imageUrl={resolveDashboardIdentityImageUrl(selectedPena)}
                imageAlt={selectedPena?.name || t('dashboard.admin.panelTitle')}
              />

              <Stack
                direction="row"
                spacing={0.6}
                flexWrap="wrap"
                useFlexGap
                alignItems="center"
                justifyContent={{ xs: 'flex-start', sm: 'flex-end' }}
              >
                <Button
                  variant="outlined"
                  onClick={openPenaSettings}
                  disabled={loading || !selectedPenaGuid}
                >
                  {t('dashboard.admin.openPenaSettings')}
                </Button>
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

            <PenaSeasonSelector />
          </Stack>
        }
        summaryCards={adminSummaryCards}
      >
        {loading && <LinearProgress />}
        {error && <Alert severity="error">{errorMessage}</Alert>}

        {!selectedPenaGuid && (
          <EmptyState
            title={t('dashboard.admin.currentPena')}
            description={t('dashboard.admin.noLinkedPenaInfo')}
            action={
              <Button
                variant="outlined"
                onClick={() => runAction(loadDashboard, '')}
                disabled={loading}
              >
                {t('dashboard.common.refreshData')}
              </Button>
            }
          />
        )}

        {selectedPenaGuid && activeSection === 'overview' && (
          <AdminOverviewSection
            state={{
              loading,
              selectedSeasonGuid,
              tokenPayload,
              standings,
              overviewSeasonMatches,
              overviewMatchesSummary,
              overviewMatchLoading,
            }}
            actions={{
              onGenerateJoinCode: handleGenerateJoinCode,
              onRefreshStandings: handleRefreshStandings,
              onCreateMatch: () => handleSectionChange('matches'),
              onOpenMatchDetail: handleOpenOverviewMatchDetail,
            }}
            helpers={{
              t,
              formatDate,
              formatEpochSeconds,
            }}
          />
        )}

        {selectedPenaGuid && activeSection === 'seasons' && (
          <Suspense fallback={<SectionLoader />}>
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
          </Suspense>
        )}

        {selectedPenaGuid &&
          activeSection === 'accountability' &&
          (!loading && historicalPlayers.length === 0 ? (
            <EmptyState
              title={t('dashboard.admin.gating.noPlayersTitle')}
              description={t('dashboard.admin.gating.noPlayersBody')}
              action={
                <Button variant="contained" onClick={() => handleSectionChange('players')}>
                  {t('dashboard.admin.gating.goToPlayers')}
                </Button>
              }
            />
          ) : (
            <Suspense fallback={<SectionLoader />}>
              <AdminAccountabilitySection
                penaGuid={selectedPenaGuid}
                players={historicalPlayers}
                t={t}
                formatPlayerDisplayName={formatPlayerDisplayName}
              />
            </Suspense>
          ))}

        {selectedPenaGuid && activeSection === 'players' && (
          <Suspense fallback={<SectionLoader />}>
            <AdminPlayersSection
              state={playersSection.state}
              actions={playersSection.actions}
              helpers={playersSection.helpers}
            />
          </Suspense>
        )}

        {selectedPenaGuid &&
          activeSection === 'matches' &&
          (hasSeason ? (
            <Suspense fallback={<SectionLoader />}>
              <AdminMatchesSection
                state={matchesSection.state}
                actions={matchesSection.actions}
                helpers={matchesSection.helpers}
              />
            </Suspense>
          ) : (
            seasonGateEmptyState
          ))}

        {selectedPenaGuid &&
          activeSection === 'standings' &&
          (hasSeason ? (
            <Suspense fallback={<SectionLoader />}>
              <AdminStandingsSection
                state={{
                  selectedSeasonGuid,
                  selectedSeasonLabel,
                  loading,
                  standings,
                  standingsFilters,
                  penaLabels,
                  insightsScope,
                  insightsLoading,
                  insightsReport,
                  insightsComparisonReport,
                  insightsComparison,
                }}
                actions={{
                  onRefreshStandings: handleRefreshStandings,
                  onStandingsFilterField,
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
            </Suspense>
          ) : (
            seasonGateEmptyState
          ))}

        <Dialog
          open={penaSettingsOpen}
          onClose={() => setPenaSettingsOpen(false)}
          fullWidth
          maxWidth="sm"
        >
          <DialogTitle>{t('dashboard.admin.penaSettingsTitle')}</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ pt: 1 }}>
              <Typography variant="body2" color="text.secondary">
                {t('dashboard.admin.penaSettingsHint')}
              </Typography>
              <ProfileImageField
                value={penaProfileDraft.image_url}
                alt={selectedPena?.name || t('dashboard.admin.panelTitle')}
                label={t('dashboard.common.profileImageLabel')}
                helperText={t('dashboard.admin.penaImageHint')}
                chooseLabel={t('dashboard.common.imageActions.choose')}
                replaceLabel={t('dashboard.common.imageActions.replace')}
                removeLabel={t('dashboard.common.imageActions.remove')}
                emptyLabel={t('dashboard.common.imageEmpty')}
                processingLabel={t('dashboard.common.imageActions.processing')}
                disabled={loading}
                onChange={(value) => setPenaProfileDraft((prev) => ({ ...prev, image_url: value }))}
                onError={(error) => setError(new Error(mapProfileImageErrorMessage(error, t)))}
              />
              <Divider />
              <AppearanceSettings />
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setPenaSettingsOpen(false)} disabled={loading}>
              {t('dashboard.user.settingsCancel')}
            </Button>
            <Button variant="contained" onClick={handleSavePenaProfile} disabled={loading}>
              {t('dashboard.admin.savePenaProfile')}
            </Button>
          </DialogActions>
        </Dialog>

        <MatchDetailDialog
          open={Boolean(overviewMatchGuid)}
          onClose={handleCloseOverviewMatchDetail}
          loading={overviewMatchLoading}
          detail={overviewMatchDetail}
          t={t}
          formatDate={formatDate}
        />

        <ConfirmDialog
          open={Boolean(pendingDeleteSeason)}
          onCancel={handleCancelDeleteSeason}
          onConfirm={handleDeleteSeason}
          title={t('dashboard.admin.seasons.deleteSeasonTitle')}
          description={
            pendingDeleteSeason
              ? t('dashboard.admin.seasons.deleteSeasonConfirm', {
                  season: `${formatDate(pendingDeleteSeason.start_date)} - ${formatDate(pendingDeleteSeason.end_date)}`,
                })
              : ''
          }
          cancelLabel={t('dashboard.admin.seasons.cancelDeleteSeason')}
          confirmLabel={t('dashboard.admin.seasons.deleteSelectedSeason')}
          loading={loading}
        />

        <EditSeasonPlayerDialog
          player={editingSeasonPlayer}
          draft={seasonPlayerDraft}
          onField={onSeasonPlayerDraftField}
          onClose={handleCloseEditSeasonPlayer}
          onSave={handleSaveSeasonPlayer}
          penaLabels={penaLabels}
          loading={loading}
          t={t}
          formatPlayerDisplayName={formatPlayerDisplayName}
        />

        <ConfirmDialog
          open={Boolean(pendingRemoveSeasonPlayer)}
          onCancel={handleCancelRemoveSeasonPlayer}
          onConfirm={handleRemoveSeasonPlayer}
          title={t('dashboard.admin.players.removeSeasonPlayerTitle')}
          description={
            pendingRemoveSeasonPlayer
              ? t('dashboard.admin.players.removeSeasonPlayerConfirm', {
                  player: formatPlayerDisplayName(pendingRemoveSeasonPlayer),
                })
              : ''
          }
          cancelLabel={t('dashboard.admin.players.cancelRemoveSeasonPlayer')}
          confirmLabel={t('dashboard.admin.players.removeFromSeason')}
          loading={loading}
        />

        <EditMembershipDialog
          player={editingMembershipPlayer}
          draft={membershipDraft}
          onField={onMembershipDraftField}
          onClose={handleCloseEditMembershipPlayer}
          onSave={handleSaveMembershipPlayer}
          penaLabels={penaLabels}
          loading={loading}
          t={t}
        />

        <ConfirmDialog
          open={Boolean(pendingRemoveMembershipPlayer)}
          onCancel={handleCancelRemoveMembershipPlayer}
          onConfirm={handleRemoveMembershipPlayer}
          title={t('dashboard.admin.members.removeTitle')}
          description={
            pendingRemoveMembershipPlayer
              ? t('dashboard.admin.members.removeConfirm', {
                  player: [
                    pendingRemoveMembershipPlayer.name,
                    pendingRemoveMembershipPlayer.surname1,
                    pendingRemoveMembershipPlayer.surname2,
                  ]
                    .filter(Boolean)
                    .join(' '),
                })
              : ''
          }
          cancelLabel={t('dashboard.admin.members.cancelRemove')}
          confirmLabel={t('dashboard.admin.members.remove')}
          loading={loading}
        />

        <ConfirmDialog
          open={Boolean(pendingDeleteMatch)}
          onCancel={handleCancelDeleteSeasonMatch}
          onConfirm={handleDeleteSeasonMatch}
          title={t('dashboard.admin.matches.deleteMatchTitle')}
          description={
            pendingDeleteMatch
              ? t('dashboard.admin.matches.deleteMatchConfirm', {
                  home: pendingDeleteMatch.home_team_name,
                  away: pendingDeleteMatch.away_team_name,
                  date: formatDate(pendingDeleteMatch.match_date),
                })
              : ''
          }
          cancelLabel={t('dashboard.admin.matches.cancelDelete')}
          confirmLabel={t('dashboard.admin.matches.deleteMatch')}
          loading={Boolean(deletingMatchGuid)}
        />
      </DashboardShell>
    </DashboardContext.Provider>
  )
}
