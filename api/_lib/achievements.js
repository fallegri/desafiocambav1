import { badRequest } from './errors.js'

// Phase 1 achievement catalogue. Codes are stable identifiers stored in the
// DB; labels can be reworded without losing history.
export const ACHIEVEMENTS = [
  {
    code: 'primera_partida',
    label: '¡Primera partida!',
    description: 'Jugaste tu primera ronda con la cuenta',
    points: 10,
    test: (ctx) => ctx.resultsCount >= 1,
  },
  {
    code: 'tres_categorias',
    label: 'Todoterreno',
    description: 'Jugaste al menos 3 categorías distintas',
    points: 30,
    test: (ctx) => ctx.distinctCategories >= 3,
  },
  {
    code: 'cinco_rondas',
    label: 'Cinco rondas',
    description: 'Jugaste cinco rondas con la cuenta',
    points: 30,
    test: (ctx) => ctx.resultsCount >= 5,
  },
  {
    code: 'cien_puntos',
    label: 'Cien puntos',
    description: 'Acumulaste 100 puntos entre todas tus partidas',
    points: 40,
    test: (ctx) => ctx.totalPoints >= 100,
  },
]

export function validateResult({ categoryId, score, maxScore, detail }) {
  if (typeof categoryId !== 'string' || categoryId.length < 2 || categoryId.length > 64) {
    throw badRequest('Categoría inválida')
  }
  const safeScore = Number(score)
  const safeMax = Number(maxScore)
  if (!Number.isInteger(safeScore) || safeScore < 0 || safeScore > 10000) {
    throw badRequest('Puntaje inválido')
  }
  if (!Number.isInteger(safeMax) || safeMax < 0 || safeMax > 10000) {
    throw badRequest('Puntaje máximo inválido')
  }
  if (safeScore > safeMax) {
    throw badRequest('El puntaje no puede superar el máximo')
  }
  const safeDetail = detail && typeof detail === 'object' && !Array.isArray(detail) ? detail : {}
  if (JSON.stringify(safeDetail).length > 4096) {
    throw badRequest('El detalle de la partida es demasiado grande')
  }
  return { categoryId, score: safeScore, maxScore: safeMax, detail: safeDetail }
}

export async function recordResult(sql, userId, payload) {
  const { categoryId, score, maxScore, detail } = validateResult(payload)

  const inserted = await sql`
    insert into game_results (user_id, category_id, score, max_score, detail)
    values (${userId}::uuid, ${categoryId}, ${score}, ${maxScore}, ${JSON.stringify(detail)}::jsonb)
    returning id, category_id, score, max_score, created_at
  `

  const statsRows = await sql`
    select
      count(*)::int as results_count,
      count(distinct category_id)::int as distinct_categories,
      coalesce(sum(score), 0)::int as total_points
    from game_results
    where user_id = ${userId}::uuid
  `
  const stats = statsRows[0] ?? { results_count: 0, distinct_categories: 0, total_points: 0 }
  const context = {
    categoryId,
    score,
    maxScore,
    resultsCount: stats.results_count,
    distinctCategories: stats.distinct_categories,
    totalPoints: stats.total_points,
  }

  const unlocked = []
  for (const achievement of ACHIEVEMENTS) {
    if (!achievement.test(context)) continue
    const rows = await sql`
      insert into achievements (user_id, code, label, points)
      values (${userId}::uuid, ${achievement.code}, ${achievement.label}, ${achievement.points})
      on conflict (user_id, code) do nothing
      returning id, code, label, points, achieved_at
    `
    if (rows[0]) unlocked.push(rows[0])
  }

  return {
    result: inserted[0],
    unlocked,
    stats: { resultsCount: stats.results_count, totalPoints: stats.total_points },
  }
}

export async function listAchievements(sql, userId) {
  const rows = await sql`
    select id, code, label, points, achieved_at
    from achievements
    where user_id = ${userId}::uuid
    order by achieved_at desc
  `
  const statsRows = await sql`
    select
      count(*)::int as results_count,
      coalesce(sum(score), 0)::int as total_points,
      coalesce(sum(max_score), 0)::int as total_max
    from game_results
    where user_id = ${userId}::uuid
  `
  const stats = statsRows[0] ?? { results_count: 0, total_points: 0, total_max: 0 }
  return {
    achievements: rows,
    stats: {
      resultsCount: stats.results_count,
      totalPoints: stats.total_points,
      totalMax: stats.total_max,
    },
  }
}
