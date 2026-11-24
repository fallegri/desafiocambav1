import { HttpError } from './errors.js'

const MAX_BODY_BYTES = 64 * 1024

export function sendJson(res, status, body) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.setHeader('Cache-Control', 'no-store')
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.end(body === null ? '' : JSON.stringify(body))
}

// Public, non-personal content (approved trivia/songs) can be cached briefly
// by Vercel's edge so the game does not hit Neon on every load.
export function sendPublicJson(res, status, body, maxAgeSeconds = 60) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.setHeader('Cache-Control', `public, max-age=0, s-maxage=${maxAgeSeconds}, stale-while-revalidate=300`)
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.end(body === null ? '' : JSON.stringify(body))
}

export function methodNotAllowed(res, allowed) {
  res.setHeader('Allow', allowed.join(', '))
  sendJson(res, 405, { error: 'Método no permitido', allowed })
}

// Vercel parses JSON bodies for the Node runtime, but `vercel dev`, plain
// `node:http` and tests may not, so fall back to reading the stream.
export async function readJsonBody(req) {
  let body
  try {
    body = req.body
  } catch {
    // Vercel's Node runtime parses the body eagerly and throws on malformed
    // JSON; turn that into the same 400 the stream path produces instead of
    // letting an unexpected error become a 500.
    throw new HttpError(400, 'El cuerpo debe ser un objeto JSON válido')
  }

  if (body !== undefined && body !== null && typeof body === 'object') {
    return body
  }
  if (typeof body === 'string' && body.length > 0) {
    return parseBody(body)
  }

  const raw = await new Promise((resolve, reject) => {
    let size = 0
    const chunks = []
    req.on('data', (chunk) => {
      size += chunk.length
      if (size > MAX_BODY_BYTES) {
        reject(new HttpError(413, 'El cuerpo de la petición es demasiado grande'))
        req.destroy()
        return
      }
      chunks.push(chunk)
    })
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
    req.on('error', reject)
  })

  if (!raw.trim()) return {}
  return parseBody(raw)
}

function parseBody(raw) {
  try {
    const parsed = JSON.parse(raw)
    if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new Error('not an object')
    }
    return parsed
  } catch {
    throw new HttpError(400, 'El cuerpo debe ser un objeto JSON válido')
  }
}

// SameSite=Lax already blocks cross-site POSTs, but an explicit Origin check
// is defence in depth and cheap: state-changing requests must come from the
// same host that serves the app.
export function assertSameOrigin(req) {
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) return
  const origin = req.headers.origin
  if (!origin) return // non-browser clients and same-origin fetches in tests
  const host = req.headers['x-forwarded-host'] || req.headers.host
  if (!host) return
  let originHost
  try {
    originHost = new URL(origin).host
  } catch {
    throw new HttpError(403, 'Origen inválido')
  }
  if (originHost !== host) {
    throw new HttpError(403, 'Origen no permitido')
  }
}

// Wraps a handler so every thrown HttpError becomes a clean JSON response
// and unexpected failures never leak internals.
export function withApi(handler) {
  return async (req, res) => {
    try {
      assertSameOrigin(req)
      await handler(req, res)
    } catch (error) {
      if (error instanceof HttpError) {
        sendJson(res, error.status, {
          error: error.message,
          ...(error.details ? { details: error.details } : {}),
        })
        return
      }
      console.error('[api] error inesperado:', error)
      sendJson(res, 500, { error: 'Error interno del servidor' })
    }
  }
}

export function getQuery(req) {
  if (req.query && typeof req.query === 'object') return req.query
  const url = new URL(req.url, 'http://localhost')
  return Object.fromEntries(url.searchParams.entries())
}

export function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for']
  if (typeof forwarded === 'string' && forwarded.length > 0) {
    return forwarded.split(',')[0].trim()
  }
  return req.socket?.remoteAddress || 'desconocida'
}
