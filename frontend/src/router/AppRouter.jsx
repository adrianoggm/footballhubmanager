import { Navigate, Route, Routes, BrowserRouter } from 'react-router-dom'
import AdminLayout from '../layouts/AdminLayout.jsx'
import PublicLayout from '../layouts/PublicLayout.jsx'
import UserLayout from '../layouts/UserLayout.jsx'
import AdminDashboardRoutePage from '../pages/AdminDashboardRoutePage.jsx'
import AuthLandingPage from '../pages/AuthLandingPage.jsx'
import SessionIncompletePage from '../pages/SessionIncompletePage.jsx'
import UserDashboardRoutePage from '../pages/UserDashboardRoutePage.jsx'
import RequireAuth from './guards/RequireAuth.jsx'
import RequireGuest from './guards/RequireGuest.jsx'
import RequireRole from './guards/RequireRole.jsx'
import { resolveRoleHomePath } from './rolePaths.js'

function RootRedirect({ isAuthenticated, session }) {
  if (!isAuthenticated) {
    return <Navigate to="/auth" replace />
  }

  return <Navigate to={resolveRoleHomePath(session)} replace />
}

function RoleHomeRedirect({ session }) {
  return <Navigate to={resolveRoleHomePath(session)} replace />
}

function CatchAllRedirect({ isAuthenticated, session }) {
  if (!isAuthenticated) {
    return <Navigate to="/auth" replace />
  }

  return <Navigate to={resolveRoleHomePath(session)} replace />
}

export default function AppRouter({ auth, onLogout }) {
  const isAuthenticated = Boolean(auth.token)

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={<RootRedirect isAuthenticated={isAuthenticated} session={auth.session} />}
        />

        <Route element={<RequireGuest isAuthenticated={isAuthenticated} session={auth.session} />}>
          <Route element={<PublicLayout />}>
            <Route path="/auth" element={<AuthLandingPage auth={auth} />} />
          </Route>
        </Route>

        <Route element={<RequireAuth isAuthenticated={isAuthenticated} />}>
          <Route path="/app" element={<RoleHomeRedirect session={auth.session} />} />
          <Route
            path="/app/session-incomplete"
            element={<SessionIncompletePage onLogout={onLogout} />}
          />

          <Route path="/app/admin" element={<RequireRole session={auth.session} role="admin" />}>
            <Route element={<AdminLayout />}>
              <Route index element={<Navigate to="overview" replace />} />
              <Route
                path=":sectionId"
                element={<AdminDashboardRoutePage session={auth.session} onLogout={onLogout} />}
              />
            </Route>
          </Route>

          <Route path="/app/user" element={<RequireRole session={auth.session} role="user" />}>
            <Route element={<UserLayout />}>
              <Route index element={<Navigate to="membership" replace />} />
              <Route
                path=":sectionId"
                element={<UserDashboardRoutePage session={auth.session} onLogout={onLogout} />}
              />
            </Route>
          </Route>
        </Route>

        <Route
          path="*"
          element={<CatchAllRedirect isAuthenticated={isAuthenticated} session={auth.session} />}
        />
      </Routes>
    </BrowserRouter>
  )
}
