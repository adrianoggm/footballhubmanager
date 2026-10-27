/** @vitest-environment happy-dom */
import '@testing-library/jest-dom/vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// The real useAuth hook drives the panel; only the controller (HTTP) is mocked.
const { authControllerMock } = vi.hoisted(() => ({
  authControllerMock: {
    restore: vi.fn(async () => null),
    loginAdmin: vi.fn(),
    loginUser: vi.fn(),
    registerAdmin: vi.fn(),
    registerUser: vi.fn(),
    claimPlayer: vi.fn(),
    logout: vi.fn(),
  },
}))

vi.mock('../services/authController.js', () => ({ authController: authControllerMock }))
vi.mock('../services/httpClient.js', () => ({
  httpClient: { get: vi.fn(async () => ['Spain']) },
}))

import { useAuth } from '../hooks/useAuth.js'
import { I18nProvider } from '../i18n/I18nProvider.jsx'
import AuthPanel from './AuthPanel.jsx'

function Harness() {
  const auth = useAuth()
  if (auth.status === 'restoring') {
    return null
  }
  return <AuthPanel auth={auth} />
}

function renderPanel() {
  return render(
    <I18nProvider>
      <MemoryRouter>
        <Harness />
      </MemoryRouter>
    </I18nProvider>
  )
}

const invalidCredentials = () => Object.assign(new Error('Invalid credentials'), { status: 401 })

const credentialsError = /invalid credentials|credenciales inválidas/i

const usernameInput = () => screen.findByLabelText(/^(username|usuario)$/i)
const passwordInput = () => screen.getByLabelText(/^(password|contraseña)$/i)

describe('AuthPanel', () => {
  let consoleError

  beforeEach(() => {
    vi.clearAllMocks()
    authControllerMock.restore.mockResolvedValue(null)
    consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    consoleError.mockRestore()
  })

  it('submits the login when pressing Enter in the password field (F1)', async () => {
    authControllerMock.loginAdmin.mockResolvedValue({ user_type: 'admin', user_guid: 'a1' })
    const user = userEvent.setup()
    renderPanel()

    await user.type(await usernameInput(), 'root')
    await user.type(passwordInput(), 'secret-password{Enter}')

    await waitFor(() =>
      expect(authControllerMock.loginAdmin).toHaveBeenCalledWith({
        username: 'root',
        password: 'secret-password',
      })
    )
  })

  it('submits the registration when pressing Enter (F1)', async () => {
    authControllerMock.registerAdmin.mockResolvedValue({ user_type: 'admin', user_guid: 'a1' })
    const user = userEvent.setup()
    renderPanel()

    await user.click(await screen.findByRole('tab', { name: /register|registro/i }))
    await user.type(screen.getByLabelText(/^(admin username|usuario de admin)/i), 'root')
    await user.type(screen.getByLabelText(/^(password|contraseña)$/i), 'secret-password{Enter}')

    await waitFor(() => expect(authControllerMock.registerAdmin).toHaveBeenCalled())
  })

  it('offers browser autocomplete hints on the login fields (F6)', async () => {
    renderPanel()

    expect(await usernameInput()).toHaveAttribute('autocomplete', 'username')
    expect(passwordInput()).toHaveAttribute('autocomplete', 'current-password')
  })

  it('clears the login error when switching account type or tab (F4)', async () => {
    authControllerMock.loginAdmin.mockRejectedValue(invalidCredentials())
    const user = userEvent.setup()
    renderPanel()

    await user.type(await usernameInput(), 'root')
    await user.type(passwordInput(), 'wrong-password{Enter}')
    expect(await screen.findByText(credentialsError)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /^(player|jugador)$/i }))
    expect(screen.queryByText(credentialsError)).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /^(admin)$/i }))
    await user.click(screen.getByRole('button', { name: /sign in as admin|entrar como admin/i }))
    expect(await screen.findByText(credentialsError)).toBeInTheDocument()

    fireEvent.click(screen.getByRole('tab', { name: /register|registro/i }))
    expect(screen.queryByText(credentialsError)).not.toBeInTheDocument()
  })

  it('does not log expected auth failures to the console (F12)', async () => {
    authControllerMock.loginAdmin.mockRejectedValue(invalidCredentials())
    const user = userEvent.setup()
    renderPanel()

    await user.type(await usernameInput(), 'root')
    await user.type(passwordInput(), 'wrong-password{Enter}')
    await screen.findByText(credentialsError)

    expect(consoleError).not.toHaveBeenCalledWith('Auth error', expect.anything())
  })
})
