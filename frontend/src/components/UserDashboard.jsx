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
  DialogTitle,
  Grid,
  LinearProgress,
  MenuItem,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material'
import { Suspense, lazy, useEffect, useMemo, useRef, useState } from 'react'
import LanguageSwitcher from './LanguageSwitcher.jsx'
import MatchDetailViewer from './MatchDetailViewer.jsx'
import ProfileImageField from './ProfileImageField.jsx'
import ThemeModeSwitcher from './ThemeModeSwitcher.jsx'
import { DashboardControlField, DashboardIdentitySlot } from './dashboard/DashboardShell.jsx'
import { resolveDashboardIdentityImageUrl } from './dashboard/dashboardIdentity.js'
import DashboardShell from './dashboard/DashboardShell.jsx'
import { useInsightsReport } from '../hooks/useInsightsReport.js'
import { useMatchDetailDialog } from '../hooks/useMatchDetailDialog.js'
import { useI18n } from '../i18n/useI18n.js'
import { USER_DASHBOARD_ANCHORS, resolveUserDashboardSections } from '../navigation/sitemap.js'
import { compareMatchInsightSummaries } from '../services/matchInsights.js'
import { userService } from '../services/userService.js'

const UserAccountabilitySection = lazy(() => import('./user/UserAccountabilitySection.jsx'))
const AdminInsightsSection = lazy(() => import('./admin/AdminInsightsSection.jsx'))

const defaultProfileForm = () => ({
  name: '',
  surname1: '',
  surname2: '',
  nationality: '',
  image_url: '',
})

const defaultJoinForm = () => ({
  token: '',
  nickname: '',
  position: '',
})

const defaultMembershipForm = () => ({
  nickname: '',
  position: '',
})

const DEFAULT_LABEL_COLOR = '#64748B'

const asText = (value) => value ?? ''

const labelChipSx = (color) => ({
  backgroundColor: color || DEFAULT_LABEL_COLOR,
  color: '#fff',
})

const formatDate = (value) => {
  if (!value) {
    return '-'
  }
  return new Date(`${value}T00:00:00`).toLocaleDateString()
}

const formatDecimal = (value, digits = 2) => Number(value || 0).toFixed(digits)

const formatSignedDecimal = (value, digits = 2) => {
  const numeric = Number(value || 0)
  const prefix = numeric >= 0 ? '+' : ''
  return `${prefix}${numeric.toFixed(digits)}`
}

const formatPercent = (value) => `${Math.round(Number(value || 0) * 100)}%`

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

const USER_HERO_SUBTITLE_KEY_BY_SECTION = {
  join: 'dashboard.user.heroSections.join',
  membership: 'dashboard.user.heroSections.membership',
  accountability: 'dashboard.user.heroSections.accountability',
  standings: 'dashboard.user.heroSections.standings',
  matches: 'dashboard.user.heroSections.matches',
  insights: 'dashboard.user.heroSections.insights',
}

