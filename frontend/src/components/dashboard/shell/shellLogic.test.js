import { describe, expect, it, vi } from 'vitest'
import {
  createSequenceMatcher,
  filterCommandItems,
  formatSeasonLong,
  formatSeasonRange,
  formatSeasonShort,
  initialsOf,
  isTypingTarget,
  parseShortcut,
} from './shellLogic.js'

describe('createSequenceMatcher', () => {
  const goMatches = { keys: ['g', 'p'], run: vi.fn() }
  const newMatch = { keys: ['n', 'p'], run: vi.fn() }

  it('completes a two-key sequence', () => {
    const matcher = createSequenceMatcher([goMatches, newMatch])
    expect(matcher.feed('g', 0)).toBeNull()
    expect(matcher.feed('P', 100)).toBe(goMatches)
  })

  it('drops a sequence after the timeout', () => {
    const matcher = createSequenceMatcher([goMatches], 1000)
    matcher.feed('g', 0)
    expect(matcher.feed('p', 1500)).toBeNull()
  })

  it('restarts on a new prefix and ignores unrelated keys', () => {
    const matcher = createSequenceMatcher([goMatches, newMatch])
    matcher.feed('g', 0)
    expect(matcher.feed('n', 10)).toBeNull()
    expect(matcher.feed('p', 20)).toBe(newMatch)
    expect(matcher.feed('x', 30)).toBeNull()
    expect(matcher.feed('p', 40)).toBeNull()
  })

  it('parses visible hints into keys', () => {
    expect(parseShortcut('G R')).toEqual(['g', 'r'])
  })
})

describe('isTypingTarget', () => {
  it('detects form fields and editable content', () => {
    expect(isTypingTarget({ tagName: 'INPUT' })).toBe(true)
    expect(isTypingTarget({ tagName: 'TEXTAREA' })).toBe(true)
    expect(isTypingTarget({ tagName: 'DIV', isContentEditable: true })).toBe(true)
    expect(isTypingTarget({ tagName: 'BUTTON' })).toBe(false)
    expect(isTypingTarget(null)).toBe(false)
  })
})

describe('filterCommandItems', () => {
  const items = [
    { id: 'p1', group: 'players', label: 'Fernando Ruiz', searchOnly: true },
    { id: 's1', group: 'sections', label: 'Partidos' },
    { id: 's2', group: 'sections', label: 'Clasificación' },
    { id: 'a1', group: 'actions', label: 'Nuevo partido' },
    { id: 'm1', group: 'matches', label: '19/10 · Blancos 0–2 Negros', searchOnly: true },
  ]

  it('lists actions first and hides search-only items without a query', () => {
    expect(filterCommandItems(items, '').map((item) => item.id)).toEqual(['a1', 's1', 's2'])
  })

  it('matches accent-insensitively and keeps group order', () => {
    expect(filterCommandItems(items, 'clasificacion').map((item) => item.id)).toEqual(['s2'])
    expect(filterCommandItems(items, 'part').map((item) => item.id)).toEqual(['a1', 's1'])
  })

  it('finds players and matches by any token', () => {
    expect(filterCommandItems(items, 'ruiz').map((item) => item.id)).toEqual(['p1'])
    expect(filterCommandItems(items, 'negros blancos').map((item) => item.id)).toEqual(['m1'])
  })

  it('caps each group', () => {
    const many = Array.from({ length: 10 }, (_, i) => ({
      id: `x${i}`,
      group: 'players',
      label: `Jugador ${i}`,
    }))
    expect(filterCommandItems(many, 'jugador', { limitPerGroup: 4 })).toHaveLength(4)
  })
})

describe('season labels', () => {
  const season = { start_date: '2026-09-01', end_date: '2027-06-30' }

  it('formats long and short labels', () => {
    expect(formatSeasonLong(season)).toBe('2026/27')
    expect(formatSeasonShort(season)).toBe('26/27')
    expect(formatSeasonLong({ start_date: '2026-01-10', end_date: '2026-06-01' })).toBe('2026')
    expect(formatSeasonLong(null)).toBe('')
  })

  it('formats the date range in the active language', () => {
    // Month abbreviations depend on the ICU build, so only the shape is pinned.
    expect(formatSeasonRange(season, 'es')).toMatch(/^1 sep\S* 2026 – 30 jun\S* 2027$/)
    expect(formatSeasonRange(season, 'en')).toMatch(/^1 Sep\S* 2026 – 30 Jun\S* 2027$/)
  })
})

describe('initialsOf', () => {
  it('skips a leading generic word', () => {
    expect(initialsOf('Peña El Rondo')).toBe('ER')
    expect(initialsOf('Los Veteranos del Zaidín')).toBe('LV')
    expect(initialsOf('Peña')).toBe('P')
    expect(initialsOf('')).toBe('FH')
  })
})
