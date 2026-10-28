// Dashboard shell navigation (redesign F1): order by frequency of use, icon
// and "G + letter" shortcut per section. Section ids, paths and gating stay in
// sitemap.js; labels resolve through i18n.

export const ADMIN_SHELL_NAV = Object.freeze([
  { id: 'overview', icon: 'home', shortcut: 'G R' },
  { id: 'matches', icon: 'ball', shortcut: 'G P' },
  { id: 'players', icon: 'users', shortcut: 'G J' },
  { id: 'accountability', icon: 'wallet', shortcut: 'G C' },
  { id: 'standings', icon: 'trophy', shortcut: 'G L' },
  { id: 'seasons', icon: 'calendar', shortcut: 'G T' },
])

// Admin create shortcuts shown in the sidebar "Shortcuts" group.
export const ADMIN_SHORTCUT_ACTION_IDS = Object.freeze(['newMatch', 'newTransaction'])

export const ADMIN_MOBILE_NAV = Object.freeze([
  { id: 'overview', labelKey: 'dashboard.admin.tabs.overview', icon: 'home', kind: 'nav' },
  { id: 'matches', labelKey: 'dashboard.admin.tabs.matches', icon: 'ball', kind: 'nav' },
  { id: 'create', labelKey: 'shell.actions.new', icon: 'plus', kind: 'create' },
  { id: 'accountability', labelKey: 'shell.mobile.cash', icon: 'wallet', kind: 'nav' },
  { id: 'more', labelKey: 'shell.mobile.more', icon: 'more', kind: 'more' },
])

// Sections reached from the mobile "More" sheet.
export const ADMIN_MORE_NAV_IDS = Object.freeze(['players', 'standings', 'seasons'])

export const USER_SHELL_NAV = Object.freeze([
  { id: 'membership', icon: 'home', shortcut: 'G I', labelKey: 'shell.userNav.home' },
  { id: 'matches', icon: 'ball', shortcut: 'G P', labelKey: 'dashboard.user.matchesTitle' },
  { id: 'standings', icon: 'trophy', shortcut: 'G L', labelKey: 'dashboard.user.standingsTitle' },
  { id: 'insights', icon: 'chart', shortcut: 'G E', labelKey: 'shell.userNav.insights' },
  {
    id: 'accountability',
    icon: 'wallet',
    shortcut: 'G C',
    labelKey: 'shell.userNav.accountability',
  },
])

export const USER_JOIN_NAV = Object.freeze({
  id: 'join',
  icon: 'link',
  shortcut: 'G U',
  labelKey: 'shell.joinPena',
})

export const USER_MOBILE_NAV = Object.freeze([
  { id: 'membership', labelKey: 'shell.mobile.home', icon: 'home', kind: 'nav' },
  { id: 'matches', labelKey: 'dashboard.user.matchesTitle', icon: 'ball', kind: 'nav' },
  { id: 'standings', labelKey: 'shell.mobile.table', icon: 'trophy', kind: 'nav' },
  { id: 'insights', labelKey: 'shell.mobile.stats', icon: 'chart', kind: 'nav' },
  { id: 'accountability', labelKey: 'shell.mobile.dues', icon: 'wallet', kind: 'nav' },
])
