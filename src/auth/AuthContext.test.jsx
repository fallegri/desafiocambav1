import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { AuthProvider, useAuth } from './AuthContext'
import { api } from '../lib/api'

vi.mock('../lib/api', () => ({
  api: {
    me: vi.fn(),
    login: vi.fn(),
    logout: vi.fn(),
    register: vi.fn(),
    achievements: vi.fn(),
    listUsers: vi.fn(),
    updateUser: vi.fn(),
    recordResult: vi.fn(),
  },
}))

function Probe() {
  const { user, login, logout } = useAuth()
  return (
    <div>
      <span data-testid="session">{user ? `${user.name}:${user.role}` : 'invitado'}</span>
      <button type="button" onClick={() => login({ email: 'a@b.bo', password: 'camba2026' })}>
        login
      </button>
      <button type="button" onClick={logout}>
        logout
      </button>
    </div>
  )
}

describe('AuthContext', () => {
  it('starts as guest when no initial user is provided', () => {
    render(
      <AuthProvider initialUser={null}>
        <Probe />
      </AuthProvider>,
    )
    expect(screen.getByTestId('session')).toHaveTextContent('invitado')
  })

  it('stores the user returned by login', async () => {
    api.login.mockResolvedValue({ user: { id: '1', name: 'Ana', role: 'participante' } })
    render(
      <AuthProvider initialUser={null}>
        <Probe />
      </AuthProvider>,
    )

    fireEvent.click(screen.getByText('login'))
    await waitFor(() => expect(screen.getByTestId('session')).toHaveTextContent('Ana:participante'))
  })

  it('clears the user on logout even if the request fails', async () => {
    api.logout.mockRejectedValue(new Error('sin red'))
    render(
      <AuthProvider initialUser={{ id: '1', name: 'Ana', role: 'participante' }}>
        <Probe />
      </AuthProvider>,
    )

    fireEvent.click(screen.getByText('logout'))
    await waitFor(() => expect(screen.getByTestId('session')).toHaveTextContent('invitado'))
  })
})
