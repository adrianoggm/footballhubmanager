import { useCallback } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import AdminDashboard from '../components/AdminDashboard.jsx'
import { DEFAULT_ADMIN_SECTION_ID, normalizeAdminSectionId } from '../navigation/sitemap.js'

export default function AdminDashboardRoutePage({ session, onLogout }) {
  const navigate = useNavigate()
  const { sectionId = DEFAULT_ADMIN_SECTION_ID } = useParams()
  const normalizedSectionId = normalizeAdminSectionId(sectionId)

  const handleSectionChange = useCallback(
    (nextSectionId) => {
      const resolvedSectionId = normalizeAdminSectionId(nextSectionId)
      navigate(`/app/admin/${resolvedSectionId}`)
    },
    [navigate]
  )

  if (sectionId !== normalizedSectionId) {
    return <Navigate to={`/app/admin/${normalizedSectionId}`} replace />
  }

  return (
    <AdminDashboard
      session={session}
      onLogout={onLogout}
      routeSectionId={normalizedSectionId}
      onSectionChange={handleSectionChange}
    />
  )
}
