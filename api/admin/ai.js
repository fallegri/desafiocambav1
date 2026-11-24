import { getSql } from '../_lib/db.js'
import { logAudit } from '../_lib/audit.js'
import { getQuery, methodNotAllowed, readJsonBody, sendJson, withApi } from '../_lib/http.js'
import { requireStaff } from '../_lib/session.js'
import { listAvailableProviders, resolveProvider } from '../_lib/ai/providers.js'
import { CONTENT_KINDS, KIND_LABELS } from '../_lib/ai/prompts.js'
import { generateContent, listContent, pendingCount, reviewContent } from '../_lib/ai/content.js'

// Generating content takes longer than the rest of the API.
export const config = { maxDuration: 60 }

const STATUSES = ['pendiente', 'aprobado', 'rechazado']

// The four assistant routes share one function because Vercel Hobby caps a
// deployment at 12 functions and plain Node functions have no dynamic file
// routes. `vercel.json` maps the public URLs to `?route=...` (plus `?id=...`
// for the review endpoint):
//   GET   /api/admin/ai/providers
//   POST  /api/admin/ai/generate        { kind, topic, count, provider, model }
//   GET   /api/admin/ai/content?status=&kind=&limit=
//   PATCH /api/admin/ai/content/:id     { action: 'approve' | 'reject' | 'edit', payload? }
export default withApi(async (req, res) => {
  const query = getQuery(req)
  const sql = getSql()
  const route = typeof query.route === 'string' ? query.route : null
  const id = typeof query.id === 'string' && query.id.length > 0 ? query.id : null

  if (route === 'providers') {
    if (req.method !== 'GET') {
      methodNotAllowed(res, ['GET'])
      return
    }

    await requireStaff(req, sql)

    const providers = listAvailableProviders()
    sendJson(res, 200, {
      providers,
      kinds: CONTENT_KINDS.map((kind) => ({ id: kind, label: KIND_LABELS[kind] })),
      configured: providers.length > 0,
    })
    return
  }

  if (route === 'generate') {
    if (req.method !== 'POST') {
      methodNotAllowed(res, ['POST'])
      return
    }

    const actor = await requireStaff(req, sql)

    const body = await readJsonBody(req)
    const provider = resolveProvider(body.provider, body.model)

    const result = await generateContent(sql, {
      actor,
      provider,
      kind: body.kind,
      topic: typeof body.topic === 'string' ? body.topic.slice(0, 200) : null,
      count: body.count,
    })

    await logAudit(sql, {
      actorId: actor.id,
      action: 'ai.generate',
      targetType: 'ai_content',
      targetId: result.batchId,
      metadata: {
        provider: provider.id,
        model: provider.model,
        kind: body.kind,
        created: result.created.length,
        rejected: result.rejected.length,
      },
    })

    sendJson(res, 201, result)
    return
  }

  if (route === 'content' && !id) {
    if (req.method !== 'GET') {
      methodNotAllowed(res, ['GET'])
      return
    }

    await requireStaff(req, sql)

    const status = STATUSES.includes(query.status) ? query.status : 'pendiente'
    const kind = CONTENT_KINDS.includes(query.kind) ? query.kind : null

    const items = await listContent(sql, { status, kind, limit: query.limit })
    sendJson(res, 200, { items, pending: await pendingCount(sql) })
    return
  }

  if (route === 'content' && id) {
    if (req.method !== 'PATCH') {
      methodNotAllowed(res, ['PATCH'])
      return
    }

    const actor = await requireStaff(req, sql)

    const body = await readJsonBody(req)
    const updated = await reviewContent(sql, {
      actor,
      id,
      action: body.action,
      payload: body.payload,
    })

    await logAudit(sql, {
      actorId: actor.id,
      action: `ai.content.${body.action}`,
      targetType: 'ai_content',
      targetId: updated.id,
      metadata: { kind: updated.kind, status: updated.status },
    })

    sendJson(res, 200, { item: updated })
    return
  }

  sendJson(res, 404, { error: 'Ruta no encontrada' })
})
