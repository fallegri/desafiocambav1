import { createPendingUser } from '../_lib/users.js'
import { getSql } from '../_lib/db.js'
import { logAudit } from '../_lib/audit.js'
import { getClientIp, readJsonBody, sendJson, withApi } from '../_lib/http.js'
import { hashPassword } from '../_lib/password.js'
import { rateLimit } from '../_lib/rateLimit.js'
import { failIfInvalid, validateDisplayName, validateEmail, validatePassword } from '../_lib/validation.js'

// POST /api/auth/register
// Creates a pending participant. Nothing is usable until a staff member
// approves the account, which keeps the player roster curated.
export default withApi(async (req, res) => {
  if (req.method !== 'POST') {
    sendJson(res, 405, { error: 'Método no permitido' })
    return
  }

  rateLimit(`register:${getClientIp(req)}`, 10)

  const body = await readJsonBody(req)
  const details = {}
  const email = validateEmail(body.email, details)
  const password = validatePassword(body.password, details)
  const name = validateDisplayName(body.name, details)
  failIfInvalid(details)

  const sql = getSql()
  const passwordHash = await hashPassword(password)
  const user = await createPendingUser(sql, { email, passwordHash, displayName: name })

  await logAudit(sql, {
    action: 'user.register',
    targetType: 'user',
    targetId: user.id,
    metadata: { email: user.email },
  })

  sendJson(res, 201, {
    user,
    message: 'Registro creado. Un operador debe aprobar tu cuenta antes de que puedas iniciar sesión.',
  })
})
