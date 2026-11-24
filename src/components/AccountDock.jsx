import { useState } from 'react'
import { useAuth } from '../auth/AuthContext'
import AuthModal from '../auth/AuthModal'
import AdminUsersPanel from '../auth/AdminUsersPanel'
import AiPanel from '../ai/AiPanel'
import './AccountDock.css'

// Floating entry point for the account. Kept inside the scaled stage so it
// lines up with the rest of the HUD (music toggle lives at right: 24px).
export default function AccountDock() {
  const { user } = useAuth()
  const [view, setView] = useState(null)

  const label = user ? user.name : 'Mi cuenta'

  return (
    <>
      <button
        type="button"
        className="account-dock"
        onClick={() => setView('auth')}
        aria-label={user ? `Cuenta de ${user.name}` : 'Iniciar sesión o crear cuenta'}
      >
        <span className="account-dock__icon" aria-hidden="true">
          {user ? user.name.slice(0, 1).toUpperCase() : '◎'}
        </span>
        <span className="account-dock__label">{label}</span>
      </button>

      {view === 'auth' && (
        <AuthModal
          onClose={() => setView(null)}
          onOpenAdmin={() => setView('admin')}
          onOpenAi={() => setView('ai')}
        />
      )}
      {view === 'admin' && <AdminUsersPanel onClose={() => setView(null)} />}
      {view === 'ai' && <AiPanel onClose={() => setView(null)} />}
    </>
  )
}
