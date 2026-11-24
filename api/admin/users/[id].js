import { getSql } from '../../_lib/db.js'
import { logAudit } from '../../_lib/audit.js'
import { badRequest } from '../../_lib/errors.js'
import { readJsonBody, sendJson, withApi } from '../../_lib/http.js'
import { requireStaff } from '../../_lib/session.js'
import { applyUserAction, ROLES } from '../../_lib/users.js'

const ACTIONS = ['approve', 'reject', 'block', 'set_role']

// PATCH /api/admin/users/:id
// body: { action: 'approve' | 'reject' | 'block' | 'set_role', role? }
export default withApi(async (req, res) => {
  if (req.method !== 'PATCH') {
    sendJson(res, 405, { error: 'Método no permitido' })
    return
  }

  const sql = getSql()
  const actor = await requireStaff(req, sql)

  const targetId = req.query?.id
  if (!targetId) throw badRequest('Falta el id del usuario')

  const body = await readJsonBody(req)
  const action = body.action
  if (!ACTIONS.includes(action)) throw badRequest('Acción inválida')

  const role = action === 'set_role' ? body.role : null
  if (action === 'set_role' && !ROLES.includes(role)) throw badRequest('Rol inválido')

  const updated = await applyUserAction(sql, { actor, targetId, action, role })

  await logAudit(sql, {
    actorId: actor.id,
    action: `admin.user.${action}`,
    targetType: 'user',
    targetId: updated.id,
    metadata: { role: updated.role, status: updated.status },
  })

  sendJson(res, 200, { user: updated })
})
