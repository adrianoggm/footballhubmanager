import { describe, expect, it } from 'vitest'

import { messages, SUPPORTED_LANGUAGES } from '../../i18n/messages.js'
import { isLegalDocument, LEGAL_DOCUMENTS, legalPath } from './legalDocuments.js'

const readPath = (source, path) =>
  path.split('.').reduce((current, part) => (current ? current[part] : undefined), source)

describe('legalDocuments', () => {
  it('recognises only declared documents', () => {
    expect(isLegalDocument('privacy')).toBe(true)
    expect(isLegalDocument('contact')).toBe(true)
    expect(isLegalDocument('cookies')).toBe(false)
    expect(isLegalDocument(undefined)).toBe(false)
  })

  it('builds public legal paths', () => {
    expect(legalPath('terms')).toBe('/legal/terms')
  })

  it.each(SUPPORTED_LANGUAGES)('has every legal text translated in %s', (language) => {
    const keys = ['legal.draftNotice', 'legal.draftHint', 'legal.back']
    Object.entries(LEGAL_DOCUMENTS).forEach(([document, sectionIds]) => {
      keys.push(`legal.pages.${document}.title`, `legal.pages.${document}.intro`)
      sectionIds.forEach((sectionId) => {
        keys.push(
          `legal.pages.${document}.sections.${sectionId}.heading`,
          `legal.pages.${document}.sections.${sectionId}.body`
        )
      })
    })

    keys.forEach((key) => {
      expect(typeof readPath(messages[language], key), key).toBe('string')
    })
  })
})
