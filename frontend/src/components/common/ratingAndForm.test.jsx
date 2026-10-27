/** @vitest-environment happy-dom */
import '@testing-library/jest-dom/vitest'
import { render, screen } from '@testing-library/react'
import { ThemeProvider } from '@mui/material/styles'
import { beforeEach, describe, expect, it } from 'vitest'
import { I18nProvider } from '../../i18n/I18nProvider.jsx'
import { createAppTheme } from '../../theme.js'
import FormDots from './FormDots.jsx'
import RatingBadge from './RatingBadge.jsx'
import SegmentedControl from './SegmentedControl.jsx'

const renderThemed = (node, language = 'es') => {
  window.localStorage.setItem('footballhubmanager.language', language)
  return render(
    <I18nProvider>
      <ThemeProvider theme={createAppTheme('ember-dark')}>{node}</ThemeProvider>
    </I18nProvider>
  )
}

describe('RatingBadge', () => {
  beforeEach(() => window.localStorage.clear())

  it('shows the rating with a decimal comma and its bucket', () => {
    renderThemed(<RatingBadge value={7.6} />)
    const badge = screen.getByText('7,6')
    expect(badge).toHaveAttribute('data-rating-bucket', 'good')
  })

  it('renders a neutral dash without a rating', () => {
    renderThemed(<RatingBadge value={null} />)
    expect(screen.getByText('–')).toHaveAttribute('data-rating-bucket', 'none')
  })
})

describe('FormDots', () => {
  it('uses V/E/D letters in Spanish with an accessible summary', () => {
    renderThemed(<FormDots results={['win', 'draw', 'loss']} />)
    expect(screen.getByRole('img', { name: 'Victoria, Empate, Derrota' })).toBeInTheDocument()
  })

  it('uses W/D/L letters in English', () => {
    renderThemed(<FormDots results={['W', 'E', 'L']} />, 'en')
    expect(screen.getByRole('img', { name: 'Win, Draw, Loss' }).textContent).toBe('WDL')
  })
})

describe('SegmentedControl', () => {
  it('exposes radio semantics with the selected option checked', () => {
    renderThemed(
      <SegmentedControl
        ariaLabel="Scope"
        value="all"
        onChange={() => {}}
        options={[
          { value: 'season', label: 'Season' },
          { value: 'all', label: 'All' },
        ]}
      />
    )
    expect(screen.getByRole('radio', { name: 'All' })).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByRole('radio', { name: 'Season' })).toHaveAttribute('aria-checked', 'false')
  })
})
