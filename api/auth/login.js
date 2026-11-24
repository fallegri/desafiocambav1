import { getSql } from '../_lib/db.js'
import { logAudit } from '../_lib/audit.js'
import { HttpError, unauthorized } from '../_lib/errors.js'
import { getClientIp, readJsonBody, sendJson, withApi } from '../_lib/http.js'
import { burnPasswordTime, verifyPassword } from '../_lib/password.js'
import { rateLimit } from '../_lib/rateLimit.js'
import { sessionCookie } from '../_lib/session.js'
import { signSession } from '../_lib/token.js'
import { findUserByEmail, publicUser } from '../_lib/users.js'
import { normalizeEmail } from '../_lib/validation.js'

const INACTIVE_MESSAGES = {
  pendiente: 'Tu cuenta está pendiente de aprobación. Un operador debe habilitarla.',
  rechazado: 'Tu solicitud de cuenta fue rechazada.',
  bloqueado: 'Tu cuenta está bloqueada.',
}

// POST /api/auth/login
export default withApi(async (req, res) => {
  if (req.method !== 'POST') {
    sendJson(res, 405, { error: 'Método no permitido' })
    return
  }

  rateLimit(`login:${getClientIp(req)}`, 15)

  const body = await readJsonBody(req)
  const email = normalizeEmail(body.email)
  const password = typeof body.password === 'string' ? body.password : ''
  if (!email || !password) {
    throw new HttpError(400, 'Email y contraseña son obligatorios')
  }

  const sql = getSql()
  const user = await findUserByEmail(sql, email)

  if (!user) {
    await burnPasswordTime(password)
    throw unauthorized('Email o contraseña incorrectos')
  }

  const passwordOk = await verifyPassword(password, user.password_hash)
  if (!passwordOk) {
    await logAudit(sql, {
      action: 'auth.login_failed',
      targetType: 'user',
      targetId: user.id,
    })
    throw unauthorized('Email o contraseña incorrectos')
  }

  if (user.status !== 'activo') {
    await logAudit(sql, {
      action: 'auth.login_inactive',
      targetType: 'user',
      targetId: user.id,
      metadata: { status: user.status },
    })
    throw new HttpError(403, INACTIVE_MESSAGES[user.status] ?? 'Tu cuenta no está activa', {
      status: user.status,
    })
  }

  const token = await signSession({ userId: user.id, email: user.email, role: user.role })
  res.setHeader('Set-Cookie', sessionCookie(token))

  await logAudit(sql, {
    action: 'auth.login',
    actorId: user.id,
    targetType: 'user',
    targetId: user.id,
  })

  sendJson(res, 200, { user: publicUser(user) })
})
