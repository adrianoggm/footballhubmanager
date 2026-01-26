import { Box, Container, Stack, Typography } from '@mui/material'
import AuthPanel from './components/AuthPanel.jsx'

export default function App() {
  return (
    <Container maxWidth="lg" sx={{ py: 6 }}>
      <Stack spacing={4}>
        <Box>
          <Typography variant="h3">PenaHub</Typography>
          <Typography variant="body1" sx={{ maxWidth: 640, mt: 1 }}>
            Auth and registration playground. Use the panels below to test the API endpoints.
          </Typography>
        </Box>
        <AuthPanel />
      </Stack>
    </Container>
  )
}
