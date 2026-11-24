import { render, screen, fireEvent, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import NoSeDiceCategory from './index'

const MISSED = { score: 0, maxScore: 100, detail: { hits: 0, total: 1 } }
const GUESSED = { score: 100, maxScore: 100, detail: { hits: 1, total: 1 } }

describe('NoSeDiceCategory', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('goes intro -> game -> time up -> reveal -> round end -> onRoundComplete', () => {
    const onRoundComplete = vi.fn()
    render(<NoSeDiceCategory onRoundComplete={onRoundComplete} />)

    expect(screen.getByText('se dice...')).toBeInTheDocument()
    fireEvent.click(screen.getByText('Jugar solo'))

    act(() => vi.advanceTimersByTime(10000))

    expect(screen.getByText('¡Se acabó el Tiempo!')).toBeInTheDocument()
    fireEvent.click(screen.getByText('Continuar'))

    expect(screen.getByText('Se dice…')).toBeInTheDocument()
    expect(screen.getByText(/^¡/)).toBeInTheDocument()
    expect(screen.getByText('Ñiee, la sabias?')).toBeInTheDocument()
    fireEvent.click(screen.getByText('siguiente'))

    fireEvent.click(screen.getByText('Ir a la ruleta'))
    expect(onRoundComplete).toHaveBeenCalledOnce()
    expect(onRoundComplete).toHaveBeenCalledWith(MISSED)
    expect(screen.getByText('0 / 100 puntos')).toBeInTheDocument()
  })

  it('"Ya adivinó" shows the reveal screen too, and scores the round', () => {
    const onRoundComplete = vi.fn()
    render(<NoSeDiceCategory onRoundComplete={onRoundComplete} />)
    fireEvent.click(screen.getByText('Jugar solo'))
    fireEvent.click(screen.getByText('Ya adivinó'))

    expect(screen.getByText('Se dice…')).toBeInTheDocument()

    fireEvent.click(screen.getByText('siguiente'))
    fireEvent.click(screen.getByText('Ir a la ruleta'))
    expect(onRoundComplete).toHaveBeenCalledWith(GUESSED)
  })

  it('plays one card per player in 1 vs 1 and reports both scores', () => {
    const onRoundComplete = vi.fn()
    render(<NoSeDiceCategory onRoundComplete={onRoundComplete} />)
    fireEvent.click(screen.getByText('Jugar 1 vs 1'))

    expect(screen.getByText('Turno de Jugador 1')).toBeInTheDocument()
    fireEvent.click(screen.getByText('Ya adivinó'))
    fireEvent.click(screen.getByText('Turno de Jugador 2'))

    expect(screen.getByText('Turno de Jugador 2')).toBeInTheDocument()
    act(() => vi.advanceTimersByTime(10000))
    fireEvent.click(screen.getByText('Continuar'))
    fireEvent.click(screen.getByText('siguiente'))
    fireEvent.click(screen.getByText('Ir a la ruleta'))

    expect(onRoundComplete).toHaveBeenCalledWith({
      score: 50,
      maxScore: 100,
      detail: {
        hits: 1,
        total: 2,
        mode: 'vs',
        players: [
          { name: 'Jugador 1', hits: 1, total: 1, score: 100 },
          { name: 'Jugador 2', hits: 0, total: 1, score: 0 },
        ],
      },
    })
    expect(screen.getByText('¡Ganó')).toBeInTheDocument()
    expect(screen.getByText('1/1 · 100 pts')).toBeInTheDocument()
    expect(screen.getByText('0/1 · 0 pts')).toBeInTheDocument()
  })

  it('declares a tie when both players miss their card', () => {
    const onRoundComplete = vi.fn()
    render(<NoSeDiceCategory onRoundComplete={onRoundComplete} />)
    fireEvent.click(screen.getByText('Jugar 1 vs 1'))

    for (let i = 0; i < 2; i++) {
      act(() => vi.advanceTimersByTime(10000))
      fireEvent.click(screen.getByText('Continuar'))
      fireEvent.click(screen.getByText(i === 0 ? 'Turno de Jugador 2' : 'siguiente'))
    }

    fireEvent.click(screen.getByText('Ir a la ruleta'))
    expect(onRoundComplete).toHaveBeenCalledWith({
      score: 0,
      maxScore: 100,
      detail: {
        hits: 0,
        total: 2,
        mode: 'vs',
        players: [
          { name: 'Jugador 1', hits: 0, total: 1, score: 0 },
          { name: 'Jugador 2', hits: 0, total: 1, score: 0 },
        ],
      },
    })
    expect(screen.getByText('¡Empataron!')).toBeInTheDocument()
  })
})
