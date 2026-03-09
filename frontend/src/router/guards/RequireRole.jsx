import { Navigate, Outlet } from 'react-router-dom'
import { resolveRoleHomePath } from '../rolePaths.js'

export default function RequireRole({ session, role }) {
  const currentRole = String(session?.user_type || '').toLowerCase()
  const expectedRole = String(role || '').toLowerCase()

  if (!currentRole) {
    return <Navigate to="/app/session-incomplete" replace />
  }

  if (currentRole !== expectedRole) {
    return <Navigate to={resolveRoleHomePath(session)} replace />
  }

  return <Outlet />
}
