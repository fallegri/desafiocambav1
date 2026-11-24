export const ROLES = ['superadmin', 'operador', 'participante']

export const ROLE_LABELS = {
  superadmin: 'Super admin',
  operador: 'Operador',
  participante: 'Participante',
}

export const STATUS_LABELS = {
  pendiente: 'Pendiente',
  activo: 'Activo',
  rechazado: 'Rechazado',
  bloqueado: 'Bloqueado',
}

export function isStaff(role) {
  return role === 'superadmin' || role === 'operador'
}
