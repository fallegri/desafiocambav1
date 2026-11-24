import bank from '../data/modismos.json'

// The bank is a list of words, not pre-baked questions: each round builds
// multiple-choice questions on the fly so 100+ words stay maintainable and
// every question gets fresh distractors.
export const MODISMOS = bank

function shuffle(array, rng) {
  const copy = [...array]
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1))
    const tmp = copy[i]
    copy[i] = copy[j]
    copy[j] = tmp
  }
  return copy
}

export function buildModismoQuestion(entry, all = MODISMOS, rng = Math.random) {
  const distractors = shuffle(
    all.filter(
      (candidate) => candidate.id !== entry.id && candidate.significado !== entry.significado,
    ),
    rng,
  )
    .slice(0, 3)
    .map((candidate) => candidate.significado)

  const opciones = shuffle([entry.significado, ...distractors], rng)

  return {
    id: `modismo-${entry.id}`,
    pregunta: `¿Qué significa «${entry.palabra}»?`,
    opciones,
    correctaIndex: opciones.indexOf(entry.significado),
    palabra: entry.palabra,
    origen: entry.origen,
  }
}

export function buildModismoQuestions(all = MODISMOS, rng = Math.random) {
  return all.map((entry) => buildModismoQuestion(entry, all, rng))
}
