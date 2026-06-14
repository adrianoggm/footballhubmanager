import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
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
 * claiming, then registers a brand-new account that adopts that player so no
 * duplicate profile is created. On success the invitee is logged in and routed
 * to their member home.
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

            {!inspectLoading && !inspectError && info && (
              <>
                <Alert severity="info">
                  {t('claim.invitedAs', { pena: info.pena_name, player: playerLabel })}
                </Alert>

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
              </>
            )}
          </Stack>
        </CardContent>
      </Card>
    </Box>
  )
}
