import { Box, Container, Stack } from '@mui/material'
import { Outlet } from 'react-router-dom'
import LanguageSwitcher from '../components/LanguageSwitcher.jsx'

export default function PublicLayout() {
  return (
    <Box sx={{ minHeight: '100vh', position: 'relative', overflow: 'hidden', py: { xs: 3, md: 5 } }}>
      <Box
        sx={{
          position: 'absolute',
          width: 520,
          height: 520,
          borderRadius: '50%',
          right: -180,
          top: -200,
          background: 'radial-gradient(circle, rgba(15,118,110,0.3) 0%, rgba(15,118,110,0) 72%)',
          animation: 'floatOrb 16s ease-in-out infinite',
        }}
      />
      <Box
        sx={{
          position: 'absolute',
          width: 480,
          height: 480,
          borderRadius: '50%',
          left: -210,
          bottom: -180,
          background: 'radial-gradient(circle, rgba(180,83,9,0.24) 0%, rgba(180,83,9,0) 72%)',
          animation: 'floatOrb 20s ease-in-out infinite reverse',
        }}
      />

      <Container maxWidth="xl" sx={{ position: 'relative' }}>
        <Stack direction="row" justifyContent="flex-end" sx={{ mb: 2 }}>
          <LanguageSwitcher />
        </Stack>
        <Outlet />
      </Container>
    </Box>
  )
}
