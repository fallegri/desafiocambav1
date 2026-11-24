import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

// Minimal .env loader so the maintenance scripts work without adding a
// dependency. Existing process.env values win (Neon/Vercel env vars).
export function loadEnv(file = '.env') {
  const path = resolve(process.cwd(), file)
  if (!existsSync(path)) return false

  for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq === -1) continue
    const key = trimmed.slice(0, eq).trim()
    let value = trimmed.slice(eq + 1).trim()
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1)
    }
    if (key && process.env[key] === undefined) process.env[key] = value
  }
  return true
}
