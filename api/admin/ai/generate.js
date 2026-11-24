import { getSql } from '../../_lib/db.js'
import { logAudit } from '../../_lib/audit.js'
import { readJsonBody, sendJson, withApi } from '../../_lib/http.js'
import { requireStaff } from '../../_lib/session.js'
import { resolveProvider } from '../../_lib/ai/providers.js'
import { generateContent } from '../../_lib/ai/content.js'

// Generar contenido puede tardar: se le da más margen que al resto de la API.
export const config = { maxDuration: 60 }

// POST /api/admin/ai/generate
// body: { kind, topic, count, provider, model }
export default withApi(async (req, res) => {
  if (req.method !== 'POST') {
    sendJson(res, 405, { error: 'Método no permitido' })
    return
  }

  const sql = getSql()
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
})
