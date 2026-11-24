import { getSql } from '../../../_lib/db.js'
import { getQuery, sendJson, withApi } from '../../../_lib/http.js'
import { requireStaff } from '../../../_lib/session.js'
import { listContent, pendingCount } from '../../../_lib/ai/content.js'

// GET /api/admin/ai/content?status=pendiente&kind=trivia
export default withApi(async (req, res) => {
  if (req.method !== 'GET') {
    sendJson(res, 405, { error: 'Método no permitido' })
    return
  }

  const sql = getSql()
  await requireStaff(req, sql)

  const query = getQuery(req)
  const status = ['pendiente', 'aprobado', 'rechazado'].includes(query.status) ? query.status : 'pendiente'
  const kind = ['trivia', 'no_se_dice', 'cancion'].includes(query.kind) ? query.kind : null

  const items = await listContent(sql, { status, kind, limit: query.limit })
  sendJson(res, 200, { items, pending: await pendingCount(sql) })
})
