/** @vitest-environment happy-dom */
import '@testing-library/jest-dom/vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Link, MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it } from 'vitest'

import { I18nProvider } from '../i18n/I18nProvider.jsx'
import LegalPage from './LegalPage.jsx'

function renderAt(initialEntries) {
  return render(
    <I18nProvider>
      <MemoryRouter initialEntries={initialEntries}>
        <Routes>
          <Route path="/" element={<p>root page</p>} />
          <Route
            path="/somewhere"
            element={
              <>
                <p>previous page</p>
                <Link to="/legal/terms">terms</Link>
              </>
            }
          />
          <Route path="/legal/:section" element={<LegalPage />} />
        </Routes>
      </MemoryRouter>
    </I18nProvider>
  )
}

const backButton = () => screen.getByRole('button', { name: /^(go back|volver)$/i })

describe('LegalPage back button (F3)', () => {
  it('goes to the app root when the page was opened directly (no in-app history)', async () => {
    const user = userEvent.setup()
    renderAt(['/legal/terms'])

    await user.click(backButton())

    expect(await screen.findByText('root page')).toBeInTheDocument()
  })

  it('goes back to the previous in-app page when there is one', async () => {
    const user = userEvent.setup()
    renderAt(['/somewhere'])

    await user.click(screen.getByRole('link', { name: 'terms' }))
    await user.click(backButton())

    expect(await screen.findByText('previous page')).toBeInTheDocument()
  })
})
