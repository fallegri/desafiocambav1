import { useRef, useState } from 'react'
import SplashScreen from './screens/SplashScreen'
import WheelScreen from './screens/WheelScreen'
import CategoryRouter from './CategoryRouter'
import MusicToggle from './components/MusicToggle'
import AccountDock from './components/AccountDock'
import { useAuth } from './auth/AuthContext'
import { api } from './lib/api'
import { useStageScale } from './hooks/useStageScale'
import { playBackgroundMusic } from './lib/backgroundMusic'

const STAGES = { SPLASH: 'splash', WHEEL: 'wheel', CATEGORY: 'category' }

export default function App() {
  const [stage, setStage] = useState(STAGES.SPLASH)
  const [categoryId, setCategoryId] = useState(null)
  const stageRef = useRef(null)
  const scale = useStageScale()
  const { user } = useAuth()

  // Guests play without an account; logged-in players get the round recorded.
  // A failing backend must never block the game, hence the fire-and-forget.
  function recordRound(result) {
    if (!user || !categoryId) return
    // The defensive unknown-category stub reports no score; recording it
    // would add 0/0 rows that only inflate the "rounds played" stats.
    if (!result || !(result.maxScore > 0)) return
    api
      .recordResult({
        categoryId,
        score: result?.score ?? 0,
        maxScore: result?.maxScore ?? 0,
        detail: result?.detail ?? {},
      })
      .catch(() => {})
  }

  function handleRoundComplete(result) {
    recordRound(result)
    setStage(STAGES.WHEEL)
  }

  return (
    <div className="app-shell">
      <div className="stage" ref={stageRef} style={{ transform: `scale(${scale})` }}>
        {stage === STAGES.SPLASH && (
          <SplashScreen
            onContinue={() => {
              // The tap that leaves the splash is the app's first user
              // gesture — autoplay is blocked before that on every
              // browser that enforces the autoplay policy.
              playBackgroundMusic()
              setStage(STAGES.WHEEL)
            }}
          />
        )}
        <MusicToggle />
        <AccountDock />
        {stage === STAGES.WHEEL && (
          <WheelScreen
            onCategorySelected={(id) => {
              setCategoryId(id)
              setStage(STAGES.CATEGORY)
            }}
          />
        )}
        {stage === STAGES.CATEGORY && (
          <CategoryRouter categoryId={categoryId} onRoundComplete={handleRoundComplete} />
        )}
      </div>
    </div>
  )
}
