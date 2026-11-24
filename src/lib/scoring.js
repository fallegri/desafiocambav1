// Every minigame reports its round on the same 0–100 scale so points from
// different categories add up: the `cien_puntos` achievement and the stats
// returned by /api/achievements assume a single unit.
//
// `hits` is how many things the group got right in the round and `total` is
// how many were possible (5 trivia questions, 1 guessed phrase, ...).
export const ROUND_MAX_SCORE = 100

export function scoreRound({ hits, total }) {
  const safeTotal = Math.max(1, Math.trunc(Number(total)) || 0)
  const safeHits = Math.min(Math.max(Math.trunc(Number(hits)) || 0, 0), safeTotal)

  return {
    score: Math.round((safeHits / safeTotal) * ROUND_MAX_SCORE),
    maxScore: ROUND_MAX_SCORE,
    detail: { hits: safeHits, total: safeTotal },
  }
}

// Returns the winning player object, or null when there is a tie (or when
// there are not enough players to compare).
export function winnerOf(players = []) {
  if (!Array.isArray(players) || players.length < 2) return null
  const [first, second] = players
  if (first.hits === second.hits) return null
  return first.hits > second.hits ? first : second
}
