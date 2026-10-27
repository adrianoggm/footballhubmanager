/** @vitest-environment happy-dom */
import '@testing-library/jest-dom/vitest'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { messages } from '../../i18n/messages.js'
import { ThemeModeProvider } from '../../theme/ThemeModeProvider.jsx'
import UserStandingsSection from './UserStandingsSection.jsx'

const t = (key, params = {}) => {
  const value = key.split('.').reduce((node, part) => node?.[part], messages.es)
  if (typeof value !== 'string') return key
  return value.replace(/\{(\w+)\}/g, (_, name) => String(params[name] ?? `{${name}}`))
}

const standing = {
  player_guid: 'me',
  rank: 2,
  name: 'Ana',
  surname1: 'Ruiz',
  role: 'member',
  position: 'defender',
  points: 6,
  played: 3,
  wins: 2,
  draws: 0,
  losses: 1,
}

describe('UserStandingsSection (PL-10)', () => {
  it('translates the position in the "your position" chip', () => {
    render(
      <ThemeModeProvider>
        <UserStandingsSection
          anchorId="standings"
          seasonDataLoading={false}
          standings={[standing]}
          currentStanding={standing}
          currentPlayerGuid="me"
          t={t}
        />
      </ThemeModeProvider>
    )

    expect(screen.getByText('Tu posición: Defensa')).toBeInTheDocument()
    expect(screen.queryByText('Tu posición: defender')).not.toBeInTheDocument()
  })
})
