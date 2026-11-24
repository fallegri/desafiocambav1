import { render, screen, fireEvent, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import EnchoqueCategory from './index'

describe('EnchoqueCategory', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('goes intro -> instructions -> timer (3:00, counts down) -> round end', () => {
    const onRoundComplete = vi.fn()
    render(<EnchoqueCategory onRoundComplete={onRoundComplete} />)

    expect(screen.getByText('Enchoque!')).toBeInTheDocument()
    fireEvent.click(screen.getByText('¡Inicia!'))

    expect(screen.getByText('Explicación')).toBeInTheDocument()
    expect(screen.getByText('Instrucciones')).toBeInTheDocument()
    fireEvent.click(screen.getByText('¡Inicia!'))

    expect(screen.getByText('3:00')).toBeInTheDocument()
    fireEvent.click(screen.getByText('Empezar'))

    act(() => vi.advanceTimersByTime(180000))
    expect(screen.getByText('0:00')).toBeInTheDocument()

    fireEvent.click(screen.getByText('Terminar ronda'))
    fireEvent.click(screen.getByText('Ir a la ruleta'))
    expect(onRoundComplete).toHaveBeenCalledOnce()
    expect(onRoundComplete).toHaveBeenCalledWith({
      score: 100,
      maxScore: 100,
      detail: { hits: 1, total: 1 },
    })
  })

  it('cancelling the round scores zero', () => {
    const onRoundComplete = vi.fn()
    render(<EnchoqueCategory onRoundComplete={onRoundComplete} />)

    fireEvent.click(screen.getByText('¡Inicia!'))
    fireEvent.click(screen.getByText('¡Inicia!'))
    fireEvent.click(screen.getByText('Empezar'))
    fireEvent.click(screen.getByText('Cancelar'))
    fireEvent.click(screen.getByText('Ir a la ruleta'))

    expect(onRoundComplete).toHaveBeenCalledWith({
      score: 0,
      maxScore: 100,
      detail: { hits: 0, total: 1 },
    })
  })
})
