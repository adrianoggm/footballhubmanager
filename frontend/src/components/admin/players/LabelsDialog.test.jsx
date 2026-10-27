/** @vitest-environment happy-dom */
import '@testing-library/jest-dom/vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { I18nProvider } from '../../../i18n/I18nProvider.jsx'
import { messages } from '../../../i18n/messages.js'
import { ThemeModeProvider } from '../../../theme/ThemeModeProvider.jsx'
import LabelsDialog from './LabelsDialog.jsx'

const t = (key, params = {}) => {
  const value = key.split('.').reduce((node, part) => node?.[part], messages.en)
  if (typeof value !== 'string') return key
  return value.replace(/\{(\w+)\}/g, (_, name) => String(params[name] ?? `{${name}}`))
}

const players = [
  { guid: 'a', role: 'member', position: 'Delantero' },
  { guid: 'b', role: 'member', position: 'Delantero' },
  { guid: 'c', role: 'member', position: 'Portero' },
]

const previousLabels = {
  role_labels: ['member'],
  position_labels: ['Delantero', 'Portero'],
}

const renderDialog = ({ positions, renames = {}, onRenameLabel = vi.fn() }) => {
  const onSave = vi.fn()
  render(
    <I18nProvider>
      <ThemeModeProvider>
        <LabelsDialog
          open
          onClose={vi.fn()}
          labelsDraft={{
            role_labels: 'member',
            position_labels: positions.join(', '),
            role_renames: {},
            position_renames: renames,
          }}
          draftRoleLabels={['member']}
          draftPositionLabels={positions}
          draftRoleColors={{ member: '#15803D' }}
          draftPositionColors={Object.fromEntries(positions.map((p) => [p, '#DC2626']))}
          onLabelsDraftField={() => vi.fn()}
          onLabelColorDraftChange={() => vi.fn()}
          onRenameLabel={onRenameLabel}
          previousLabels={previousLabels}
          players={players}
          onSave={onSave}
          t={t}
        />
      </ThemeModeProvider>
    </I18nProvider>
  )
  return { onSave, onRenameLabel }
}

describe('LabelsDialog (PL-03)', () => {
  beforeEach(() => {
    localStorage.setItem('footballhubmanager.language', 'en')
  })

  it('asks for confirmation, with the affected player count, before removing a label in use', () => {
    const { onSave } = renderDialog({ positions: ['Portero'] })

    fireEvent.click(screen.getByRole('button', { name: 'Save labels' }))

    expect(onSave).not.toHaveBeenCalled()
    expect(screen.getByText('Remove labels in use?')).toBeVisible()
    expect(screen.getByText('Delantero: 2 players')).toBeVisible()

    fireEvent.click(screen.getByRole('button', { name: 'Remove and save' }))
    expect(onSave).toHaveBeenCalledTimes(1)
  })

  it('saves directly when no label in use is removed', () => {
    const { onSave } = renderDialog({ positions: ['Delantero', 'Portero', 'Defensa'] })
    fireEvent.click(screen.getByRole('button', { name: 'Save labels' }))
    expect(onSave).toHaveBeenCalledTimes(1)
  })

  it('does not treat a rename as a removal', () => {
    const { onSave } = renderDialog({
      positions: ['Atacante', 'Portero'],
      renames: { Delantero: 'Atacante' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Save labels' }))
    expect(onSave).toHaveBeenCalledTimes(1)
  })

  it('renames a label in place', () => {
    const { onRenameLabel } = renderDialog({ positions: ['Delantero', 'Portero'] })

    expect(screen.getAllByText('2 players')[0]).toBeVisible()
    fireEvent.click(screen.getByRole('button', { name: 'Rename Delantero' }))
    const input = screen.getByRole('textbox', { name: 'New name for Delantero' })
    fireEvent.change(input, { target: { value: 'Atacante' } })
    fireEvent.click(screen.getByRole('button', { name: 'Apply' }))

    expect(onRenameLabel).toHaveBeenCalledWith('position', 'Delantero', 'Atacante')
  })
})
