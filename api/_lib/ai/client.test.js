// @vitest-environment node
import { describe, expect, it, vi } from 'vitest'
import { chatJson, extractJson } from './client.js'

describe('extractJson', () => {
  it('parses a plain JSON object', () => {
    expect(extractJson('{"items":[1,2]}')).toEqual({ items: [1, 2] })
  })

  it('ignores markdown fences and surrounding prose', () => {
    const text = 'Claro, acá está:\n```json\n{"items": [{"pregunta": "¿Sí?"}]}\n```\nEspero que sirva.'
    expect(extractJson(text)).toEqual({ items: [{ pregunta: '¿Sí?' }] })
  })

  it('handles braces inside strings', () => {
    expect(extractJson('{"texto":"un {brazo} y un }cierre{"}')).toEqual({ texto: 'un {brazo} y un }cierre{' })
  })

  it('returns null for invalid or missing JSON', () => {
    expect(extractJson('sin json acá')).toBeNull()
    expect(extractJson('{"roto": ')).toBeNull()
    expect(extractJson(null)).toBeNull()
  })
})

const openai = {
  id: 'openai',
  label: 'OpenAI',
  kind: 'openai',
  baseUrl: 'https://api.openai.com/v1',
  apiKey: 'sk-test',
  model: 'gpt-4o-mini',
}

const anthropic = {
  id: 'anthropic',
  label: 'Anthropic',
  kind: 'anthropic',
  baseUrl: 'https://api.anthropic.com/v1',
  apiKey: 'ak-test',
  model: 'claude-3-5-haiku-latest',
}

describe('chatJson', () => {
  it('calls the OpenAI-compatible endpoint and parses the content', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ choices: [{ message: { content: '{"items":[{"ok":true}]}' } }] }),
    })

    const result = await chatJson(openai, { system: 'sys', user: 'user' }, { fetchImpl })
    expect(result.json).toEqual({ items: [{ ok: true }] })

    const [url, options] = fetchImpl.mock.calls[0]
    expect(url).toBe('https://api.openai.com/v1/chat/completions')
    expect(options.headers.Authorization).toBe('Bearer sk-test')
    expect(JSON.parse(options.body).model).toBe('gpt-4o-mini')
  })

  it('dedicates an adapter to Anthropic messages', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ content: [{ type: 'text', text: '{"items":[]}' }] }),
    })

    const result = await chatJson(anthropic, { system: 'sys', user: 'hola' }, { fetchImpl })
    expect(result.json).toEqual({ items: [] })

    const [url, options] = fetchImpl.mock.calls[0]
    expect(url).toBe('https://api.anthropic.com/v1/messages')
    expect(options.headers['x-api-key']).toBe('ak-test')
    expect(JSON.parse(options.body).system).toBe('sys')
  })

  it('retries once on a 500 and succeeds', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 500, text: async () => 'boom' })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ choices: [{ message: { content: '{"items":[]}' } }] }),
      })

    const result = await chatJson(openai, { system: 's', user: 'u' }, { fetchImpl })
    expect(result.json).toEqual({ items: [] })
    expect(fetchImpl).toHaveBeenCalledTimes(2)
  })

  it('does not retry auth failures and hides provider details', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      text: async () => 'invalid api key sk-test',
    })

    await expect(chatJson(openai, { system: 's', user: 'u' }, { fetchImpl })).rejects.toThrow(
      /OpenAI devolvió un error \(401\)/,
    )
    expect(fetchImpl).toHaveBeenCalledTimes(1)
  })

  it('fails clearly when the model returns prose instead of JSON', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ choices: [{ message: { content: 'No puedo ayudarte con eso.' } }] }),
    })

    await expect(chatJson(openai, { system: 's', user: 'u' }, { fetchImpl })).rejects.toThrow(/JSON válido/)
  })
})
