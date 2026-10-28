import { Box } from '@mui/material'
import { Outlet, useMatch } from 'react-router-dom'
import UserDashboardRoutePage from '../pages/UserDashboardRoutePage.jsx'

// The dashboard is rendered once here (not per section route) so its pena/season
// selection and loaded data survive section navigation (U-01). Section routes
// only drive the URL; the Outlet renders their redirects. The dashboard shell
// owns the whole viewport (sidebar/topbar); the legal footer lives in settings.
export default function UserLayout({ session, onLogout }) {
  const sectionId = useMatch('/app/user/:sectionId')?.params.sectionId

  return (
    <Box sx={{ minHeight: '100vh', width: '100%' }}>
      <UserDashboardRoutePage session={session} onLogout={onLogout} sectionId={sectionId} />
      <Outlet />
    </Box>
  )
}
