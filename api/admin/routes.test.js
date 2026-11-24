// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest'

// The admin routes share one serverless function each (Vercel Hobby caps a
// deployment at 12), so dispatch is the part worth pinning: URLs must behave
// exactly like the old index.js + [id].js pair.
const mocks = vi.hoisted(() => ({
  listUsers: vi.fn(async () => ({ users: [{ id: 'u-1' }], total: 1 })),
  applyUserAction: vi.fn(async (_sql, { targetId }) => ({
    id: targetId,
    role: 'participante',
    status: 'activo',
  })),
  listAvailableProviders: vi.fn(() => [{ id: 'openai' }]),
  resolveProvider: vi.fn(() => ({ id: 'openai', model: 'gpt-test' })),
  generateContent: vi.fn(async () => ({ batchId: 'b-1', created: [{}], rejected: [] })),
  listContent: vi.fn(async () => [{ id: 'c-1' }]),
  pendingCount: vi.fn(async () => 2),
  reviewContent: vi.fn(async (_sql, { id }) => ({ id, kind: 'trivia', status: 'aprobado' })),
}))

vi.mock('../_lib/db.js', () => ({ getSql: () => ({}) }))
vi.mock('../_lib/session.js', () => ({
  requireStaff: async () => ({ id: 'admin-1', role: 'superadmin' }),
}))
vi.mock('../_lib/audit.js', () => ({ logAudit: async () => {} }))
vi.mock('../_lib/users.js', () => ({
  listUsers: mocks.listUsers,
  applyUserAction: mocks.applyUserAction,
  ROLES: ['participante', 'operador', 'superadmin'],
  STATUSES: ['pendiente', 'activo', 'rechazado', 'bloqueado'],
}))
vi.mock('../_lib/ai/providers.js', () => ({
  listAvailableProviders: mocks.listAvailableProviders,
  resolveProvider: mocks.resolveProvider,
}))
vi.mock('../_lib/ai/prompts.js', () => ({
  CONTENT_KINDS: ['trivia', 'no_se_dice', 'cancion'],
  KIND_LABELS: { trivia: 'Trivia', no_se_dice: 'No se dice', cancion: 'Canción' },
}))
vi.mock('../_lib/ai/content.js', () => ({
  generateContent: mocks.generateContent,
  listContent: mocks.listContent,
  pendingCount: mocks.pendingCount,
  reviewContent: mocks.reviewContent,
}))

const { default: usersHandler } = await import('./users/[...path].js')
const { default: aiHandler } = await import('./ai/[...path].js')

function makeResponse() {
  return {
    statusCode: 200,
    headers: {},
    payload: null,
    setHeader(name, value) {
      this.headers[name.toLowerCase()] = value
    },
    end(body) {
      this.payload = body ? JSON.parse(body) : null
    },
  }
}

function makeRequest({ method = 'GET', path, query = {}, body } = {}) {
  return {
    method,
    headers: {},
    url: '/api/admin/test',
    query: { ...(path === undefined ? {} : { path }), ...query },
    body,
    socket: {},
  }
}

async function call(handler, request) {
  const res = makeResponse()
  await handler(request, res)
  return res
}

beforeEach(() => vi.clearAllMocks())

describe('admin users router', () => {
  it('lists users on GET /api/admin/users', async () => {
    const res = await call(
      usersHandler,
      makeRequest({ query: { status: 'pendiente', page: '2' } }),
    )

    expect(res.statusCode).toBe(200)
    expect(res.payload).toMatchObject({ page: 2, total: 1 })
    expect(mocks.listUsers).toHaveBeenCalledWith(expect.anything(), {
      status: 'pendiente',
      search: null,
      limit: 50,
      offset: 50,
    })
  })

  it('applies an action on PATCH /api/admin/users/:id', async () => {
    const res = await call(
      usersHandler,
      makeRequest({ method: 'PATCH', path: ['u-1'], body: { action: 'approve' } }),
    )

    expect(res.statusCode).toBe(200)
    expect(mocks.applyUserAction).toHaveBeenCalledWith(expect.anything(), {
      actor: { id: 'admin-1', role: 'superadmin' },
      targetId: 'u-1',
      action: 'approve',
      role: null,
    })
    expect(res.payload.user.id).toBe('u-1')
  })

  it('rejects an unknown action and an unknown route', async () => {
    const badAction = await call(
      usersHandler,
      makeRequest({ method: 'PATCH', path: ['u-1'], body: { action: 'destroy' } }),
    )
    expect(badAction.statusCode).toBe(400)

    const wrongMethod = await call(usersHandler, makeRequest({ path: ['u-1'] }))
    expect(wrongMethod.statusCode).toBe(405)
    expect(wrongMethod.headers.allow).toBe('PATCH')

    const missing = await call(usersHandler, makeRequest({ path: ['a', 'b'] }))
    expect(missing.statusCode).toBe(404)
  })
})

describe('admin AI router', () => {
  it('returns configured providers on GET /api/admin/ai/providers', async () => {
    const res = await call(aiHandler, makeRequest({ path: ['providers'] }))

    expect(res.statusCode).toBe(200)
    expect(res.payload.configured).toBe(true)
    expect(res.payload.kinds).toHaveLength(3)
    expect(res.payload.providers).toEqual([{ id: 'openai' }])
  })

  it('generates content on POST /api/admin/ai/generate', async () => {
    const res = await call(
      aiHandler,
      makeRequest({
        method: 'POST',
        path: ['generate'],
        body: { kind: 'trivia', provider: 'openai', model: 'gpt-test', count: 3 },
      }),
    )

    expect(res.statusCode).toBe(201)
    expect(res.payload.batchId).toBe('b-1')
    expect(mocks.generateContent).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ kind: 'trivia', count: 3 }),
    )
  })

  it('lists the inbox on GET /api/admin/ai/content', async () => {
    const res = await call(aiHandler, makeRequest({ path: ['content'], query: { status: 'aprobado' } }))

    expect(res.statusCode).toBe(200)
    expect(res.payload).toEqual({ items: [{ id: 'c-1' }], pending: 2 })
    expect(mocks.listContent).toHaveBeenCalledWith(expect.anything(), {
      status: 'aprobado',
      kind: null,
      limit: undefined,
    })
  })

  it('reviews one item on PATCH /api/admin/ai/content/:id', async () => {
    const res = await call(
      aiHandler,
      makeRequest({ method: 'PATCH', path: ['content', 'c-1'], body: { action: 'approve' } }),
    )

    expect(res.statusCode).toBe(200)
    expect(res.payload.item).toMatchObject({ id: 'c-1', status: 'aprobado' })
  })

  it('keeps method and route errors distinct', async () => {
    const wrongMethod = await call(aiHandler, makeRequest({ method: 'POST', path: ['content'] }))
    expect(wrongMethod.statusCode).toBe(405)
    expect(wrongMethod.headers.allow).toBe('GET')

    const missing = await call(aiHandler, makeRequest({ path: ['unknown'] }))
    expect(missing.statusCode).toBe(404)
    expect(missing.payload.error).toBe('Ruta no encontrada')
  })
})
