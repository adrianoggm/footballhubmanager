import { Box, Container } from '@mui/material'
import { Outlet } from 'react-router-dom'

export default function UserLayout() {
  return (
    <Box sx={{ minHeight: '100vh', py: { xs: 2, md: 3 } }}>
      <Container maxWidth="xl">
        <Outlet />
      </Container>
    </Box>
  )
}
