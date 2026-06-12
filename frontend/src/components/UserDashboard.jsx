import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  LinearProgress,
  Stack,
  Typography,
} from '@mui/material'
import { Suspense, lazy, useEffect, useMemo, useRef, useState } from 'react'
import { DashboardIdentitySlot } from './dashboard/DashboardShell.jsx'
import { resolveDashboardIdentityImageUrl } from './dashboard/dashboardIdentity.js'
import DashboardShell from './dashboard/DashboardShell.jsx'
import MatchDetailDialog from './dashboard/MatchDetailDialog.jsx'
import PenaSeasonSelector from './dashboard/PenaSeasonSelector.jsx'
import UserJoinSection from './user/UserJoinSection.jsx'
import UserProfileSettingsDialog from './user/UserProfileSettingsDialog.jsx'
import UserMatchesSection from './user/UserMatchesSection.jsx'
import UserMembershipSection from './user/UserMembershipSection.jsx'
import UserStandingsSection from './user/UserStandingsSection.jsx'
import { DashboardContext } from '../context/dashboardContext.js'
import { DEFAULT_LABEL_COLOR } from '../theme/tokens.js'
import { useForm } from '../hooks/useForm.js'
import { translateRoleLabel } from '../i18n/labels.js'
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
  const {
    values: profileForm,
    setValues: setProfileForm,
    onField: onProfileField,
  } = useForm(defaultProfileForm)
  const [nationalities, setNationalities] = useState([])

  const [penas, setPenas] = useState([])
  const [selectedPenaGuid, setSelectedPenaGuid] = useState('')
  const [membership, setMembership] = useState(null)
  const {
    values: membershipForm,
    setValues: setMembershipForm,
    onField: onMembershipField,
  } = useForm(defaultMembershipForm)
  const {
    values: joinForm,
    onField: onJoinField,
    reset: resetJoinForm,
  } = useForm(defaultJoinForm)
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
      resetJoinForm()
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

  // Selection state stays owned here; exposed through context so the shared
  // PenaSeasonSelector reads it without prop drilling (see admin dashboard).
  const dashboardContextValue = {
    role: 'user',
    loading,
    penas,
    selectedPenaGuid,
    selectedPena,
    onSelectPena: setSelectedPenaGuid,
    seasons: seasonList,
    selectedSeasonGuid,
    selectedSeason,
    activeSeason: null,
    onSelectSeason: setSelectedSeasonGuid,
    labels: {
      pena: t('dashboard.user.selectedPena'),
      season: t('dashboard.user.selectedSeason'),
      activeSuffix: '',
    },
  }

  return (
    <DashboardContext.Provider value={dashboardContextValue}>
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
            <Chip
              size="small"
              label={translateRoleLabel(t, membership.role)}
              sx={labelChipSx(membership.role_color)}
            />
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
        <Stack spacing={1.1}>
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={1}
            alignItems={{ sm: 'center' }}
            justifyContent="space-between"
          >
            <DashboardIdentitySlot
              name={selectedPena?.name || profileDisplayName || t('dashboard.user.panelTitle')}
              subtitle={profileDisplayName || ''}
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
              alignItems="center"
              justifyContent={{ xs: 'flex-start', sm: 'flex-end' }}
            >
              <Button variant="outlined" onClick={openProfileSettings} disabled={loading}>
                {t('dashboard.user.openSettings')}
              </Button>
              <Button variant="outlined" onClick={() => runAction(loadDashboard)} disabled={loading}>
                {t('dashboard.common.refresh')}
              </Button>
              <Button variant="text" onClick={onLogout} disabled={loading}>
                {t('dashboard.common.logout')}
              </Button>
            </Stack>
          </Stack>

          <PenaSeasonSelector />
        </Stack>
      }
      summaryCards={userSummaryCards}
    >
      {loading && <LinearProgress />}
      {error && <Alert severity="error">{errorMessage}</Alert>}
      {notice && <Alert severity="success">{notice}</Alert>}

      {visibleUserSectionId === 'join' && (
        <UserJoinSection
          anchorId={USER_DASHBOARD_ANCHORS.join}
          joinForm={joinForm}
          onJoinField={onJoinField}
          onJoin={handleJoinPena}
          loading={loading}
          t={t}
        />
      )}

      {visibleUserSectionId === 'membership' && (
        <UserMembershipSection
          anchorId={USER_DASHBOARD_ANCHORS.membership}
          penas={penas}
          selectedPenaGuid={selectedPenaGuid}
          selectedPena={selectedPena}
          membership={membership}
          membershipForm={membershipForm}
          onMembershipField={onMembershipField}
          onUpdateMembership={handleUpdateMembership}
          onLeavePena={handleLeavePena}
          seasonList={seasonList}
          selectedSeason={selectedSeason}
          selectedSeasonLabel={selectedSeasonLabel}
          loading={loading}
          t={t}
        />
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
        <UserStandingsSection
          anchorId={USER_DASHBOARD_ANCHORS.standings}
          seasonDataLoading={seasonDataLoading}
          standings={standings}
          currentStanding={currentStanding}
          currentPlayerGuid={currentPlayerGuid}
          t={t}
        />
      )}

      {visibleUserSectionId === 'matches' && selectedSeasonGuid && (
        <UserMatchesSection
          anchorId={USER_DASHBOARD_ANCHORS.matches}
          orderedSeasonMatches={orderedSeasonMatches}
          matchDetailLoading={matchDetailLoading}
          onOpenMatchDetail={handleOpenMatchDetail}
          t={t}
          formatDate={formatDate}
        />
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

      <MatchDetailDialog
        open={Boolean(selectedMatchGuid)}
        onClose={handleCloseMatchDetail}
        loading={matchDetailLoading}
        detail={selectedMatchDetail}
        t={t}
        formatDate={formatDate}
      />

      <UserProfileSettingsDialog
        open={profileSettingsOpen}
        onClose={() => setProfileSettingsOpen(false)}
        onSave={handleSaveProfileFromSettings}
        loading={loading}
        profileForm={profileForm}
        onProfileField={onProfileField}
        onProfileImageChange={(value) =>
          setProfileForm((prev) => ({ ...prev, image_url: value }))
        }
        onProfileImageError={(error) => setError(new Error(mapProfileImageErrorMessage(error, t)))}
        profileDisplayName={profileDisplayName}
        nationalities={nationalities}
        t={t}
      />
    </DashboardShell>
    </DashboardContext.Provider>
  )
}
