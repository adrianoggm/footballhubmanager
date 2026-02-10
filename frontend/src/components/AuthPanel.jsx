import { Alert, Box, Button, Card, CardContent, MenuItem, Stack, TextField, Typography } from '@mui/material'
import { useEffect, useState } from 'react'
import { useAuth } from '../hooks/useAuth.js'
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

export default function AuthPanel() {
  const auth = useAuth()
  const [nationalities, setNationalities] = useState([])
  const [userLogin, setUserLogin] = useState({ username: '', password: '' })
  const [adminLogin, setAdminLogin] = useState({ username: '', password: '' })
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
    <Stack spacing={3}>
      {auth.error && <Alert severity="error">{auth.error.message}</Alert>}
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={3}>
        <Card sx={{ flex: 1 }}>
          <CardContent>
            <Stack spacing={2}>
              <Typography variant="h6">User login</Typography>
              <TextField label="Username" name="username" value={userLogin.username} onChange={onField(setUserLogin)} />
              <TextField label="Password" type="password" name="password" value={userLogin.password} onChange={onField(setUserLogin)} />
              <Button
                variant="contained"
                onClick={handle(() => auth.loginUser(userLogin))}
                disabled={auth.status === 'loading'}
              >
                Login
              </Button>
            </Stack>
          </CardContent>
        </Card>
        <Card sx={{ flex: 1 }}>
          <CardContent>
            <Stack spacing={2}>
              <Typography variant="h6">Admin login</Typography>
              <TextField label="Username" name="username" value={adminLogin.username} onChange={onField(setAdminLogin)} />
              <TextField label="Password" type="password" name="password" value={adminLogin.password} onChange={onField(setAdminLogin)} />
              <Button
                variant="contained"
                onClick={handle(() => auth.loginAdmin(adminLogin))}
                disabled={auth.status === 'loading'}
              >
                Login
              </Button>
            </Stack>
          </CardContent>
        </Card>
      </Stack>

      <Stack direction={{ xs: 'column', md: 'row' }} spacing={3}>
        <Card sx={{ flex: 1 }}>
          <CardContent>
            <Stack spacing={2}>
              <Typography variant="h6">User register</Typography>
              <TextField label="Username" name="username" value={userRegister.username} onChange={onField(setUserRegister)} />
              <TextField label="Password" type="password" name="password" value={userRegister.password} onChange={onField(setUserRegister)} />
              <TextField label="Name" name="name" value={userRegister.name} onChange={onField(setUserRegister)} />
              <TextField label="Surname 1" name="surname1" value={userRegister.surname1} onChange={onField(setUserRegister)} />
              <TextField label="Surname 2" name="surname2" value={userRegister.surname2} onChange={onField(setUserRegister)} />
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
              <Button
                variant="outlined"
                onClick={handle(() => auth.registerUser(userRegister))}
                disabled={auth.status === 'loading'}
              >
                Register
              </Button>
            </Stack>
          </CardContent>
        </Card>
        <Card sx={{ flex: 1 }}>
          <CardContent>
            <Stack spacing={2}>
              <Typography variant="h6">Admin register</Typography>
              <TextField label="Username" name="username" value={adminRegister.username} onChange={onField(setAdminRegister)} />
              <TextField label="Password" type="password" name="password" value={adminRegister.password} onChange={onField(setAdminRegister)} />
              <TextField label="Name" name="name" value={adminRegister.name} onChange={onField(setAdminRegister)} />
              <Button
                variant="outlined"
                onClick={handle(() => auth.registerAdmin(adminRegister))}
                disabled={auth.status === 'loading'}
              >
                Register
              </Button>
            </Stack>
          </CardContent>
        </Card>
      </Stack>

      {auth.token && (
        <Box>
          <Typography variant="body2">Token: {auth.token}</Typography>
          <Button onClick={handle(() => auth.logout())} disabled={auth.status === 'loading'}>
            Logout
          </Button>
        </Box>
      )}
    </Stack>
  )
}
