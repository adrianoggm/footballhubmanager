import { Box, LinearProgress } from '@mui/material'
import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes, BrowserRouter } from 'react-router-dom'
import { ADMIN_SECTION_IDS, USER_SECTION_IDS } from '../navigation/sitemap.js'
import PublicLayout from '../layouts/PublicLayout.jsx'
import RequireAuth from './guards/RequireAuth.jsx'
import RequireGuest from './guards/RequireGuest.jsx'
import RequireRole from './guards/RequireRole.jsx'
import { resolveRoleHomePath } from './rolePaths.js'

const AuthLandingPage = lazy(() => import('../pages/AuthLandingPage.jsx'))
const ClaimPlayerPage = lazy(() => import('../pages/ClaimPlayerPage.jsx'))
const ForgotPasswordPage = lazy(() => import('../pages/ForgotPasswordPage.jsx'))
const ResetPasswordPage = lazy(() => import('../pages/ResetPasswordPage.jsx'))
const VerifyEmailPage = lazy(() => import('../pages/VerifyEmailPage.jsx'))
const LegalPage = lazy(() => import('../pages/LegalPage.jsx'))
const SessionIncompletePage = lazy(() => import('../pages/SessionIncompletePage.jsx'))
// Each role dashboard is mounted once by its layout (sections are child routes
// without their own element), so selection state survives navigation.
const AdminLayout = lazy(() => import('../layouts/AdminLayout.jsx'))
const UserLayout = lazy(() => import('../layouts/UserLayout.jsx'))

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
  const isAuthenticated = Boolean(auth.session)

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

          {/* Legal/info pages (contact, terms, privacy, accessibility): public regardless of session. */}
          <Route element={<PublicLayout />}>
            <Route path="/legal/:section" element={<LegalPage />} />
            {/* Invitation claim link: public so a brand-new invitee can register
                and adopt their existing guest player without an account first. */}
            <Route path="/claim/:token" element={<ClaimPlayerPage auth={auth} />} />
            {/* Account email links (#154): reachable with or without a session. */}
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password/:token" element={<ResetPasswordPage />} />
            <Route path="/verify-email/:token" element={<VerifyEmailPage auth={auth} />} />
          </Route>

          <Route element={<RequireAuth isAuthenticated={isAuthenticated} />}>
            <Route path="/app" element={<RoleHomeRedirect session={auth.session} />} />
            <Route
              path="/app/session-incomplete"
              element={<SessionIncompletePage onLogout={onLogout} />}
            />

            <Route path="/app/admin" element={<RequireRole session={auth.session} role="admin" />}>
              <Route element={<AdminLayout session={auth.session} onLogout={onLogout} />}>
                <Route index element={<Navigate to="overview" replace />} />
                {ADMIN_SECTION_IDS.map((sectionId) => (
                  <Route key={sectionId} path={sectionId} />
                ))}
                <Route path="*" element={<Navigate to="overview" replace />} />
              </Route>
            </Route>

            <Route path="/app/user" element={<RequireRole session={auth.session} role="user" />}>
              <Route element={<UserLayout session={auth.session} onLogout={onLogout} />}>
                <Route index element={<Navigate to="membership" replace />} />
                {USER_SECTION_IDS.map((sectionId) => (
                  <Route key={sectionId} path={sectionId} />
                ))}
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
