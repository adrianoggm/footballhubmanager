import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import AdminDashboard from '../components/AdminDashboard.jsx'
import {
  DEFAULT_ADMIN_SECTION_ID,
  getAdminSectionPath,
  normalizeAdminSectionId,
} from '../navigation/sitemap.js'

export default function AdminDashboardRoutePage({
  session,
  onLogout,
  sectionId = DEFAULT_ADMIN_SECTION_ID,
}) {
  const navigate = useNavigate()
  const normalizedSectionId = normalizeAdminSectionId(sectionId)

  const handleSectionChange = useCallback(
    (nextSectionId) => {
      const resolvedSectionId = normalizeAdminSectionId(nextSectionId)
      navigate(getAdminSectionPath(resolvedSectionId))
    },
    [navigate]
  )

  return (
    <AdminDashboard
      session={session}
      onLogout={onLogout}
      routeSectionId={normalizedSectionId}
      onSectionChange={handleSectionChange}
    />
  )
}
