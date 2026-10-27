/** @vitest-environment happy-dom */
import '@testing-library/jest-dom/vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'

import { I18nProvider } from '../../i18n/I18nProvider.jsx'
import { ADMIN_DASHBOARD_SITEMAP, USER_DASHBOARD_SITEMAP } from '../../navigation/sitemap.js'
import AppFooter from './AppFooter.jsx'

const renderFooter = (sections) =>
  render(
    <I18nProvider>
      <MemoryRouter>
        <AppFooter sections={sections} />
      </MemoryRouter>
    </I18nProvider>
  )

// F13: public and dashboard footers share the same legal + GitHub links; the
// dashboards only prepend their sitemap.
describe('AppFooter (F13)', () => {
  it.each([
    ['public', undefined],
    ['admin dashboard', ADMIN_DASHBOARD_SITEMAP],
    ['user dashboard', USER_DASHBOARD_SITEMAP],
  ])('renders the shared links in the %s footer', (_, sections) => {
    renderFooter(sections)

    expect(screen.getByRole('link', { name: 'GitHub' })).toHaveAttribute(
      'href',
      'https://github.com/adrianoggm/footballhubmanager'
    )
    expect(screen.getAllByRole('link', { name: /terms|términos|condiciones/i }).length).toBe(1)
  })
})