export default function UserDashboard({
  session,
  onLogout,
  routeSectionId = '',
  onSectionChange = null,
}) {
  const { t } = useI18n()
  const [initializing, setInitializing] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [notice, setNotice] = useState('')
  const [profileSettingsOpen, setProfileSettingsOpen] = useState(false)

  const [profile, setProfile] = useState(null)
  const [profileForm, setProfileForm] = useState(defaultProfileForm)
  const [nationalities, setNationalities] = useState([])

  const [penas, setPenas] = useState([])
  const [selectedPenaGuid, setSelectedPenaGuid] = useState('')
  const [membership, setMembership] = useState(null)
  const [membershipForm, setMembershipForm] = useState(defaultMembershipForm)
  const [joinForm, setJoinForm] = useState(defaultJoinForm)
  const [seasonList, setSeasonList] = useState([])
  const [selectedSeasonGuid, setSelectedSeasonGuid] = useState('')
  const [standings, setStandings] = useState([])
  const [seasonMatches, setSeasonMatches] = useState([])
  const [seasonDataLoading, setSeasonDataLoading] = useState(false)
  const [insightsScope, setInsightsScope] = useState('selected_season')
  const seasonListRequestIdRef = useRef(0)
  const seasonDataRequestIdRef = useRef(0)

  const selectedPena = useMemo(
    () => penas.find((item) => item.guid === selectedPenaGuid) || null,
    [penas, selectedPenaGuid]
  )

  const selectedSeason = useMemo(
    () => seasonList.find((item) => item.guid === selectedSeasonGuid) || null,
    [seasonList, selectedSeasonGuid]
  )

  const {
    loading: insightsLoading,
    report: insightsReport,
    comparisonReport: insightsComparisonReport,
    refresh: refreshInsightsReport,
    reset: resetInsightsReport,
  } = useInsightsReport({
    fetchInsights: ({ scope, seasonGuids }) =>
      userService.getMatchInsights(selectedPenaGuid, {
        scope,
        season_guids: seasonGuids,
      }),
    onUnauthorized: onLogout,
    onError: setError,
  })

  const {
    matchGuid: selectedMatchGuid,
    matchDetail: selectedMatchDetail,
    isLoading: matchDetailLoading,
    open: openMatchDetailDialog,
    close: closeMatchDetailDialog,
    reset: resetMatchDetailDialog,
  } = useMatchDetailDialog({
    fetchDetail: (matchGuid) =>
      userService.getMatchDetail(selectedPenaGuid, selectedSeasonGuid, matchGuid),
    onUnauthorized: onLogout,
    onError: setError,
  })

  const errorMessage = useMemo(() => (error ? mapDashboardErrorMessage(error, t) : ''), [error, t])
  const userQuickNavSections = useMemo(
    () =>
      resolveUserDashboardSections({
        hasSelectedPena: Boolean(selectedPenaGuid),
        hasSelectedSeason: Boolean(selectedSeasonGuid),
      }),
    [selectedPenaGuid, selectedSeasonGuid]
  )
  const activeNavSectionId = useMemo(() => {
    if (!routeSectionId) {
      return ''
    }
    return userQuickNavSections.some((section) => section.id === routeSectionId)
      ? routeSectionId
      : ''
  }, [routeSectionId, userQuickNavSections])
  const visibleUserSectionId = activeNavSectionId || userQuickNavSections[0]?.id || 'membership'
  const shouldLoadStandings = visibleUserSectionId === 'standings'
  const shouldLoadSeasonMatches = visibleUserSectionId === 'matches'
  const currentPlayerGuid = asText(profile?.guid || session?.user_guid).trim()
  const currentStanding = useMemo(() => {
    if (!currentPlayerGuid || standings.length === 0) {
      return null
    }
    const index = standings.findIndex((item) => item.player_guid === currentPlayerGuid)
    if (index < 0) {
      return null
    }
    return { ...standings[index], rank: index + 1 }
  }, [standings, currentPlayerGuid])

  const orderedSeasonMatches = useMemo(
    () =>
      [...seasonMatches].sort((left, right) => {
        if (left.match_date === right.match_date) {
          return String(right.guid || '').localeCompare(String(left.guid || ''))
        }
        return String(right.match_date || '').localeCompare(String(left.match_date || ''))
      }),
    [seasonMatches]
  )

  const insightsComparison = useMemo(
    () => compareMatchInsightSummaries(insightsReport, insightsComparisonReport),
    [insightsReport, insightsComparisonReport]
  )

  useEffect(() => {
    if (!visibleUserSectionId) {
      return
    }
    const targetSection = userQuickNavSections.find(
      (section) => section.id === visibleUserSectionId
    )
    if (!targetSection?.anchor) {
      return
    }

    const rafId = window.requestAnimationFrame(() => {
      const node = document.getElementById(targetSection.anchor)
      if (node) {
        node.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
    })

    return () => window.cancelAnimationFrame(rafId)
  }, [userQuickNavSections, visibleUserSectionId])

  const runAction = async (action, successMessage = '') => {
    setLoading(true)
    setError(null)
    setNotice('')
    try {
      await action()
      if (successMessage) {
        setNotice(successMessage)
      }
      return true
    } catch (actionError) {
      if (actionError?.status === 401) {
        await onLogout()
        return false
      }
      setError(actionError)
      return false
    } finally {
      setLoading(false)
    }
  }

  const loadMembership = async (penaGuid) => {
    if (!penaGuid) {
      setMembership(null)
      setMembershipForm(defaultMembershipForm())
      return
    }
    try {
      const currentMembership = await userService.getMyMembership(penaGuid)
      setMembership(currentMembership)
      setMembershipForm({
        nickname: asText(currentMembership.nickname),
        position: asText(currentMembership.position),
      })
    } catch (requestError) {
      if (requestError.status === 403 || requestError.status === 404) {
        setMembership(null)
        setMembershipForm(defaultMembershipForm())
        return
      }
      throw requestError
    }
  }

  const loadSeasonList = async (penaGuid) => {
    const requestId = seasonListRequestIdRef.current + 1
    seasonListRequestIdRef.current = requestId
    const isStale = () => requestId !== seasonListRequestIdRef.current

    if (!penaGuid) {
      if (isStale()) {
        return
      }
      setSeasonList([])
      setSelectedSeasonGuid('')
      return
    }

    const [activeSeason, seasonsPage] = await Promise.all([
      userService.getActiveSeason(penaGuid).catch((requestError) => {
        if (requestError?.status === 404) {
          return null
        }
        throw requestError
      }),
      userService.listSeasons(penaGuid, { pageSize: 100 }),
    ])
    if (isStale()) {
      return
    }

    const seasonItems = seasonsPage.items || []
    setSeasonList(seasonItems)
    const resolvedSeasonGuid = seasonItems.some((item) => item.guid === selectedSeasonGuid)
      ? selectedSeasonGuid
      : activeSeason?.guid || seasonItems[0]?.guid || ''
    setSelectedSeasonGuid(resolvedSeasonGuid)
  }

  const loadStandingsData = async (penaGuid, seasonGuid) => {
    const requestId = seasonDataRequestIdRef.current + 1
    seasonDataRequestIdRef.current = requestId
    const isStale = () => requestId !== seasonDataRequestIdRef.current

    if (!seasonGuid) {
      if (isStale()) {
        return
      }
      setStandings([])
      return
    }

    const standingsPage = await userService.listStandings(penaGuid, seasonGuid, { pageSize: 20 })
    if (isStale()) {
      return
    }
    setStandings(standingsPage.items || [])
  }

  const loadSeasonMatchesData = async (penaGuid, seasonGuid) => {
    const requestId = seasonDataRequestIdRef.current + 1
    seasonDataRequestIdRef.current = requestId
    const isStale = () => requestId !== seasonDataRequestIdRef.current

    if (!seasonGuid) {
      if (isStale()) {
        return
      }
      setSeasonMatches([])
      resetMatchDetailDialog()
      return
    }

    const matchesPage = await userService.listSeasonMatches(penaGuid, seasonGuid, { pageSize: 100 })
    if (isStale()) {
      return
    }
    setSeasonMatches(matchesPage.items || [])
  }

  const loadDashboard = async () => {
    setInitializing(true)
    setError(null)
    try {
      const [nextProfile, penasPage, nextNationalities] = await Promise.all([
        userService.getMyProfile(),
        userService.listMyPenas(),
        userService.getNationalities().catch(() => []),
      ])
      const nextPenas = penasPage.items || []
      setProfile(nextProfile)
      setProfileForm({
        name: asText(nextProfile.name),
        surname1: asText(nextProfile.surname1),
        surname2: asText(nextProfile.surname2),
        nationality: asText(nextProfile.nationality),
        image_url: asText(nextProfile.image_url),
      })
      setPenas(nextPenas)
      setNationalities(nextNationalities)

      const preferredPena =
        nextPenas.find((item) => item.guid === selectedPenaGuid)?.guid || nextPenas[0]?.guid || ''
      setSelectedPenaGuid(preferredPena)
      if (preferredPena) {
        await Promise.all([loadMembership(preferredPena), loadSeasonList(preferredPena)])
      } else {
        setMembership(null)
        setMembershipForm(defaultMembershipForm())
        setSeasonList([])
        setSelectedSeasonGuid('')
        setStandings([])
        setSeasonMatches([])
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
      if (!selectedPenaGuid) {
        setMembership(null)
        setMembershipForm(defaultMembershipForm())
        setSeasonList([])
        setSelectedSeasonGuid('')
        setStandings([])
        setSeasonMatches([])
        resetMatchDetailDialog()
      }
      return
    }
    runAction(async () => {
      await Promise.all([loadMembership(selectedPenaGuid), loadSeasonList(selectedPenaGuid)])
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPenaGuid])

  useEffect(() => {
    if (!shouldLoadStandings) {
      setStandings([])
      setSeasonDataLoading(false)
      return
    }
    if (!selectedPenaGuid || !selectedSeasonGuid || initializing) {
      setStandings([])
      setSeasonDataLoading(false)
      return
    }

    let activeRequest = true
    setSeasonDataLoading(true)
    ;(async () => {
      try {
        await loadStandingsData(selectedPenaGuid, selectedSeasonGuid)
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
          setSeasonDataLoading(false)
        }
      }
    })()

    return () => {
      activeRequest = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPenaGuid, selectedSeasonGuid, initializing, activeNavSectionId])

  useEffect(() => {
    if (!shouldLoadSeasonMatches) {
      setSeasonMatches([])
      return
    }
    if (!selectedPenaGuid || !selectedSeasonGuid || initializing) {
      setSeasonMatches([])
      return
    }

    let activeRequest = true
    ;(async () => {
      try {
        await loadSeasonMatchesData(selectedPenaGuid, selectedSeasonGuid)
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
  }, [selectedPenaGuid, selectedSeasonGuid, initializing, activeNavSectionId])

  useEffect(() => {
    resetMatchDetailDialog()
  }, [resetMatchDetailDialog, selectedPenaGuid, selectedSeasonGuid])

  useEffect(() => {
    resetInsightsReport()
  }, [resetInsightsReport, selectedPenaGuid, selectedSeasonGuid, insightsScope])

  const onProfileField = (name) => (event) => {
    setProfileForm((prev) => ({ ...prev, [name]: event.target.value }))
  }

  const openProfileSettings = () => {
    if (profile) {
      setProfileForm({
        name: asText(profile.name),
        surname1: asText(profile.surname1),
        surname2: asText(profile.surname2),
        nationality: asText(profile.nationality),
        image_url: asText(profile.image_url),
      })
    }
    setProfileSettingsOpen(true)
  }

  const onMembershipField = (name) => (event) => {
    setMembershipForm((prev) => ({ ...prev, [name]: event.target.value }))
  }

  const onJoinField = (name) => (event) => {
    setJoinForm((prev) => ({ ...prev, [name]: event.target.value }))
  }

  const handleUpdateProfile = async () => {
    return runAction(async () => {
      const updatedProfile = await userService.updateMyProfile(profileForm)
      setProfile(updatedProfile)
      setProfileForm({
        name: asText(updatedProfile.name),
        surname1: asText(updatedProfile.surname1),
        surname2: asText(updatedProfile.surname2),
        nationality: asText(updatedProfile.nationality),
        image_url: asText(updatedProfile.image_url),
      })
    }, t('dashboard.user.noticeProfileUpdated'))
  }

  const handleSaveProfileFromSettings = async () => {
    const saved = await handleUpdateProfile()
    if (saved) {
      setProfileSettingsOpen(false)
    }
  }

  const handleJoinPena = async () => {
    const token = joinForm.token.trim()
    if (!token) {
      setError(new Error(t('dashboard.user.errorInviteRequired')))
      return
    }
    await runAction(async () => {
      await userService.consumeJoinToken({
        token,
        nickname: joinForm.nickname.trim() || null,
        position: joinForm.position.trim() || null,
      })
      setJoinForm(defaultJoinForm())
      await loadDashboard()
    }, t('dashboard.user.noticeJoinedPena'))
  }

  const handleUpdateMembership = async () => {
    if (!selectedPenaGuid) {
      return
    }
    await runAction(async () => {
      const updatedMembership = await userService.updateMyMembership(selectedPenaGuid, {
        nickname: membershipForm.nickname.trim() || null,
        position: membershipForm.position.trim() || null,
      })
      setMembership(updatedMembership)
      setMembershipForm({
        nickname: asText(updatedMembership.nickname),
        position: asText(updatedMembership.position),
      })
    }, t('dashboard.user.noticeMembershipUpdated'))
  }

  const handleLeavePena = async () => {
    if (!selectedPenaGuid) {
      return
    }
    const confirmed = window.confirm(t('dashboard.user.confirmLeave'))
    if (!confirmed) {
      return
    }
    await runAction(async () => {
      await userService.leavePena(selectedPenaGuid)
      await loadDashboard()
    }, t('dashboard.user.noticeLeftPena'))
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

  const handleOpenMatchDetail = async (matchGuid) => {
    if (!selectedPenaGuid || !selectedSeasonGuid || !matchGuid) {
      return
    }
    setError(null)
    await openMatchDetailDialog(matchGuid)
  }

  const handleCloseMatchDetail = () => {
    closeMatchDetailDialog()
  }

  const handleNavigateToSection = (sectionId) => {
    if (onSectionChange) {
      onSectionChange(sectionId)
      return
    }
    const targetSection = userQuickNavSections.find((section) => section.id === sectionId)
    const node = targetSection?.anchor ? document.getElementById(targetSection.anchor) : null
    if (node) {
      node.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  const selectedSeasonLabel = selectedSeason
    ? `${formatDate(selectedSeason.start_date)} - ${formatDate(selectedSeason.end_date)}`
    : t('dashboard.user.noSeasonsAvailable')

  const profileDisplayName = [profile?.name, profile?.surname1, profile?.surname2]
    .filter(Boolean)
    .join(' ')

  const userNavItems = userQuickNavSections.map((section) => ({
    id: section.id,
    label: t(section.titleKey),
    icon: section.id,
  }))
  const activeUserSection =
    userQuickNavSections.find((section) => section.id === visibleUserSectionId) ||
    userQuickNavSections[0] ||
    null
  const activeUserSectionLabel = activeUserSection
    ? t(activeUserSection.titleKey)
    : t('dashboard.user.panelTitle')
  const activeUserHeroSubtitle = t(
    USER_HERO_SUBTITLE_KEY_BY_SECTION[activeUserSection?.id] || 'dashboard.user.heroSubtitle'
  )

  const userSummaryCards = [
    {
      label: t('dashboard.user.myPenasTitle'),
      value: String(penas.length),
      helper: selectedPena?.name || t('dashboard.user.noPenasLinked'),
      helperLabel: t('dashboard.common.summaryMeta.activePena'),
      tone: 'secondary',
    },
    {
      label: t('dashboard.user.selectedSeason'),
      value: selectedSeason ? selectedSeasonLabel : '-',
      helper: selectedPena ? selectedPena.name : t('dashboard.user.noPenasLinked'),
      helperLabel: t('dashboard.common.summaryMeta.activePena'),
      tone: 'primary',
    },
    {
      label: t('dashboard.user.standingsTitle'),
      value: shouldLoadStandings && currentStanding ? `#${currentStanding.rank}` : '-',
      helper:
        shouldLoadStandings && currentStanding
          ? t('dashboard.user.yourPointsLabel', { points: currentStanding.points })
          : t('dashboard.user.notInStandingsYet'),
      helperLabel: t('dashboard.common.summaryMeta.points'),
      tone: 'info',
    },
    {
      label: t('dashboard.user.matchesTitle'),
      value: shouldLoadSeasonMatches ? String(orderedSeasonMatches.length) : '-',
      helper: selectedSeason ? selectedSeasonLabel : t('dashboard.user.noMatchesForSeason'),
      helperLabel: t('dashboard.common.summaryMeta.season'),
      tone: 'warning',
    },
  ]

  if (initializing) {
    return (
      <Stack spacing={2}>
        <Typography variant="h5">{t('dashboard.user.loadingTitle')}</Typography>
        <LinearProgress />
      </Stack>
    )
  }

  return (
    <DashboardShell
      brand={t('app.brand')}
      brandShort="FH"
      railLabel={t('dashboard.user.panelTitle')}
      navItems={userNavItems}
      activeNavId={activeNavSectionId}
      onNavChange={handleNavigateToSection}
      title={activeUserSectionLabel}
      subtitle={activeUserHeroSubtitle}
      badges={
        <>
          <Chip
            size="small"
            color="secondary"
            label={selectedPena?.name || t('dashboard.user.noPenasLinked')}
          />
          <Chip size="small" color="primary" label={selectedSeason ? selectedSeasonLabel : '-'} />
          {membership?.role ? (
            <Chip size="small" label={membership.role} sx={labelChipSx(membership.role_color)} />
          ) : null}
          {currentStanding ? (
            <Chip
              size="small"
              color="info"
              label={t('dashboard.user.yourRank', { rank: currentStanding.rank })}
            />
          ) : null}
        </>
      }
      headerAside={
        <Stack spacing={0.95}>
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={0.9}
            alignItems={{ sm: 'center' }}
            justifyContent="space-between"
          >
            <DashboardIdentitySlot
              title={t('dashboard.common.identityTitle')}
              name={selectedPena?.name || profileDisplayName || t('dashboard.user.panelTitle')}
              subtitle={profileDisplayName || ''}
              placeholderLabel={t('dashboard.common.identityPlaceholder')}
              imageUrl={
                resolveDashboardIdentityImageUrl(selectedPena) ||
                resolveDashboardIdentityImageUrl(profile)
              }
              imageAlt={selectedPena?.name || profileDisplayName || t('dashboard.user.panelTitle')}
            />

            <Stack
              direction="row"
              spacing={0.6}
              flexWrap="wrap"
              useFlexGap
              justifyContent={{ sm: 'flex-end' }}
            >
              <LanguageSwitcher />
              <ThemeModeSwitcher />
              <Button variant="outlined" onClick={openProfileSettings} disabled={loading}>
                {t('dashboard.user.openSettings')}
              </Button>
              <Button
                variant="outlined"
                onClick={() => runAction(loadDashboard)}
                disabled={loading}
              >
                {t('dashboard.common.refresh')}
              </Button>
              <Button variant="text" onClick={onLogout} disabled={loading}>
                {t('dashboard.common.logout')}
              </Button>
            </Stack>
          </Stack>

          <Grid container spacing={0.85}>
            <Grid item xs={12} md={6}>
              <DashboardControlField label={t('dashboard.user.selectedPena')}>
                <TextField
                  select
                  size="small"
                  value={selectedPenaGuid}
                  onChange={(event) => setSelectedPenaGuid(event.target.value)}
                  inputProps={{ 'aria-label': t('dashboard.user.selectedPena') }}
                  fullWidth
                >
                  {penas.map((pena) => (
                    <MenuItem key={pena.guid} value={pena.guid}>
                      {pena.name}
                    </MenuItem>
                  ))}
                </TextField>
              </DashboardControlField>
            </Grid>
            <Grid item xs={12} md={6}>
              <DashboardControlField label={t('dashboard.user.selectedSeason')}>
                <TextField
                  select
                  size="small"
                  value={selectedSeasonGuid}
                  onChange={(event) => setSelectedSeasonGuid(event.target.value)}
                  disabled={!selectedPenaGuid || !seasonList.length || loading}
                  inputProps={{ 'aria-label': t('dashboard.user.selectedSeason') }}
                  fullWidth
                >
                  {seasonList.map((season) => (
                    <MenuItem key={season.guid} value={season.guid}>
                      {formatDate(season.start_date)} - {formatDate(season.end_date)}
                    </MenuItem>
                  ))}
                </TextField>
              </DashboardControlField>
            </Grid>
          </Grid>
        </Stack>
      }
      summaryCards={userSummaryCards}
    >
      {loading && <LinearProgress />}
      {error && <Alert severity="error">{errorMessage}</Alert>}
      {notice && <Alert severity="success">{notice}</Alert>}

      {visibleUserSectionId === 'join' && (
        <Card id={USER_DASHBOARD_ANCHORS.join} data-sitemap-anchor>
          <CardContent>
            <Stack spacing={2}>
              <Typography variant="h6">{t('dashboard.user.joinTitle')}</Typography>
              <TextField
                label={t('dashboard.user.inviteCode')}
                value={joinForm.token}
                onChange={onJoinField('token')}
                placeholder={t('dashboard.user.invitePlaceholder')}
              />
              <TextField
                label={t('dashboard.user.nicknameOptional')}
                value={joinForm.nickname}
                onChange={onJoinField('nickname')}
              />
              <TextField
                label={t('dashboard.user.positionOptional')}
                value={joinForm.position}
                onChange={onJoinField('position')}
              />
              <Button variant="contained" onClick={handleJoinPena} disabled={loading}>
                {t('dashboard.user.join')}
              </Button>
            </Stack>
          </CardContent>
        </Card>
      )}

      {visibleUserSectionId === 'membership' && (
        <Card id={USER_DASHBOARD_ANCHORS.membership} data-sitemap-anchor>
          <CardContent>
            <Stack spacing={2.5}>
              <Box>
                <Typography variant="h6">{t('dashboard.user.myPenasTitle')}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {t('dashboard.user.linkedCount', {
                    count: penas.length,
                    suffix: penas.length === 1 ? '' : 's',
                  })}
                </Typography>
              </Box>

              <Stack direction="row" flexWrap="wrap" gap={1}>
                {penas.map((pena) => (
                  <Chip
                    key={pena.guid}
                    label={pena.name}
                    color={pena.guid === selectedPenaGuid ? 'secondary' : 'default'}
                    variant={pena.guid === selectedPenaGuid ? 'filled' : 'outlined'}
                  />
                ))}
                {!penas.length && <Chip label={t('dashboard.user.noPenasLinked')} />}
              </Stack>

              {selectedPena && (
                <Card variant="outlined">
                  <CardContent>
                    <Stack spacing={2}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                        {t('dashboard.user.membershipIn', { name: selectedPena.name })}
                      </Typography>
                      <TextField
                        label={t('dashboard.user.nickname')}
                        value={membershipForm.nickname}
                        onChange={onMembershipField('nickname')}
                      />
                      <TextField
                        label={t('dashboard.user.position')}
                        value={membershipForm.position}
                        onChange={onMembershipField('position')}
                      />
                      {membership?.role && (
                        <Typography variant="body2" color="text.secondary">
                          {t('dashboard.user.role', { role: membership.role })}
                        </Typography>
                      )}
                      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                        <Button
                          variant="contained"
                          onClick={handleUpdateMembership}
                          disabled={loading}
                        >
                          {t('dashboard.user.saveMembership')}
                        </Button>
                        <Button
                          variant="outlined"
                          color="error"
                          onClick={handleLeavePena}
                          disabled={loading}
                        >
                          {t('dashboard.user.leavePena')}
                        </Button>
                      </Stack>
                      <Typography variant="caption" color="text.secondary">
                        {t('dashboard.user.leaveHint')}
                      </Typography>

                      {!seasonList.length && (
                        <Typography variant="body2" color="text.secondary">
                          {t('dashboard.user.noSeasonsAvailable')}
                        </Typography>
                      )}

                      {selectedSeason && (
                        <Typography variant="body2" color="text.secondary">
                          {t('dashboard.user.statsReadOnlyHint', {
                            season: selectedSeasonLabel,
                          })}
                        </Typography>
                      )}
                    </Stack>
                  </CardContent>
                </Card>
              )}
            </Stack>
          </CardContent>
        </Card>
      )}

      {visibleUserSectionId === 'accountability' && selectedPenaGuid && (
        <Box id={USER_DASHBOARD_ANCHORS.accountability} data-sitemap-anchor>
          <Suspense fallback={<SectionLoader />}>
            <UserAccountabilitySection
              penaGuid={selectedPenaGuid}
              currentPlayerGuid={currentPlayerGuid}
              t={t}
            />
          </Suspense>
        </Box>
      )}

      {visibleUserSectionId === 'standings' && selectedSeasonGuid && (
        <Card id={USER_DASHBOARD_ANCHORS.standings} data-sitemap-anchor>
          <CardContent>
            <Stack spacing={1.5}>
              <Typography variant="h6">{t('dashboard.user.standingsTitle')}</Typography>
              {seasonDataLoading && <LinearProgress />}
              {!seasonDataLoading && !standings.length && (
                <Typography variant="body2" color="text.secondary">
                  {t('dashboard.user.noStandingsForSeason')}
                </Typography>
              )}
              {!seasonDataLoading && standings.length > 0 && (
                <Stack spacing={1.5}>
                  {currentStanding && (
                    <Stack direction="row" flexWrap="wrap" gap={1}>
                      <Chip size="small" color="info" label={t('dashboard.user.youTag')} />
                      <Chip
                        size="small"
                        color="secondary"
                        label={t('dashboard.user.yourRank', {
                          rank: currentStanding.rank,
                        })}
                      />
                      <Chip
                        size="small"
                        variant="outlined"
                        label={t('dashboard.user.yourPositionLabel', {
                          position: currentStanding.position || '-',
                        })}
                      />
                      {currentStanding.role && (
                        <Chip
                          size="small"
                          label={currentStanding.role}
                          sx={labelChipSx(currentStanding.role_color)}
                        />
                      )}
                      <Chip
                        size="small"
                        variant="outlined"
                        label={t('dashboard.user.yourPointsLabel', {
                          points: currentStanding.points,
                        })}
                      />
                      <Chip
                        size="small"
                        variant="outlined"
                        label={t('dashboard.user.yourGoalContributionLabel', {
                          goals: currentStanding.goals ?? 0,
                          assists: currentStanding.assists ?? 0,
                        })}
                      />
                    </Stack>
                  )}
                  {!currentStanding && currentPlayerGuid && (
                    <Typography variant="caption" color="text.secondary">
                      {t('dashboard.user.notInStandingsYet')}
                    </Typography>
                  )}
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>{t('dashboard.user.table.rank')}</TableCell>
                          <TableCell>{t('dashboard.user.table.player')}</TableCell>
                          <TableCell>{t('dashboard.user.table.role')}</TableCell>
                          <TableCell>{t('dashboard.user.table.position')}</TableCell>
                          <TableCell align="right">{t('dashboard.user.table.played')}</TableCell>
                          <TableCell align="right">{t('dashboard.user.table.w')}</TableCell>
                          <TableCell align="right">{t('dashboard.user.table.d')}</TableCell>
                          <TableCell align="right">{t('dashboard.user.table.l')}</TableCell>
                          <TableCell align="right">{t('dashboard.user.table.goals')}</TableCell>
                          <TableCell align="right">{t('dashboard.user.table.assists')}</TableCell>
                          <TableCell align="right">{t('dashboard.user.table.pts')}</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {standings.map((player, index) => {
                          const isCurrentPlayer = player.player_guid === currentPlayerGuid
                          return (
                            <TableRow
                              key={player.player_guid}
                              sx={
                                isCurrentPlayer
                                  ? {
                                      '& td': {
                                        backgroundColor: 'rgba(2, 136, 209, 0.09)',
                                        fontWeight: 700,
                                      },
                                    }
                                  : undefined
                              }
                            >
                              <TableCell>{index + 1}</TableCell>
                              <TableCell>
                                <Stack direction="row" spacing={1} alignItems="center">
                                  <span>
                                    {player.nickname || `${player.name} ${player.surname1}`}
                                  </span>
                                  {isCurrentPlayer && (
                                    <Chip
                                      size="small"
                                      color="info"
                                      variant="filled"
                                      label={t('dashboard.user.youTag')}
                                    />
                                  )}
                                </Stack>
                              </TableCell>
                              <TableCell>
                                {player.role ? (
                                  <Chip
                                    size="small"
                                    label={player.role}
                                    sx={labelChipSx(player.role_color)}
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
                                    sx={labelChipSx(player.position_color)}
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
                          )
                        })}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Stack>
              )}
            </Stack>
          </CardContent>
        </Card>
      )}

      {visibleUserSectionId === 'matches' && selectedSeasonGuid && (
        <Card id={USER_DASHBOARD_ANCHORS.matches} data-sitemap-anchor>
          <CardContent>
            <Stack spacing={1.5}>
              <Typography variant="h6">{t('dashboard.user.matchesTitle')}</Typography>
              {!orderedSeasonMatches.length && (
                <Typography variant="body2" color="text.secondary">
                  {t('dashboard.user.noMatchesForSeason')}
                </Typography>
              )}
              {orderedSeasonMatches.length > 0 && (
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>{t('dashboard.user.table.date')}</TableCell>
                        <TableCell>{t('dashboard.user.table.home')}</TableCell>
                        <TableCell>{t('dashboard.user.table.away')}</TableCell>
                        <TableCell>{t('dashboard.user.table.status')}</TableCell>
                        <TableCell>{t('dashboard.user.table.result')}</TableCell>
                        <TableCell>{t('dashboard.user.table.actions')}</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {orderedSeasonMatches.map((match) => (
                        <TableRow key={match.guid}>
                          <TableCell>{formatDate(match.match_date)}</TableCell>
                          <TableCell>{match.home_team_name}</TableCell>
                          <TableCell>{match.away_team_name}</TableCell>
                          <TableCell>
                            {String(match.status || '').toLowerCase() === 'closed'
                              ? t('dashboard.user.statusClosed')
                              : t('dashboard.user.statusOpen')}
                          </TableCell>
                          <TableCell>
                            {match.home_score} - {match.away_score}
                          </TableCell>
                          <TableCell>
                            <Button
                              size="small"
                              variant="text"
                              onClick={() => handleOpenMatchDetail(match.guid)}
                              disabled={matchDetailLoading}
                            >
                              {t('dashboard.common.matchDetail.viewAction')}
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </Stack>
          </CardContent>
        </Card>
      )}

      {visibleUserSectionId === 'insights' && selectedSeasonGuid && (
        <Box id={USER_DASHBOARD_ANCHORS.insights} data-sitemap-anchor>
          <Suspense fallback={<SectionLoader />}>
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
          </Suspense>
        </Box>
      )}

      <Dialog
        open={Boolean(selectedMatchGuid)}
        onClose={handleCloseMatchDetail}
        fullWidth
        maxWidth="lg"
      >
        <DialogTitle>{t('dashboard.common.matchDetail.dialogTitle')}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            {matchDetailLoading && <LinearProgress />}
            {!matchDetailLoading && selectedMatchDetail && (
              <MatchDetailViewer detail={selectedMatchDetail} t={t} formatDate={formatDate} />
            )}
            {!matchDetailLoading && !selectedMatchDetail && (
              <Typography variant="body2" color="text.secondary">
                {t('dashboard.common.matchDetail.noData')}
              </Typography>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseMatchDetail}>
            {t('dashboard.common.matchDetail.closeAction')}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={profileSettingsOpen}
        onClose={() => setProfileSettingsOpen(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>{t('dashboard.user.profileSettingsTitle')}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <Typography variant="body2" color="text.secondary">
              {t('dashboard.user.profileSettingsHint')}
            </Typography>
            <ProfileImageField
              value={profileForm.image_url}
              alt={profileDisplayName || t('dashboard.user.profileSettingsTitle')}
              label={t('dashboard.common.profileImageLabel')}
              helperText={t('dashboard.user.profileImageHint')}
              chooseLabel={t('dashboard.common.imageActions.choose')}
              replaceLabel={t('dashboard.common.imageActions.replace')}
              removeLabel={t('dashboard.common.imageActions.remove')}
              emptyLabel={t('dashboard.common.imageEmpty')}
              processingLabel={t('dashboard.common.imageActions.processing')}
              disabled={loading}
              onChange={(value) => setProfileForm((prev) => ({ ...prev, image_url: value }))}
              onError={(error) => setError(new Error(mapProfileImageErrorMessage(error, t)))}
            />
            <TextField
              label={t('dashboard.user.fields.name')}
              value={profileForm.name}
              onChange={onProfileField('name')}
            />
            <TextField
              label={t('dashboard.user.fields.surname1')}
              value={profileForm.surname1}
              onChange={onProfileField('surname1')}
            />
            <TextField
              label={t('dashboard.user.fields.surname2')}
              value={profileForm.surname2}
              onChange={onProfileField('surname2')}
            />
            <TextField
              select
              label={t('dashboard.user.fields.nationality')}
              value={profileForm.nationality}
              onChange={onProfileField('nationality')}
            >
              {nationalities.map((nationality) => (
                <MenuItem key={nationality} value={nationality}>
                  {nationality}
                </MenuItem>
              ))}
            </TextField>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setProfileSettingsOpen(false)} disabled={loading}>
            {t('dashboard.user.settingsCancel')}
          </Button>
          <Button variant="contained" onClick={handleSaveProfileFromSettings} disabled={loading}>
            {t('dashboard.user.saveProfile')}
          </Button>
        </DialogActions>
      </Dialog>
    </DashboardShell>
  )
}
