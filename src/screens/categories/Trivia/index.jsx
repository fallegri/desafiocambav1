import { useEffect, useMemo, useRef, useState } from 'react'
import TriviaTitle from './TriviaTitle'
import TriviaInstructions from './TriviaInstructions'
import TriviaQuestion from './TriviaQuestion'
import RoundEndScreen from '../../../components/RoundEndScreen'
import { pickRandomN } from '../../../lib/random'
import { scoreRound, winnerOf } from '../../../lib/scoring'
import { buildModismoQuestions } from '../../../lib/modismos'
import { getExtraContent } from '../../../lib/contentCache'
import { pauseBackgroundMusic, playBackgroundMusic } from '../../../lib/backgroundMusic'
import bank from '../../../data/trivia.json'
import './Trivia.css'

const QUESTIONS_PER_ROUND = 5
const VS_QUESTIONS_PER_ROUND = 10
const PLAYERS = [{ name: 'Jugador 1' }, { name: 'Jugador 2' }]
const STEPS = { TITLE: 'title', INSTRUCTIONS: 'instructions', QUESTIONS: 'questions', END: 'end' }

export default function TriviaCategory({ onRoundComplete }) {
  const [step, setStep] = useState(STEPS.TITLE)
  const [mode, setMode] = useState('solo')
  // Approved AI questions and the 100+ modismo words are merged with the
  // bundled general bank. The pool is read once per mount so it cannot
  // change mid-game; each new round picks fresh questions from it.
  const pool = useMemo(() => {
    const extra = getExtraContent('trivia').map((item, index) => ({
      ...item,
      id: item.id ? `ai-${item.id}` : `ai-${index}`,
    }))
    return [...bank, ...buildModismoQuestions(), ...extra]
  }, [])
  const [questions, setQuestions] = useState(() => pickRandomN(pool, QUESTIONS_PER_ROUND))
  const [index, setIndex] = useState(0)
  const [result, setResult] = useState(null)
  // Correct answers are accumulated in refs so the last question can score
  // the whole round without waiting for the state update to land.
  const hitsRef = useRef(0)
  const hitsByPlayerRef = useRef([0, 0])
  const countdownRef = useRef(null)

  const versus = mode === 'vs'
  const activePlayer = versus ? index % 2 : 0

  function startRound(selectedMode) {
    const total = selectedMode === 'vs' ? VS_QUESTIONS_PER_ROUND : QUESTIONS_PER_ROUND
    setMode(selectedMode)
    setQuestions(pickRandomN(pool, total))
    setIndex(0)
    setResult(null)
    hitsRef.current = 0
    hitsByPlayerRef.current = [0, 0]
    setStep(STEPS.QUESTIONS)
  }

  function handleAnswered(correct) {
    if (correct) {
      hitsRef.current += 1
      if (versus) hitsByPlayerRef.current[activePlayer] += 1
    }

    if (index + 1 < questions.length) {
      setIndex(index + 1)
      return
    }

    if (versus) {
      const perPlayerTotal = questions.length / 2
      const players = PLAYERS.map((player, playerIndex) => {
        const hits = hitsByPlayerRef.current[playerIndex]
        return {
          name: player.name,
          hits,
          total: perPlayerTotal,
          score: scoreRound({ hits, total: perPlayerTotal }).score,
        }
      })
      const base = scoreRound({ hits: hitsRef.current, total: questions.length })
      setResult({
        ...base,
        detail: { ...base.detail, mode: 'vs', players },
      })
    } else {
      setResult(scoreRound({ hits: hitsRef.current, total: questions.length }))
    }
    setStep(STEPS.END)
  }

  // The suspense countdown track plays for the whole questions phase (all
  // questions), not per-question — it must not restart every time the
  // question index changes, only when entering/leaving STEPS.QUESTIONS.
  useEffect(() => {
    if (step !== STEPS.QUESTIONS) return
    const audio = countdownRef.current
    pauseBackgroundMusic()
    audio.currentTime = 0
    audio.play().catch(() => {})

    return () => {
      audio.pause()
      playBackgroundMusic()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step === STEPS.QUESTIONS])

  const versusScoreboard = versus
    ? {
        players: PLAYERS.map((player, playerIndex) => ({
          name: player.name,
          hits: hitsByPlayerRef.current[playerIndex],
          total: questions.length / 2,
        })),
        activeIndex: activePlayer,
      }
    : null

  let screen
  if (step === STEPS.TITLE) {
    screen = <TriviaTitle onStart={() => setStep(STEPS.INSTRUCTIONS)} />
  } else if (step === STEPS.INSTRUCTIONS) {
    screen = <TriviaInstructions onStart={startRound} />
  } else if (step === STEPS.QUESTIONS) {
    screen = (
      <TriviaQuestion
        key={questions[index].id ?? index}
        question={questions[index]}
        questionIndex={index}
        total={questions.length}
        versus={versusScoreboard}
        onAnswered={handleAnswered}
      />
    )
  } else {
    const players = result?.detail?.players
    const winner = winnerOf(players)
    screen = (
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

  return (
    <>
      {screen}
      <audio ref={countdownRef} src="/audio/trivia-countdown.mp3" loop data-testid="trivia-countdown-audio" />
    </>
  )
}
