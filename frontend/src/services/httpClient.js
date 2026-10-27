const API_BASE = import.meta.env.VITE_API_BASE_URL || ''

// One FastAPI validation entry ({ loc: ['body', 'field'], msg }) -> "field: msg".
const validationEntryMessage = (entry) => {
  if (typeof entry === 'string') {
    return entry
  }
  const field = (entry?.loc || []).filter((part) => part !== 'body').join('.')
  const msg = entry?.msg || ''
  return field && msg ? `${field}: ${msg}` : msg || field
}

// Readable error message from an error payload. FastAPI 422 responses carry
// `detail` as an array of validation entries; `new Error(array)` used to print
// "[object Object]".
export const errorMessageFromPayload = (payload, fallback) => {
  if (!payload) {
    return fallback
  }
  if (typeof payload === 'string') {
    return payload
  }
  const { detail, message } = payload
  if (Array.isArray(detail)) {
    return detail.map(validationEntryMessage).filter(Boolean).join('; ') || fallback
  }
  if (detail && typeof detail === 'object') {
    return validationEntryMessage(detail) || fallback
  }
  return detail || message || fallback
}

export class HttpClient {
  constructor(baseUrl = API_BASE) {
    this.baseUrl = baseUrl
  }

  async request(path, options = {}) {
    const headers = {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    }

    // The session token lives in an HttpOnly cookie; send it automatically.
    // Same-origin in prod (ingress) and dev (vite proxy), so 'include' is safe.
    const response = await fetch(`${this.baseUrl}${path}`, {
      ...options,
      credentials: 'include',
      headers,
    })

    const contentType = response.headers.get('content-type') || ''
    const hasNoContentStatus = response.status === 204 || response.status === 205
    const rawPayload = hasNoContentStatus ? '' : await response.text()

    let payload = null
    if (rawPayload) {
      if (contentType.includes('application/json')) {
        try {
          payload = JSON.parse(rawPayload)
        } catch {
          payload = rawPayload
        }
      } else {
        payload = rawPayload
      }
    }

    if (!response.ok) {
      const error = new Error(
        errorMessageFromPayload(payload, response.statusText || 'Request failed')
      )
      error.status = response.status
      error.payload = payload
      throw error
    }

    return payload
  }

  get(path, options = {}) {
    return this.request(path, { ...options, method: 'GET' })
  }

  post(path, body, options = {}) {
    return this.request(path, this.withJsonBody({ ...options, method: 'POST' }, body))
  }

  put(path, body, options = {}) {
    return this.request(path, this.withJsonBody({ ...options, method: 'PUT' }, body))
  }

  patch(path, body, options = {}) {
    return this.request(path, this.withJsonBody({ ...options, method: 'PATCH' }, body))
  }

  delete(path, options = {}) {
    return this.request(path, { ...options, method: 'DELETE' })
  }

  withJsonBody(options, body) {
    if (typeof body === 'undefined') {
      return options
    }
    return {
      ...options,
      body: JSON.stringify(body),
    }
  }
}

export const httpClient = new HttpClient()
