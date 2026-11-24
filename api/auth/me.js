import { getSql } from '../_lib/db.js'
import { sendJson, withApi } from '../_lib/http.js'
import { clearSessionCookie, readSessionToken } from '../_lib/session.js'
import { verifySession } from '../_lib/token.js'
import { findUserById, publicUser } from '../_lib/users.js'

// GET /api/auth/me
// Guests get `{ user: null }` instead of a 401 so the UI can boot without
// treating "not logged in" as an error. Pending accounts are returned with
// their status so the UI can explain why login is not available yet.
export default withApi(async (req, res) => {
  if (req.method !== 'GET') {
    sendJson(res, 405, { error: 'Método no permitido' })
    return
  }

  const token = readSessionToken(req)
  if (!token) {
    sendJson(res, 200, { user: null })
    return
  }

  let payload
  try {
    payload = await verifySession(token)
  } catch {
    res.setHeader('Set-Cookie', clearSessionCookie())
    sendJson(res, 200, { user: null })
    return
  }

  const row = await findUserById(getSql(), payload.sub)
  if (!row) {
    res.setHeader('Set-Cookie', clearSessionCookie())
    sendJson(res, 200, { user: null })
    return
  }

  const user = publicUser(row)
  if (user.status === 'bloqueado' || user.status === 'rechazado') {
    res.setHeader('Set-Cookie', clearSessionCookie())
    sendJson(res, 200, { user: null, revoked: true })
    return
  }

  sendJson(res, 200, { user })
})
