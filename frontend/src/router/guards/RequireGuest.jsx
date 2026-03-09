import { Navigate, Outlet } from 'react-router-dom'
import { resolveRoleHomePath } from '../rolePaths.js'

export default function RequireGuest({ isAuthenticated, session }) {
  if (isAuthenticated) {
    return <Navigate to={resolveRoleHomePath(session)} replace />
  }

  return <Outlet />
}
