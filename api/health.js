import { getSql } from './_lib/db.js'
import { sendJson, withApi } from './_lib/http.js'

// GET /api/health — smoke test for the deployment (Vercel function + Neon).
export default withApi(async (req, res) => {
  if (req.method !== 'GET') {
    sendJson(res, 405, { error: 'Método no permitido' })
    return
  }

  try {
    await getSql()`select 1 as ok`
    sendJson(res, 200, { ok: true, database: 'up' })
  } catch (error) {
    console.error('[health] database check failed:', error)
    sendJson(res, 503, { ok: false, database: 'down' })
  }
})
