import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import RoundEndScreen from './RoundEndScreen'

describe('RoundEndScreen', () => {
  it('renders the default message and triggers onBackToWheel', () => {
    const onBackToWheel = vi.fn()
    render(<RoundEndScreen onBackToWheel={onBackToWheel} />)
    expect(screen.getByText(/Facilingo/)).toBeInTheDocument()
    fireEvent.click(screen.getByText('Ir a la ruleta'))
    expect(onBackToWheel).toHaveBeenCalledOnce()
  })

  it('shows the round score when the category reports one', () => {
    render(<RoundEndScreen score={60} maxScore={100} onBackToWheel={() => {}} />)
    expect(screen.getByText('60 / 100 puntos')).toBeInTheDocument()
  })

  it('omits the score line when the round has no score', () => {
    render(<RoundEndScreen onBackToWheel={() => {}} />)
    expect(screen.queryByText(/puntos$/)).not.toBeInTheDocument()
  })

  it('lists each player when the round was 1 vs 1', () => {
    render(
      <RoundEndScreen
        score={50}
        maxScore={100}
        players={[
          { name: 'Jugador 1', hits: 5, total: 5, score: 100 },
          { name: 'Jugador 2', hits: 0, total: 5, score: 0 },
        ]}
        onBackToWheel={() => {}}
      />,
    )

    expect(screen.getByLabelText('Puntajes por jugador')).toBeInTheDocument()
    expect(screen.getByText('5/5 · 100 pts')).toBeInTheDocument()
    expect(screen.getByText('0/5 · 0 pts')).toBeInTheDocument()
  })
})
