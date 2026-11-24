import { describe, expect, it } from 'vitest'
import { ROUND_MAX_SCORE, scoreRound, winnerOf } from './scoring'

describe('scoreRound', () => {
  it('gives the full score for a perfect round', () => {
    expect(scoreRound({ hits: 5, total: 5 })).toEqual({
      score: 100,
      maxScore: ROUND_MAX_SCORE,
      detail: { hits: 5, total: 5 },
    })
    expect(scoreRound({ hits: 1, total: 1 })).toMatchObject({ score: 100, maxScore: 100 })
  })

  it('scores partial rounds proportionally', () => {
    expect(scoreRound({ hits: 3, total: 5 }).score).toBe(60)
    expect(scoreRound({ hits: 1, total: 4 }).score).toBe(25)
  })

  it('scores a missed round as zero', () => {
    expect(scoreRound({ hits: 0, total: 5 })).toEqual({
      score: 0,
      maxScore: 100,
      detail: { hits: 0, total: 5 },
    })
  })

  it('clamps impossible values instead of producing invalid payloads', () => {
    expect(scoreRound({ hits: 9, total: 5 }).detail.hits).toBe(5)
    expect(scoreRound({ hits: -3, total: 5 }).score).toBe(0)
  })

  it('never divides by zero', () => {
    expect(scoreRound({ hits: 0, total: 0 })).toMatchObject({ score: 0, maxScore: 100 })
    expect(scoreRound({ hits: 1, total: 0 })).toMatchObject({ score: 100, maxScore: 100 })
    expect(scoreRound({ hits: undefined, total: undefined })).toMatchObject({ score: 0 })
  })

  it('rounds to whole points', () => {
    expect(scoreRound({ hits: 1, total: 3 }).score).toBe(33)
    expect(scoreRound({ hits: 2, total: 3 }).score).toBe(67)
  })
})

describe('winnerOf', () => {
  it('returns the player with more hits', () => {
    expect(winnerOf([{ name: 'J1', hits: 2 }, { name: 'J2', hits: 4 }])).toEqual({ name: 'J2', hits: 4 })
    expect(winnerOf([{ name: 'J1', hits: 4 }, { name: 'J2', hits: 2 }])).toEqual({ name: 'J1', hits: 4 })
  })

  it('returns null on a tie or without two players', () => {
    expect(winnerOf([{ name: 'J1', hits: 3 }, { name: 'J2', hits: 3 }])).toBeNull()
    expect(winnerOf([{ name: 'J1', hits: 3 }])).toBeNull()
    expect(winnerOf()).toBeNull()
  })
})
