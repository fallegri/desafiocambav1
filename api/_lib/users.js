import { conflict, forbidden, notFound } from './errors.js'

export const ROLES = ['superadmin', 'operador', 'participante']
export const STATUSES = ['pendiente', 'activo', 'rechazado', 'bloqueado']

export const ROLE_LABELS = {
  superadmin: 'Super admin',
  operador: 'Operador',
  participante: 'Participante',
}

export function isStaff(role) {
  return role === 'superadmin' || role === 'operador'
}

export function publicUser(row) {
  if (!row) return null
  return {
    id: row.id,
    email: row.email,
    name: row.display_name,
    role: row.role,
    status: row.status,
    createdAt: row.created_at,
    approvedAt: row.approved_at ?? null,
  }
}

export async function findUserByEmail(sql, email) {
  const rows = await sql`
    select id, email, password_hash, display_name, role, status, created_at, approved_at
    from users
    where email = ${email}
    limit 1
  `
  return rows[0] ?? null
}

export async function findUserById(sql, id) {
  const rows = await sql`
    select id, email, password_hash, display_name, role, status, created_at, approved_at
    from users
    where id = ${id}::uuid
    limit 1
  `
  return rows[0] ?? null
}

export async function createPendingUser(sql, { email, passwordHash, displayName }) {
  try {
    const rows = await sql`
      insert into users (email, password_hash, display_name)
      values (${email}, ${passwordHash}, ${displayName})
      returning id, email, display_name, role, status, created_at, approved_at
    `
    return publicUser(rows[0])
  } catch (error) {
    if (error?.code === '23505') {
      throw conflict('Ya existe una cuenta registrada con ese email')
    }
    throw error
  }
}

export async function listUsers(sql, { status = null, search = null, limit = 50, offset = 0 } = {}) {
  const safeLimit = Math.min(Math.max(Number(limit) || 50, 1), 100)
  const safeOffset = Math.max(Number(offset) || 0, 0)
  const rows = await sql`
    select id, email, display_name, role, status, created_at, approved_at
    from users
    where (${status}::text is null or status::text = ${status}::text)
      and (
        ${search}::text is null
        or email ilike '%' || ${search}::text || '%'
        or display_name ilike '%' || ${search}::text || '%'
      )
    order by
      case when status = 'pendiente' then 0 else 1 end,
      created_at desc
    limit ${safeLimit} offset ${safeOffset}
  `
  const totals = await sql`
    select count(*)::int as total
    from users
    where (${status}::text is null or status::text = ${status}::text)
      and (
        ${search}::text is null
        or email ilike '%' || ${search}::text || '%'
        or display_name ilike '%' || ${search}::text || '%'
      )
  `
  return {
    users: rows.map(publicUser),
    total: totals[0]?.total ?? 0,
    limit: safeLimit,
    offset: safeOffset,
  }
}

export async function countActiveSuperadmins(sql) {
  const rows = await sql`
    select count(*)::int as total
    from users
    where role = 'superadmin' and status = 'activo'
  `
  return rows[0]?.total ?? 0
}

// Business rules for the admin panel:
// - A staff member (superadmin/operador) can approve or reject participants.
// - Only a superadmin can grant `operador` or `superadmin`; an operador can
//   never escalate anyone (including themselves).
// - Nobody can change a superadmin unless they are a superadmin.
export async function applyUserAction(sql, { actor, targetId, action, role = null }) {
  const target = await findUserById(sql, targetId)
  if (!target) throw notFound('Usuario no encontrado')

  const actorIsSuper = actor.role === 'superadmin'

  if (!actorIsSuper && isStaff(target.role)) {
    throw forbidden('Solo el super admin puede modificar a otro miembro del staff')
  }
  if (!actorIsSuper && target.id === actor.id) {
    throw forbidden('No podés cambiar tu propio rol')
  }

  if (action === 'approve') {
    const rows = await sql`
      update users
      set status = 'activo', approved_by = ${actor.id}::uuid, approved_at = now(), updated_at = now()
      where id = ${target.id}::uuid
      returning id, email, display_name, role, status, created_at, approved_at
    `
    return publicUser(rows[0])
  }

  if (action === 'reject' || action === 'block') {
    if (target.role === 'superadmin') {
      throw forbidden('No se puede desactivar a un super admin')
    }
    const nextStatus = action === 'reject' ? 'rechazado' : 'bloqueado'
    const rows = await sql`
      update users
      set status = ${nextStatus}::user_status, updated_at = now()
      where id = ${target.id}::uuid
      returning id, email, display_name, role, status, created_at, approved_at
    `
    return publicUser(rows[0])
  }

  if (action === 'set_role') {
    if (!ROLES.includes(role)) throw forbidden('Rol inválido')
    if (!actorIsSuper) throw forbidden('Solo el super admin puede asignar roles de staff')
    if (target.role === 'superadmin' && role !== 'superadmin') {
      const superadmins = await countActiveSuperadmins(sql)
      if (superadmins <= 1) throw forbidden('No se puede quitar el último super admin')
    }
    const rows = await sql`
      update users
      set role = ${role}::user_role, updated_at = now()
      where id = ${target.id}::uuid
      returning id, email, display_name, role, status, created_at, approved_at
    `
    return publicUser(rows[0])
  }

  throw forbidden('Acción inválida')
}
