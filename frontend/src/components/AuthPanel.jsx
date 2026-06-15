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
  Typography,
} from '@mui/material'
import { alpha } from '@mui/material/styles'
import { useEffect, useMemo, useState } from 'react'
import { translateNationalityLabel } from '../i18n/labels.js'
import { useI18n } from '../i18n/useI18n.js'
import { normalizeNationalities } from '../services/catalogUtils.js'
import { httpClient } from '../services/httpClient.js'

const initialUser = {
  username: '',
  password: '',
  name: '',
  surname1: '',
  surname2: '',
  nationality: '',
}

const initialAdmin = {
  username: '',
  password: '',
  name: '',
}

const mapAuthErrorMessage = (error, t) => {
  const raw = String(error?.message || '').toLowerCase()
  if (error?.status === 401) {
    return t('auth.errors.invalidCredentials')
  }
  if (error?.status === 409) {
    return t('auth.errors.usernameExists')
  }
  if (!raw) {
    return t('auth.errors.generic')
  }
  if (raw.includes('invalid credentials') || raw.includes('credenciales inválidas')) {
    return t('auth.errors.invalidCredentials')
  }
  if (
    raw.includes('username already exists') ||
    raw.includes('usuario ya existe') ||
    raw.includes('nombre de usuario ya existe')
  ) {
    return t('auth.errors.usernameExists')
  }
  if (
    raw.includes('invalid user registration data') ||
    raw.includes('datos de registro de jugador inválidos') ||
    raw.includes('datos de registro de usuario inválidos')
  ) {
    return t('auth.errors.invalidUserRegistrationData')
  }
  if (
    raw.includes('invalid admin registration data') ||
    raw.includes('datos de registro de admin inválidos')
  ) {
    return t('auth.errors.invalidAdminRegistrationData')
  }
  if (raw.includes('invalid nationality') || raw.includes('nacionalidad inválida')) {
    return t('auth.errors.invalidNationality')
  }
  if (raw.includes('failed to fetch') || raw.includes('network')) {
    return t('auth.errors.network')
  }
  if (
    error?.status === 400 ||
    error?.status === 422 ||
    raw.includes('required') ||
    raw.includes('field') ||
    raw.includes('validation') ||
    raw.includes('obligatorio')
  ) {
    return t('auth.errors.validation')
  }
  return t('auth.errors.generic')
}

export default function AuthPanel({ auth }) {
  const { t } = useI18n()
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
        ? t('auth.submitSignInAdmin')
        : t('auth.submitSignInPlayer')
      : accountType === 'admin'
        ? t('auth.submitCreateAdmin')
        : t('auth.submitCreatePlayer')

  const panelDescription =
    mode === 'register' && accountType === 'admin'
      ? t('auth.panelDescriptionAdminRegister')
      : t('auth.panelDescriptionDefault')

  const authErrorMessage = useMemo(
    () => (auth.error ? mapAuthErrorMessage(auth.error, t) : ''),
    [auth.error, t]
  )

  useEffect(() => {
    const loadNationalities = async () => {
      try {
        const payload = await httpClient.get('/api/v1/catalogs/nationalities')
        const items = normalizeNationalities(payload)
        setNationalities(items)
        setUserRegister((prev) => {
          if (!items.length) {
            return prev.nationality ? { ...prev, nationality: '' } : prev
          }
          if (prev.nationality && items.includes(prev.nationality)) {
            return prev
          }
          return { ...prev, nationality: items[0] }
        })
      } catch {
        setNationalities([])
        setUserRegister((prev) => (prev.nationality ? { ...prev, nationality: '' } : prev))
      }
    }
    loadNationalities()
  }, [])

  return (
    <Card
      sx={{
        width: '100%',
        borderRadius: 4,
        bgcolor: 'background.paper',
        border: '1px solid rgba(31,41,55,0.1)',
        boxShadow: '0 22px 52px rgba(15, 23, 42, 0.14), 0 6px 18px rgba(15, 118, 110, 0.16)',
      }}
    >
      <CardContent sx={{ p: { xs: 2.5, md: 3 } }}>
        <Stack spacing={3}>
          <Stack spacing={1}>
            <Typography
              variant="overline"
              sx={{ color: 'secondary.dark', fontWeight: 800, letterSpacing: 1.2 }}
            >
              {accountType === 'admin' ? t('auth.roleAdmin') : t('auth.rolePlayer')}
            </Typography>
            <Typography variant="h5" sx={{ fontWeight: 700 }}>
              {mode === 'login' ? t('auth.titleLogin') : t('auth.titleRegister')}
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
            textColor="secondary"
            indicatorColor="secondary"
          >
            <Tab value="login" label={t('auth.tabLogin')} sx={{ minHeight: 40 }} />
            <Tab value="register" label={t('auth.tabRegister')} sx={{ minHeight: 40 }} />
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
            <ToggleButton value="admin">{t('auth.roleAdmin')}</ToggleButton>
            <ToggleButton value="user">{t('auth.rolePlayer')}</ToggleButton>
          </ToggleButtonGroup>

          {auth.error && <Alert severity="error">{authErrorMessage}</Alert>}

          {mode === 'login' && (
            <Stack spacing={2}>
              <TextField
                label={t('auth.username')}
                name="username"
                value={credentials.username}
                onChange={onField(setCredentials)}
              />
              <TextField
                label={t('auth.password')}
                type="password"
                name="password"
                value={credentials.password}
                onChange={onField(setCredentials)}
              />
            </Stack>
          )}

          {mode === 'register' && accountType === 'admin' && (
            <Stack spacing={2}>
              <Alert severity="info">{t('auth.adminRegisterHint')}</Alert>
              <TextField
                label={t('auth.adminUsername')}
                name="username"
                value={adminRegister.username}
                onChange={onField(setAdminRegister)}
                helperText={t('auth.adminUsernameHint')}
              />
              <TextField
                label={t('auth.password')}
                type="password"
                name="password"
                value={adminRegister.password}
                onChange={onField(setAdminRegister)}
              />
              <TextField
                label={t('auth.adminPenaName')}
                name="name"
                value={adminRegister.name}
                onChange={onField(setAdminRegister)}
                helperText={t('auth.adminPenaNameHint')}
              />
            </Stack>
          )}

          {mode === 'register' && accountType === 'user' && (
            <Stack spacing={2}>
              <TextField
                label={t('auth.username')}
                name="username"
                value={userRegister.username}
                onChange={onField(setUserRegister)}
              />
              <TextField
                label={t('auth.password')}
                type="password"
                name="password"
                value={userRegister.password}
                onChange={onField(setUserRegister)}
              />
              <TextField
                label={t('auth.userName')}
                name="name"
                value={userRegister.name}
                onChange={onField(setUserRegister)}
              />
              <TextField
                label={t('auth.userSurname1')}
                name="surname1"
                value={userRegister.surname1}
                onChange={onField(setUserRegister)}
              />
              <TextField
                label={t('auth.userSurname2')}
                name="surname2"
                value={userRegister.surname2}
                onChange={onField(setUserRegister)}
              />
              <TextField
                select
                label={t('auth.userNationality')}
                name="nationality"
                value={userRegister.nationality}
                onChange={onField(setUserRegister)}
              >
                {nationalities.map((nationality) => (
                  <MenuItem key={nationality} value={nationality}>
                    {translateNationalityLabel(t, nationality)}
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
            {accountType === 'admin' ? t('auth.adminFooter') : t('auth.playerFooter')}
          </Typography>
        </Stack>
      </CardContent>
    </Card>
  )
}
