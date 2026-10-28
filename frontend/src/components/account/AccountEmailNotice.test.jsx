/** @vitest-environment happy-dom */
import '@testing-library/jest-dom/vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { I18nProvider } from '../../i18n/I18nProvider.jsx'
import { EMAIL_NOTICE } from '../../services/accountEmailHelpers.js'
import AccountEmailNotice from './AccountEmailNotice.jsx'

const unverified = {
  notice: EMAIL_NOTICE.UNVERIFIED,
  email: 'player@example.com',
  saving: false,
  error: '',
  info: '',
  resendVerification: vi.fn(),
}

const renderNotice = (accountEmail = unverified, onOpenSettings = vi.fn()) =>
  render(
    <I18nProvider>
      <AccountEmailNotice
        accountEmail={accountEmail}
        onOpenSettings={onOpenSettings}
        userGuid="user-1"
      />
    </I18nProvider>
  )

describe('AccountEmailNotice (one-line notice)', () => {
  beforeEach(() => {
    window.localStorage.clear()
    window.localStorage.setItem('footballhubmanager.language', 'en')
  })

  it('shows one line with resend and change actions', () => {
    const onOpenSettings = vi.fn()
    renderNotice(unverified, onOpenSettings)

    expect(screen.getByRole('status')).toHaveTextContent('player@example.com')
    fireEvent.click(screen.getByRole('button', { name: 'Resend verification' }))
    expect(unverified.resendVerification).toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Change email' }))
    expect(onOpenSettings).toHaveBeenCalled()
  })

  it('remembers the dismissal per user until the email state changes', () => {
    const { unmount } = renderNotice()
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss' }))
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
    unmount()

    const second = renderNotice()
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
    second.unmount()

    renderNotice({ ...unverified, email: 'new@example.com' })
    expect(screen.getByRole('status')).toHaveTextContent('new@example.com')
  })

  it('offers "Add email" when the account has none', () => {
    renderNotice({ ...unverified, notice: EMAIL_NOTICE.MISSING, email: '' })
    expect(screen.getByRole('button', { name: 'Add email' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Resend verification' })).toBeNull()
  })
})
