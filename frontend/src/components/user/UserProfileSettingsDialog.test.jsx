/** @vitest-environment happy-dom */
import '@testing-library/jest-dom/vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { I18nProvider } from '../../i18n/I18nProvider.jsx'
import { useI18n } from '../../i18n/useI18n.js'
import { ThemeModeProvider } from '../../theme/ThemeModeProvider.jsx'
import UserProfileSettingsDialog from './UserProfileSettingsDialog.jsx'

function Dialog() {
  const { t } = useI18n()
  return (
    <UserProfileSettingsDialog
      open
      onClose={vi.fn()}
      onSave={vi.fn()}
      loading={false}
      profileForm={{ name: '', surname1: '', surname2: '', nationality: '', image_url: '' }}
      onProfileField={() => vi.fn()}
      onProfileImageChange={vi.fn()}
      formatProfileImageError={(error) => error.message}
      profileDisplayName="Alvaro Garcia"
      nationalities={[]}
      t={t}
    />
  )
}

function Harness() {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        open settings
      </button>
      <UserProfileSettingsDialog
        open={open}
        onClose={() => setOpen(false)}
        onSave={() => {}}
        loading={false}
        profileForm={{ name: '', surname1: '', surname2: '', nationality: '', image_url: '' }}
        onProfileField={() => () => {}}
        onProfileImageChange={() => {}}
        formatProfileImageError={(error) => error.message}
        profileDisplayName="Ana"
        nationalities={[]}
        t={(key) => key}
      />
    </>
  )
}

describe('UserProfileSettingsDialog', () => {
  it('U-07: labels the player image as a profile photo, not a pena shield', () => {
    render(
      <I18nProvider>
        <ThemeModeProvider>
          <Dialog />
        </ThemeModeProvider>
      </I18nProvider>
    )

    expect(screen.getByText('Profile photo')).toBeInTheDocument()
    expect(screen.queryByText('Pena shield')).not.toBeInTheDocument()
  })
})

describe('UserProfileSettingsDialog focus return (F9)', () => {
  it('returns focus to the opener only once the app is no longer aria-hidden', async () => {
    const user = userEvent.setup()
    render(
      <I18nProvider>
        <ThemeModeProvider>
          <Harness />
        </ThemeModeProvider>
      </I18nProvider>
    )
    const opener = screen.getByRole('button', { name: 'open settings' })

    // Record whether the opener sits inside an aria-hidden subtree whenever it is
    // focused: browsers block (and warn about) focus inside aria-hidden content.
    const hiddenAtFocus = []
    opener.addEventListener('focus', () =>
      hiddenAtFocus.push(Boolean(opener.closest('[aria-hidden="true"]')))
    )

    await user.click(opener)
    await screen.findByRole('dialog')
    hiddenAtFocus.length = 0

    await user.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())

    await waitFor(() => expect(opener).toHaveFocus())
    expect(hiddenAtFocus).not.toContain(true)
  })
})
