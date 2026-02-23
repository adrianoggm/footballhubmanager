const API_BASE = import.meta.env.VITE_API_BASE_URL || ''

export class HttpClient {
  constructor(baseUrl = API_BASE) {
    this.baseUrl = baseUrl
    this.sessionToken = null
  }

  setSessionToken(token) {
    this.sessionToken = token
  }

  async request(path, options = {}) {
    const headers = {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }

    if (this.sessionToken) {
      headers.Authorization = `Bearer ${this.sessionToken}`
    }

    const response = await fetch(`${this.baseUrl}${path}`, {
      ...options,
      headers
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
      let message = response.statusText || 'Request failed'
      if (payload) {
        if (typeof payload === 'string') {
          message = payload
        } else if (payload.detail) {
          message = payload.detail
        } else if (payload.message) {
          message = payload.message
        }
      }
      const error = new Error(message)
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
      body: JSON.stringify(body)
    }
  }
}

export const httpClient = new HttpClient()
