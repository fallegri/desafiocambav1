// Cache of staff-approved content coming from the API. Loaded once at app
// boot so the games can read it synchronously when a round starts.
const cache = {
  trivia: [],
  no_se_dice: [],
  cancion: [],
}

const requested = {}
let started = false

export async function loadKind(kind) {
  if (!(kind in cache)) return []
  if (requested[kind]) return cache[kind]
  requested[kind] = true

  try {
    const response = await fetch(`/api/content?kind=${encodeURIComponent(kind)}`)
    if (!response.ok) return cache[kind]
    const data = await response.json()
    if (Array.isArray(data.items)) {
      cache[kind] = data.items
    }
  } catch {
    // Offline or backend not deployed: the bundled JSON is enough to play.
  }
  return cache[kind]
}

export function preloadContent() {
  if (started) return
  started = true
  for (const kind of Object.keys(cache)) {
    loadKind(kind)
  }
}

export function getExtraContent(kind) {
  return cache[kind] ?? []
}

// Test helper: allows a fresh preload per test file.
export function resetContentCache() {
  started = false
  for (const kind of Object.keys(cache)) {
    cache[kind] = []
    delete requested[kind]
  }
}
