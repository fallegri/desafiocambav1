import { getSql } from '../../../_lib/db.js'
import { logAudit } from '../../../_lib/audit.js'
import { badRequest } from '../../../_lib/errors.js'
import { readJsonBody, sendJson, withApi } from '../../../_lib/http.js'
import { requireStaff } from '../../../_lib/session.js'
import { reviewContent } from '../../../_lib/ai/content.js'

// PATCH /api/admin/ai/content/:id
// body: { action: 'approve' | 'reject' | 'edit', payload? }
export default withApi(async (req, res) => {
  if (req.method !== 'PATCH') {
    sendJson(res, 405, { error: 'Método no permitido' })
    return
  }

  const sql = getSql()
  const actor = await requireStaff(req, sql)

  const id = req.query?.id
  if (!id) throw badRequest('Falta el id del contenido')

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
})
