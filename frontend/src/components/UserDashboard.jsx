import { Alert, Box } from '@mui/material'
import { Suspense, lazy, useEffect, useMemo, useRef, useState } from 'react'
import { SkeletonSection } from './common'
import { resolveDashboardIdentityImageUrl } from './dashboard/dashboardIdentity.js'
import DashboardShell from './dashboard/DashboardShell.jsx'
import MatchDetailDialog from './dashboard/MatchDetailDialog.jsx'
import DashboardShellSkeleton from './dashboard/shell/DashboardShellSkeleton.jsx'
import { formatSeasonLong } from './dashboard/shell/shellLogic.js'
import { USER_JOIN_NAV, USER_MOBILE_NAV, USER_SHELL_NAV } from '../navigation/shellNav.js'
import { translatePlural } from '../i18n/plural.js'
import UserJoinSection from './user/UserJoinSection.jsx'
import UserProfileSettingsDialog from './user/UserProfileSettingsDialog.jsx'
import UserMatchesSection from './user/UserMatchesSection.jsx'
import UserMembershipSection from './user/UserMembershipSection.jsx'
import UserStandingsSection from './user/UserStandingsSection.jsx'
import { DashboardContext } from '../context/dashboardContext.js'
import { readableTextColor } from '../theme/contrastText.js'
import { DEFAULT_LABEL_COLOR } from '../theme/tokens.js'
import { useForm } from '../hooks/useForm.js'
import { translateRoleLabel } from '../i18n/labels.js'
import { translateApiError } from '../i18n/apiErrors.js'
import { useInsightsReport } from '../hooks/useInsightsReport.js'
import { useMatchDetailDialog } from '../hooks/useMatchDetailDialog.js'
import { useToast } from '../context/toastContext.js'
import { useI18n } from '../i18n/useI18n.js'
import { USER_DASHBOARD_ANCHORS, resolveUserDashboardSections } from '../navigation/sitemap.js'
import { compareMatchInsightSummaries } from '../services/matchInsights.js'
import {
  readStoredPenaGuid,
  resolvePreferredPenaGuid,
  storeSelectedPenaGuid,
} from '../services/selectedPenaStore.js'
import { loadSeasonsWithActive } from '../services/seasonLookup.js'
import { userService } from '../services/userService.js'
import { useAccountEmail } from '../hooks/useAccountEmail.js'
import AccountEmailNotice from './account/AccountEmailNotice.jsx'

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
})

const defaultMembershipForm = () => ({
  nickname: '',
  position: '',
})

const asText = (value) => value ?? ''

const labelChipSx = (color) => {
  const background = color || DEFAULT_LABEL_COLOR
  return {
    backgroundColor: background,
    color: readableTextColor(background),
  }
}

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
  // PL-09: known backend details (e.g. an expired join code) are translated.
  return translateApiError(error, t) || error.message
}

const mapProfileImageErrorMessage = (error, t) => {
  const raw = String(error?.message || '').toLowerCase()
  if (raw.includes('jpg') || raw.includes('png') || raw.includes('webp')) {
    return t('dashboard.common.imageErrors.invalidType')
  }
  return t('dashboard.common.imageErrors.processing')
}

function SectionLoader() {
  return <SkeletonSection />
}

