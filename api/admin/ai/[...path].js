import { getSql } from '../../_lib/db.js'
import { logAudit } from '../../_lib/audit.js'
import {
  getQuery,
  methodNotAllowed,
  readJsonBody,
  sendJson,
  withApi,
} from '../../_lib/http.js'
import { requireStaff } from '../../_lib/session.js'
import { listAvailableProviders, resolveProvider } from '../../_lib/ai/providers.js'
import { CONTENT_KINDS, KIND_LABELS } from '../../_lib/ai/prompts.js'
import { generateContent, listContent, pendingCount, reviewContent } from '../../_lib/ai/content.js'

// Generating content takes longer than the rest of the API.
export const config = { maxDuration: 60 }

const STATUSES = ['pendiente', 'aprobado', 'rechazado']

function segmentsOf(req) {
  const path = req.query?.path
  if (Array.isArray(path)) return path.filter(Boolean)
  if (typeof path === 'string' && path.length > 0) return path.split('/').filter(Boolean)
  return []
}

// The four assistant routes share one function (Vercel Hobby caps a deployment
// at 12). Public URLs are unchanged:
//   GET   /api/admin/ai/providers
//   POST  /api/admin/ai/generate        { kind, topic, count, provider, model }
//   GET   /api/admin/ai/content?status=&kind=&limit=
//   PATCH /api/admin/ai/content/:id     { action: 'approve' | 'reject' | 'edit', payload? }
export default withApi(async (req, res) => {
  const [first, second] = segmentsOf(req)
  const sql = getSql()

  if (first === 'providers' && second === undefined) {
    if (req.method !== 'GET') {
      methodNotAllowed(res, ['GET'])
      return
    }

    await requireStaff(req, sql)

    const providers = listAvailableProviders()
    sendJson(res, 200, {
      providers,
      kinds: CONTENT_KINDS.map((id) => ({ id, label: KIND_LABELS[id] })),
      configured: providers.length > 0,
    })
    return
  }

  if (first === 'generate' && second === undefined) {
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

  if (first === 'content' && second === undefined) {
    if (req.method !== 'GET') {
      methodNotAllowed(res, ['GET'])
      return
    }

    await requireStaff(req, sql)

    const query = getQuery(req)
    const status = STATUSES.includes(query.status) ? query.status : 'pendiente'
    const kind = CONTENT_KINDS.includes(query.kind) ? query.kind : null

    const items = await listContent(sql, { status, kind, limit: query.limit })
    sendJson(res, 200, { items, pending: await pendingCount(sql) })
    return
  }

  if (first === 'content' && typeof second === 'string' && second.length > 0) {
    if (req.method !== 'PATCH') {
      methodNotAllowed(res, ['PATCH'])
      return
    }

    const actor = await requireStaff(req, sql)

    const body = await readJsonBody(req)
    const updated = await reviewContent(sql, {
      actor,
      id: second,
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
