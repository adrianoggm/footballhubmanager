import { Navigate, Outlet, useLocation } from 'react-router-dom'

export default function RequireAuth({ isAuthenticated }) {
  const location = useLocation()

  if (!isAuthenticated) {
    return <Navigate to="/auth" replace state={{ from: location }} />
  }

  return <Outlet />
}
