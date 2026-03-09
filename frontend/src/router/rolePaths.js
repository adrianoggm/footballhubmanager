import {
  DEFAULT_ADMIN_SECTION_ID,
  DEFAULT_USER_SECTION_ID,
  getAdminSectionPath,
  getUserSectionPath,
} from '../navigation/sitemap.js'

export const resolveRoleHomePath = (session) => {
  const role = String(session?.user_type || '').toLowerCase()
  if (role === 'admin') {
    return getAdminSectionPath(DEFAULT_ADMIN_SECTION_ID)
  }
  if (role === 'user') {
    return getUserSectionPath(DEFAULT_USER_SECTION_ID)
  }
  return '/app/session-incomplete'
}
