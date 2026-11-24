import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import AiPanel from './AiPanel'
import { api } from '../lib/api'

vi.mock('../lib/api', () => ({
  api: {
    aiProviders: vi.fn(),
    aiContent: vi.fn(),
    aiGenerate: vi.fn(),
    aiReview: vi.fn(),
  },
}))

const providerConfig = {
  providers: [
    { id: 'openai', label: 'OpenAI', kind: 'openai', models: ['gpt-4o-mini'], defaultModel: 'gpt-4o-mini', local: false },
    { id: 'nvidia', label: 'NVIDIA NIM', kind: 'openai', models: [], defaultModel: 'meta/llama-3.1-70b-instruct', local: false },
  ],
  kinds: [
    { id: 'trivia', label: 'Trivia' },
    { id: 'no_se_dice', label: 'No se dice' },
    { id: 'cancion', label: 'Canción' },
  ],
  configured: true,
}

const propuesta = {
  id: 'c-1',
  kind: 'trivia',
  payload: {
    pregunta: '¿Qué río cruza Santa Cruz de la Sierra?',
    opciones: ['Piraí', 'Pilcomayo', 'Desaguadero', 'Choqueyapu'],
    correctaIndex: 0,
  },
  provider: 'openai',
  model: 'gpt-4o-mini',
  status: 'pendiente',
  created_by_name: 'Ope',
}

describe('AiPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    api.aiProviders.mockResolvedValue(providerConfig)
    api.aiContent.mockResolvedValue({ items: [propuesta], pending: 1 })
  })

  it('lists configured providers and pending proposals', async () => {
    render(<AiPanel onClose={() => {}} />)

    await waitFor(() => expect(screen.getByText('¿Qué río cruza Santa Cruz de la Sierra?')).toBeInTheDocument())
    expect(screen.getByRole('option', { name: 'OpenAI' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: /NVIDIA NIM/ })).toBeInTheDocument()
  })

  it('sends the generation request with the selected provider and model', async () => {
    api.aiGenerate.mockResolvedValue({
      batchId: 'b-1',
      provider: { id: 'openai', label: 'OpenAI', model: 'gpt-4o-mini' },
      requested: 5,
      created: [{ id: 'c-2' }],
      rejected: [{ reason: 'Duplicado' }],
    })

    render(<AiPanel onClose={() => {}} />)
    await waitFor(() => expect(screen.getByRole('button', { name: 'Generar propuestas' })).toBeEnabled())

    fireEvent.click(screen.getByRole('button', { name: 'Generar propuestas' }))

    await waitFor(() =>
      expect(api.aiGenerate).toHaveBeenCalledWith({
        provider: 'openai',
        model: 'gpt-4o-mini',
        kind: 'trivia',
        topic: null,
        count: 5,
      }),
    )
    expect(screen.getByText(/1 se descartaron/)).toBeInTheDocument()
  })

  it('approves a proposal', async () => {
    api.aiReview.mockResolvedValue({ item: { ...propuesta, status: 'aprobado' } })
    render(<AiPanel onClose={() => {}} />)

    await waitFor(() => expect(screen.getByRole('button', { name: 'Aprobar' })).toBeInTheDocument())
    fireEvent.click(screen.getByRole('button', { name: 'Aprobar' }))

    await waitFor(() => expect(api.aiReview).toHaveBeenCalledWith('c-1', { action: 'approve' }))
    expect(screen.getByText('Contenido aprobado')).toBeInTheDocument()
  })

  it('explains when no provider is configured', async () => {
    api.aiProviders.mockResolvedValue({ providers: [], kinds: providerConfig.kinds, configured: false })
    api.aiContent.mockResolvedValue({ items: [], pending: 0 })

    render(<AiPanel onClose={() => {}} />)
    await waitFor(() => expect(screen.getByText(/No hay proveedores configurados/)).toBeInTheDocument())
    expect(screen.getByRole('button', { name: 'Generar propuestas' })).toBeDisabled()
  })
})
