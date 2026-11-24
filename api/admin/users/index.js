import { getSql } from '../../_lib/db.js'
import { getQuery, sendJson, withApi } from '../../_lib/http.js'
import { requireStaff } from '../../_lib/session.js'
import { listUsers, STATUSES } from '../../_lib/users.js'

// GET /api/admin/users?status=pendiente&search=&page=1
export default withApi(async (req, res) => {
  if (req.method !== 'GET') {
    sendJson(res, 405, { error: 'Método no permitido' })
    return
  }

  const sql = getSql()
  await requireStaff(req, sql)

  const query = getQuery(req)
  const status = STATUSES.includes(query.status) ? query.status : null
  const search = typeof query.search === 'string' && query.search.trim() ? query.search.trim() : null
  const page = Math.max(Number(query.page) || 1, 1)
  const limit = Math.min(Math.max(Number(query.limit) || 50, 1), 100)

  const result = await listUsers(sql, { status, search, limit, offset: (page - 1) * limit })
  sendJson(res, 200, { ...result, page })
})
