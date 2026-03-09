import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import UserDashboard from '../components/UserDashboard.jsx'
import {
  DEFAULT_USER_SECTION_ID,
  getUserSectionPath,
  normalizeUserSectionId,
} from '../navigation/sitemap.js'

export default function UserDashboardRoutePage({
  session,
  onLogout,
  sectionId = DEFAULT_USER_SECTION_ID,
}) {
  const navigate = useNavigate()
  const normalizedSectionId = normalizeUserSectionId(sectionId)

  const handleSectionChange = useCallback(
    (nextSectionId) => {
      const resolvedSectionId = normalizeUserSectionId(nextSectionId)
      navigate(getUserSectionPath(resolvedSectionId))
    },
    [navigate]
  )

  return (
    <UserDashboard
      session={session}
      onLogout={onLogout}
      routeSectionId={normalizedSectionId}
      onSectionChange={handleSectionChange}
    />
  )
}
