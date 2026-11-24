import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import AdminUsersPanel from './AdminUsersPanel'
import { AuthProvider } from './AuthContext'
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
  },
}))

const pendiente = { id: 'u-1', name: 'Jugador', email: 'jugador@camba.bo', role: 'participante', status: 'pendiente' }

function renderPanel(role = 'operador') {
  return render(
    <AuthProvider initialUser={{ id: 'staff-1', name: 'Staff', role }}>
      <AdminUsersPanel onClose={() => {}} />
    </AuthProvider>,
  )
}

describe('AdminUsersPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    api.listUsers.mockResolvedValue({ users: [pendiente], total: 1, page: 1, limit: 50 })
  })

  it('lists pending users and approves them', async () => {
    api.updateUser.mockResolvedValue({ user: { ...pendiente, status: 'activo' } })
    renderPanel()

    await waitFor(() => expect(screen.getByText('Jugador')).toBeInTheDocument())
    fireEvent.click(screen.getByRole('button', { name: 'Aprobar' }))

    await waitFor(() => expect(api.updateUser).toHaveBeenCalledWith('u-1', { action: 'approve' }))
    expect(screen.getByText(/Jugador · Activo/)).toBeInTheDocument()
  })

  it('hides role assignment from operadores', async () => {
    renderPanel('operador')
    await waitFor(() => expect(screen.getByText('Jugador')).toBeInTheDocument())
    expect(screen.queryByLabelText('Rol de Jugador')).not.toBeInTheDocument()
  })

  it('lets a superadmin assign a role', async () => {
    api.updateUser.mockResolvedValue({ user: { ...pendiente, role: 'operador', status: 'activo' } })
    renderPanel('superadmin')
    await waitFor(() => expect(screen.getByText('Jugador')).toBeInTheDocument())

    fireEvent.change(screen.getByLabelText('Rol de Jugador'), { target: { value: 'operador' } })

    await waitFor(() =>
      expect(api.updateUser).toHaveBeenCalledWith('u-1', { action: 'set_role', role: 'operador' }),
    )
  })

  it('shows the backend error when an action is rejected', async () => {
    api.updateUser.mockRejectedValue(new Error('Solo el super admin puede asignar roles de staff'))
    renderPanel('operador')
    await waitFor(() => expect(screen.getByText('Jugador')).toBeInTheDocument())

    fireEvent.click(screen.getByRole('button', { name: 'Aprobar' }))

    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent('Solo el super admin puede asignar roles de staff'),
    )
  })
})
