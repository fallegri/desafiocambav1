import { useState } from 'react'
import MencionaLugaresIntro from './MencionaLugaresIntro'
import MencionaLugaresGame from './MencionaLugaresGame'
import RoundEndScreen from '../../../components/RoundEndScreen'
import { scoreRound } from '../../../lib/scoring'
import './MencionaLugares.css'

const STEPS = { INTRO: 'intro', GAME: 'game', END: 'end' }

export default function MencionaLugaresCategory({ onRoundComplete }) {
  const [step, setStep] = useState(STEPS.INTRO)
  const [result, setResult] = useState(null)

  if (step === STEPS.INTRO) return <MencionaLugaresIntro onStart={() => setStep(STEPS.GAME)} />
  if (step === STEPS.GAME) {
    return (
      <MencionaLugaresGame
        onFinished={(finished) => {
          setResult(scoreRound({ hits: finished ? 1 : 0, total: 1 }))
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
