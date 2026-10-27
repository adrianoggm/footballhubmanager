/** @vitest-environment happy-dom */
import '@testing-library/jest-dom/vitest'
import { render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { I18nProvider } from '../../i18n/I18nProvider.jsx'
import { useI18n } from '../../i18n/useI18n.js'
import { ThemeModeProvider } from '../../theme/ThemeModeProvider.jsx'
import MatchDetailDialog from './MatchDetailDialog.jsx'

const player = (guid, name, goals = 0) => ({
  player_guid: guid,
  name,
  surname1: '',
  goals,
  assists: 0,
  saves: 0,
})

const closedMatch = {
  guid: 'm1',
  match_date: '2026-07-01',
  status: 'closed',
  tracking_status: 'not_started',
  elapsed_seconds: 0,
  events: [],
  home_team: { team_name: 'Home', score: 2, players: [player('p1', 'Lucas', 2)] },
  away_team: { team_name: 'Away', score: 2, players: [player('p2', 'Mario', 2)] },
}

function Dialog({ detail }) {
  const { t } = useI18n()
  return (
    <MatchDetailDialog
      open
      onClose={vi.fn()}
      loading={false}
      detail={detail}
      t={t}
      formatDate={(value) => value}
    />
  )
}

function renderDialog(detail = closedMatch) {
  render(
    <I18nProvider>
      <ThemeModeProvider>
        <Dialog detail={detail} />
      </ThemeModeProvider>
    </I18nProvider>
  )
  return screen.getByRole('dialog')
}

describe('MatchDetailDialog', () => {
  it('U-14: highlights list every player tied for the top value', () => {
    const dialog = renderDialog()
    expect(within(dialog).getByText('Top scorer: Lucas, Mario (2)')).toBeInTheDocument()
  })

  it('U-15: shows the title once', () => {
    const dialog = renderDialog()
    expect(within(dialog).getAllByText('Match detail')).toHaveLength(1)
  })

  it('U-15: a closed match is not shown as "Not started" with a 00:00 clock', () => {
    const dialog = renderDialog()
    expect(within(dialog).queryByText('Not started')).not.toBeInTheDocument()
    expect(within(dialog).queryByText(/00:00/)).not.toBeInTheDocument()
    expect(within(dialog).getByText('Finished')).toBeInTheDocument()
  })
})
