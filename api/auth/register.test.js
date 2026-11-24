// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest'

let userStatus = 'pendiente'

function fakeSql(strings, ...values) {
  const text = strings.join(' ').replace(/\s+/g, ' ').trim()
  if (text.startsWith('insert into users')) {
    return Promise.resolve([
      {
        id: 'u-1',
        email: values[0],
        display_name: values[2],
        role: 'participante',
        status: userStatus,
        created_at: '2026-01-01T00:00:00.000Z',
        approved_at: null,
      },
    ])
  }
  if (text.startsWith('insert into audit_log')) return Promise.resolve([])
  throw new Error(`Query no simulada: ${text}`)
}

vi.mock('../_lib/db.js', () => ({ getSql: () => fakeSql }))
vi.mock('../_lib/password.js', () => ({ hashPassword: async () => 'hash-falso' }))

const { default: handler } = await import('./register.js')

function makeRequest(body, { method = 'POST', headers = {} } = {}) {
  return { method, body, headers, url: '/api/auth/register', query: {}, socket: {} }
}

function makeResponse() {
  const res = {
    statusCode: 200,
    headers: {},
    payload: null,
    setHeader(name, value) {
      this.headers[name.toLowerCase()] = value
    },
    end(body) {
      this.payload = body ? JSON.parse(body) : null
    },
  }
  return res
}

describe('POST /api/auth/register', () => {
  beforeEach(() => {
    userStatus = 'pendiente'
  })

  it('creates a pending participant', async () => {
    const res = makeResponse()
    await handler(makeRequest({ name: 'Ana', email: 'Ana@Camba.BO ', password: 'camba2026' }), res)

    expect(res.statusCode).toBe(201)
    expect(res.payload.user.status).toBe('pendiente')
    expect(res.payload.user.email).toBe('ana@camba.bo')
    expect(res.payload.message).toMatch(/operador/)
    expect(res.headers['cache-control']).toBe('no-store')
  })

  it('rejects invalid input before touching the database', async () => {
    const res = makeResponse()
    await handler(makeRequest({ name: '', email: 'mal', password: 'corta' }), res)

    expect(res.statusCode).toBe(400)
    expect(res.payload.details).toHaveProperty('email')
    expect(res.payload.details).toHaveProperty('password')
    expect(res.payload.details).toHaveProperty('name')
  })

  it('answers 405 for other methods', async () => {
    const res = makeResponse()
    await handler(makeRequest({}, { method: 'GET' }), res)

    expect(res.statusCode).toBe(405)
  })
})
