// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { applyUserAction, publicUser } from './users.js'

// Minimal in-memory stand-in for Neon's tagged-template client: it matches
// queries by their SQL text and mutates the row array in place.
function makeDb(rows) {
  const users = rows.map((row) => ({ ...row }))

  function sql(strings, ...values) {
    const text = strings.join(' ').replace(/\s+/g, ' ').trim()

    if (text.includes('count(*)') && text.includes("role = 'superadmin'")) {
      return Promise.resolve([
        { total: users.filter((u) => u.role === 'superadmin' && u.status === 'activo').length },
      ])
    }

    if (text.startsWith('select') && text.includes('from users')) {
      const id = values[0]
      const row = users.find((u) => u.id === id)
      return Promise.resolve(row ? [{ ...row }] : [])
    }

    if (text.startsWith('update users')) {
      const id = text.includes('set role') ? values[1] : values[values.length - 1]
      const row = users.find((u) => u.id === id)
      if (!row) return Promise.resolve([])
      if (text.includes('set role')) row.role = values[0]
      if (text.includes('set status') && !text.includes("status = 'activo'")) row.status = values[0]
      if (text.includes("status = 'activo'")) row.status = 'activo'
      return Promise.resolve([{ ...row }])
    }

    throw new Error(`Query no simulada: ${text}`)
  }

  return { sql, users }
}

const superadmin = { id: '00000000-0000-0000-0000-000000000001', role: 'superadmin', status: 'activo', email: 'admin@x.bo', display_name: 'Admin' }
const operador = { id: '00000000-0000-0000-0000-000000000002', role: 'operador', status: 'activo', email: 'op@x.bo', display_name: 'Operador' }
const participante = { id: '00000000-0000-0000-0000-000000000003', role: 'participante', status: 'pendiente', email: 'p@x.bo', display_name: 'Jugador' }

describe('publicUser', () => {
  it('never leaks the password hash', () => {
    const user = publicUser({ ...participante, password_hash: 'secreto' })
    expect(user.password_hash).toBeUndefined()
    expect(user.name).toBe('Jugador')
  })
})

describe('applyUserAction', () => {
  it('lets an operador approve a pending participant', async () => {
    const { sql } = makeDb([operador, participante])
    const updated = await applyUserAction(sql, {
      actor: { id: operador.id, role: 'operador' },
      targetId: participante.id,
      action: 'approve',
    })
    expect(updated.status).toBe('activo')
  })

  it('does not let an operador grant the operador role', async () => {
    const { sql } = makeDb([operador, participante])
    await expect(
      applyUserAction(sql, {
        actor: { id: operador.id, role: 'operador' },
        targetId: participante.id,
        action: 'set_role',
        role: 'operador',
      }),
    ).rejects.toThrow(/Solo el super admin/)
  })

  it('lets a superadmin grant the operador role', async () => {
    const { sql } = makeDb([superadmin, participante])
    const updated = await applyUserAction(sql, {
      actor: { id: superadmin.id, role: 'superadmin' },
      targetId: participante.id,
      action: 'set_role',
      role: 'operador',
    })
    expect(updated.role).toBe('operador')
  })

  it('prevents an operador from modifying another staff member', async () => {
    const { sql } = makeDb([operador, superadmin])
    await expect(
      applyUserAction(sql, {
        actor: { id: operador.id, role: 'operador' },
        targetId: superadmin.id,
        action: 'block',
      }),
    ).rejects.toThrow(/staff/)
  })

  it('never removes the last superadmin', async () => {
    const { sql } = makeDb([superadmin])
    await expect(
      applyUserAction(sql, {
        actor: { id: superadmin.id, role: 'superadmin' },
        targetId: superadmin.id,
        action: 'set_role',
        role: 'participante',
      }),
    ).rejects.toThrow(/último super admin/)
  })

  it('rejects unknown actions', async () => {
    const { sql } = makeDb([superadmin, participante])
    await expect(
      applyUserAction(sql, {
        actor: { id: superadmin.id, role: 'superadmin' },
        targetId: participante.id,
        action: 'delete',
      }),
    ).rejects.toThrow(/Acción inválida/)
  })
})
