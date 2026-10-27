/** @vitest-environment happy-dom */
import '@testing-library/jest-dom/vitest'
import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { I18nProvider } from '../../i18n/I18nProvider.jsx'
import { EMAIL_NOTICE } from '../../services/accountEmailHelpers.js'
import AccountEmailNotice from './AccountEmailNotice.jsx'

const accountEmail = {
  notice: EMAIL_NOTICE.UNVERIFIED,
  email: 'player@example.com',
  saving: false,
  error: '',
  info: '',
  resendVerification: vi.fn(),
}

const mockViewport = (matchesQuery) => {
  vi.stubGlobal(
    'matchMedia',
    vi.fn((query) => ({
      matches: matchesQuery(query),
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }))
  )
}

const renderNotice = () =>
  render(
    <I18nProvider>
      <AccountEmailNotice accountEmail={accountEmail} onOpenSettings={vi.fn()} />
    </I18nProvider>
  )

describe('AccountEmailNotice', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('U-10: on phones the actions stack under the full-width message', () => {
    // xs viewport: only "max-width" (down) queries match.
    mockViewport((query) => query.includes('max-width'))
    renderNotice()

    const message = screen.getByText(/player@example.com/).closest('.MuiAlert-message')
    expect(message).toContainElement(screen.getByRole('button', { name: 'Change email' }))
  })

  it('keeps the actions beside the message on wider screens', () => {
    mockViewport(() => false)
    renderNotice()

    const message = screen.getByText(/player@example.com/).closest('.MuiAlert-message')
    expect(message).not.toContainElement(screen.getByRole('button', { name: 'Change email' }))
  })
})
