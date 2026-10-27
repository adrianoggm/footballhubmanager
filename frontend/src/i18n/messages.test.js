import { describe, expect, it } from 'vitest'

import { createTestT } from './testUtils.js'

describe.each(['en', 'es'])('match messages (%s)', (language) => {
  const t = createTestT(language)

  // MT-07: the "final score" chip received a score that the copy never showed.
  it('interpolates the score into the final score chip', () => {
    expect(t('dashboard.admin.matches.finalScore', { score: '1 - 2' })).toContain('1 - 2')
  })

  // MT-11: the creation notice named the match by its internal GUID.
  it('describes a created match by teams and date, never by GUID', () => {
    const text = t('dashboard.admin.matches.matchCreated', {
      home: 'Reds',
      away: 'Blues',
      date: '27/10/2026',
      guid: '90d9408b-guid',
    })
    expect(text).toContain('Reds')
    expect(text).toContain('Blues')
    expect(text).toContain('27/10/2026')
    expect(text).not.toContain('90d9408b-guid')
  })
})

// MT-14: "G" read as goals; wins use the same letter as the standings header.
describe.each(['en', 'es'])('overview ranking line (%s)', (language) => {
  const t = createTestT(language)

  it('abbreviates wins and played like the standings table', () => {
    const line = t('dashboard.admin.overview.rankingLineItem', {
      played: 2,
      wins: 1,
      draws: 1,
      points: 4,
    })
    expect(line).toContain(`1${t('dashboard.admin.table.w')} `)
    expect(line).toContain(`2${t('dashboard.admin.table.played')} `)
  })
})
