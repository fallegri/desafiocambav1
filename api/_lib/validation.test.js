// @vitest-environment node
import { describe, expect, it } from 'vitest'
import {
  failIfInvalid,
  normalizeEmail,
  validateDisplayName,
  validateEmail,
  validatePassword,
} from './validation.js'

describe('validation', () => {
  it('normalizes emails to lowercase and trims spaces', () => {
    expect(normalizeEmail('  Jugador@Example.COM ')).toBe('jugador@example.com')
  })

  it('rejects malformed emails', () => {
    const details = {}
    validateEmail('no-es-un-email', details)
    expect(details.email).toBeTruthy()
  })

  it('accepts a valid email', () => {
    const details = {}
    const email = validateEmail('jugador@example.com', details)
    expect(details).toEqual({})
    expect(email).toBe('jugador@example.com')
  })

  it('requires a password with a letter and a digit, min 8 chars', () => {
    expect(validatePassword('corta', {})).toBe('corta')
    const noDigit = {}
    validatePassword('solamenteletras', noDigit)
    expect(noDigit.password).toMatch(/letra y un número/)

    const ok = {}
    validatePassword('camba2026', ok)
    expect(ok).toEqual({})
  })

  it('validates display names', () => {
    const details = {}
    validateDisplayName(' ', details)
    expect(details.name).toBeTruthy()

    const tooShort = {}
    validateDisplayName('A', tooShort)
    expect(tooShort.name).toBeTruthy()
  })

  it('throws a 400 with the field details when invalid', () => {
    expect(() => failIfInvalid({ email: 'mal' })).toThrowError(/Revisá los datos/)
    try {
      failIfInvalid({ email: 'mal' })
    } catch (error) {
      expect(error.status).toBe(400)
      expect(error.details).toEqual({ email: 'mal' })
    }
  })
})
