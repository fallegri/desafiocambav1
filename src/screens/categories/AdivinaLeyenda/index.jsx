import { useState } from 'react'
import LeyendaTitle from './LeyendaTitle'
import LeyendaInstructions from './LeyendaInstructions'
import LeyendaGame from './LeyendaGame'
import RoundEndScreen from '../../../components/RoundEndScreen'
import { scoreRound } from '../../../lib/scoring'
import './AdivinaLeyenda.css'

const STEPS = { TITLE: 'title', INSTRUCTIONS: 'instructions', GAME: 'game', END: 'end' }

export default function LeyendaCategory({ onRoundComplete }) {
  const [step, setStep] = useState(STEPS.TITLE)
  const [result, setResult] = useState(null)

  if (step === STEPS.TITLE) return <LeyendaTitle onStart={() => setStep(STEPS.INSTRUCTIONS)} />
  if (step === STEPS.INSTRUCTIONS) return <LeyendaInstructions onStart={() => setStep(STEPS.GAME)} />
  if (step === STEPS.GAME) {
    return (
      <LeyendaGame
        onFinished={(guessed) => {
          setResult(scoreRound({ hits: guessed ? 1 : 0, total: 1 }))
          setStep(STEPS.END)
        }}
      />
    )
  }
  return (
    <RoundEndScreen
      score={result?.score}
      maxScore={result?.maxScore}
      onBackToWheel={() => onRoundComplete(result)}
    />
  )
}
