import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getExtraContent, loadKind, preloadContent, resetContentCache } from './contentCache'

describe('contentCache', () => {
  beforeEach(() => {
    resetContentCache()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('caches approved content per kind', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ items: [{ id: 'ai-1', pregunta: '¿Pregunta aprobada?' }] }),
      }),
    )

    await loadKind('trivia')
    expect(getExtraContent('trivia')).toEqual([{ id: 'ai-1', pregunta: '¿Pregunta aprobada?' }])
    expect(fetch).toHaveBeenCalledWith('/api/content?kind=trivia')
  })

  it('falls back to an empty list when the backend is unavailable', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')))
    await loadKind('no_se_dice')
    expect(getExtraContent('no_se_dice')).toEqual([])
  })

  it('does not request the same kind twice', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ items: [] }) }))
    await loadKind('cancion')
    await loadKind('cancion')
    expect(fetch).toHaveBeenCalledTimes(1)
  })

  it('preloads every kind exactly once', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ items: [] }) }))
    preloadContent()
    preloadContent()
    await Promise.resolve()
    expect(fetch).toHaveBeenCalledTimes(3)
  })
})

