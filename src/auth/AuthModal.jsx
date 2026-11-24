import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import { useAuth } from './AuthContext'
import { ROLE_LABELS } from './roles'
import './auth.css'

const MODES = { LOGIN: 'login', REGISTER: 'register' }

function LoginForm() {
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      await login({ email, password })
    } catch (apiError) {
      setError(apiError.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form className="auth-form" onSubmit={handleSubmit} noValidate>
      <label className="auth-field">
        <span>Email</span>
        <input
          type="email"
          name="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />
      </label>
      <label className="auth-field">
        <span>Contraseña</span>
        <input
          type="password"
          name="password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
        />
      </label>
      {error && <p className="auth-message auth-message--error" role="alert">{error}</p>}
      <button className="auth-submit" type="submit" disabled={submitting}>
        {submitting ? 'Ingresando…' : 'Ingresar'}
      </button>
    </form>
  )
}

function RegisterForm({ onRegistered }) {
  const { register } = useAuth()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [details, setDetails] = useState({})
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    setSubmitting(true)
    setError(null)
    setDetails({})
    try {
      const data = await register({ name, email, password })
      onRegistered?.(data.message)
    } catch (apiError) {
      setError(apiError.message)
      setDetails(apiError.details ?? {})
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form className="auth-form" onSubmit={handleSubmit} noValidate>
      <label className="auth-field">
        <span>Nombre</span>
        <input
          type="text"
          name="name"
          autoComplete="nickname"
          value={name}
          onChange={(event) => setName(event.target.value)}
          required
        />
      </label>
      {details.name && <p className="auth-hint">{details.name}</p>}
      <label className="auth-field">
        <span>Email</span>
        <input
          type="email"
          name="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />
      </label>
      {details.email && <p className="auth-hint">{details.email}</p>}
      <label className="auth-field">
        <span>Contraseña</span>
        <input
          type="password"
          name="password"
          autoComplete="new-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
        />
      </label>
      <p className="auth-hint">Mínimo 8 caracteres, con al menos una letra y un número.</p>
      {details.password && <p className="auth-hint">{details.password}</p>}
      {error && <p className="auth-message auth-message--error" role="alert">{error}</p>}
      <button className="auth-submit" type="submit" disabled={submitting}>
        {submitting ? 'Enviando…' : 'Pedir cuenta'}
      </button>
      <p className="auth-legal">
        Jugar no requiere cuenta. Si te registrás, un operador debe aprobar tu cuenta para que tus logros queden guardados.
      </p>
    </form>
  )
}

function Profile() {
  const { user, logout } = useAuth()
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false
    api
      .achievements()
      .then((result) => {
        if (!cancelled) setData(result)
      })
      .catch((apiError) => {
        if (!cancelled) setError(apiError.message)
      })
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="auth-profile">
      <div className="auth-profile__head">
        <div>
          <p className="auth-profile__name">{user.name}</p>
          <p className="auth-profile__email">{user.email}</p>
        </div>
        <span className={`auth-badge auth-badge--${user.role}`}>{ROLE_LABELS[user.role] ?? user.role}</span>
      </div>

      <section className="auth-profile__section">
        <h3>Mis logros</h3>
        {error && <p className="auth-message auth-message--error">{error}</p>}
        {!data && !error && <p className="auth-hint">Cargando logros…</p>}
        {data && data.achievements.length === 0 && (
          <p className="auth-hint">Todavía no desbloqueaste logros. ¡Jugá una ronda para empezar!</p>
        )}
        {data && data.achievements.length > 0 && (
          <ul className="auth-achievements">
            {data.achievements.map((achievement) => (
              <li key={achievement.id}>
                <strong>{achievement.label}</strong>
                <span>+{achievement.points} pts</span>
              </li>
            ))}
          </ul>
        )}
        {data && (
          <p className="auth-stats">
            {data.stats.resultsCount} rondas jugadas · {data.stats.totalPoints} puntos
          </p>
        )}
      </section>

      <button className="auth-submit auth-submit--ghost" type="button" onClick={logout}>
        Cerrar sesión
      </button>
    </div>
  )
}

export default function AuthModal({ onClose, onOpenAdmin, onOpenAi }) {
  const { user, loading } = useAuth()
  const [mode, setMode] = useState(MODES.LOGIN)
  const [notice, setNotice] = useState(null)
  const isStaff = user?.role === 'superadmin' || user?.role === 'operador'

  return (
    <div className="auth-overlay" role="dialog" aria-modal="true" aria-label="Cuenta">
      <div className="auth-panel">
        <button className="auth-close" type="button" onClick={onClose} aria-label="Cerrar">
          ✕
        </button>

        {loading && <p className="auth-hint">Cargando cuenta…</p>}

        {!loading && user && (
          <>
            <Profile />
            {isStaff && (
              <div className="auth-staff-actions">
                <button className="auth-submit" type="button" onClick={onOpenAdmin}>
                  Administrar usuarios
                </button>
                <button className="auth-submit auth-submit--ghost" type="button" onClick={onOpenAi}>
                  Asistente IA
                </button>
              </div>
            )}
          </>
        )}

        {!loading && !user && (
          <>
            <h2 className="auth-title">Tu cuenta</h2>
            <div className="auth-tabs" role="tablist">
              <button
                type="button"
                role="tab"
                aria-selected={mode === MODES.LOGIN}
                className={`auth-tab ${mode === MODES.LOGIN ? 'is-active' : ''}`}
                onClick={() => setMode(MODES.LOGIN)}
              >
                Ingresar
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={mode === MODES.REGISTER}
                className={`auth-tab ${mode === MODES.REGISTER ? 'is-active' : ''}`}
                onClick={() => setMode(MODES.REGISTER)}
              >
                Crear cuenta
              </button>
            </div>

            {notice && <p className="auth-message auth-message--ok">{notice}</p>}

            {mode === MODES.LOGIN && <LoginForm />}
            {mode === MODES.REGISTER && (
              <RegisterForm
                onRegistered={(message) => {
                  setNotice(message)
                  setMode(MODES.LOGIN)
                }}
              />
            )}
          </>
        )}
      </div>
    </div>
  )
}
