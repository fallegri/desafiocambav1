import { render, screen, fireEvent, act } from '@testing-library/react'
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import { AuthProvider } from './auth/AuthContext'
import { api } from './lib/api'
import * as randomLib from './lib/random'
import categorias from './data/categorias.json'
import { currentPrompt, resolveTriviaAnswer } from './test/triviaHelpers'

// The round score is the bridge between the games and the backend, so it is
// tested end-to-end here: category -> App -> POST /api/achievements.
vi.mock('./lib/api', () => ({
  api: {
    recordResult: vi.fn().mockResolvedValue({}),
    me: vi.fn().mockResolvedValue({ user: null }),
  },
}))

const PLAYER = { id: 'u-1', role: 'participante', status: 'activo', name: 'Jugador' }

function optionButtons() {
  return screen
    .getAllByRole('button')
    .filter((button) => button.className.includes('trivia-question__option'))
}

function answerCurrent() {
  const buttons = optionButtons()
  const labels = buttons.map((button) => button.textContent.replace(/^[A-D]/, '').trim())
  const correctIndex = resolveTriviaAnswer(currentPrompt(), labels)
  expect(correctIndex).toBeGreaterThanOrEqual(0)
  fireEvent.click(buttons[correctIndex])
  fireEvent.click(screen.getAllByText('Siguiente')[0])
}

function reachTrivia() {
  fireEvent.click(screen.getByRole('button', { name: /tocar la pantalla/i }))
  fireEvent.click(screen.getByLabelText('Girar la ruleta'))
  act(() => vi.advanceTimersByTime(4000))
  fireEvent.click(screen.getByText('Iniciar'))
}

function playSoloTrivia() {
  fireEvent.click(screen.getByText('¡Inicia!'))
  fireEvent.click(screen.getByText('Jugar solo'))
  for (let i = 0; i < 5; i += 1) answerCurrent()
  fireEvent.click(screen.getByText('Ir a la ruleta'))
}

describe('App - records the real round score', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.clearAllMocks()
    window.HTMLMediaElement.prototype.play = vi.fn().mockResolvedValue(undefined)
    vi.spyOn(randomLib, 'pickRandom').mockReturnValue(categorias.find((c) => c.id === 'trivia'))
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('posts category, score, maxScore and detail after a perfect trivia round', () => {
    render(
      <AuthProvider initialUser={PLAYER}>
        <App />
      </AuthProvider>,
    )

    reachTrivia()
    playSoloTrivia()

    expect(api.recordResult).toHaveBeenCalledOnce()
    expect(api.recordResult).toHaveBeenCalledWith({
      categoryId: 'trivia',
      score: 100,
      maxScore: 100,
      detail: { hits: 5, total: 5 },
    })
  })

  it('records a 1 vs 1 round with both players in the detail', () => {
    render(
      <AuthProvider initialUser={PLAYER}>
        <App />
      </AuthProvider>,
    )

    reachTrivia()
    fireEvent.click(screen.getByText('¡Inicia!'))
    fireEvent.click(screen.getByText('Jugar 1 vs 1'))
    for (let i = 0; i < 10; i += 1) answerCurrent()
    fireEvent.click(screen.getByText('Ir a la ruleta'))

    expect(api.recordResult).toHaveBeenCalledWith({
      categoryId: 'trivia',
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
  })

  it('does not record anything for a guest', () => {
    render(<App />)

    reachTrivia()
    playSoloTrivia()

    expect(api.recordResult).not.toHaveBeenCalled()
  })
})
