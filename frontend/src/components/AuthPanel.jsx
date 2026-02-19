import {
  Alert,
  Button,
  Card,
  CardContent,
  MenuItem,
  Stack,
  Tab,
  Tabs,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography
} from '@mui/material'
import { useEffect, useState } from 'react'
import { httpClient } from '../services/httpClient.js'

const initialUser = {
  username: '',
  password: '',
  name: '',
  surname1: '',
  surname2: '',
  nationality: ''
}

const initialAdmin = {
  username: '',
  password: '',
  name: ''
}

export default function AuthPanel({ auth }) {
  const [mode, setMode] = useState('login')
  const [accountType, setAccountType] = useState('admin')
  const [nationalities, setNationalities] = useState([])
  const [credentials, setCredentials] = useState({ username: '', password: '' })
  const [userRegister, setUserRegister] = useState(initialUser)
  const [adminRegister, setAdminRegister] = useState(initialAdmin)

  const onField = (setter) => (event) => {
    const { name, value } = event.target
    setter((prev) => ({ ...prev, [name]: value }))
  }

  const handle = (fn) => async () => {
    try {
      await fn()
    } catch {
      // handled in hook state
    }
  }

  const handleSubmit = async () => {
    if (mode === 'login') {
      if (accountType === 'admin') {
        await auth.loginAdmin(credentials)
      } else {
        await auth.loginUser(credentials)
      }
      return
    }

    if (accountType === 'admin') {
      await auth.registerAdmin(adminRegister)
      return
    }

    await auth.registerUser(userRegister)
  }

  const submitLabel =
    mode === 'login'
      ? accountType === 'admin'
        ? 'Sign in as admin'
        : 'Sign in as player'
      : accountType === 'admin'
        ? 'Create admin account'
        : 'Create player account'

  const panelDescription =
    mode === 'register' && accountType === 'admin'
      ? 'Create your admin login and your first pena in one step.'
      : 'Manage your pena seasons, call-ups, matches and standings from one panel.'

  useEffect(() => {
    const loadNationalities = async () => {
      try {
        const items = await httpClient.get('/api/v1/catalogs/nationalities')
        setNationalities(items)
      } catch {
        setNationalities([])
      }
    }
    loadNationalities()
  }, [])

  return (
    <Card
      sx={{
        maxWidth: 460,
        width: '100%',
        borderRadius: 4,
        bgcolor: 'rgba(255,253,248,0.93)',
        border: '1px solid rgba(31,41,55,0.1)',
        boxShadow: '0 22px 52px rgba(15, 23, 42, 0.14), 0 6px 18px rgba(15, 118, 110, 0.16)'
      }}
    >
      <CardContent sx={{ p: 4 }}>
        <Stack spacing={3}>
          <Stack spacing={1}>
            <Typography variant="h5" sx={{ fontWeight: 700 }}>
              {mode === 'login'
                ? 'Sign in to footballhubmanager'
                : 'Create your footballhubmanager account'}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {panelDescription}
            </Typography>
          </Stack>

          <Tabs
            value={mode}
            onChange={(_, value) => setMode(value)}
            variant="fullWidth"
            sx={{ minHeight: 40 }}
          >
            <Tab value="login" label="Login" sx={{ minHeight: 40 }} />
            <Tab value="register" label="Register" sx={{ minHeight: 40 }} />
          </Tabs>

          <ToggleButtonGroup
            value={accountType}
            exclusive
            fullWidth
            onChange={(_, value) => {
              if (value) {
                setAccountType(value)
              }
            }}
            size="small"
          >
            <ToggleButton value="admin">Admin</ToggleButton>
            <ToggleButton value="user">Player</ToggleButton>
          </ToggleButtonGroup>

          {auth.error && <Alert severity="error">{auth.error.message}</Alert>}

          {mode === 'login' && (
            <Stack spacing={2}>
              <TextField
                label="Username"
                name="username"
                value={credentials.username}
                onChange={onField(setCredentials)}
              />
              <TextField
                label="Password"
                type="password"
                name="password"
                value={credentials.password}
                onChange={onField(setCredentials)}
              />
            </Stack>
          )}

          {mode === 'register' && accountType === 'admin' && (
            <Stack spacing={2}>
              <Alert severity="info">
                <strong>Admin username</strong> is for login. <strong>Pena name</strong> is the club
                created at registration.
              </Alert>
              <TextField
                label="Admin username"
                name="username"
                value={adminRegister.username}
                onChange={onField(setAdminRegister)}
                helperText="This username is used to sign in as admin."
              />
              <TextField
                label="Password"
                type="password"
                name="password"
                value={adminRegister.password}
                onChange={onField(setAdminRegister)}
              />
              <TextField
                label="Pena name"
                name="name"
                value={adminRegister.name}
                onChange={onField(setAdminRegister)}
                helperText="This is the name of the pena created for your admin account."
              />
            </Stack>
          )}

          {mode === 'register' && accountType === 'user' && (
            <Stack spacing={2}>
              <TextField
                label="Username"
                name="username"
                value={userRegister.username}
                onChange={onField(setUserRegister)}
              />
              <TextField
                label="Password"
                type="password"
                name="password"
                value={userRegister.password}
                onChange={onField(setUserRegister)}
              />
              <TextField
                label="Name"
                name="name"
                value={userRegister.name}
                onChange={onField(setUserRegister)}
              />
              <TextField
                label="Surname 1"
                name="surname1"
                value={userRegister.surname1}
                onChange={onField(setUserRegister)}
              />
              <TextField
                label="Surname 2"
                name="surname2"
                value={userRegister.surname2}
                onChange={onField(setUserRegister)}
              />
              <TextField
                select
                label="Nationality"
                name="nationality"
                value={userRegister.nationality}
                onChange={onField(setUserRegister)}
              >
                {nationalities.map((nationality) => (
                  <MenuItem key={nationality} value={nationality}>
                    {nationality}
                  </MenuItem>
                ))}
              </TextField>
            </Stack>
          )}

          <Button
            variant="contained"
            size="large"
            onClick={handle(handleSubmit)}
            disabled={auth.status === 'loading'}
          >
            {submitLabel}
          </Button>

          <Typography variant="caption" color="text.secondary">
            {accountType === 'admin'
              ? 'Admins manage seasons, lineups, scoring rules and invite links.'
              : 'Players join penas with invite codes and participate in season matches.'}
          </Typography>
        </Stack>
      </CardContent>
    </Card>
  )
}
