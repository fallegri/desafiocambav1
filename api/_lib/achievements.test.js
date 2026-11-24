// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { ACHIEVEMENTS, recordResult, validateResult } from './achievements.js'

describe('validateResult', () => {
  it('accepts a coherent result', () => {
    const result = validateResult({ categoryId: 'trivia', score: 3, maxScore: 5 })
    expect(result).toEqual({ categoryId: 'trivia', score: 3, maxScore: 5, detail: {} })
  })

  it('rejects an invalid category', () => {
    expect(() => validateResult({ categoryId: '', score: 0, maxScore: 0 })).toThrow(/Categoría/)
  })

  it('rejects negative scores', () => {
    expect(() => validateResult({ categoryId: 'trivia', score: -1, maxScore: 5 })).toThrow(/Puntaje/)
  })

  it('rejects a score above the maximum', () => {
    expect(() => validateResult({ categoryId: 'trivia', score: 6, maxScore: 5 })).toThrow(/superar el máximo/)
  })

  it('rejects oversized details', () => {
    const detail = { blob: 'x'.repeat(5000) }
    expect(() => validateResult({ categoryId: 'trivia', score: 0, maxScore: 1, detail })).toThrow(/demasiado grande/)
  })
})

describe('recordResult', () => {
  it('unlocks the first-round achievement exactly once', async () => {
    const unlockedCodes = []

    function sql(strings, ...values) {
      const text = strings.join(' ').replace(/\s+/g, ' ').trim()
      if (text.startsWith('insert into game_results')) {
        return Promise.resolve([{ id: 'result-1', category_id: 'trivia', score: 0, max_score: 0 }])
      }
      if (text.includes('count(*)')) {
        return Promise.resolve([{ results_count: 1, distinct_categories: 1, total_points: 0 }])
      }
      if (text.startsWith('insert into achievements')) {
        const code = values[1]
        if (unlockedCodes.includes(code)) return Promise.resolve([])
        unlockedCodes.push(code)
        return Promise.resolve([{ id: `a-${code}`, code, label: code, points: 10 }])
      }
      throw new Error(`Query no simulada: ${text}`)
    }

    const first = await recordResult(sql, '00000000-0000-0000-0000-000000000003', {
      categoryId: 'trivia',
      score: 0,
      maxScore: 0,
    })
    expect(first.unlocked.map((a) => a.code)).toEqual(['primera_partida'])
    expect(unlockedCodes.every((code) => ACHIEVEMENTS.some((a) => a.code === code))).toBe(true)

    const second = await recordResult(sql, '00000000-0000-0000-0000-000000000003', {
      categoryId: 'trivia',
      score: 0,
      maxScore: 0,
    })
    expect(second.unlocked).toEqual([])
  })

  it('unlocks cien_puntos with a perfect round now that categories report real scores', async () => {
    function sql(strings, ...values) {
      const text = strings.join(' ').replace(/\s+/g, ' ').trim()
      if (text.startsWith('insert into game_results')) {
        return Promise.resolve([{ id: 'result-1', category_id: 'trivia', score: 100, max_score: 100 }])
      }
      if (text.includes('count(*)')) {
        return Promise.resolve([{ results_count: 1, distinct_categories: 1, total_points: 100 }])
      }
      if (text.startsWith('insert into achievements')) {
        return Promise.resolve([{ id: `a-${values[1]}`, code: values[1], label: values[2], points: values[3] }])
      }
      throw new Error(`Query no simulada: ${text}`)
    }

    const result = await recordResult(sql, '00000000-0000-0000-0000-000000000004', {
      categoryId: 'trivia',
      score: 100,
      maxScore: 100,
      detail: { hits: 5, total: 5 },
    })

    expect(result.unlocked.map((achievement) => achievement.code)).toEqual(['primera_partida', 'cien_puntos'])
    expect(result.stats).toEqual({ resultsCount: 1, totalPoints: 100 })
  })
})
