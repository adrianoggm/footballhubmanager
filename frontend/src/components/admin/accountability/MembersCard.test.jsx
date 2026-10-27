/** @vitest-environment happy-dom */
import '@testing-library/jest-dom/vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import MembersCard from './MembersCard.jsx'
import { createMoneyFormatter } from './accountabilityHelpers.js'

const P = 'dashboard.admin.accountability'
const t = (key) => key

const members = [
  {
    player_guid: 'p-ana',
    player_name: 'Ana',
    debt_cents: 6000,
    contribution_cents: 0,
    note: 'Pays in cash',
  },
]
const playerOptions = [
  { guid: 'p-ana', label: 'Ana' },
  { guid: 'p-luis', label: 'Luis' },
]

const renderCard = () => {
  const onSave = vi.fn(async () => true)
  const onInvalid = vi.fn()
  render(
    <MembersCard
      t={t}
      formatter={createMoneyFormatter('EUR', 'en-GB')}
      members={members}
      playerOptions={playerOptions}
      onSave={onSave}
      onDelete={vi.fn()}
      onInvalid={onInvalid}
      saving={false}
    />
  )
  return { onSave, onInvalid }
}

const openMemberOptions = () => {
  const input = screen.getAllByLabelText(`${P}.member`)[0]
  fireEvent.mouseDown(input)
  fireEvent.keyDown(input, { key: 'ArrowDown' })
  return screen.getAllByRole('option').map((option) => option.textContent)
}

const selectMember = (label) => {
  openMemberOptions()
  fireEvent.click(screen.getByRole('option', { name: label }))
}

describe('MembersCard', () => {
  it('only offers members without an account in the add selector (MO-10)', () => {
    renderCard()
    expect(openMemberOptions()).toEqual(['Luis'])
  })

  it('shows an inline error for a negative debt instead of failing silently (MO-06)', () => {
    const { onSave, onInvalid } = renderCard()
    selectMember('Luis')
    fireEvent.change(screen.getAllByLabelText(`${P}.debt`)[0], { target: { value: '-5' } })
    fireEvent.click(screen.getByText(`${P}.addMember`))

    expect(onSave).not.toHaveBeenCalled()
    expect(onInvalid).toHaveBeenCalled()
    expect(screen.getByText(`${P}.validation.amountNegative`)).toBeInTheDocument()
  })

  it('sends the admin note when adding a member (MO-12)', () => {
    const { onSave } = renderCard()
    selectMember('Luis')
    fireEvent.change(screen.getAllByLabelText(`${P}.note`)[0], {
      target: { value: 'Joined in May' },
    })
    fireEvent.click(screen.getByText(`${P}.addMember`))

    expect(onSave).toHaveBeenCalledWith('p-luis', {
      debt_cents: 0,
      contribution_cents: 0,
      note: 'Joined in May',
    })
  })

  it('shows and edits the note of an existing member (MO-12)', () => {
    const { onSave } = renderCard()
    expect(screen.getByText('Pays in cash')).toBeInTheDocument()

    const row = screen.getByText('Ana').closest('tr')
    fireEvent.click(within(row).getByRole('checkbox'))
    const noteInput = within(row).getByDisplayValue('Pays in cash')
    fireEvent.change(noteInput, { target: { value: 'Pays by card' } })
    fireEvent.click(within(row).getByText(`${P}.save`))

    expect(onSave).toHaveBeenCalledWith('p-ana', {
      debt_cents: 6000,
      contribution_cents: 0,
      note: 'Pays by card',
    })
  })

  it('rejects a negative inline edit with a visible error (MO-06)', () => {
    const { onSave, onInvalid } = renderCard()
    const row = screen.getByText('Ana').closest('tr')
    fireEvent.click(within(row).getByRole('checkbox'))
    fireEvent.change(within(row).getByDisplayValue('60.00'), { target: { value: '-1' } })
    fireEvent.click(within(row).getByText(`${P}.save`))

    expect(onSave).not.toHaveBeenCalled()
    expect(onInvalid).toHaveBeenCalled()
    expect(within(row).getByText(`${P}.validation.amountNegative`)).toBeInTheDocument()
  })

  it('explains that debt/paid edits are manual adjustments (MO-11)', () => {
    renderCard()
    expect(screen.getByText(`${P}.membersManualHint`)).toBeInTheDocument()
  })
})
