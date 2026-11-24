import { SignJWT, jwtVerify } from 'jose'

const ISSUER = 'desafio-camba'
const AUDIENCE = 'desafio-camba-web'
const SESSION_TTL = '7d'
const encoder = new TextEncoder()

function getSecret() {
  const secret = process.env.JWT_SECRET
  if (!secret || secret.length < 32) {
    throw new Error('Falta JWT_SECRET (mínimo 32 caracteres) en las variables de entorno')
  }
  return encoder.encode(secret)
}

export async function signSession({ userId, email, role }) {
  return new SignJWT({ email, role })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setSubject(userId)
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setIssuedAt()
    .setExpirationTime(SESSION_TTL)
    .sign(getSecret())
}

export async function verifySession(token) {
  const { payload } = await jwtVerify(token, getSecret(), {
    issuer: ISSUER,
    audience: AUDIENCE,
    algorithms: ['HS256'],
  })
  return payload
}
