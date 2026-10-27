import { describe, expect, it } from 'vitest'

import {
  countLabelUsage,
  effectiveRenames,
  findRemovedLabelsInUse,
  recordRename,
  renameLabelInText,
  validateRename,
} from './labelsHelpers.js'

const players = [
  { guid: 'a', role: 'president', position: 'Delantero' },
  { guid: 'b', role: 'member', position: 'delantero' },
  { guid: 'c', role: 'member', position: 'Portero' },
]

describe('labelsHelpers (PL-03)', () => {
  it('counts players using a label case-insensitively', () => {
    expect(countLabelUsage(players, 'position', 'DELANTERO')).toBe(2)
    expect(countLabelUsage(players, 'role', 'guest')).toBe(0)
  })

  it('lists removed labels that are still in use, with the affected count', () => {
    const removed = findRemovedLabelsInUse({
      previous: ['Delantero', 'Portero', 'Defensa'],
      next: ['Portero'],
      renames: {},
      players,
      field: 'position',
    })
    // Defensa is unused: removing it needs no confirmation.
    expect(removed).toEqual([{ label: 'Delantero', count: 2 }])
  })

  it('does not report a renamed label as removed', () => {
    const removed = findRemovedLabelsInUse({
      previous: ['Delantero', 'Portero'],
      next: ['Atacante', 'Portero'],
      renames: { Delantero: 'Atacante' },
      players,
      field: 'position',
    })
    expect(removed).toEqual([])
  })

  it('renames a label inside the raw draft text', () => {
    expect(renameLabelInText('Delantero, Portero\nDefensa', 'delantero', 'Atacante')).toBe(
      'Atacante, Portero, Defensa'
    )
  })

  it('collapses chained renames and drops no-ops', () => {
    let renames = recordRename({}, 'Delantero', 'Atacante')
    renames = recordRename(renames, 'Atacante', 'Punta')
    expect(renames).toEqual({ Delantero: 'Punta' })
    expect(recordRename(renames, 'Punta', 'Delantero')).toEqual({})
  })

  it('keeps only renames whose target is still in the catalog', () => {
    expect(effectiveRenames({ Delantero: 'Punta', Portero: 'Arquero' }, ['Punta'])).toEqual({
      Delantero: 'Punta',
    })
  })

  it('rejects empty renames and clashes with another label', () => {
    expect(validateRename(['A', 'B'], 'A', ' ')).toBe('empty')
    expect(validateRename(['A', 'B'], 'A', 'b')).toBe('duplicate')
    expect(validateRename(['A', 'B'], 'A', 'a')).toBe('')
    expect(validateRename(['A', 'B'], 'A', 'C')).toBe('')
  })
})
