// Thin wrapper around fetch for the Vercel functions. Cookies carry the
// session (httpOnly), so every request uses `credentials: 'include'`.
const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? ''

export class ApiError extends Error {
  constructor(message, status = 0, details = null) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.details = details
  }
}

async function request(path, { method = 'GET', body } = {}) {
  const options = {
    method,
    credentials: 'include',
  }
  if (body !== undefined) {
    options.headers = { 'Content-Type': 'application/json' }
    options.body = JSON.stringify(body)
  }

  let response
  try {
    response = await fetch(`${BASE_URL}${path}`, options)
  } catch {
    throw new ApiError('No se pudo conectar con el servidor', 0)
  }

  const data = await response.json().catch(() => null)
  if (!response.ok) {
    // `vite dev` sirve el front pero no las funciones de `api/`: el 404 llega
    // como HTML. Damos una pista en lugar de un "Error 404" sin contexto.
    const fallback =
      response.status === 404
        ? 'La API no está disponible en este entorno. En local usá "npx vercel dev".'
        : `Error ${response.status}`
    throw new ApiError(data?.error ?? fallback, response.status, data?.details ?? null)
  }
  return data ?? {}
}

export const api = {
  me: () => request('/api/auth/me'),
  login: ({ email, password }) => request('/api/auth/login', { method: 'POST', body: { email, password } }),
  register: ({ email, password, name }) => request('/api/auth/register', { method: 'POST', body: { email, password, name } }),
  logout: () => request('/api/auth/logout', { method: 'POST' }),

  listUsers: ({ status, search, page = 1 } = {}) => {
    const params = new URLSearchParams()
    if (status) params.set('status', status)
    if (search) params.set('search', search)
    params.set('page', String(page))
    return request(`/api/admin/users?${params.toString()}`)
  },
  updateUser: (id, payload) => request(`/api/admin/users/${id}`, { method: 'PATCH', body: payload }),

  achievements: () => request('/api/achievements'),
  recordResult: (payload) => request('/api/achievements', { method: 'POST', body: payload }),

  aiProviders: () => request('/api/admin/ai/providers'),
  aiGenerate: (payload) => request('/api/admin/ai/generate', { method: 'POST', body: payload }),
  aiContent: ({ status = 'pendiente', kind } = {}) => {
    const params = new URLSearchParams({ status })
    if (kind) params.set('kind', kind)
    return request(`/api/admin/ai/content?${params.toString()}`)
  },
  aiReview: (id, payload) => request(`/api/admin/ai/content/${id}`, { method: 'PATCH', body: payload }),
}
