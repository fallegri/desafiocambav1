import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import AccountDock from './AccountDock'
import { AuthProvider } from '../auth/AuthContext'
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

describe('AccountDock', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    api.achievements.mockResolvedValue({
      achievements: [],
      stats: { resultsCount: 0, totalPoints: 0, totalMax: 0 },
    })
  })

  it('opens the account modal for guests', () => {
    render(
      <AuthProvider initialUser={null}>
        <AccountDock />
      </AuthProvider>,
    )

    expect(screen.getByRole('button', { name: 'Iniciar sesión o crear cuenta' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Iniciar sesión o crear cuenta' }))

    expect(screen.getByRole('dialog', { name: 'Cuenta' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Ingresar' })).toBeInTheDocument()
  })

  it('greets a logged-in player by name', async () => {
    render(
      <AuthProvider initialUser={{ id: '1', name: 'Ana', role: 'participante' }}>
        <AccountDock />
      </AuthProvider>,
    )

    expect(screen.getByRole('button', { name: 'Cuenta de Ana' })).toBeInTheDocument()
  })

  it('takes a staff member from the profile to the admin panel', async () => {
    api.listUsers.mockResolvedValue({ users: [], total: 0, page: 1, limit: 50 })
    render(
      <AuthProvider initialUser={{ id: '1', name: 'Ope', role: 'operador' }}>
        <AccountDock />
      </AuthProvider>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Cuenta de Ope' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Administrar usuarios' }))

    await waitFor(() =>
      expect(screen.getByRole('dialog', { name: 'Administrar usuarios' })).toBeInTheDocument(),
    )
  })
})
