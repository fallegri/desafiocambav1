import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import AuthModal from './AuthModal'
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
    recordResult: vi.fn(),
  },
}))

const jugador = { id: '1', name: 'Ana', email: 'ana@camba.bo', role: 'participante' }

function renderModal() {
  return render(
    <AuthProvider initialUser={null}>
      <AuthModal onClose={() => {}} onOpenAdmin={() => {}} />
    </AuthProvider>,
  )
}

describe('AuthModal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    api.achievements.mockResolvedValue({
      achievements: [],
      stats: { resultsCount: 0, totalPoints: 0, totalMax: 0 },
    })
  })

  it('logs in and shows the profile', async () => {
    api.login.mockResolvedValue({ user: jugador })
    renderModal()

    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'ana@camba.bo' } })
    fireEvent.change(screen.getByLabelText('Contraseña'), { target: { value: 'camba2026' } })
    fireEvent.click(screen.getByRole('button', { name: 'Ingresar' }))

    await waitFor(() => expect(screen.getByText('Ana')).toBeInTheDocument())
    expect(screen.getByText('Participante')).toBeInTheDocument()
    expect(api.login).toHaveBeenCalledWith({ email: 'ana@camba.bo', password: 'camba2026' })
  })

  it('shows the backend error when login fails', async () => {
    api.login.mockRejectedValue(Object.assign(new Error('Email o contraseña incorrectos'), { status: 401 }))
    renderModal()

    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'ana@camba.bo' } })
    fireEvent.change(screen.getByLabelText('Contraseña'), { target: { value: 'mala' } })
    fireEvent.click(screen.getByRole('button', { name: 'Ingresar' }))

    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Email o contraseña incorrectos'))
  })

  it('registers a pending account and explains the approval step', async () => {
    api.register.mockResolvedValue({
      user: { ...jugador, status: 'pendiente' },
      message: 'Registro creado. Un operador debe aprobar tu cuenta antes de que puedas iniciar sesión.',
    })
    renderModal()

    fireEvent.click(screen.getByRole('tab', { name: 'Crear cuenta' }))
    fireEvent.change(screen.getByLabelText('Nombre'), { target: { value: 'Ana' } })
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'ana@camba.bo' } })
    fireEvent.change(screen.getByLabelText('Contraseña'), { target: { value: 'camba2026' } })
    fireEvent.click(screen.getByRole('button', { name: 'Pedir cuenta' }))

    await waitFor(() => expect(screen.getByText(/Un operador debe aprobar tu cuenta/)).toBeInTheDocument())
    expect(api.register).toHaveBeenCalledWith({ name: 'Ana', email: 'ana@camba.bo', password: 'camba2026' })
  })

  it('shows field-level validation details from the backend', async () => {
    api.register.mockRejectedValue(
      Object.assign(new Error('Revisá los datos ingresados'), {
        status: 400,
        details: { password: 'La contraseña debe incluir al menos una letra y un número' },
      }),
    )
    renderModal()

    fireEvent.click(screen.getByRole('tab', { name: 'Crear cuenta' }))
    fireEvent.change(screen.getByLabelText('Nombre'), { target: { value: 'Ana' } })
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'ana@camba.bo' } })
    fireEvent.change(screen.getByLabelText('Contraseña'), { target: { value: 'sinNumeros' } })
    fireEvent.click(screen.getByRole('button', { name: 'Pedir cuenta' }))

    await waitFor(() => expect(screen.getByText(/al menos una letra y un número/)).toBeInTheDocument())
  })

  it('offers the admin panel only to staff', async () => {
    api.login.mockResolvedValue({ user: { ...jugador, role: 'operador' } })
    renderModal()

    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'ana@camba.bo' } })
    fireEvent.change(screen.getByLabelText('Contraseña'), { target: { value: 'camba2026' } })
    fireEvent.click(screen.getByRole('button', { name: 'Ingresar' }))

    await waitFor(() => expect(screen.getByRole('button', { name: 'Administrar usuarios' })).toBeInTheDocument())
  })
})
