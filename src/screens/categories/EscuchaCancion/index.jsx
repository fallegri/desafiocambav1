import { useState } from 'react'
import CancionTitle from './CancionTitle'
import CancionIntro from './CancionIntro'
import CancionAnswer from './CancionAnswer'
import CancionReveal from './CancionReveal'
import RoundEndScreen from '../../../components/RoundEndScreen'
import { pickRandom } from '../../../lib/random'
import { scoreRound } from '../../../lib/scoring'
import canciones from '../../../data/canciones.json'
import './EscuchaCancion.css'

const STEPS = { TITLE: 'title', INTRO: 'intro', ANSWER: 'answer', REVEAL: 'reveal', END: 'end' }

export default function CancionCategory({ onRoundComplete }) {
  const [cancion] = useState(() => pickRandom(canciones))
  const [step, setStep] = useState(STEPS.TITLE)
  const [result, setResult] = useState(null)

  if (step === STEPS.TITLE) {
    return <CancionTitle onStart={() => setStep(STEPS.INTRO)} />
  }
  if (step === STEPS.INTRO) {
    return <CancionIntro cancion={cancion} onDone={() => setStep(STEPS.ANSWER)} />
  }
  if (step === STEPS.ANSWER) {
    return (
      <CancionAnswer
        onFinished={(knewIt) => {
          setResult(scoreRound({ hits: knewIt ? 1 : 0, total: 1 }))
          setStep(STEPS.REVEAL)
        }}
      />
    )
  }
  if (step === STEPS.REVEAL) {
    return <CancionReveal cancion={cancion} onDone={() => setStep(STEPS.END)} />
  }
  return (
    <RoundEndScreen
      score={result?.score}
      maxScore={result?.maxScore}
      onBackToWheel={() => onRoundComplete(result)}
    />
  )
}
