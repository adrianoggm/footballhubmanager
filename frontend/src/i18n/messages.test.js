import { describe, expect, it } from 'vitest'
import { messages } from './messages.js'

describe('messages', () => {
  it('U-09: EN standings use the English "played" abbreviation in both dashboards', () => {
    expect(messages.en.dashboard.admin.table.played).toBe('P')
    expect(messages.en.dashboard.user.table.played).toBe('P')
    expect(messages.es.dashboard.user.table.played).toBe('PJ')
  })
})
