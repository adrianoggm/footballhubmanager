import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Grid,
  LinearProgress,
  MenuItem,
  Stack,
  TextField,
  Typography
} from '@mui/material'
import { useEffect, useMemo, useState } from 'react'
import { userService } from '../services/userService.js'

const defaultProfileForm = () => ({
  name: '',
  surname1: '',
  surname2: '',
  nationality: ''
})

const defaultJoinForm = () => ({
  token: '',
  nickname: '',
  position: ''
})

const defaultMembershipForm = () => ({
  nickname: '',
  position: ''
})

const asText = (value) => value ?? ''

export default function UserDashboard({ session, onLogout }) {
  const [initializing, setInitializing] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [notice, setNotice] = useState('')

  const [profile, setProfile] = useState(null)
  const [profileForm, setProfileForm] = useState(defaultProfileForm)
  const [nationalities, setNationalities] = useState([])

  const [penas, setPenas] = useState([])
  const [selectedPenaGuid, setSelectedPenaGuid] = useState('')
  const [membership, setMembership] = useState(null)
  const [membershipForm, setMembershipForm] = useState(defaultMembershipForm)
  const [joinForm, setJoinForm] = useState(defaultJoinForm)

  const selectedPena = useMemo(
    () => penas.find((item) => item.guid === selectedPenaGuid) || null,
    [penas, selectedPenaGuid]
  )

  const runAction = async (action, successMessage = '') => {
    setLoading(true)
    setError(null)
    setNotice('')
    try {
      await action()
      if (successMessage) {
        setNotice(successMessage)
      }
    } catch (actionError) {
      setError(actionError)
    } finally {
      setLoading(false)
    }
  }

  const loadMembership = async (penaGuid) => {
    if (!penaGuid) {
      setMembership(null)
      setMembershipForm(defaultMembershipForm())
      return
    }
    try {
      const currentMembership = await userService.getMyMembership(penaGuid)
      setMembership(currentMembership)
      setMembershipForm({
        nickname: asText(currentMembership.nickname),
        position: asText(currentMembership.position)
      })
    } catch (requestError) {
      if (requestError.status === 403 || requestError.status === 404) {
        setMembership(null)
        setMembershipForm(defaultMembershipForm())
        return
      }
      throw requestError
    }
  }

  const loadDashboard = async () => {
    setInitializing(true)
    setError(null)
    try {
      const [nextProfile, penasPage, nextNationalities] = await Promise.all([
        userService.getMyProfile(),
        userService.listMyPenas(),
        userService.getNationalities().catch(() => [])
      ])
      const nextPenas = penasPage.items || []
      setProfile(nextProfile)
      setProfileForm({
        name: asText(nextProfile.name),
        surname1: asText(nextProfile.surname1),
        surname2: asText(nextProfile.surname2),
        nationality: asText(nextProfile.nationality)
      })
      setPenas(nextPenas)
      setNationalities(nextNationalities)

      const preferredPena =
        nextPenas.find((item) => item.guid === selectedPenaGuid)?.guid || nextPenas[0]?.guid || ''
      setSelectedPenaGuid(preferredPena)
      if (preferredPena) {
        await loadMembership(preferredPena)
      } else {
        setMembership(null)
        setMembershipForm(defaultMembershipForm())
      }
    } catch (requestError) {
      setError(requestError)
    } finally {
      setInitializing(false)
    }
  }

  useEffect(() => {
    loadDashboard()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!selectedPenaGuid || initializing) {
      if (!selectedPenaGuid) {
        setMembership(null)
        setMembershipForm(defaultMembershipForm())
      }
      return
    }
    runAction(() => loadMembership(selectedPenaGuid))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPenaGuid])

  const onProfileField = (name) => (event) => {
    setProfileForm((prev) => ({ ...prev, [name]: event.target.value }))
  }

  const onMembershipField = (name) => (event) => {
    setMembershipForm((prev) => ({ ...prev, [name]: event.target.value }))
  }

  const onJoinField = (name) => (event) => {
    setJoinForm((prev) => ({ ...prev, [name]: event.target.value }))
  }

  const handleUpdateProfile = async () => {
    await runAction(async () => {
      const updatedProfile = await userService.updateMyProfile(profileForm)
      setProfile(updatedProfile)
      setProfileForm({
        name: asText(updatedProfile.name),
        surname1: asText(updatedProfile.surname1),
        surname2: asText(updatedProfile.surname2),
        nationality: asText(updatedProfile.nationality)
      })
    }, 'Profile updated')
  }

  const handleJoinPena = async () => {
    const token = joinForm.token.trim()
    if (!token) {
      setError(new Error('Invite code is required'))
      return
    }
    await runAction(async () => {
      await userService.consumeJoinToken({
        token,
        nickname: joinForm.nickname.trim() || null,
        position: joinForm.position.trim() || null
      })
      setJoinForm(defaultJoinForm())
      await loadDashboard()
    }, 'Joined pena successfully')
  }

  const handleUpdateMembership = async () => {
    if (!selectedPenaGuid) {
      return
    }
    await runAction(async () => {
      const updatedMembership = await userService.updateMyMembership(selectedPenaGuid, {
        nickname: membershipForm.nickname.trim() || null,
        position: membershipForm.position.trim() || null
      })
      setMembership(updatedMembership)
      setMembershipForm({
        nickname: asText(updatedMembership.nickname),
        position: asText(updatedMembership.position)
      })
    }, 'Membership updated')
  }

  const handleLeavePena = async () => {
    if (!selectedPenaGuid) {
      return
    }
    await runAction(async () => {
      await userService.leavePena(selectedPenaGuid)
      await loadDashboard()
    }, 'You left the selected pena')
  }

  if (initializing) {
    return (
      <Stack spacing={2}>
        <Typography variant="h5">Player Panel</Typography>
        <LinearProgress />
      </Stack>
    )
  }

  return (
    <Stack spacing={3}>
      <Card>
        <CardContent>
          <Stack spacing={2} direction={{ xs: 'column', md: 'row' }} alignItems={{ md: 'center' }}>
            <Box sx={{ flex: 1 }}>
              <Typography variant="h4">Player Panel</Typography>
              <Typography variant="body2" color="text.secondary">
                Logged as <strong>{session?.user_guid || '-'}</strong>
              </Typography>
            </Box>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
              <Button variant="outlined" onClick={() => runAction(loadDashboard)} disabled={loading}>
                Refresh
              </Button>
              <Button variant="text" onClick={onLogout} disabled={loading}>
                Logout
              </Button>
            </Stack>
          </Stack>
        </CardContent>
      </Card>

      {loading && <LinearProgress />}
      {error && <Alert severity="error">{error.message}</Alert>}
      {notice && <Alert severity="success">{notice}</Alert>}

      <Grid container spacing={3}>
        <Grid item xs={12} md={7}>
          <Card>
            <CardContent>
              <Stack spacing={2}>
                <Typography variant="h6">My Profile</Typography>
                <TextField label="Name" value={profileForm.name} onChange={onProfileField('name')} />
                <TextField
                  label="Surname 1"
                  value={profileForm.surname1}
                  onChange={onProfileField('surname1')}
                />
                <TextField
                  label="Surname 2"
                  value={profileForm.surname2}
                  onChange={onProfileField('surname2')}
                />
                <TextField
                  select
                  label="Nationality"
                  value={profileForm.nationality}
                  onChange={onProfileField('nationality')}
                >
                  {nationalities.map((nationality) => (
                    <MenuItem key={nationality} value={nationality}>
                      {nationality}
                    </MenuItem>
                  ))}
                </TextField>
                <Button variant="contained" onClick={handleUpdateProfile} disabled={loading}>
                  Save profile
                </Button>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={5}>
          <Card>
            <CardContent>
              <Stack spacing={2}>
                <Typography variant="h6">Join a Pena</Typography>
                <TextField
                  label="Invite code"
                  value={joinForm.token}
                  onChange={onJoinField('token')}
                  placeholder="Paste invite token"
                />
                <TextField
                  label="Nickname (optional)"
                  value={joinForm.nickname}
                  onChange={onJoinField('nickname')}
                />
                <TextField
                  label="Position (optional)"
                  value={joinForm.position}
                  onChange={onJoinField('position')}
                />
                <Button variant="contained" onClick={handleJoinPena} disabled={loading}>
                  Join
                </Button>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Card>
        <CardContent>
          <Stack spacing={2.5}>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} alignItems={{ md: 'center' }}>
              <Box sx={{ flex: 1 }}>
                <Typography variant="h6">My Penas</Typography>
                <Typography variant="body2" color="text.secondary">
                  You are linked to {penas.length} pena{penas.length === 1 ? '' : 's'}.
                </Typography>
              </Box>
              <TextField
                select
                size="small"
                label="Selected pena"
                value={selectedPenaGuid}
                onChange={(event) => setSelectedPenaGuid(event.target.value)}
                sx={{ minWidth: 280 }}
              >
                {penas.map((pena) => (
                  <MenuItem key={pena.guid} value={pena.guid}>
                    {pena.name}
                  </MenuItem>
                ))}
              </TextField>
            </Stack>

            <Stack direction="row" flexWrap="wrap" gap={1}>
              {penas.map((pena) => (
                <Chip
                  key={pena.guid}
                  label={pena.name}
                  color={pena.guid === selectedPenaGuid ? 'secondary' : 'default'}
                  variant={pena.guid === selectedPenaGuid ? 'filled' : 'outlined'}
                />
              ))}
              {!penas.length && <Chip label="No penas linked yet" />}
            </Stack>

            {selectedPena && (
              <Card variant="outlined">
                <CardContent>
                  <Stack spacing={2}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                      Membership in {selectedPena.name}
                    </Typography>
                    <TextField
                      label="Nickname"
                      value={membershipForm.nickname}
                      onChange={onMembershipField('nickname')}
                    />
                    <TextField
                      label="Position"
                      value={membershipForm.position}
                      onChange={onMembershipField('position')}
                    />
                    {membership?.role && (
                      <Typography variant="body2" color="text.secondary">
                        Role: {membership.role}
                      </Typography>
                    )}
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                      <Button
                        variant="contained"
                        onClick={handleUpdateMembership}
                        disabled={loading}
                      >
                        Save membership
                      </Button>
                      <Button
                        variant="outlined"
                        color="error"
                        onClick={handleLeavePena}
                        disabled={loading}
                      >
                        Leave pena
                      </Button>
                    </Stack>
                  </Stack>
                </CardContent>
              </Card>
            )}
          </Stack>
        </CardContent>
      </Card>

      {profile && (
        <Alert severity="info">
          Player GUID: <strong>{profile.guid}</strong>
        </Alert>
      )}
    </Stack>
  )
}
