import { randomUUID } from 'node:crypto'
import { badRequest, notFound, tooManyRequests } from '../errors.js'
import { chatJson } from './client.js'
import { buildPrompt, CONTENT_KINDS } from './prompts.js'
import { payloadKey, validateItems, validatePayload } from './validate.js'
import triviaBank from '../../../src/data/trivia.json' with { type: 'json' }
import noSeDiceBank from '../../../src/data/noSeDice.json' with { type: 'json' }
import cancionesBank from '../../../src/data/canciones.json' with { type: 'json' }

const DAILY_ITEM_QUOTA = 200

// Keys of the content that already exists, so the model does not propose
// duplicates of either the bundled JSON or anything already in the database.
export function staticKeys(kind) {
  if (kind === 'trivia') return triviaBank.map((item) => payloadKey(kind, item))
  if (kind === 'no_se_dice') return noSeDiceBank.map((item) => payloadKey(kind, item))
  if (kind === 'cancion') return cancionesBank.map((item) => payloadKey(kind, item))
  return []
}

export async function existingKeys(sql, kind) {
  const rows = await sql`
    select payload
    from ai_content
    where kind = ${kind} and status in ('pendiente', 'aprobado')
  `
  const dbKeys = rows.map((row) => payloadKey(kind, row.payload ?? {})).filter(Boolean)
  return [...new Set([...staticKeys(kind), ...dbKeys])]
}

async function assertQuota(sql, userId) {
  const rows = await sql`
    select count(*)::int as total
    from ai_content
    where created_by = ${userId}::uuid
      and created_at > now() - interval '24 hours'
  `
  if ((rows[0]?.total ?? 0) >= DAILY_ITEM_QUOTA) {
    throw tooManyRequests('Alcanzaste el límite diario de contenido generado')
  }
}

export async function generateContent(sql, { actor, provider, kind, topic, count, fetchImpl }) {
  if (!CONTENT_KINDS.includes(kind)) throw badRequest('Tipo de contenido inválido')
  const safeCount = Math.min(Math.max(Number(count) || 5, 1), 10)

  await assertQuota(sql, actor.id)

  const keys = await existingKeys(sql, kind)
  const prompt = buildPrompt(kind, {
    topic,
    count: safeCount,
    existing: keys.slice(0, 15),
  })

  const { json } = await chatJson(provider, prompt, fetchImpl ? { fetchImpl } : undefined)

  if (json.blocked === true) {
    throw badRequest('El modelo rechazó la solicitud')
  }
  const rawItems = Array.isArray(json.items) ? json.items : []
  if (rawItems.length === 0) {
    throw badRequest('El modelo no devolvió ítems')
  }

  const { accepted, rejected } = validateItems(kind, rawItems, keys)
  const batchId = randomUUID()
  const created = []

  for (const payload of accepted) {
    const rows = await sql`
      insert into ai_content (kind, payload, provider, model, batch_id, topic, created_by)
      values (
        ${kind},
        ${JSON.stringify(payload)}::jsonb,
        ${provider.id},
        ${provider.model},
        ${batchId}::uuid,
        ${topic ?? null},
        ${actor.id}::uuid
      )
      returning id, kind, payload, provider, model, status, batch_id, topic, created_at
    `
    created.push(rows[0])
  }

  return {
    batchId,
    provider: { id: provider.id, label: provider.label, model: provider.model },
    requested: safeCount,
    created,
    rejected,
  }
}

export async function listContent(sql, { status = 'pendiente', kind = null, limit = 50 } = {}) {
  const safeLimit = Math.min(Math.max(Number(limit) || 50, 1), 100)
  const rows = await sql`
    select
      c.id, c.kind, c.payload, c.provider, c.model, c.status,
      c.batch_id, c.topic, c.created_at, c.reviewed_at,
      creator.display_name as created_by_name,
      reviewer.display_name as reviewed_by_name
    from ai_content c
    left join users creator on creator.id = c.created_by
    left join users reviewer on reviewer.id = c.reviewed_by
    where (${status}::text is null or c.status::text = ${status}::text)
      and (${kind}::text is null or c.kind = ${kind}::text)
    order by c.created_at desc
    limit ${safeLimit}
  `
  return rows.map((row) => ({ ...row, payload: row.payload }))
}

export async function reviewContent(sql, { actor, id, action, payload }) {
  if (!['approve', 'reject', 'edit'].includes(action)) throw badRequest('Acción inválida')

  const existingRows = await sql`
    select id, kind, payload, status
    from ai_content
    where id = ${id}::uuid
    limit 1
  `
  const existing = existingRows[0]
  if (!existing) throw notFound('Contenido no encontrado')

  let nextPayload = existing.payload
  if (action === 'edit' || (action === 'approve' && payload)) {
    const result = validatePayload(existing.kind, payload)
    if (!result.ok) throw badRequest(`Contenido inválido: ${result.reason}`)
    nextPayload = result.value
  }

  const nextStatus = action === 'reject' ? 'rechazado' : action === 'approve' ? 'aprobado' : existing.status

  const rows = await sql`
    update ai_content
    set payload = ${JSON.stringify(nextPayload)}::jsonb,
        status = ${nextStatus},
        reviewed_by = ${actor.id}::uuid,
        reviewed_at = now()
    where id = ${existing.id}::uuid
    returning id, kind, payload, provider, model, status, batch_id, topic, created_at, reviewed_at
  `
  return rows[0]
}

export async function publicContent(sql, kind, limit = 200) {
  if (!CONTENT_KINDS.includes(kind)) throw badRequest('Tipo de contenido inválido')
  const safeLimit = Math.min(Math.max(Number(limit) || 200, 1), 200)
  const rows = await sql`
    select id, payload
    from ai_content
    where kind = ${kind} and status = 'aprobado'
    order by reviewed_at desc
    limit ${safeLimit}
  `
  return rows.map((row) => ({ id: row.id, ...row.payload }))
}

export async function pendingCount(sql) {
  const rows = await sql`
    select count(*)::int as total
    from ai_content
    where status = 'pendiente'
  `
  return rows[0]?.total ?? 0
}
