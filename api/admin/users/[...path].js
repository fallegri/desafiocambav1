import { getSql } from '../../_lib/db.js'
import { logAudit } from '../../_lib/audit.js'
import { badRequest } from '../../_lib/errors.js'
import {
  getQuery,
  methodNotAllowed,
  readJsonBody,
  sendJson,
  withApi,
} from '../../_lib/http.js'
import { requireStaff } from '../../_lib/session.js'
import { applyUserAction, listUsers, ROLES, STATUSES } from '../../_lib/users.js'

const ACTIONS = ['approve', 'reject', 'block', 'set_role']

function segmentsOf(req) {
  const path = req.query?.path
  if (Array.isArray(path)) return path.filter(Boolean)
  if (typeof path === 'string' && path.length > 0) return path.split('/').filter(Boolean)
  return []
}

// Both admin user routes live in one serverless function because Vercel's
// Hobby plan caps a deployment at 12 of them. The catch-all segment keeps the
// public URLs unchanged:
//   GET   /api/admin/users?status=pendiente&search=&page=1
//   PATCH /api/admin/users/:id   { action: 'approve' | 'reject' | 'block' | 'set_role', role? }
export default withApi(async (req, res) => {
  const segments = segmentsOf(req)
  const sql = getSql()

  if (segments.length === 0) {
    if (req.method !== 'GET') {
      methodNotAllowed(res, ['GET'])
      return
    }

    await requireStaff(req, sql)

    const query = getQuery(req)
    const status = STATUSES.includes(query.status) ? query.status : null
    const search = typeof query.search === 'string' && query.search.trim() ? query.search.trim() : null
    const page = Math.max(Number(query.page) || 1, 1)
    const limit = Math.min(Math.max(Number(query.limit) || 50, 1), 100)

    const result = await listUsers(sql, { status, search, limit, offset: (page - 1) * limit })
    sendJson(res, 200, { ...result, page })
    return
  }

  if (segments.length === 1) {
    if (req.method !== 'PATCH') {
      methodNotAllowed(res, ['PATCH'])
      return
    }

    const actor = await requireStaff(req, sql)
    const targetId = segments[0]

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
    return
  }

  sendJson(res, 404, { error: 'Ruta no encontrada' })
})
