import { tooManyRequests } from './errors.js'

// Best-effort, per-lambda-instance limiter. Vercel may run several warm
// instances, so this is a speed bump, not a hard guarantee. For a stricter
// limit move the counters to Neon or Upstash Redis.
const buckets = new Map()
const WINDOW_MS = 10 * 60 * 1000

export function rateLimit(key, max, windowMs = WINDOW_MS) {
  const now = Date.now()
  const bucket = buckets.get(key)

  if (!bucket || now - bucket.start > windowMs) {
    buckets.set(key, { start: now, count: 1 })
    return
  }

  bucket.count += 1
  if (bucket.count > max) {
    throw tooManyRequests()
  }
}

export function resetRateLimits() {
  buckets.clear()
}
