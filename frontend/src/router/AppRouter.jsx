import { Navigate, Route, Routes, BrowserRouter } from 'react-router-dom'
import AdminLayout from '../layouts/AdminLayout.jsx'
import PublicLayout from '../layouts/PublicLayout.jsx'
import UserLayout from '../layouts/UserLayout.jsx'
import AuthLandingPage from '../pages/AuthLandingPage.jsx'
import SessionIncompletePage from '../pages/SessionIncompletePage.jsx'
import AdminMatchesPage from '../pages/admin/AdminMatchesPage.jsx'
import AdminOverviewPage from '../pages/admin/AdminOverviewPage.jsx'
import AdminPlayersPage from '../pages/admin/AdminPlayersPage.jsx'
import AdminSeasonsPage from '../pages/admin/AdminSeasonsPage.jsx'
import AdminStandingsPage from '../pages/admin/AdminStandingsPage.jsx'
import UserInsightsPage from '../pages/user/UserInsightsPage.jsx'
import UserJoinPage from '../pages/user/UserJoinPage.jsx'
import UserMatchesPage from '../pages/user/UserMatchesPage.jsx'
import UserMembershipPage from '../pages/user/UserMembershipPage.jsx'
import UserStandingsPage from '../pages/user/UserStandingsPage.jsx'
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
                path="overview"
                element={<AdminOverviewPage session={auth.session} onLogout={onLogout} />}
              />
              <Route
                path="seasons"
                element={<AdminSeasonsPage session={auth.session} onLogout={onLogout} />}
              />
              <Route
                path="players"
                element={<AdminPlayersPage session={auth.session} onLogout={onLogout} />}
              />
              <Route
                path="matches"
                element={<AdminMatchesPage session={auth.session} onLogout={onLogout} />}
              />
              <Route
                path="standings"
                element={<AdminStandingsPage session={auth.session} onLogout={onLogout} />}
              />
              <Route path="*" element={<Navigate to="overview" replace />} />
            </Route>
          </Route>

          <Route path="/app/user" element={<RequireRole session={auth.session} role="user" />}>
            <Route element={<UserLayout />}>
              <Route index element={<Navigate to="membership" replace />} />
              <Route
                path="join"
                element={<UserJoinPage session={auth.session} onLogout={onLogout} />}
              />
              <Route
                path="membership"
                element={<UserMembershipPage session={auth.session} onLogout={onLogout} />}
              />
              <Route
                path="standings"
                element={<UserStandingsPage session={auth.session} onLogout={onLogout} />}
              />
              <Route
                path="matches"
                element={<UserMatchesPage session={auth.session} onLogout={onLogout} />}
              />
              <Route
                path="insights"
                element={<UserInsightsPage session={auth.session} onLogout={onLogout} />}
              />
              <Route path="*" element={<Navigate to="membership" replace />} />
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
