/** @vitest-environment happy-dom */
import '@testing-library/jest-dom/vitest'
import { render, screen } from '@testing-library/react'
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
      onProfileImageError={vi.fn()}
      profileDisplayName="Alvaro Garcia"
      nationalities={[]}
      t={t}
    />
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
