// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { signSession, verifySession } from './token.js'

beforeAll(() => {
  process.env.JWT_SECRET = 'test-secret-con-mas-de-32-caracteres-123456'
})

afterAll(() => {
  process.env.JWT_SECRET = 'test-secret-con-mas-de-32-caracteres-123456'
})

describe('session tokens', () => {
  it('round-trips the user payload', async () => {
    const token = await signSession({ userId: 'u-1', email: 'ana@camba.bo', role: 'participante' })
    const payload = await verifySession(token)

    expect(payload.sub).toBe('u-1')
    expect(payload.email).toBe('ana@camba.bo')
    expect(payload.role).toBe('participante')
    expect(payload.iss).toBe('desafio-camba')
  })

  it('rejects a tampered token', async () => {
    const token = await signSession({ userId: 'u-1', email: 'ana@camba.bo', role: 'participante' })
    const tampered = `${token.slice(0, -2)}xx`

    await expect(verifySession(tampered)).rejects.toThrow()
  })

  it('rejects tokens signed with another secret', async () => {
    const token = await signSession({ userId: 'u-1', email: 'ana@camba.bo', role: 'participante' })
    process.env.JWT_SECRET = 'otro-secreto-distinto-de-mas-de-32-chars-9876'

    await expect(verifySession(token)).rejects.toThrow()
  })
})
