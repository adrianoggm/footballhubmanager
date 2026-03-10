export const USER_DASHBOARD_ANCHORS = Object.freeze({
  join: 'user-section-join',
  membership: 'user-section-membership',
  standings: 'user-section-standings',
  matches: 'user-section-matches',
  insights: 'user-section-insights',
})

const ADMIN_BASE_PATH = '/app/admin'
const USER_BASE_PATH = '/app/user'

export const ADMIN_DASHBOARD_SITEMAP = Object.freeze([
  {
    id: 'overview',
    path: `${ADMIN_BASE_PATH}/overview`,
    titleKey: 'dashboard.admin.tabs.overview',
    requiresSelectedPena: true,
  },
  {
    id: 'seasons',
    path: `${ADMIN_BASE_PATH}/seasons`,
    titleKey: 'dashboard.admin.tabs.seasons',
    requiresSelectedPena: true,
  },
  {
    id: 'players',
    path: `${ADMIN_BASE_PATH}/players`,
    titleKey: 'dashboard.admin.tabs.players',
    requiresSelectedPena: true,
  },
  {
    id: 'matches',
    path: `${ADMIN_BASE_PATH}/matches`,
    titleKey: 'dashboard.admin.tabs.matches',
    requiresSelectedPena: true,
  },
  {
    id: 'standings',
    path: `${ADMIN_BASE_PATH}/standings`,
    titleKey: 'dashboard.admin.tabs.standings',
    requiresSelectedPena: true,
  },
])

export const USER_DASHBOARD_SITEMAP = Object.freeze([
  {
    id: 'join',
    anchor: USER_DASHBOARD_ANCHORS.join,
    path: `${USER_BASE_PATH}/join`,
    titleKey: 'dashboard.user.joinTitle',
    requiresSelectedPena: false,
    requiresSelectedSeason: false,
  },
  {
    id: 'membership',
    anchor: USER_DASHBOARD_ANCHORS.membership,
    path: `${USER_BASE_PATH}/membership`,
    titleKey: 'dashboard.user.myPenasTitle',
    requiresSelectedPena: false,
    requiresSelectedSeason: false,
  },
  {
    id: 'standings',
    anchor: USER_DASHBOARD_ANCHORS.standings,
    path: `${USER_BASE_PATH}/standings`,
    titleKey: 'dashboard.user.standingsTitle',
    requiresSelectedPena: true,
    requiresSelectedSeason: true,
  },
  {
    id: 'matches',
    anchor: USER_DASHBOARD_ANCHORS.matches,
    path: `${USER_BASE_PATH}/matches`,
    titleKey: 'dashboard.user.matchesTitle',
    requiresSelectedPena: true,
    requiresSelectedSeason: true,
  },
  {
    id: 'insights',
    anchor: USER_DASHBOARD_ANCHORS.insights,
    path: `${USER_BASE_PATH}/insights`,
    titleKey: 'dashboard.admin.standings.insightsTitle',
    requiresSelectedPena: true,
    requiresSelectedSeason: true,
  },
])

export const FRONTEND_SITEMAP = Object.freeze({
  shared: [
    {
      id: 'auth-landing',
      path: '/auth',
      titleKey: 'app.auth.welcome',
    },
  ],
  roles: {
    admin: ADMIN_DASHBOARD_SITEMAP,
    user: USER_DASHBOARD_SITEMAP,
  },
})

export const ADMIN_SECTION_IDS = Object.freeze(
  ADMIN_DASHBOARD_SITEMAP.map((section) => section.id).filter(Boolean)
)
export const USER_SECTION_IDS = Object.freeze(
  USER_DASHBOARD_SITEMAP.map((section) => section.id).filter(Boolean)
)

export const DEFAULT_ADMIN_SECTION_ID = ADMIN_SECTION_IDS[0] || 'overview'
export const DEFAULT_USER_SECTION_ID = USER_SECTION_IDS.includes('membership')
  ? 'membership'
  : USER_SECTION_IDS[0] || 'join'

export const normalizeAdminSectionId = (sectionId) =>
  ADMIN_SECTION_IDS.includes(sectionId) ? sectionId : DEFAULT_ADMIN_SECTION_ID

export const normalizeUserSectionId = (sectionId) =>
  USER_SECTION_IDS.includes(sectionId) ? sectionId : DEFAULT_USER_SECTION_ID

const getSectionPathById = (sections, sectionId, fallbackSectionId, basePath) =>
  sections.find((section) => section.id === sectionId)?.path ||
  sections.find((section) => section.id === fallbackSectionId)?.path ||
  `${basePath}/${fallbackSectionId}`

export const getAdminSectionPath = (sectionId) =>
  getSectionPathById(
    ADMIN_DASHBOARD_SITEMAP,
    normalizeAdminSectionId(sectionId),
    DEFAULT_ADMIN_SECTION_ID,
    ADMIN_BASE_PATH
  )

export const getUserSectionPath = (sectionId) =>
  getSectionPathById(
    USER_DASHBOARD_SITEMAP,
    normalizeUserSectionId(sectionId),
    DEFAULT_USER_SECTION_ID,
    USER_BASE_PATH
  )

export const resolveUserDashboardSections = ({
  hasSelectedPena = false,
  hasSelectedSeason = false,
} = {}) =>
  USER_DASHBOARD_SITEMAP.filter((section) => {
    if (section.requiresSelectedPena && !hasSelectedPena) {
      return false
    }
    if (section.requiresSelectedSeason && !hasSelectedSeason) {
      return false
    }
    return true
  })
