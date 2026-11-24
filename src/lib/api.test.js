import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiError, api } from './api'

function mockFetch(response) {
  const fetchMock = vi.fn().mockResolvedValue(response)
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

describe('api client', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('sends cookies and parses the JSON response', async () => {
    const fetchMock = mockFetch({
      ok: true,
      status: 200,
      json: async () => ({ user: { id: 'u1' } }),
    })

    await expect(api.me()).resolves.toEqual({ user: { id: 'u1' } })
    const [url, options] = fetchMock.mock.calls[0]
    expect(url).toBe('/api/auth/me')
    expect(options.credentials).toBe('include')
  })

  it('posts a JSON body', async () => {
    const fetchMock = mockFetch({ ok: true, status: 200, json: async () => ({ ok: true }) })

    await api.login({ email: 'a@b.test', password: 'secreto123' })

    const [, options] = fetchMock.mock.calls[0]
    expect(options.method).toBe('POST')
    expect(options.headers['Content-Type']).toBe('application/json')
    expect(JSON.parse(options.body)).toEqual({ email: 'a@b.test', password: 'secreto123' })
  })

  it('surfaces the error message returned by the API', async () => {
    mockFetch({ ok: false, status: 409, json: async () => ({ error: 'Ese email ya está registrado' }) })

    await expect(api.register({ email: 'a@b.test', password: 'secreto123', name: 'A' })).rejects.toMatchObject({
      name: 'ApiError',
      message: 'Ese email ya está registrado',
      status: 409,
    })
  })

  it('explains a non-JSON 404 (front served without the API)', async () => {
    mockFetch({ ok: false, status: 404, json: async () => { throw new SyntaxError('Unexpected token <') } })

    const error = await api.login({ email: 'a@b.test', password: 'x' }).catch((caught) => caught)
    expect(error).toBeInstanceOf(ApiError)
    expect(error.message).toMatch(/API no está disponible/)
    expect(error.status).toBe(404)
  })

  it('reports a connection failure', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))

    await expect(api.achievements()).rejects.toMatchObject({
      message: 'No se pudo conectar con el servidor',
      status: 0,
    })
  })
})