export default function UserDashboard({
  session,
  onLogout,
  routeSectionId = '',
  onSectionChange = null,
}) {
  const { t, language } = useI18n()
  const { showToast } = useToast()
  const accountEmail = useAccountEmail()
  const [initializing, setInitializing] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [profileSettingsOpen, setProfileSettingsOpen] = useState(false)
  const [focusEmailSetting, setFocusEmailSetting] = useState(false)

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
  const [positionOptions, setPositionOptions] = useState([])
  const {
    values: membershipForm,
    setValues: setMembershipForm,
    onField: onMembershipField,
  } = useForm(defaultMembershipForm)
  const { values: joinForm, onField: onJoinField, reset: resetJoinForm } = useForm(defaultJoinForm)
  const [seasonList, setSeasonList] = useState([])
  const [seasonListPenaGuid, setSeasonListPenaGuid] = useState('')
  const [activeSeason, setActiveSeason] = useState(null)
  const [selectedSeasonGuid, setSelectedSeasonGuid] = useState('')
  const [standings, setStandings] = useState([])
  const [seasonMatches, setSeasonMatches] = useState([])
  const [seasonDataLoading, setSeasonDataLoading] = useState(false)
  const [insightsScope, setInsightsScope] = useState('selected_season')
  const seasonListRequestIdRef = useRef(0)
  const seasonDataRequestIdRef = useRef(0)
  const seasonMatchesRequestIdRef = useRef(0)

  const selectedPena = useMemo(
    () => penas.find((item) => item.guid === selectedPenaGuid) || null,
    [penas, selectedPenaGuid]
  )

  const selectedSeason = useMemo(
    () => seasonList.find((item) => item.guid === selectedSeasonGuid) || null,
    [seasonList, selectedSeasonGuid]
  )
  // U-03: right after a pena switch the season list (and selection) still
  // belong to the previous pena until loadSeasonList resolves. Season-scoped
  // loaders only use a season once it is confirmed for the selected pena.
  const seasonContextGuid =
    selectedSeason && seasonListPenaGuid === selectedPenaGuid ? selectedSeasonGuid : ''

  const {
    loading: insightsLoading,
    report: insightsReport,
    comparisonReport: insightsComparisonReport,
    refresh: refreshInsightsReport,
    reset: resetInsightsReport,
  } = useInsightsReport({
    fetchInsights: ({ scope, seasonGuids, dateFrom, dateTo }) =>
      userService.getMatchInsights(selectedPenaGuid, {
        scope,
        season_guids: seasonGuids,
        ...(dateFrom ? { date_from: dateFrom } : {}),
        ...(dateTo ? { date_to: dateTo } : {}),
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
    try {
      await action()
      // UX-3: transient success feedback as an auto-dismissing toast.
      if (successMessage) {
        showToast(successMessage, 'success')
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
      setPositionOptions([])
      return
    }
    try {
      const [currentMembership, labels] = await Promise.all([
        userService.getMyMembership(penaGuid),
        // Position is restricted to the pena's configured labels; a labels
        // failure must not block the membership view.
        userService.getPenaLabels(penaGuid).catch(() => null),
      ])
      setMembership(currentMembership)
      setPositionOptions(labels?.position_labels || [])
      setMembershipForm({
        nickname: asText(currentMembership.nickname),
        position: asText(currentMembership.position),
      })
    } catch (requestError) {
      if (requestError.status === 403 || requestError.status === 404) {
        setMembership(null)
        setMembershipForm(defaultMembershipForm())
        setPositionOptions([])
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

    const { activeSeason, seasonsPage } = await loadSeasonsWithActive(userService, penaGuid)
    if (isStale()) {
      return
    }

    const seasonItems = seasonsPage.items || []
    setSeasonList(seasonItems)
    setSeasonListPenaGuid(penaGuid)
    setActiveSeason(activeSeason)
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
    const requestId = seasonMatchesRequestIdRef.current + 1
    seasonMatchesRequestIdRef.current = requestId
    const isStale = () => requestId !== seasonMatchesRequestIdRef.current

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

      const preferredPena = resolvePreferredPenaGuid(nextPenas, [
        selectedPenaGuid,
        readStoredPenaGuid('user', session?.user_guid),
      ])
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
    storeSelectedPenaGuid('user', session?.user_guid, selectedPenaGuid)
  }, [selectedPenaGuid, session?.user_guid])

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

  // U-04: standings and matches feed the always-visible header KPIs, so they
  // load for every section (the dashboard stays mounted across sections).
  useEffect(() => {
    if (!selectedPenaGuid || !seasonContextGuid || initializing) {
      setStandings([])
      setSeasonDataLoading(false)
      return
    }

    let activeRequest = true
    setSeasonDataLoading(true)
    ;(async () => {
      try {
        await loadStandingsData(selectedPenaGuid, seasonContextGuid)
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
  }, [selectedPenaGuid, seasonContextGuid, initializing])

  useEffect(() => {
    if (!selectedPenaGuid || !seasonContextGuid || initializing) {
      setSeasonMatches([])
      return
    }

    let activeRequest = true
    ;(async () => {
      try {
        await loadSeasonMatchesData(selectedPenaGuid, seasonContextGuid)
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
  }, [selectedPenaGuid, seasonContextGuid, initializing])

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

  const openEmailSettings = () => {
    setFocusEmailSetting(true)
    openProfileSettings()
  }

  const closeProfileSettings = () => {
    setProfileSettingsOpen(false)
    setFocusEmailSetting(false)
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
      closeProfileSettings()
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
      })
      resetJoinForm()
      await loadDashboard()
      // PL-14: after joining, show the joined pena in "My penas".
      handleNavigateToSection('membership')
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

  // Shell navigation (redesign F1): fixed order; sections that need a peña or
  // a season stay visible but disabled until they are available.
  const availableUserSectionIds = new Set(userQuickNavSections.map((section) => section.id))
  const userNavItems = USER_SHELL_NAV.map((navEntry) => {
    const available = availableUserSectionIds.has(navEntry.id)
    return {
      ...navEntry,
      label: t(navEntry.labelKey),
      disabled: !available,
      disabledReason: available
        ? ''
        : t(
            selectedPenaGuid ? 'dashboard.user.noSeasonsAvailable' : 'dashboard.user.noPenasLinked'
          ),
    }
  })
  const userJoinItem = {
    ...USER_JOIN_NAV,
    label: t(USER_JOIN_NAV.labelKey),
    onClick: () => handleNavigateToSection('join'),
  }
  const activeUserSectionLabel =
    visibleUserSectionId === 'join'
      ? userJoinItem.label
      : userNavItems.find((item) => item.id === visibleUserSectionId)?.label ||
        t('dashboard.user.panelTitle')

  const userPenaOptions = penas.map((pena) => ({
    guid: pena.guid,
    name: pena.name,
    imageUrl: resolveDashboardIdentityImageUrl(pena),
    meta: t('shell.rolePlayer'),
  }))
  const userCommandItems = [
    {
      id: 'joinPena',
      group: 'actions',
      label: userJoinItem.label,
      icon: 'link',
      onSelect: userJoinItem.onClick,
    },
    ...orderedSeasonMatches.map((match) => ({
      id: match.guid,
      group: 'matches',
      searchOnly: true,
      icon: 'calendar',
      label: t('shell.palette.matchItem', {
        date: formatDate(match.match_date),
        home: match.home_team_name || '',
        away: match.away_team_name || '',
        score: `${match.home_score ?? 0}–${match.away_score ?? 0}`,
      }),
      onSelect: () => {
        handleNavigateToSection('matches')
        handleOpenMatchDetail(match.guid)
      },
    })),
    ...standings.map((row) => ({
      id: row.player_guid,
      group: 'players',
      searchOnly: true,
      icon: 'users',
      label: row.nickname || row.player_name || [row.name, row.surname1].filter(Boolean).join(' '),
      onSelect: () => handleNavigateToSection('standings'),
    })),
    ...(penas.length > 1
      ? userPenaOptions.map((pena) => ({
          id: pena.guid,
          group: 'penas',
          searchOnly: true,
          icon: 'home',
          label: pena.name,
          onSelect: () => setSelectedPenaGuid(pena.guid),
        }))
      : []),
  ]

  if (initializing) {
    return <DashboardShellSkeleton label={t('dashboard.user.loadingTitle')} />
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
    activeSeason: seasonListPenaGuid === selectedPenaGuid ? activeSeason : null,
    onSelectSeason: setSelectedSeasonGuid,
    labels: {
      pena: t('dashboard.user.selectedPena'),
      season: t('dashboard.user.selectedSeason'),
      activeSuffix: t('dashboard.admin.seasonActiveSuffix'),
    },
  }

  return (
    <DashboardContext.Provider value={dashboardContextValue}>
      <DashboardShell
        navItems={userNavItems}
        activeNavId={visibleUserSectionId}
        onNavChange={handleNavigateToSection}
        extraGroup={{ title: t('shell.penasGroup'), items: [userJoinItem] }}
        mobileNav={USER_MOBILE_NAV.map((item) => ({ ...item, label: t(item.labelKey) }))}
        title={activeUserSectionLabel}
        breadcrumb={selectedPena?.name || ''}
        mobileSubtitle={[selectedPena?.name, formatSeasonLong(selectedSeason)]
          .filter(Boolean)
          .join(' · ')}
        penaSwitcher={{
          pena: {
            name: selectedPena?.name || profileDisplayName || t('dashboard.user.panelTitle'),
            imageUrl:
              resolveDashboardIdentityImageUrl(selectedPena) ||
              resolveDashboardIdentityImageUrl(profile),
            meta: [
              t('shell.rolePlayer'),
              translatePlural(t, language, 'shell.penasCount', penas.length),
            ].join(' · '),
          },
          penas: userPenaOptions,
          selectedPenaGuid,
          onSelectPena: setSelectedPenaGuid,
          switchable: true,
          footerActions: [
            { id: 'join', label: userJoinItem.label, icon: 'plus', onClick: userJoinItem.onClick },
          ],
        }}
        commandItems={userCommandItems}
        account={{
          onOpenSettings: openProfileSettings,
          settingsDisabled: loading,
          onRefresh: () => runAction(loadDashboard),
          refreshLabel: t('dashboard.common.refreshData'),
          onLogout,
          logoutLabel: t('dashboard.common.logout'),
          loading,
        }}
        notice={
          <AccountEmailNotice
            accountEmail={accountEmail}
            onOpenSettings={openEmailSettings}
            userGuid={session?.user_guid}
          />
        }
      >
        {error && <Alert severity="error">{errorMessage}</Alert>}

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
            onSelectPena={setSelectedPenaGuid}
            membership={membership}
            membershipForm={membershipForm}
            onMembershipField={onMembershipField}
            positionOptions={positionOptions}
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
                language={language}
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
          onClose={closeProfileSettings}
          onSave={handleSaveProfileFromSettings}
          loading={loading}
          profileForm={profileForm}
          onProfileField={onProfileField}
          onProfileImageChange={(value) =>
            setProfileForm((prev) => ({ ...prev, image_url: value }))
          }
          formatProfileImageError={(error) => mapProfileImageErrorMessage(error, t)}
          profileDisplayName={profileDisplayName}
          nationalities={nationalities}
          t={t}
          penas={penas}
          selectedPenaGuid={selectedPenaGuid}
          onSelectPena={setSelectedPenaGuid}
          accountEmail={accountEmail}
          focusEmail={focusEmailSetting}
        />
      </DashboardShell>
    </DashboardContext.Provider>
  )
}
