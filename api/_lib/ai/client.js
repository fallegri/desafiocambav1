import { HttpError } from '../errors.js'

const TIMEOUT_MS = 30_000
const RETRYABLE = new Set([429, 500, 502, 503, 504])

// Extracts the first balanced JSON object from a model response, ignoring
// markdown fences and any prose the model adds around it.
export function extractJson(text) {
  if (typeof text !== 'string') return null
  const start = text.indexOf('{')
  if (start === -1) return null

  let depth = 0
  let inString = false
  let escaped = false

  for (let index = start; index < text.length; index += 1) {
    const char = text[index]

    if (inString) {
      if (escaped) escaped = false
      else if (char === '\\') escaped = true
      else if (char === '"') inString = false
      continue
    }

    if (char === '"') {
      inString = true
      continue
    }

    if (char === '{') depth += 1
    else if (char === '}') {
      depth -= 1
      if (depth === 0) {
        try {
          return JSON.parse(text.slice(start, index + 1))
        } catch {
          return null
        }
      }
    }
  }

  return null
}

async function callOpenAI(provider, system, user, fetchImpl) {
  const response = await fetchImpl(`${provider.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${provider.apiKey}`,
    },
    body: JSON.stringify({
      model: provider.model,
      temperature: 0.8,
      max_tokens: 2000,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
    }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  })

  if (!response.ok) {
    throw await providerError(provider, response)
  }

  const data = await response.json().catch(() => ({}))
  return data?.choices?.[0]?.message?.content ?? ''
}

async function callAnthropic(provider, system, user, fetchImpl) {
  const response = await fetchImpl(`${provider.baseUrl}/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': provider.apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: provider.model,
      max_tokens: 2000,
      temperature: 0.8,
      system,
      messages: [{ role: 'user', content: user }],
    }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  })

  if (!response.ok) {
    throw await providerError(provider, response)
  }

  const data = await response.json().catch(() => ({}))
  const blocks = Array.isArray(data?.content) ? data.content : []
  return blocks
    .filter((block) => block?.type === 'text')
    .map((block) => block.text)
    .join('\n')
}

async function providerError(provider, response) {
  const body = await response.text().catch(() => '')
  console.error(`[ai] ${provider.id} respondió ${response.status}: ${body.slice(0, 400)}`)
  const error = new HttpError(502, `El proveedor ${provider.label} devolvió un error (${response.status})`)
  error.providerStatus = response.status
  return error
}

export async function chatJson(provider, { system, user }, { fetchImpl = fetch } = {}) {
  const call = provider.kind === 'anthropic' ? callAnthropic : callOpenAI

  let text
  try {
    text = await call(provider, system, user, fetchImpl)
  } catch (error) {
    if (error instanceof HttpError && RETRYABLE.has(error.providerStatus)) {
      text = await call(provider, system, user, fetchImpl)
    } else {
      throw error
    }
  }

  const json = extractJson(text)
  if (!json) {
    throw new HttpError(502, 'La IA no devolvió un JSON válido. Probá de nuevo o cambiá de modelo.')
  }
  return { json, raw: text }
}
