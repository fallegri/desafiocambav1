import { getSql } from '../_lib/db.js'
import { logAudit } from '../_lib/audit.js'
import { sendJson, withApi } from '../_lib/http.js'
import { parseCookies, clearSessionCookie, readSessionToken, SESSION_COOKIE } from '../_lib/session.js'
import { verifySession } from '../_lib/token.js'

// POST /api/auth/logout
// Idempotent: clearing a cookie that isn't there is fine.
export default withApi(async (req, res) => {
  if (req.method !== 'POST') {
    sendJson(res, 405, { error: 'Método no permitido' })
    return
  }

  const cookies = parseCookies(req.headers.cookie)
  if (cookies[SESSION_COOKIE]) {
    try {
      const payload = await verifySession(readSessionToken(req))
      await logAudit(getSql(), {
        action: 'auth.logout',
        actorId: payload.sub,
        targetType: 'user',
        targetId: payload.sub,
      })
    } catch {
      // Token already invalid — nothing to audit.
    }
  }

  res.setHeader('Set-Cookie', clearSessionCookie())
  sendJson(res, 200, { ok: true })
})
