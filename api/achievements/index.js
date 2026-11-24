import { getSql } from '../_lib/db.js'
import { listAchievements, recordResult } from '../_lib/achievements.js'
import { readJsonBody, sendJson, withApi } from '../_lib/http.js'
import { getSessionUser } from '../_lib/session.js'

// GET  /api/achievements  -> logros + estadísticas del usuario
// POST /api/achievements  -> registra una partida y devuelve logros nuevos
export default withApi(async (req, res) => {
  const sql = getSql()
  const user = await getSessionUser(req, sql)

  if (req.method === 'GET') {
    const data = await listAchievements(sql, user.id)
    sendJson(res, 200, data)
    return
  }

  if (req.method === 'POST') {
    const body = await readJsonBody(req)
    const data = await recordResult(sql, user.id, body)
    sendJson(res, 201, data)
    return
  }

  sendJson(res, 405, { error: 'Método no permitido' })
})
