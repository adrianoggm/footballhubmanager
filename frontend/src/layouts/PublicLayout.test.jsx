/** @vitest-environment happy-dom */
import '@testing-library/jest-dom/vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'

import { I18nProvider } from '../i18n/I18nProvider.jsx'
import { messages, SUPPORTED_LANGUAGES } from '../i18n/messages.js'
import { ThemeModeProvider } from '../theme/ThemeModeProvider.jsx'
import PublicLayout from './PublicLayout.jsx'

describe('PublicLayout header tagline (F11)', () => {
  it('shows the product tagline under the logo instead of placeholder copy', () => {
    render(
      <I18nProvider>
        <ThemeModeProvider>
          <MemoryRouter>
            <PublicLayout />
          </MemoryRouter>
        </ThemeModeProvider>
      </I18nProvider>
    )

    const taglines = SUPPORTED_LANGUAGES.map((lang) => messages[lang].app.tagline)
    expect(screen.getByText((text) => taglines.includes(text))).toBeInTheDocument()
    expect(screen.queryByText(/capabilities for admins|capacidades para admins/i)).toBeNull()
  })

  it('has a short tagline in every language', () => {
    for (const lang of SUPPORTED_LANGUAGES) {
      const tagline = messages[lang].app.tagline
      expect(typeof tagline).toBe('string')
      expect(tagline.length).toBeGreaterThan(0)
      expect(tagline.length).toBeLessThanOrEqual(80)
    }
  })
})
