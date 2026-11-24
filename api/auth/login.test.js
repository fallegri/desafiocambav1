// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest'

let passwordOk = true
let currentUser = null

function fakeSql(strings) {
  const text = strings.join(' ').replace(/\s+/g, ' ').trim()
  if (text.startsWith('select') && text.includes('from users')) {
    return Promise.resolve(currentUser ? [{ ...currentUser }] : [])
  }
  if (text.startsWith('insert into audit_log')) return Promise.resolve([])
  throw new Error(`Query no simulada: ${text}`)
}

vi.mock('../_lib/db.js', () => ({ getSql: () => fakeSql }))
vi.mock('../_lib/password.js', () => ({
  verifyPassword: async () => passwordOk,
  burnPasswordTime: async () => {},
}))

process.env.JWT_SECRET = 'test-secret-con-mas-de-32-caracteres-123456'
const { default: handler } = await import('./login.js')

function makeRequest(body) {
  return { method: 'POST', body, headers: {}, url: '/api/auth/login', query: {}, socket: {} }
}

function makeResponse() {
  return {
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
}

const baseUser = {
  id: 'u-1',
  email: 'ana@camba.bo',
  display_name: 'Ana',
  password_hash: 'hash',
  role: 'participante',
  status: 'activo',
  created_at: '2026-01-01T00:00:00.000Z',
  approved_at: null,
}

describe('POST /api/auth/login', () => {
  beforeEach(() => {
    passwordOk = true
    currentUser = { ...baseUser }
  })

  it('logs in an active user and sets an httpOnly session cookie', async () => {
    const res = makeResponse()
    await handler(makeRequest({ email: 'ANA@camba.bo', password: 'camba2026' }), res)

    expect(res.statusCode).toBe(200)
    expect(res.payload.user.name).toBe('Ana')
    expect(res.headers['set-cookie']).toMatch(/dc_session=/)
    expect(res.headers['set-cookie']).toMatch(/HttpOnly/)
    expect(res.headers['set-cookie']).toMatch(/SameSite=Lax/)
  })

  it('rejects a pending user with an explanatory message', async () => {
    currentUser.status = 'pendiente'
    const res = makeResponse()
    await handler(makeRequest({ email: 'ana@camba.bo', password: 'camba2026' }), res)

    expect(res.statusCode).toBe(403)
    expect(res.payload.error).toMatch(/pendiente de aprobación/)
    expect(res.payload.details.status).toBe('pendiente')
  })

  it('uses the same generic message for unknown emails and wrong passwords', async () => {
    const unknown = makeResponse()
    currentUser = null
    await handler(makeRequest({ email: 'nadie@camba.bo', password: 'camba2026' }), unknown)
    expect(unknown.statusCode).toBe(401)
    expect(unknown.payload.error).toBe('Email o contraseña incorrectos')

    currentUser = { ...baseUser }
    passwordOk = false
    const wrong = makeResponse()
    await handler(makeRequest({ email: 'ana@camba.bo', password: 'mala' }), wrong)
    expect(wrong.statusCode).toBe(401)
    expect(wrong.payload.error).toBe('Email o contraseña incorrectos')
  })

  it('requires both fields', async () => {
    const res = makeResponse()
    await handler(makeRequest({ email: '', password: '' }), res)
    expect(res.statusCode).toBe(400)
  })
})
