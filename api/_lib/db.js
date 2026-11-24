// Neon serverless driver (HTTP, no connection pool to manage). One client
// per warm lambda is enough; the module-level cache survives between
// invocations on the same instance.
import { neon } from '@neondatabase/serverless'

let cachedClient = null

export function getSql() {
  const url = process.env.DATABASE_URL
  if (!url) {
    throw new Error('Falta la variable de entorno DATABASE_URL (connection string de Neon)')
  }
  if (!cachedClient) {
    cachedClient = neon(url)
  }
  return cachedClient
}
