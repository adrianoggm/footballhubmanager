import { Box, Container } from '@mui/material'
import { Outlet } from 'react-router-dom'

export default function AdminLayout() {
  return (
    <Box sx={{ minHeight: '100vh', py: { xs: 2, md: 3 } }}>
      <Container
        maxWidth={false}
        disableGutters
        sx={{ px: { xs: 1.5, sm: 2, md: 2.5, lg: 3, xl: 4 } }}
      >
        <Outlet />
      </Container>
    </Box>
  )
}
