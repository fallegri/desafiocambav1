export const CONTENT_KINDS = ['trivia', 'no_se_dice', 'cancion']

export const KIND_LABELS = {
  trivia: 'Trivia (opción múltiple)',
  no_se_dice: 'No se dice (jerga cruceña)',
  cancion: 'Canción',
}

const SYSTEM = `Sos un redactor de contenido para "Desafío Camba", un juego de fiesta sobre la cultura de Santa Cruz de la Sierra, Bolivia.
Reglas:
- Escribí en español rioplatense/camba, con humor y respeto.
- No inventes datos: si no estás seguro de un hecho, no lo incluyas.
- Respondé ÚNICAMENTE con un objeto JSON válido, sin markdown ni explicaciones.`

function existingHint(existing) {
  if (!existing || existing.length === 0) return ''
  return `\nEvitá repetir o parafrasear estos ítems existentes:\n${existing.map((item) => `- ${item}`).join('\n')}`
}

const INSTRUCTIONS = {
  trivia: (count, topic, existing) => `Generá ${count} pregunta(s) de opción múltiple sobre ${topic}.
Cada pregunta debe tener exactamente 4 opciones distintas y una sola respuesta correcta.
Formato exacto:
{"items":[{"pregunta":"texto de la pregunta","opciones":["A","B","C","D"],"correctaIndex":0}]}${existingHint(existing)}`,

  no_se_dice: (count, topic, existing) => `Generá ${count} par(es) de jerga cruceña para el juego "No se dice".
La frase debe empezar con "No se dice ..." y describir una palabra estándar; la respuesta debe ser la palabra o expresión cruceña equivalente.
Formato exacto:
{"items":[{"frase":"No se dice ...","respuesta":"palabra cruceña"}]}${existingHint(existing)}`,

  cancion: (count, topic, existing) => `Sugerí ${count} canción(es) reales de artistas cruceños o bolivianos${topic ? ` relacionadas con ${topic}` : ''}.
No inventes títulos ni artistas. Si no estás seguro del año, omití el campo "anio".
Formato exacto:
{"items":[{"nombre":"Título real","artista":"Intérprete real","anio":1998,"nota":"por qué encaja en el juego"}]}${existingHint(existing)}`,
}

export function buildPrompt(kind, { topic, count, existing = [] }) {
  const instruction = INSTRUCTIONS[kind]
  if (!instruction) throw new Error(`Tipo de contenido desconocido: ${kind}`)
  const safeTopic = topic?.trim() || 'cultura general de Santa Cruz de la Sierra'
  return {
    system: SYSTEM,
    user: instruction(count, safeTopic, existing),
  }
}
