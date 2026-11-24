import { forbidden, unauthorized } from './errors.js'
import { findUserById, isStaff, publicUser } from './users.js'
import { verifySession } from './token.js'

export const SESSION_COOKIE = 'dc_session'
const MAX_AGE_SECONDS = 60 * 60 * 24 * 7

export function parseCookies(header) {
  const cookies = {}
  if (!header || typeof header !== 'string') return cookies
  for (const part of header.split(';')) {
    const index = part.indexOf('=')
    if (index === -1) continue
    const name = part.slice(0, index).trim()
    const value = part.slice(index + 1).trim()
    if (name) cookies[name] = decodeURIComponent(value)
  }
  return cookies
}

function cookieAttributes() {
  const secure = process.env.NODE_ENV === 'production' || Boolean(process.env.VERCEL)
  return `Path=/; HttpOnly; SameSite=Lax; Max-Age=${MAX_AGE_SECONDS}${secure ? '; Secure' : ''}`
}

export function sessionCookie(token) {
  return `${SESSION_COOKIE}=${encodeURIComponent(token)}; ${cookieAttributes()}`
}

export function clearSessionCookie() {
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`
}

export function readSessionToken(req) {
  const cookies = parseCookies(req.headers.cookie)
  return cookies[SESSION_COOKIE] ?? null
}

// Resolves the JWT *and* re-reads the user row, so a revoked or blocked user
// loses access immediately instead of when their token expires.
export async function getSessionUser(req, sql) {
  const token = readSessionToken(req)
  if (!token) throw unauthorized()

  let payload
  try {
    payload = await verifySession(token)
  } catch {
    throw unauthorized('Sesión inválida o expirada')
  }

  const user = await findUserById(sql, payload.sub)
  if (!user) throw unauthorized('El usuario ya no existe')

  if (user.status !== 'activo') {
    throw forbidden('Tu cuenta todavía no está activa. Pedile a un operador que apruebe tu registro')
  }

  return publicUser(user)
}

export async function requireStaff(req, sql) {
  const user = await getSessionUser(req, sql)
  if (!isStaff(user.role)) throw forbidden('Se requiere rol de operador o superior')
  return user
}

export async function requireSuperadmin(req, sql) {
  const user = await getSessionUser(req, sql)
  if (user.role !== 'superadmin') throw forbidden('Solo el super admin puede hacer esta acción')
  return user
}
