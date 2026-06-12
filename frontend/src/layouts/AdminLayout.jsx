import { Box, Container } from '@mui/material'
import { Outlet } from 'react-router-dom'
import AppFooter from '../components/common/AppFooter.jsx'
import { ADMIN_DASHBOARD_SITEMAP } from '../navigation/sitemap.js'

export default function AdminLayout() {
  return (
    <Box sx={{ minHeight: '100vh', py: { xs: 1.25, md: 1.75, xl: 1.25 } }}>
      <Container
        maxWidth={false}
        disableGutters
        sx={{ px: { xs: 1, sm: 1.25, md: 1.5, lg: 1.75, xl: 2 } }}
      >
        <Outlet />
        <AppFooter sections={ADMIN_DASHBOARD_SITEMAP} />
      </Container>
    </Box>
  )
}
