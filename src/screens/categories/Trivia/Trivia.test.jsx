import { render, screen, fireEvent, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import TriviaCategory from './index'
import { currentPrompt, resolveTriviaAnswer } from '../../../test/triviaHelpers'

function optionButtons() {
  return screen
    .getAllByRole('button')
    .filter((button) => button.className.includes('trivia-question__option'))
}

function optionLabels(buttons) {
  return buttons.map((button) => button.textContent.replace(/^[A-D]/, '').trim())
}

function startSolo() {
  fireEvent.click(screen.getByText('¡Inicia!'))
  fireEvent.click(screen.getByText('Jugar solo'))
}

function startVersus() {
  fireEvent.click(screen.getByText('¡Inicia!'))
  fireEvent.click(screen.getByText('Jugar 1 vs 1'))
}

function answerCurrent(correct = true) {
  const buttons = optionButtons()
  const labels = optionLabels(buttons)
  const answerIndex = resolveTriviaAnswer(currentPrompt(), labels)
  expect(answerIndex).toBeGreaterThanOrEqual(0)
  const wrongIndex = labels.findIndex((_, index) => index !== answerIndex)
  fireEvent.click(buttons[correct ? answerIndex : wrongIndex])
  fireEvent.click(screen.getAllByText('Siguiente')[0])
}

describe('TriviaCategory', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('asks exactly 5 questions in solo mode then reaches round end', () => {
    const onRoundComplete = vi.fn()
    render(<TriviaCategory onRoundComplete={onRoundComplete} />)

    expect(screen.getByText('Cultura general!')).toBeInTheDocument()
    startSolo()
    expect(screen.getByText(/Pregunta 1 de 5/)).toBeInTheDocument()

    for (let i = 1; i <= 5; i++) {
      expect(screen.getByText(new RegExp(`Pregunta ${i} de 5`))).toBeInTheDocument()

      // Each question must mount fresh: all 4 options enabled, countdown back
      // at 15, and no leftover reveal text from the previous question.
      const options = optionButtons()
      expect(options).toHaveLength(4)
      options.forEach((opt) => expect(opt).not.toBeDisabled())

      const progressBar = screen.getByRole('progressbar')
      expect(progressBar).toHaveAttribute('aria-valuenow', '15')

      expect(screen.queryByText(/^Respuesta correcta:/)).not.toBeInTheDocument()

      // Answer correctly so the round scores 5/5 regardless of which
      // questions the random draw picked (general or modismo).
      answerCurrent(true)
    }

    expect(onRoundComplete).not.toHaveBeenCalled() // still needs a manual click on Ir a la ruleta
    fireEvent.click(screen.getByText('Ir a la ruleta'))
    expect(onRoundComplete).toHaveBeenCalledOnce()
    expect(onRoundComplete).toHaveBeenCalledWith({
      score: 100,
      maxScore: 100,
      detail: { hits: 5, total: 5 },
    })
    expect(screen.getByText('100 / 100 puntos')).toBeInTheDocument()
  })

  it('scores a round where every question times out as zero', () => {
    const onRoundComplete = vi.fn()
    render(<TriviaCategory onRoundComplete={onRoundComplete} />)
    startSolo()

    for (let i = 0; i < 5; i++) {
      act(() => vi.advanceTimersByTime(15000))
      fireEvent.click(screen.getByText('Siguiente'))
      fireEvent.click(screen.getByText('Continuar'))
    }

    fireEvent.click(screen.getByText('Ir a la ruleta'))
    expect(onRoundComplete).toHaveBeenCalledWith({
      score: 0,
      maxScore: 100,
      detail: { hits: 0, total: 5 },
    })
  })

  it('shows the time-up overlay when the 15s countdown expires', () => {
    render(<TriviaCategory onRoundComplete={() => {}} />)
    startSolo()
    act(() => vi.advanceTimersByTime(15000))
    expect(screen.getByText('¡Se acabó el Tiempo!')).toBeInTheDocument()
  })

  it('plays 10 alternating questions in 1 vs 1 and reports both players', () => {
    const onRoundComplete = vi.fn()
    render(<TriviaCategory onRoundComplete={onRoundComplete} />)
    startVersus()

    for (let i = 1; i <= 10; i++) {
      const turn = i % 2 === 1 ? 'Jugador 1' : 'Jugador 2'
      expect(screen.getByText(new RegExp(`Pregunta ${i} de 10`))).toBeInTheDocument()
      expect(screen.getByText(new RegExp(`Turno de ${turn}`))).toBeInTheDocument()
      answerCurrent(true)
    }

    fireEvent.click(screen.getByText('Ir a la ruleta'))
    expect(onRoundComplete).toHaveBeenCalledWith({
      score: 100,
      maxScore: 100,
      detail: {
        hits: 10,
        total: 10,
        mode: 'vs',
        players: [
          { name: 'Jugador 1', hits: 5, total: 5, score: 100 },
          { name: 'Jugador 2', hits: 5, total: 5, score: 100 },
        ],
      },
    })
    expect(screen.getByText('¡Empataron!')).toBeInTheDocument()
    expect(screen.getAllByText('5/5 · 100 pts')).toHaveLength(2)
  })

  it('declares the player with more hits as the winner', () => {
    const onRoundComplete = vi.fn()
    render(<TriviaCategory onRoundComplete={onRoundComplete} />)
    startVersus()

    for (let i = 1; i <= 10; i++) {
      answerCurrent(i % 2 === 1)
    }

    fireEvent.click(screen.getByText('Ir a la ruleta'))
    expect(onRoundComplete).toHaveBeenCalledWith({
      score: 50,
      maxScore: 100,
      detail: {
        hits: 5,
        total: 10,
        mode: 'vs',
        players: [
          { name: 'Jugador 1', hits: 5, total: 5, score: 100 },
          { name: 'Jugador 2', hits: 0, total: 5, score: 0 },
        ],
      },
    })
    expect(screen.getByText('¡Ganó')).toBeInTheDocument()
    expect(screen.getAllByText('Jugador 1').length).toBeGreaterThan(0)
  })
})
