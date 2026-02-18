import { Alert, Box, Chip, Container, Grid, Stack, Typography } from '@mui/material'
import AuthPanel from './components/AuthPanel.jsx'
import AdminDashboard from './components/AdminDashboard.jsx'
import UserDashboard from './components/UserDashboard.jsx'
import { useAuth } from './hooks/useAuth.js'

export default function App() {
  const auth = useAuth()
  const isAuthenticated = Boolean(auth.token)
  const isAdmin = auth.session?.user_type === 'admin'
  const isUser = auth.session?.user_type === 'user'

  const handleLogout = async () => {
    try {
      await auth.logout()
    } catch {
      // handled in auth state
    }
  }

  if (!isAuthenticated) {
    return (
      <Box sx={{ minHeight: '100vh', position: 'relative', overflow: 'hidden' }}>
        <Box
          sx={{
            position: 'absolute',
            width: 420,
            height: 420,
            borderRadius: '50%',
            right: -120,
            top: -120,
            background: 'radial-gradient(circle, rgba(37,99,235,0.22) 0%, rgba(37,99,235,0) 70%)'
          }}
        />
        <Box
          sx={{
            position: 'absolute',
            width: 360,
            height: 360,
            borderRadius: '50%',
            left: -160,
            bottom: -120,
            background: 'radial-gradient(circle, rgba(17,24,39,0.16) 0%, rgba(17,24,39,0) 70%)'
          }}
        />

        <Container maxWidth="xl" sx={{ py: { xs: 4, md: 8 }, position: 'relative' }}>
          <Grid container spacing={5} alignItems="center">
            <Grid item xs={12} md={7}>
              <Stack spacing={3}>
                <Chip
                  label="Community football manager"
                  color="secondary"
                  sx={{ width: 'fit-content', fontWeight: 600 }}
                />
                <Typography
                  variant="h2"
                  sx={{ fontWeight: 800, lineHeight: 1.05, maxWidth: 720, letterSpacing: -1.6 }}
                >
                  Run your pena season from one place.
                </Typography>
                <Typography variant="h6" color="text.secondary" sx={{ maxWidth: 640, fontWeight: 400 }}>
                  Create seasons, configure scoring rules, generate join codes, call up lineups, and
                  track standings match by match.
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <Box sx={{ p: 2, borderRadius: 3, bgcolor: 'rgba(255,255,255,0.7)' }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                        Season control
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Points by win/draw/loss are configurable per season.
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Box sx={{ p: 2, borderRadius: 3, bgcolor: 'rgba(255,255,255,0.7)' }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                        Match orchestration
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Create detailed matches with full home/away lineups.
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Box sx={{ p: 2, borderRadius: 3, bgcolor: 'rgba(255,255,255,0.7)' }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                        Invite flow
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Share secure join codes with players in seconds.
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Box sx={{ p: 2, borderRadius: 3, bgcolor: 'rgba(255,255,255,0.7)' }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                        Live standings
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Track wins, draws, losses and points for the current season.
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>
              </Stack>
            </Grid>
            <Grid item xs={12} md={5} sx={{ display: 'flex', justifyContent: { md: 'flex-end' } }}>
              <AuthPanel auth={auth} />
            </Grid>
          </Grid>
        </Container>
      </Box>
    )
  }

  return (
    <Container maxWidth="lg" sx={{ py: 6 }}>
      <Stack spacing={4}>
        <Box>
          <Typography variant="h3">PenaHub</Typography>
        </Box>

        {isAuthenticated && isAdmin && (
          <AdminDashboard session={auth.session} onLogout={handleLogout} />
        )}

        {isAuthenticated && isUser && (
          <UserDashboard session={auth.session} onLogout={handleLogout} />
        )}

        {isAuthenticated && !isAdmin && !isUser && (
          <Alert severity="warning">
            Session metadata is incomplete. Please logout and login again.
          </Alert>
        )}
      </Stack>
    </Container>
  )
}
