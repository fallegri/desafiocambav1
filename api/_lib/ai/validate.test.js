// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { normalizeText, payloadKey, validateItems, validatePayload } from './validate.js'

describe('normalizeText', () => {
  it('lowercases, strips accents and punctuation', () => {
    expect(normalizeText('¿Ñuflo de Cháves, 1561?')).toBe('nuflo de chaves 1561')
  })
})

describe('validatePayload - trivia', () => {
  const valid = {
    pregunta: '¿Cuál es la capital del departamento de Santa Cruz?',
    opciones: ['Montero', 'Santa Cruz de la Sierra', 'Camiri', 'Warnes'],
    correctaIndex: 1,
  }

  it('accepts a well-formed question', () => {
    const result = validatePayload('trivia', valid)
    expect(result.ok).toBe(true)
    expect(result.value.correctaIndex).toBe(1)
  })

  it('rejects a question without four options', () => {
    const result = validatePayload('trivia', { ...valid, opciones: ['A', 'B', 'C'] })
    expect(result.ok).toBe(false)
    expect(result.reason).toMatch(/4 opciones/)
  })

  it('rejects duplicate options', () => {
    const result = validatePayload('trivia', { ...valid, opciones: ['A', 'A', 'B', 'C'] })
    expect(result.ok).toBe(false)
    expect(result.reason).toMatch(/distintas/)
  })

  it('rejects an out-of-range answer index', () => {
    const result = validatePayload('trivia', { ...valid, correctaIndex: 7 })
    expect(result.ok).toBe(false)
  })

  it('rejects a too-short question', () => {
    const result = validatePayload('trivia', { ...valid, pregunta: '¿Y?' })
    expect(result.ok).toBe(false)
  })
})

describe('validatePayload - no se dice', () => {
  it('accepts a typical pair', () => {
    const result = validatePayload('no_se_dice', {
      frase: 'No se dice estás sucio, se dice…',
      respuesta: 'estás cuchuquí',
    })
    expect(result.ok).toBe(true)
  })

  it('requires the phrase to start with "No se dice"', () => {
    const result = validatePayload('no_se_dice', { frase: 'Estás sucio', respuesta: 'cuchuquí' })
    expect(result.ok).toBe(false)
    expect(result.reason).toMatch(/No se dice/)
  })
})

describe('validatePayload - cancion', () => {
  it('accepts a real-looking song and drops unknown extra fields', () => {
    const result = validatePayload('cancion', {
      nombre: 'Mi viejo Santa Cruz',
      artista: 'Artista cruceño',
      anio: 1998,
      nota: 'Clásico del carnaval',
      id: 'malicioso',
    })
    expect(result.ok).toBe(true)
    expect(result.value.id).toBeUndefined()
    expect(result.value.anio).toBe(1998)
  })

  it('rejects an invalid year', () => {
    const result = validatePayload('cancion', { nombre: 'Tema', artista: 'Alguien', anio: 1200 })
    expect(result.ok).toBe(false)
  })
})

describe('validateItems', () => {
  const base = {
    pregunta: '¿Qué celebración tradicional cruceña se realiza en septiembre?',
    opciones: ['Carnaval', 'Día de la Tradición', 'San Roque', 'Alasitas'],
    correctaIndex: 1,
  }

  it('deduplicates against existing content and within the batch', () => {
    const result = validateItems(
      'trivia',
      [base, { ...base }, { ...base, pregunta: '¿Otra pregunta distinta sobre Santa Cruz?' }],
      [payloadKey('trivia', base)],
    )
    expect(result.accepted).toHaveLength(1)
    expect(result.rejected).toHaveLength(2)
    expect(result.rejected.every((item) => item.reason === 'Duplicado')).toBe(true)
  })

  it('keeps valid items and caps the batch at 20', () => {
    const items = Array.from({ length: 30 }, (_, index) => ({
      ...base,
      pregunta: `¿Pregunta número ${index} sobre la cultura cruceña?`,
    }))
    const result = validateItems('trivia', items, [])
    expect(result.accepted).toHaveLength(20)
  })

  it('does not crash on a non-array payload', () => {
    expect(validateItems('trivia', null, [])).toEqual({ accepted: [], rejected: [] })
  })
})
