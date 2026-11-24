import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import { AuthProvider } from './auth/AuthContext.jsx'
import { preloadContent } from './lib/contentCache.js'
import { playBackgroundMusic } from './lib/backgroundMusic.js'
import './styles/global.css'

// Staff-approved trivia / word pairs / songs live in the database. Fetch them
// in the background at boot; games fall back to the bundled JSON if this
// fails or has not finished yet.
preloadContent()

// Browsers only allow audio to start after a genuine user gesture. Rather
// than rely on any one specific button, start the background track on the
// very first interaction anywhere on the page — tap, click, or key press —
// so it begins as early as the platform allows, even before the splash's
// own "tap to continue" click.
function startMusicOnFirstInteraction() {
  playBackgroundMusic()
  window.removeEventListener('pointerdown', startMusicOnFirstInteraction)
  window.removeEventListener('keydown', startMusicOnFirstInteraction)
}
window.addEventListener('pointerdown', startMusicOnFirstInteraction, { once: true })
window.addEventListener('keydown', startMusicOnFirstInteraction, { once: true })

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </React.StrictMode>,
)
