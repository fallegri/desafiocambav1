import { useState } from 'react'
import EnchoqueIntro from './EnchoqueIntro'
import EnchoqueInstructions from './EnchoqueInstructions'
import EnchoqueTimer from './EnchoqueTimer'
import RoundEndScreen from '../../../components/RoundEndScreen'
import { scoreRound } from '../../../lib/scoring'
import './Enchoque.css'

const STEPS = { INTRO: 'intro', INSTRUCTIONS: 'instructions', TIMER: 'timer', END: 'end' }

export default function EnchoqueCategory({ onRoundComplete }) {
  const [step, setStep] = useState(STEPS.INTRO)
  const [result, setResult] = useState(null)

  if (step === STEPS.INTRO) return <EnchoqueIntro onStart={() => setStep(STEPS.INSTRUCTIONS)} />
  if (step === STEPS.INSTRUCTIONS) return <EnchoqueInstructions onStart={() => setStep(STEPS.TIMER)} />
  if (step === STEPS.TIMER) {
    return (
      <EnchoqueTimer
        onFinished={(completed) => {
          setResult(scoreRound({ hits: completed ? 1 : 0, total: 1 }))
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
