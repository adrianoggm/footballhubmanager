import { Box, LinearProgress } from '@mui/material'
import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes, BrowserRouter } from 'react-router-dom'
import AdminLayout from '../layouts/AdminLayout.jsx'
import PublicLayout from '../layouts/PublicLayout.jsx'
import UserLayout from '../layouts/UserLayout.jsx'
import RequireAuth from './guards/RequireAuth.jsx'
import RequireGuest from './guards/RequireGuest.jsx'
import RequireRole from './guards/RequireRole.jsx'
import { resolveRoleHomePath } from './rolePaths.js'

const AuthLandingPage = lazy(() => import('../pages/AuthLandingPage.jsx'))
const ClaimPlayerPage = lazy(() => import('../pages/ClaimPlayerPage.jsx'))
const LegalPage = lazy(() => import('../pages/LegalPage.jsx'))
const SessionIncompletePage = lazy(() => import('../pages/SessionIncompletePage.jsx'))
const AdminOverviewPage = lazy(() => import('../pages/admin/AdminOverviewPage.jsx'))
const AdminSeasonsPage = lazy(() => import('../pages/admin/AdminSeasonsPage.jsx'))
const AdminAccountabilityPage = lazy(() => import('../pages/admin/AdminAccountabilityPage.jsx'))
const AdminPlayersPage = lazy(() => import('../pages/admin/AdminPlayersPage.jsx'))
const AdminMatchesPage = lazy(() => import('../pages/admin/AdminMatchesPage.jsx'))
const AdminStandingsPage = lazy(() => import('../pages/admin/AdminStandingsPage.jsx'))
const UserJoinPage = lazy(() => import('../pages/user/UserJoinPage.jsx'))
const UserMembershipPage = lazy(() => import('../pages/user/UserMembershipPage.jsx'))
const UserAccountabilityPage = lazy(() => import('../pages/user/UserAccountabilityPage.jsx'))
const UserStandingsPage = lazy(() => import('../pages/user/UserStandingsPage.jsx'))
const UserMatchesPage = lazy(() => import('../pages/user/UserMatchesPage.jsx'))
const UserInsightsPage = lazy(() => import('../pages/user/UserInsightsPage.jsx'))

function RouteLoader() {
  return (
    <Box sx={{ width: '100%', px: { xs: 1.5, md: 2.5 }, py: 2 }}>
      <LinearProgress />
    </Box>
  )
}

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
      <Suspense fallback={<RouteLoader />}>
        <Routes>
          <Route
            path="/"
            element={<RootRedirect isAuthenticated={isAuthenticated} session={auth.session} />}
          />

          <Route
            element={<RequireGuest isAuthenticated={isAuthenticated} session={auth.session} />}
          >
            <Route element={<PublicLayout />}>
              <Route path="/auth" element={<AuthLandingPage auth={auth} />} />
            </Route>
          </Route>

          {/* Legal/info placeholders: public regardless of session. */}
          <Route element={<PublicLayout />}>
            <Route path="/legal/:section" element={<LegalPage />} />
            {/* Invitation claim link: public so a brand-new invitee can register
                and adopt their existing guest player without an account first. */}
            <Route path="/claim/:token" element={<ClaimPlayerPage auth={auth} />} />
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
                  path="accountability"
                  element={<AdminAccountabilityPage session={auth.session} onLogout={onLogout} />}
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
                  path="accountability"
                  element={<UserAccountabilityPage session={auth.session} onLogout={onLogout} />}
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
      </Suspense>
    </BrowserRouter>
  )
}
