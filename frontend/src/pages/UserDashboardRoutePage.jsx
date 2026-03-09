import { useCallback } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import UserDashboard from '../components/UserDashboard.jsx'
import { DEFAULT_USER_SECTION_ID, normalizeUserSectionId } from '../navigation/sitemap.js'

export default function UserDashboardRoutePage({ session, onLogout }) {
  const navigate = useNavigate()
  const { sectionId = DEFAULT_USER_SECTION_ID } = useParams()
  const normalizedSectionId = normalizeUserSectionId(sectionId)

  const handleSectionChange = useCallback(
    (nextSectionId) => {
      const resolvedSectionId = normalizeUserSectionId(nextSectionId)
      navigate(`/app/user/${resolvedSectionId}`)
    },
    [navigate]
  )

  if (sectionId !== normalizedSectionId) {
    return <Navigate to={`/app/user/${normalizedSectionId}`} replace />
  }

  return (
    <UserDashboard
      session={session}
      onLogout={onLogout}
      routeSectionId={normalizedSectionId}
      onSectionChange={handleSectionChange}
    />
  )
}
