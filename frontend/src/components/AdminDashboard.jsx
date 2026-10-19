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
  IconButton,
  Tooltip,
} from '@mui/material'
import { Suspense, lazy, useEffect, useMemo, useState } from 'react'
import { useAdminPlayers } from '../hooks/useAdminPlayers.js'
import { useAdminSeasons } from '../hooks/useAdminSeasons.js'
import { useFetchWithStaleCheck } from '../hooks/useFetchWithStaleCheck.js'
import { useForm } from '../hooks/useForm.js'
import { useInsightsReport } from '../hooks/useInsightsReport.js'
import { useInvitations } from '../hooks/useInvitations.js'
import { useMatchDetailDialog } from '../hooks/useMatchDetailDialog.js'
import { useMatchTracking } from '../hooks/useMatchTracking.js'
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
import {
  buildLineupPlayerOptions,
  formatPlayerDisplayName,
  normalizePlayerGuids,
  setUnionSize,
} from './admin/matches/lineupHelpers.js'
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

const defaultGuestForm = () => ({
  name: '',
  surname1: '',
  surname2: '',
  nationality: 'Spain',
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
  const { t } = useI18n()
  const { showToast } = useToast()
  const penaDataFetch = useFetchWithStaleCheck()
  const [loading, setLoading] = useState(false)
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
  const [standings, setStandings] = useState([])
  const [insightsScope, setInsightsScope] = useState('selected_season')
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
    fetchInsights: ({ scope, seasonGuids, dateFrom, dateTo }) =>
      adminService.getMatchInsights(selectedPenaGuid, {
        scope,
        season_guids: seasonGuids,
        ...(dateFrom ? { date_from: dateFrom } : {}),
        ...(dateTo ? { date_to: dateTo } : {}),
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

  const createMatchLineupPlayers = useMemo(
    () => buildLineupPlayerOptions(seasonRoster),
    [seasonRoster]
  )

  const matchFormHomeGuids = useMemo(
    () => normalizePlayerGuids(matchForm.home_player_guids),
    [matchForm.home_player_guids]
  )

  const matchFormAwayGuids = useMemo(
    () => normalizePlayerGuids(matchForm.away_player_guids),
    [matchForm.away_player_guids]
  )

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

  // Same success/failure resolution contract as
  // `handleRegisterHistoricalPlayersInSeason`/`handleCreateGuestPlayer` above.
  const handleSavePenaLabels = async () => {
    if (!selectedPenaGuid) {
      return false
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
      return false
    }

    let succeeded = false
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
      adminPlayers.syncMembershipDraftLabels(updated)
      const nextStandingsFilters = {
        role: pruneFilterValues(standingsFilters.role, updated.role_labels),
        position: pruneFilterValues(standingsFilters.position, updated.position_labels),
      }
      setStandingsFilters(nextStandingsFilters)
      if (selectedSeasonGuid) {
        await loadStandings(selectedPenaGuid, selectedSeasonGuid, nextStandingsFilters)
      }
      succeeded = true
    }, t('dashboard.admin.notices.labelsUpdated'))
    return succeeded
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

  const {
    tokenPayload,
    claimLinkPayload,
    handleGenerateJoinCode,
    handleGenerateClaimLink,
    closeClaimLink,
  } = useInvitations({ selectedPenaGuid, runAction, t })

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

  // A match mutation changes scores, so the sibling standings + roster must
  // refresh too. The match list refresh is owned by useMatchTracking.
  const refreshStandingsAndRoster = async (penaGuid, seasonGuid) => {
    await Promise.all([
      loadStandings(penaGuid, seasonGuid),
      loadSeasonRoster(penaGuid, seasonGuid).then(setSeasonRoster),
    ])
  }

  const matchTracking = useMatchTracking({
    selectedPenaGuid,
    selectedSeasonGuid,
    seasonRoster,
    seasonList,
    initializing,
    runAction,
    setError,
    onUnauthorized: onLogout,
    showToast,
    t,
    refreshStandingsAndRoster,
  })
  const {
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
    resetSelection: resetMatchSelection,
  } = matchTracking

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
        setStandingsFilters(defaultLabelFilters())

        if (shouldLoadHistoricalPlayers) {
          adminPlayers.refreshHistoricalPlayers(penaPlayers || [])
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
        adminPlayers.clearHistoricalSelection()
        adminPlayers.resetMembershipDialog()
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
        setStandingsFilters(defaultLabelFilters())
        setStandings([])
        // The season-matches list is cleared by useMatchTracking's own effect
        // once selectedPenaGuid drops to ''; here we only clear the selection.
        resetMatchSelection()
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
          adminPlayers.refreshHistoricalPlayers(players || [])
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
          adminPlayers.syncMembershipDraftLabels(labels)
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
    adminPlayers.clearHistoricalSelection()
    setPendingDeleteSeason(null)
    adminPlayers.resetSeasonPlayerDialog()
    setMatchForm((prev) => ({
      ...prev,
      home_player_guids: [],
      away_player_guids: [],
    }))
    // The match list + hidden-delete set are reconciled by useMatchTracking's
    // loading effect when selectedSeasonGuid changes; clear the selection here.
    resetMatchSelection()
    if (!nextSeasonGuid) {
      setStandings([])
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

  const handleSelectSeasonFromHistory = (seasonGuid) => {
    selectSeason(selectedSeasonGuid === seasonGuid ? '' : seasonGuid)
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

  const handleRefreshInsights = async (options = {}) => {
    if (!selectedPenaGuid || !selectedSeasonGuid) {
      return
    }

    setError(null)
    await refreshInsightsReport({
      scope: insightsScope,
      selectedSeasonGuid,
      seasonList,
      dateFrom: options.dateFrom || '',
      dateTo: options.dateTo || '',
    })
  }

  const activeSeasonLabel = activeSeason
    ? `${formatDate(activeSeason.start_date)} - ${formatDate(activeSeason.end_date)}`
    : t('dashboard.admin.status.noActiveSeason')

  const selectedSeasonLabel = selectedSeason
    ? `${formatDate(selectedSeason.start_date)} - ${formatDate(selectedSeason.end_date)}`
    : t('dashboard.admin.status.noSeasonSelected')

  // Player state + mutation handlers are owned by useAdminPlayers (issue #147,
  // task 4). This call must stay after runAction/loadPenaData/loadSeasonRoster/
  // loadStandings/penaLabels/guestForm/the dialog-open setters are all defined
  // above, since they're passed in by value as args.
  const adminPlayers = useAdminPlayers({
    selectedPenaGuid,
    selectedSeasonGuid,
    selectedSeasonLabel,
    selectedSeason,
    seasonList,
    loading,
    seasonRoster,
    seasonRosterLoading,
    setSeasonRoster,
    penaLabels,
    labelsDraft,
    draftRoleLabels,
    draftPositionLabels,
    draftRoleColors,
    draftPositionColors,
    onLabelsDraftField,
    onLabelColorDraftChange,
    handleSavePenaLabels,
    guestForm,
    setGuestForm,
    onGuestField,
    nationalities,
    claimLinkPayload,
    handleGenerateClaimLink,
    onCloseClaimLink: closeClaimLink,
    runAction,
    setError,
    loadPenaData,
    loadSeasonRoster,
    loadStandings,
  })

  // Plain view-model bundles for the section components.
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

  // Overview datacards favor actionable season-ops info over restating context that is
  // already visible in the header (pena name, selectors). Rendered only on the Overview
  // section now (issue #144).
  const goalsScored = standings.reduce((sum, p) => sum + (p.goals ?? 0), 0)
  const topScorer = standings.reduce(
    (best, p) => ((p.goals ?? 0) > (best?.goals ?? -1) ? p : best),
    null
  )
  const topScorerName = topScorer
    ? topScorer.nickname || `${topScorer.name} ${topScorer.surname1}`
    : '-'

  const overviewDatacards = [
    {
      label: t('dashboard.admin.overview.registeredPlayersCard'),
      value: selectedSeasonGuid && !seasonRosterLoading ? String(seasonRoster.length) : '-',
      helper: t('dashboard.admin.overview.registeredPlayersHelper'),
      tone: 'info',
      icon: 'players',
    },
    {
      label: t('dashboard.admin.overview.seasonMatchesCardLabel'),
      value:
        selectedSeasonGuid && !seasonMatchesLoading ? String(overviewMatchesSummary.total) : '-',
      helper: selectedSeason
        ? t('dashboard.admin.status.matchesOpenClosed', {
            open: overviewMatchesSummary.open,
            closed: overviewMatchesSummary.closed,
          })
        : t('dashboard.admin.status.noSeasonSelected'),
      tone: overviewMatchesSummary.open > 0 ? 'warning' : 'success',
      icon: 'matches',
    },
    {
      label: t('dashboard.admin.overview.goalsScoredCard'),
      value: selectedSeasonGuid ? String(goalsScored) : '-',
      helper: selectedSeason ? selectedSeasonLabel : t('dashboard.admin.overview.noSeasonShort'),
      tone: 'secondary',
      icon: 'goals',
    },
    {
      label: t('dashboard.admin.overview.topScorerCard'),
      value: selectedSeasonGuid && topScorer ? topScorerName : '-',
      helper: topScorer
        ? t('dashboard.admin.overview.topScorerHelper', { goals: topScorer.goals ?? 0 })
        : t('dashboard.admin.overview.noSeasonShort'),
      tone: 'success',
      icon: 'scorer',
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
        title={!['overview', 'players'].includes(activeSection) ? activeAdminSectionLabel : ''}
        subtitle={!['overview', 'players'].includes(activeSection) ? activeAdminHeroSubtitle : ''}
        headerAside={
          <Stack
            direction={{ xs: 'column', md: 'row' }}
            spacing={2}
            alignItems={{ xs: 'stretch', md: 'center' }}
            justifyContent="space-between"
            sx={{ width: '100%' }}
          >
            <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap" useFlexGap>
              <DashboardIdentitySlot
                name={selectedPena?.name || t('dashboard.admin.panelTitle')}
                imageUrl={resolveDashboardIdentityImageUrl(selectedPena)}
                imageAlt={selectedPena?.name || t('dashboard.admin.panelTitle')}
              />
              <PenaSeasonSelector />
            </Stack>

            <Stack
              direction="row"
              spacing={0.6}
              flexWrap="wrap"
              useFlexGap
              alignItems="center"
              justifyContent={{ xs: 'flex-start', md: 'flex-end' }}
            >
              <Tooltip title={t('dashboard.common.refreshData')}>
                <span>
                  <IconButton
                    onClick={() => runAction(loadDashboard, '')}
                    disabled={loading}
                    color="text.secondary"
                  >
                    <Box component="span" className="material-symbols-rounded">
                      refresh
                    </Box>
                  </IconButton>
                </span>
              </Tooltip>
              <Tooltip title={t('dashboard.admin.openPenaSettings')}>
                <span>
                  <IconButton
                    onClick={openPenaSettings}
                    disabled={loading || !selectedPenaGuid}
                    color="text.Secondary"
                  >
                    <Box component="span" className="material-symbols-rounded">
                      settings
                    </Box>
                  </IconButton>
                </span>
              </Tooltip>
              <Tooltip title={t('dashboard.common.logout')}>
                <span>
                  <IconButton onClick={onLogout} disabled={loading} color="error">
                    <Box component="span" className="material-symbols-rounded">
                      logout
                    </Box>
                  </IconButton>
                </span>
              </Tooltip>
            </Stack>
          </Stack>
        }
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
              allSeasonMatches: visibleSeasonMatches,
              overviewMatchesSummary,
              overviewMatchLoading,
              overviewDatacards,
            }}
            actions={{
              onGenerateJoinCode: handleGenerateJoinCode,
              onOpenMatchDetail: handleOpenOverviewMatchDetail,
              onAddPlayer: () => handleSectionChange('players'),
              onAddGuest: () => adminPlayers.actions.handleCreateGuestPlayer(true),
              onAddFunds: () => handleSectionChange('accountability'),
              onAddExpenses: () => handleSectionChange('accountability'),
              onStandings: () => handleSectionChange('standings'),
              onViewMatches: () => handleSectionChange('matches'),
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
          (!loading && adminPlayers.players.length === 0 ? (
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
                players={adminPlayers.players}
                t={t}
                formatPlayerDisplayName={formatPlayerDisplayName}
              />
            </Suspense>
          ))}

        {selectedPenaGuid && activeSection === 'players' && (
          <Suspense fallback={<SectionLoader />}>
            <AdminPlayersSection
              adminPlayers={adminPlayers}
              penaGuid={selectedPenaGuid}
              selectedSeasonGuid={selectedSeasonGuid}
              selectedSeasonLabel={selectedSeasonLabel}
              seasons={seasonList}
              nationalities={nationalities}
              penaLabels={penaLabels}
              t={t}
              formatPlayerDisplayName={formatPlayerDisplayName}
              formatEpochSeconds={formatEpochSeconds}
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
              <TextField
                select
                size="small"
                label={t('dashboard.admin.currentPena') || 'Peña Activa'}
                value={selectedPenaGuid}
                onChange={(event) => setSelectedPenaGuid(event.target.value)}
                disabled={loading}
                fullWidth
              >
                {penas.map((pena) => (
                  <MenuItem key={pena.guid} value={pena.guid}>
                    {pena.name}
                  </MenuItem>
                ))}
              </TextField>
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
