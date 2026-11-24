// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { chatJson } from './client.js'
import { generateContent, reviewContent } from './content.js'

vi.mock('./client.js', () => ({ chatJson: vi.fn() }))

const actor = { id: '00000000-0000-0000-0000-000000000001', role: 'superadmin' }
const provider = { id: 'openai', label: 'OpenAI', kind: 'openai', baseUrl: 'https://x', apiKey: 'k', model: 'gpt-4o-mini' }

function makeSql({ existing = [], quota = 0, updateRow = null } = {}) {
  const inserts = []
  function sql(strings, ...values) {
    const text = strings.join(' ').replace(/\s+/g, ' ').trim()
    if (text.startsWith('select payload') && text.includes('from ai_content')) {
      return Promise.resolve(existing)
    }
    if (text.startsWith('select count(*)') && text.includes('where created_by')) {
      return Promise.resolve([{ total: quota }])
    }
    if (text.startsWith('insert into ai_content')) {
      const row = {
        id: `c-${inserts.length + 1}`,
        kind: values[0],
        payload: JSON.parse(values[1]),
        provider: values[2],
        model: values[3],
        status: 'pendiente',
        batch_id: values[4],
        topic: values[5],
        created_at: '2026-01-01T00:00:00.000Z',
      }
      inserts.push(row)
      return Promise.resolve([row])
    }
    if (text.startsWith('select id, kind, payload') && text.includes('from ai_content')) {
      return Promise.resolve([updateRow])
    }
    if (text.startsWith('update ai_content')) {
      return Promise.resolve([
        { ...updateRow, payload: JSON.parse(values[0]), status: values[1], reviewed_at: '2026-01-02T00:00:00.000Z' },
      ])
    }
    throw new Error(`Query no simulada: ${text}`)
  }
  return { sql, inserts }
}

const pregunta = {
  pregunta: '¿Qué río cruza la ciudad de Santa Cruz de la Sierra?',
  opciones: ['Piraí', 'Pilcomayo', 'Desaguadero', 'Choqueyapu'],
  correctaIndex: 0,
}

describe('generateContent', () => {
  beforeEach(() => {
    vi.mocked(chatJson).mockReset()
  })

  it('stores valid proposals and reports rejected ones', async () => {
    vi.mocked(chatJson).mockResolvedValue({
      json: {
        items: [
          pregunta,
          { ...pregunta, opciones: ['A', 'B', 'C'] },
          { ...pregunta, pregunta: '¿Cuál es el parque nacional con formaciones rocosas en Santa Cruz?' },
        ],
      },
    })
    const { sql, inserts } = makeSql()

    const result = await generateContent(sql, {
      actor,
      provider,
      kind: 'trivia',
      topic: 'ríos',
      count: 3,
    })

    expect(result.created).toHaveLength(2)
    expect(inserts).toHaveLength(2)
    expect(result.rejected).toHaveLength(1)
    expect(result.batchId).toMatch(/^[0-9a-f-]{36}$/)
    expect(result.provider).toEqual({ id: 'openai', label: 'OpenAI', model: 'gpt-4o-mini' })
  })

  it('rejects duplicates of the bundled bank', async () => {
    vi.mocked(chatJson).mockResolvedValue({
      json: {
        items: [
          {
            pregunta: '¿En qué año fue fundada Santa Cruz de la Sierra por Ñuflo de Chaves?',
            opciones: ['1559', '1561', '1564', '1523'],
            correctaIndex: 1,
          },
        ],
      },
    })
    const { sql } = makeSql()

    const result = await generateContent(sql, { actor, provider, kind: 'trivia', count: 1 })
    expect(result.created).toHaveLength(0)
    expect(result.rejected[0].reason).toBe('Duplicado')
  })

  it('enforces the daily quota', async () => {
    const { sql } = makeSql({ quota: 200 })
    await expect(generateContent(sql, { actor, provider, kind: 'trivia', count: 1 })).rejects.toThrow(
      /límite diario/,
    )
  })

  it('rejects a broken model response', async () => {
    vi.mocked(chatJson).mockResolvedValue({ json: { items: [] } })
    const { sql } = makeSql()
    await expect(generateContent(sql, { actor, provider, kind: 'trivia', count: 1 })).rejects.toThrow(
      /no devolvió ítems/,
    )
  })
})

describe('reviewContent', () => {
  it('approves a valid item', async () => {
    const { sql } = makeSql({
      updateRow: { id: 'c-1', kind: 'trivia', payload: pregunta, status: 'pendiente' },
    })
    const updated = await reviewContent(sql, { actor, id: 'c-1', action: 'approve' })
    expect(updated.status).toBe('aprobado')
  })

  it('refuses to approve an invalid edited payload', async () => {
    const { sql } = makeSql({
      updateRow: { id: 'c-1', kind: 'trivia', payload: pregunta, status: 'pendiente' },
    })
    await expect(
      reviewContent(sql, {
        actor,
        id: 'c-1',
        action: 'approve',
        payload: { ...pregunta, opciones: ['solo', 'dos'] },
      }),
    ).rejects.toThrow(/Contenido inválido/)
  })

  it('rejects an unknown action', async () => {
    const { sql } = makeSql({ updateRow: { id: 'c-1', kind: 'trivia', payload: pregunta } })
    await expect(reviewContent(sql, { actor, id: 'c-1', action: 'delete' })).rejects.toThrow(/Acción inválida/)
  })
})
