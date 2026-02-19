import { Alert, Box, Chip, Container, Grid, Paper, Stack, Typography } from '@mui/material'
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
            animation: 'floatOrb 16s ease-in-out infinite'
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
            animation: 'floatOrb 20s ease-in-out infinite reverse'
          }}
        />

        <Container maxWidth="xl" sx={{ position: 'relative' }}>
          <Grid container spacing={{ xs: 3, md: 5 }} alignItems="start">
            <Grid item xs={12} md={4}>
              <Box sx={{ position: { md: 'sticky' }, top: { md: 28 } }}>
                <Stack spacing={2.5}>
                  <Stack spacing={0.5}>
                    <Typography
                      variant="overline"
                      sx={{ color: 'secondary.dark', fontWeight: 800, letterSpacing: 1.2 }}
                    >
                      Authentication
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Use this panel to sign in or create your account.
                    </Typography>
                  </Stack>
                  <Typography variant="h4" sx={{ fontWeight: 800, letterSpacing: -0.8 }}>
                    Welcome to footballhubmanager
                  </Typography>
                  <Typography variant="body1" color="text.secondary">
                    Login or register on the left panel to access your role-specific experience
                    as admin or player.
                  </Typography>
                  <AuthPanel auth={auth} />
                </Stack>
              </Box>
            </Grid>

            <Grid item xs={12} md={8}>
              <Stack spacing={3}>
                <Stack spacing={0.5}>
                  <Typography
                    variant="overline"
                    sx={{ color: 'secondary.dark', fontWeight: 800, letterSpacing: 1.2 }}
                  >
                    Product overview
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Core value and capabilities for admins and players.
                  </Typography>
                </Stack>
                <Typography
                  variant="h2"
                  sx={{ fontWeight: 800, lineHeight: 1.04, maxWidth: 860, letterSpacing: -1.8 }}
                >
                  Run your pena from invite to final standings in one place.
                </Typography>
                <Typography variant="h6" color="text.secondary" sx={{ maxWidth: 760, fontWeight: 400 }}>
                  footballhubmanager centralizes seasons, memberships, matches, and rankings with clear
                  workflows for admins and players.
                </Typography>

                <Paper
                  elevation={0}
                  sx={{
                    borderRadius: 4,
                    p: { xs: 2.5, md: 3.5 },
                    border: '1px solid rgba(31,41,55,0.1)',
                    background:
                      'linear-gradient(145deg, rgba(255,255,252,0.95) 0%, rgba(227,245,240,0.8) 56%, rgba(255,241,225,0.74) 100%)'
                  }}
                >
                  <Stack spacing={1.5}>
                    <Typography variant="h6" sx={{ fontWeight: 700 }}>
                      What you can do today
                    </Typography>
                    <Typography variant="body1" color="text.secondary">
                      Create and activate seasons, generate invitation tokens, let players join
                      safely, and monitor standings by selected season.
                    </Typography>
                  </Stack>
                </Paper>

                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <Paper
                      elevation={0}
                      sx={{
                        p: 2.5,
                        borderRadius: 3,
                        minHeight: '100%',
                        border: '1px solid rgba(31,41,55,0.1)',
                        bgcolor: 'rgba(255,253,247,0.86)'
                      }}
                    >
                      <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                        Admin workspace
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75 }}>
                        Manage pena context, seasons, invite tokens and competitive tracking
                        without leaving the same dashboard.
                      </Typography>
                    </Paper>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Paper
                      elevation={0}
                      sx={{
                        p: 2.5,
                        borderRadius: 3,
                        minHeight: '100%',
                        border: '1px solid rgba(31,41,55,0.1)',
                        bgcolor: 'rgba(255,253,247,0.86)'
                      }}
                    >
                      <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                        Player experience
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75 }}>
                        Join penas with invite tokens, pick your current pena, keep profile and
                        membership updated, and follow fixtures and standings.
                      </Typography>
                    </Paper>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Paper
                      elevation={0}
                      sx={{
                        p: 2.5,
                        borderRadius: 3,
                        minHeight: '100%',
                        border: '1px solid rgba(31,41,55,0.1)',
                        bgcolor: 'rgba(255,253,247,0.86)'
                      }}
                    >
                      <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                        Context-first navigation
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75 }}>
                        Admin screens require selected managed pena. Player screens require current
                        pena membership. The app always routes to the right setup step.
                      </Typography>
                    </Paper>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Paper
                      elevation={0}
                      sx={{
                        p: 2.5,
                        borderRadius: 3,
                        minHeight: '100%',
                        border: '1px solid rgba(31,41,55,0.1)',
                        bgcolor: 'rgba(255,253,247,0.86)'
                      }}
                    >
                      <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                        MVP now, V2 ready
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75 }}>
                        Current scope delivers auth, seasons, invitations, standings, memberships,
                        and read-only match flow, with expansion space for roster and match detail.
                      </Typography>
                    </Paper>
                  </Grid>
                </Grid>

                <Paper
                  elevation={0}
                  sx={{
                    borderRadius: 4,
                    p: { xs: 2.5, md: 3 },
                    border: '1px dashed rgba(180,83,9,0.3)',
                    bgcolor: 'rgba(255,246,230,0.72)'
                  }}
                >
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.25} alignItems="center">
                    <Chip label="Fast onboarding" size="small" color="secondary" />
                    <Typography variant="body2" color="text.secondary">
                      Register as admin to create your competition, or as player to join a pena in
                      seconds with an invite token.
                    </Typography>
                  </Stack>
                </Paper>
              </Stack>
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
          <Typography variant="h3">footballhubmanager</Typography>
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
