import bank from '../data/trivia.json'
import modismos from '../data/modismos.json'

// Resolves the correct option for whichever kind of trivia question is on
// screen. Tests read the rendered prompt, so they stay independent of the
// random draw (general bank or the generated modismo questions).
export function resolveTriviaAnswer(prompt, options) {
  const modismoMatch = prompt.match(/^¿Qué significa «(.+)»\?$/)
  if (modismoMatch) {
    const entry = modismos.find((item) => item.palabra === modismoMatch[1])
    return entry ? options.indexOf(entry.significado) : -1
  }
  const question = bank.find((item) => item.pregunta === prompt)
  return question ? question.correctaIndex : -1
}

export function currentPrompt() {
  return document.querySelector('.category-game__prompt')?.textContent ?? ''
}
