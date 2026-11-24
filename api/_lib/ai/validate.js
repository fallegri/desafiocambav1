// Validation + normalisation for everything the AI proposes. Nothing reaches
// the database (or the game) without passing through here.
export function normalizeText(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9ñ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function stripControl(text) {
  let clean = ''
  for (const char of text) {
    const code = char.codePointAt(0)
    clean += code < 32 || code === 127 ? ' ' : char
  }
  return clean
}

function cleanString(value, { min = 1, max = 200 } = {}) {
  if (typeof value !== 'string') return null
  const text = stripControl(value).replace(/\s+/g, ' ').trim()
  if (text.length < min || text.length > max) return null
  return text
}

function isInt(value, min, max) {
  return Number.isInteger(value) && value >= min && value <= max
}

export function payloadKey(kind, payload) {
  if (kind === 'trivia') return normalizeText(payload.pregunta)
  if (kind === 'no_se_dice') return normalizeText(payload.frase)
  if (kind === 'cancion') return normalizeText(payload.nombre)
  return ''
}

function validateTrivia(item) {
  const pregunta = cleanString(item?.pregunta, { min: 8, max: 280 })
  if (!pregunta) return { ok: false, reason: 'Pregunta vacía o fuera de largo' }

  if (!Array.isArray(item?.opciones) || item.opciones.length !== 4) {
    return { ok: false, reason: 'La trivia debe tener exactamente 4 opciones' }
  }
  const opciones = item.opciones.map((option) => cleanString(option, { min: 1, max: 120 }))
  if (opciones.some((option) => option === null)) {
    return { ok: false, reason: 'Hay una opción vacía o demasiado larga' }
  }
  if (new Set(opciones.map(normalizeText)).size !== 4) {
    return { ok: false, reason: 'Las opciones deben ser distintas' }
  }
  if (!isInt(item?.correctaIndex, 0, 3)) {
    return { ok: false, reason: 'correctaIndex debe estar entre 0 y 3' }
  }

  return { ok: true, value: { pregunta, opciones, correctaIndex: item.correctaIndex } }
}

function validateNoSeDice(item) {
  const frase = cleanString(item?.frase, { min: 8, max: 160 })
  if (!frase) return { ok: false, reason: 'Frase vacía o fuera de largo' }
  if (!normalizeText(frase).startsWith('no se dice')) {
    return { ok: false, reason: 'La frase debe empezar con "No se dice"' }
  }

  const respuesta = cleanString(item?.respuesta, { min: 1, max: 60 })
  if (!respuesta) return { ok: false, reason: 'Respuesta vacía o demasiado larga' }
  if (normalizeText(respuesta) === normalizeText(frase)) {
    return { ok: false, reason: 'La respuesta no puede ser igual a la frase' }
  }

  return { ok: true, value: { frase, respuesta } }
}

function validateCancion(item) {
  const nombre = cleanString(item?.nombre, { min: 2, max: 120 })
  if (!nombre) return { ok: false, reason: 'Nombre vacío o fuera de largo' }

  const artista = cleanString(item?.artista, { min: 2, max: 120 })
  if (!artista) return { ok: false, reason: 'Artista vacío o fuera de largo' }

  const value = { nombre, artista }
  if (item?.anio !== undefined && item?.anio !== null) {
    if (!isInt(item.anio, 1900, 2100)) return { ok: false, reason: 'Año inválido' }
    value.anio = item.anio
  }
  if (item?.nota !== undefined && item?.nota !== null) {
    const nota = cleanString(item.nota, { min: 1, max: 300 })
    if (!nota) return { ok: false, reason: 'Nota inválida' }
    value.nota = nota
  }
  return { ok: true, value }
}

const VALIDATORS = {
  trivia: validateTrivia,
  no_se_dice: validateNoSeDice,
  cancion: validateCancion,
}

export function validatePayload(kind, item) {
  const validator = VALIDATORS[kind]
  if (!validator) return { ok: false, reason: 'Tipo de contenido desconocido' }
  return validator(item)
}

// Returns the accepted items plus the rejected ones with a human reason, and
// drops duplicates among the proposals themselves and against `existingKeys`.
export function validateItems(kind, rawItems, existingKeys = []) {
  const seen = new Set(existingKeys.map((key) => normalizeText(key)))
  const accepted = []
  const rejected = []

  const items = Array.isArray(rawItems) ? rawItems.slice(0, 20) : []
  for (const item of items) {
    const result = validatePayload(kind, item)
    if (!result.ok) {
      rejected.push({ reason: result.reason, item })
      continue
    }
    const key = payloadKey(kind, result.value)
    if (!key || seen.has(key)) {
      rejected.push({ reason: 'Duplicado', item: result.value })
      continue
    }
    seen.add(key)
    accepted.push(result.value)
  }

  return { accepted, rejected }
}
