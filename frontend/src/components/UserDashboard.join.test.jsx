/** @vitest-environment happy-dom */
import '@testing-library/jest-dom/vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// Join flow of the user dashboard against a mocked user service.
const { userServiceMock } = vi.hoisted(() => {
  const page = (items = []) => ({ items, total: items.length, total_pages: 1, page: 1 })
  return {
    userServiceMock: {
      getMyProfile: vi.fn(async () => ({
        guid: 'me',
        name: 'Ana',
        surname1: 'Ruiz',
        nationality: 'Spain',
      })),
      listMyPenas: vi.fn(async () => page([])),
      getNationalities: vi.fn(async () => ['Spain']),
      consumeJoinToken: vi.fn(async () => ({})),
      getMyMembership: vi.fn(async () => null),
      getPenaLabels: vi.fn(async () => ({ role_labels: [], position_labels: [] })),
      listSeasons: vi.fn(async () => page([])),
      getActiveSeason: vi.fn(async () => null),
      listStandings: vi.fn(async () => page([])),
      listSeasonMatches: vi.fn(async () => page([])),
    },
  }
})

vi.mock('../services/userService.js', () => ({ userService: userServiceMock }))
vi.mock('../services/authService.js', () => ({
  authService: {
    getAccountEmail: vi.fn(async () => ({ email: 'user@example.com', email_verified: true })),
  },
}))

import { I18nProvider } from '../i18n/I18nProvider.jsx'
import { ThemeModeProvider } from '../theme/ThemeModeProvider.jsx'
import ToastProvider from './common/ToastProvider.jsx'
import UserDashboard from './UserDashboard.jsx'

const renderDashboard = (onSectionChange) =>
  render(
    <I18nProvider>
      <ThemeModeProvider>
        <ToastProvider>
          <UserDashboard
            session={{ user_guid: 'me', user_type: 'player' }}
            onLogout={vi.fn()}
            routeSectionId="join"
            onSectionChange={onSectionChange}
          />
        </ToastProvider>
      </ThemeModeProvider>
    </I18nProvider>
  )

const submitCode = async (code) => {
  const input = await screen.findByLabelText(/Invite code/)
  fireEvent.change(input, { target: { value: code } })
  fireEvent.click(screen.getByRole('button', { name: 'Join' }))
}

describe('UserDashboard join flow', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.setItem('footballhubmanager.language', 'en')
  })

  it('navigates to "My penas" after joining with a valid code (PL-14)', async () => {
    const onSectionChange = vi.fn()
    renderDashboard(onSectionChange)

    await submitCode('ABC123')

    await waitFor(() => expect(onSectionChange).toHaveBeenCalledWith('membership'))
    expect(userServiceMock.consumeJoinToken).toHaveBeenCalledWith({
      token: 'ABC123',
      nickname: null,
    })
  })

  it('stays on the join page and shows a translated error for an invalid code (PL-09)', async () => {
    userServiceMock.consumeJoinToken.mockRejectedValueOnce(
      Object.assign(new Error('Invalid or expired link token'), {
        status: 400,
        payload: { detail: 'Invalid or expired link token' },
      })
    )
    const onSectionChange = vi.fn()
    renderDashboard(onSectionChange)

    await submitCode('NOPE')

    expect(await screen.findByText('This link or code is invalid or has expired.')).toBeVisible()
    expect(onSectionChange).not.toHaveBeenCalledWith('membership')
  })
})
