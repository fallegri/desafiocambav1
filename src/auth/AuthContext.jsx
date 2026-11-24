import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { api } from '../lib/api'

// Safe default so components can call useAuth() outside the provider (for
// example in isolated unit tests) and simply behave like a guest.
const GUEST_CONTEXT = {
  user: null,
  loading: false,
  error: null,
  login: async () => {},
  register: async () => {},
  logout: async () => {},
  refresh: async () => {},
}

const AuthContext = createContext(GUEST_CONTEXT)

export function AuthProvider({ children, initialUser = undefined }) {
  const [user, setUser] = useState(initialUser ?? null)
  const [loading, setLoading] = useState(initialUser === undefined)
  const [error, setError] = useState(null)

  const refresh = useCallback(async () => {
    try {
      const data = await api.me()
      setUser(data.user ?? null)
      setError(null)
    } catch (apiError) {
      // A backend that is not deployed yet must not block the game.
      setUser(null)
      setError(apiError.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (initialUser === undefined) refresh()
  }, [initialUser, refresh])

  const login = useCallback(async (credentials) => {
    const data = await api.login(credentials)
    setUser(data.user)
    setError(null)
    return data.user
  }, [])

  const register = useCallback(async (payload) => {
    return api.register(payload)
  }, [])

  const logout = useCallback(async () => {
    try {
      await api.logout()
    } catch {
      // Clearing local state is enough: the cookie may already be gone or
      // the network may be down, and the user asked to leave either way.
    }
    setUser(null)
  }, [])

  const value = useMemo(
    () => ({ user, loading, error, login, register, logout, refresh }),
    [user, loading, error, login, register, logout, refresh],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  return useContext(AuthContext)
}
