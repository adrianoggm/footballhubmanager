import { describe, expect, it } from 'vitest'

import { messages } from './messages.js'
import { translatePlural } from './plural.js'

const makeT =
  (language) =>
  (key, params = {}) => {
    const value = key.split('.').reduce((node, part) => node?.[part], messages[language])
    if (typeof value !== 'string') {
      return key
    }
    return value.replace(/\{(\w+)\}/g, (_, name) => String(params[name]))
  }

const KEY = 'dashboard.admin.notices.playersAdded'

describe('translatePlural (PL-19)', () => {
  it('agrees the Spanish participle with the number of players', () => {
    const t = makeT('es')
    expect(translatePlural(t, 'es', KEY, 4)).toBe('4 jugadores añadidos a la temporada')
    expect(translatePlural(t, 'es', KEY, 1)).toBe('1 jugador añadido a la temporada')
  })

  it('pluralizes in English', () => {
    const t = makeT('en')
    expect(translatePlural(t, 'en', KEY, 4)).toBe('4 players added to the season')
    expect(translatePlural(t, 'en', KEY, 1)).toBe('1 player added to the season')
  })

  it('falls back to the other form when a category is missing', () => {
    const t = makeT('es')
    // Spanish has no `two` category; zero uses `other`.
    expect(translatePlural(t, 'es', KEY, 0)).toBe('0 jugadores añadidos a la temporada')
  })
})
