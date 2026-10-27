import { Box, Container } from '@mui/material'
import { Outlet, useMatch } from 'react-router-dom'
import AppFooter from '../components/common/AppFooter.jsx'
import { ADMIN_DASHBOARD_SITEMAP } from '../navigation/sitemap.js'
import AdminDashboardRoutePage from '../pages/AdminDashboardRoutePage.jsx'

// The dashboard is rendered once here (not per section route) so its pena/season
// selection and loaded data survive section navigation (U-02). Section routes
// only drive the URL; the Outlet renders their redirects.
export default function AdminLayout({ session, onLogout }) {
  const sectionId = useMatch('/app/admin/:sectionId')?.params.sectionId

  return (
    <Box sx={{ minHeight: '100vh', py: { xs: 1.25, md: 1.75, xl: 1.25 } }}>
      <Container
        maxWidth={false}
        disableGutters
        sx={{ px: { xs: 1, sm: 1.25, md: 1.5, lg: 1.75, xl: 2 } }}
      >
        <AdminDashboardRoutePage session={session} onLogout={onLogout} sectionId={sectionId} />
        <Outlet />
        <AppFooter sections={ADMIN_DASHBOARD_SITEMAP} />
      </Container>
    </Box>
  )
}
