// Error type that carries the HTTP status the API should answer with.
// Anything else that reaches the handler wrapper is treated as a 500 and
// its message is never echoed to the client.
export class HttpError extends Error {
  constructor(status, message, details = null) {
    super(message)
    this.name = 'HttpError'
    this.status = status
    this.details = details
  }
}

export function badRequest(message, details) {
  return new HttpError(400, message, details)
}

export function unauthorized(message = 'No autenticado') {
  return new HttpError(401, message)
}

export function forbidden(message = 'No tenés permiso para esta acción') {
  return new HttpError(403, message)
}

export function notFound(message = 'Recurso no encontrado') {
  return new HttpError(404, message)
}

export function conflict(message, details) {
  return new HttpError(409, message, details)
}

export function tooManyRequests(message = 'Demasiados intentos. Probá de nuevo en unos minutos') {
  return new HttpError(429, message)
}
