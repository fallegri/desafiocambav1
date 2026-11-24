import { useState } from 'react'
import NoSeDiceIntro from './NoSeDiceIntro'
import NoSeDiceGame from './NoSeDiceGame'
import RoundEndScreen from '../../../components/RoundEndScreen'
import { scoreRound, winnerOf } from '../../../lib/scoring'
import './NoSeDice.css'

const STEPS = { INTRO: 'intro', GAME: 'game', END: 'end' }
const PLAYERS = [{ name: 'Jugador 1' }, { name: 'Jugador 2' }]

export default function NoSeDiceCategory({ onRoundComplete }) {
  const [step, setStep] = useState(STEPS.INTRO)
  const [mode, setMode] = useState('solo')
  const [turn, setTurn] = useState(0)
  const [scores, setScores] = useState([0, 0])
  const [gameKey, setGameKey] = useState(0)
  const [result, setResult] = useState(null)
  const versus = mode === 'vs'

  function start(selectedMode) {
    setMode(selectedMode)
    setTurn(0)
    setScores([0, 0])
    setGameKey((key) => key + 1)
    setResult(null)
    setStep(STEPS.GAME)
  }

  function finishRound(guessed) {
    const nextScores = [...scores]
    if (guessed) nextScores[turn] += 1

    // Player 1's card ends the turn, not the round: remount the game with a
    // fresh phrase for player 2 (the key change resets the timer and card).
    if (versus && turn === 0) {
      setScores(nextScores)
      setTurn(1)
      setGameKey((key) => key + 1)
      return
    }

    if (versus) {
      const players = PLAYERS.map((player, index) => ({
        name: player.name,
        hits: nextScores[index],
        total: 1,
        score: scoreRound({ hits: nextScores[index], total: 1 }).score,
      }))
      const base = scoreRound({ hits: nextScores[0] + nextScores[1], total: 2 })
      setScores(nextScores)
      setResult({ ...base, detail: { ...base.detail, mode: 'vs', players } })
    } else {
      setScores(nextScores)
      setResult(scoreRound({ hits: nextScores[0], total: 1 }))
    }
    setStep(STEPS.END)
  }

  if (step === STEPS.INTRO) return <NoSeDiceIntro onStart={start} />

  if (step === STEPS.GAME) {
    return (
      <NoSeDiceGame
        key={gameKey}
        playerName={versus ? PLAYERS[turn].name : null}
        versus={
          versus
            ? {
                players: PLAYERS.map((player, index) => ({
                  name: player.name,
                  hits: scores[index],
                  total: 1,
                })),
                activeIndex: turn,
              }
            : null
        }
        finishLabel={versus && turn === 0 ? 'Turno de Jugador 2' : 'siguiente'}
        onFinished={finishRound}
      />
    )
  }

  const players = result?.detail?.players
  const winner = winnerOf(players)
  return (
    <RoundEndScreen
      title={versus ? (winner ? '¡Ganó' : '¡Empataron!') : undefined}
      titleBold={winner?.name}
      score={result?.score}
      maxScore={result?.maxScore}
      players={players}
      onBackToWheel={() => onRoundComplete(result)}
    />
  )
}
