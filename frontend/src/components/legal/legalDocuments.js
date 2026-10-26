// Structure of the public legal/info pages. Only section ids live here; every
// title, heading and body is read from i18n under `legal.pages.<document>`.
export const LEGAL_DOCUMENTS = {
  contact: ['channel', 'response', 'dataRequests'],
  terms: ['provider', 'accounts', 'acceptableUse', 'content', 'availability', 'termination', 'law'],
  privacy: ['controller', 'data', 'purposes', 'recipients', 'retention', 'cookies', 'rights'],
  accessibility: ['commitment', 'measures', 'limitations', 'feedback'],
}

export const isLegalDocument = (name) => Object.hasOwn(LEGAL_DOCUMENTS, name)

export const legalPath = (name) => `/legal/${name}`
