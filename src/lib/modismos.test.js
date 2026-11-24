import { describe, expect, it } from 'vitest'
import bank from '../data/modismos.json'
import { buildModismoQuestion, buildModismoQuestions } from './modismos'

describe('modismos bank', () => {
  it('has at least 100 words from the cruceño, beniano and camba traditions', () => {
    expect(bank.length).toBeGreaterThanOrEqual(100)
    const origins = new Set(bank.map((entry) => entry.origen))
    expect(origins).toContain('cruceño')
    expect(origins).toContain('beniano')
    expect(origins).toContain('camba')
    expect(new Set(bank.map((entry) => entry.palabra)).size).toBe(bank.length)
    expect(new Set(bank.map((entry) => entry.significado)).size).toBe(bank.length)
  })

  it('builds a question with four distinct options and the right answer', () => {
    const entry = bank[0]
    const question = buildModismoQuestion(entry, bank, () => 0.42)

    expect(question.pregunta).toBe(`¿Qué significa «${entry.palabra}»?`)
    expect(question.opciones).toHaveLength(4)
    expect(new Set(question.opciones).size).toBe(4)
    expect(question.opciones[question.correctaIndex]).toBe(entry.significado)
    expect(question.origen).toBe(entry.origen)
  })

  it('builds one question per word and never reuses the same options', () => {
    const questions = buildModismoQuestions(bank, () => 0.1)

    expect(questions).toHaveLength(bank.length)
    expect(new Set(questions.map((question) => question.pregunta)).size).toBe(bank.length)
    questions.forEach((question) => {
      expect(question.opciones).toHaveLength(4)
      expect(question.correctaIndex).toBeGreaterThanOrEqual(0)
    })
  })
})
