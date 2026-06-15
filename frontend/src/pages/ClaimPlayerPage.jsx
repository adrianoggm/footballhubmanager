import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Divider,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useI18n } from '../i18n/useI18n.js'
import { resolveRoleHomePath } from '../router/rolePaths.js'
import { claimService } from '../services/claimService.js'

/**
 * Public page reached from an admin-generated claim invitation link
 * (`/claim/:token`). It previews which existing guest player the invitee is
 * claiming, then either:
 *  - (no session) registers a brand-new account that adopts that guest player, or
 *  - (signed-in player) merges the guest player into the current account.
 * Both paths avoid creating a duplicate profile. On success the invitee lands on
 * their member home.
 */
export default function ClaimPlayerPage({ auth }) {
  const { t } = useI18n()
  const navigate = useNavigate()
  const { token } = useParams()

  const [inspectLoading, setInspectLoading] = useState(true)
  const [inspectError, setInspectError] = useState('')
  const [info, setInfo] = useState(null)

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  // For visitors without an active session: 'register' a new account, or sign
  // 'login' into an existing one and link the guest player to it.
  const [guestMode, setGuestMode] = useState('register')

  // An already-signed-in player links the guest profile to their existing
  // account (merge) instead of registering a new one.
  const isLoggedInUser = Boolean(auth?.token) && auth?.session?.user_type === 'user'

  const switchGuestMode = (mode) => {
    setSubmitError('')
    setGuestMode(mode)
  }

  useEffect(() => {
    let active = true
    setInspectLoading(true)
    setInspectError('')
    claimService
      .inspectClaimToken(token)
      .then((payload) => {
        if (active) {
          setInfo(payload)
        }
      })
      .catch((error) => {
        if (active) {
          setInspectError(error?.message || t('claim.errors.invalidToken'))
        }
      })
      .finally(() => {
        if (active) {
          setInspectLoading(false)
        }
      })
    return () => {
      active = false
    }
  }, [token, t])

  const handleAttach = async () => {
    setSubmitError('')
    setSubmitting(true)
    try {
      await claimService.attachExistingAccount(token)
      navigate(resolveRoleHomePath(auth.session), { replace: true })
    } catch (error) {
      setSubmitError(error?.message || t('claim.errors.generic'))
    } finally {
      setSubmitting(false)
    }
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setSubmitError('')
    if (!username.trim() || !password) {
      setSubmitError(t('claim.errors.missingFields'))
      return
    }
    if (password !== confirmPassword) {
      setSubmitError(t('claim.errors.passwordMismatch'))
      return
    }
    setSubmitting(true)
    try {
      const session = await auth.claimPlayer({ token, username: username.trim(), password })
      navigate(resolveRoleHomePath(session), { replace: true })
    } catch (error) {
      setSubmitError(error?.message || t('claim.errors.generic'))
    } finally {
      setSubmitting(false)
    }
  }

  // Existing account, not currently signed in: log in, then merge the guest
  // player into that account.
  const handleLoginAndLink = async (event) => {
    event.preventDefault()
    setSubmitError('')
    if (!username.trim() || !password) {
      setSubmitError(t('claim.errors.missingFields'))
      return
    }
    setSubmitting(true)
    try {
      const session = await auth.loginUser({ username: username.trim(), password })
      await claimService.attachExistingAccount(token)
      navigate(resolveRoleHomePath(session), { replace: true })
    } catch (error) {
      setSubmitError(error?.message || t('claim.errors.generic'))
    } finally {
      setSubmitting(false)
    }
  }

  const playerLabel = info?.player_nickname
    ? `${info.player_name} (${info.player_nickname})`
    : info?.player_name

  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', px: { xs: 1.5, md: 2.5 }, py: 4 }}>
      <Card sx={{ width: '100%', maxWidth: 460 }}>
        <CardContent>
          <Stack spacing={2.5}>
            <Box>
              <Typography variant="h5">{t('claim.title')}</Typography>
              <Typography variant="body2" color="text.secondary">
                {t('claim.subtitle')}
              </Typography>
            </Box>

            {inspectLoading && (
              <Stack direction="row" spacing={1.5} alignItems="center">
                <CircularProgress size={20} />
                <Typography variant="body2" color="text.secondary">
                  {t('claim.loading')}
                </Typography>
              </Stack>
            )}

            {!inspectLoading && inspectError && (
              <>
                <Alert severity="error">{inspectError}</Alert>
                <Button variant="outlined" onClick={() => navigate('/auth', { replace: true })}>
                  {t('claim.goToSignIn')}
                </Button>
              </>
            )}

            {!inspectLoading && !inspectError && info && isLoggedInUser && (
              <>
                <Alert severity="info">
                  {t('claim.linkInvitedAs', { pena: info.pena_name, player: playerLabel })}
                </Alert>
                {submitError && <Alert severity="error">{submitError}</Alert>}
                <Button variant="contained" onClick={handleAttach} disabled={submitting} fullWidth>
                  {submitting ? t('claim.linking') : t('claim.linkAction')}
                </Button>
              </>
            )}

            {!inspectLoading && !inspectError && info && !isLoggedInUser && (
              <>
                <Alert severity="info">
                  {t('claim.invitedAs', { pena: info.pena_name, player: playerLabel })}
                </Alert>

                {guestMode === 'register' ? (
                  <Box component="form" onSubmit={handleSubmit}>
                    <Stack spacing={2}>
                      <TextField
                        label={t('claim.usernameLabel')}
                        value={username}
                        onChange={(event) => setUsername(event.target.value)}
                        autoComplete="username"
                        fullWidth
                        required
                      />
                      <TextField
                        label={t('claim.passwordLabel')}
                        type="password"
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        autoComplete="new-password"
                        fullWidth
                        required
                      />
                      <TextField
                        label={t('claim.confirmPasswordLabel')}
                        type="password"
                        value={confirmPassword}
                        onChange={(event) => setConfirmPassword(event.target.value)}
                        autoComplete="new-password"
                        fullWidth
                        required
                      />

                      {submitError && <Alert severity="error">{submitError}</Alert>}

                      <Button type="submit" variant="contained" disabled={submitting} fullWidth>
                        {submitting ? t('claim.submitting') : t('claim.submit')}
                      </Button>
                    </Stack>
                  </Box>
                ) : (
                  <Box component="form" onSubmit={handleLoginAndLink}>
                    <Stack spacing={2}>
                      <TextField
                        label={t('claim.usernameLabel')}
                        value={username}
                        onChange={(event) => setUsername(event.target.value)}
                        autoComplete="username"
                        fullWidth
                        required
                      />
                      <TextField
                        label={t('claim.passwordLabel')}
                        type="password"
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        autoComplete="current-password"
                        fullWidth
                        required
                      />

                      {submitError && <Alert severity="error">{submitError}</Alert>}

                      <Button type="submit" variant="contained" disabled={submitting} fullWidth>
                        {submitting ? t('claim.linking') : t('claim.linkAction')}
                      </Button>
                    </Stack>
                  </Box>
                )}

                <Divider />
                <Stack direction="row" spacing={1} alignItems="center" justifyContent="center">
                  <Typography variant="body2" color="text.secondary">
                    {guestMode === 'register'
                      ? t('claim.haveAccountQuestion')
                      : t('claim.noAccountQuestion')}
                  </Typography>
                  <Button
                    variant="text"
                    size="small"
                    disabled={submitting}
                    onClick={() => switchGuestMode(guestMode === 'register' ? 'login' : 'register')}
                  >
                    {guestMode === 'register'
                      ? t('claim.linkExistingAction')
                      : t('claim.createNewAction')}
                  </Button>
                </Stack>
              </>
            )}
          </Stack>
        </CardContent>
      </Card>
    </Box>
  )
}
