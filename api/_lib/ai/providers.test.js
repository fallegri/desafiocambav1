// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { listAvailableProviders, resolveProvider } from './providers.js'

describe('listAvailableProviders', () => {
  it('returns nothing when no key or base URL is configured', () => {
    expect(listAvailableProviders({})).toEqual([])
  })

  it('only exposes providers whose credentials exist', () => {
    const providers = listAvailableProviders({ OPENAI_API_KEY: 'sk-test', NVIDIA_API_KEY: 'nv-test' })
    expect(providers.map((provider) => provider.id)).toEqual(['openai', 'nvidia'])
  })

  it('never serialises the API keys', () => {
    const providers = listAvailableProviders({ OPENAI_API_KEY: 'sk-super-secreta' })
    expect(JSON.stringify(providers)).not.toContain('sk-super-secreta')
  })

  it('enables the local provider only when a base URL is set', () => {
    expect(listAvailableProviders({ LOCAL_AI_BASE_URL: 'http://127.0.0.1:11434/v1' }).map((p) => p.id)).toContain(
      'local',
    )
    expect(listAvailableProviders({}).map((p) => p.id)).not.toContain('local')
  })
})

describe('resolveProvider', () => {
  it('resolves an OpenAI provider with its default model', () => {
    const provider = resolveProvider('openai', null, { OPENAI_API_KEY: 'sk-test' })
    expect(provider.baseUrl).toBe('https://api.openai.com/v1')
    expect(provider.model).toBe('gpt-4o-mini')
    expect(provider.apiKey).toBe('sk-test')
  })

  it('honours a model override', () => {
    const provider = resolveProvider('openai', 'gpt-4o', { OPENAI_API_KEY: 'sk-test' })
    expect(provider.model).toBe('gpt-4o')
  })

  it('rejects unknown or unconfigured providers', () => {
    expect(() => resolveProvider('nope', null, {})).toThrow(/desconocido/)
    expect(() => resolveProvider('anthropic', null, {})).toThrow(/no está configurado/)
  })

  it('uses the local base URL and model env vars', () => {
    const provider = resolveProvider('local', null, {
      LOCAL_AI_BASE_URL: 'http://127.0.0.1:1234/v1',
      LOCAL_AI_MODEL: 'qwen2.5',
    })
    expect(provider.baseUrl).toBe('http://127.0.0.1:1234/v1')
    expect(provider.model).toBe('qwen2.5')
    expect(provider.apiKey).toBeNull()
  })

  it('strips trailing slashes from the base URL', () => {
    const provider = resolveProvider('local', null, { LOCAL_AI_BASE_URL: 'http://localhost:11434/v1///' })
    expect(provider.baseUrl).toBe('http://localhost:11434/v1')
  })
})
