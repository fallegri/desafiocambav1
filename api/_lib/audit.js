// Audit trail for privileged actions (login, approvals, role changes).
// Logging must never break the request it is recording, so failures are
// swallowed after being reported to the platform logs.
export async function logAudit(sql, { actorId = null, action, targetType = null, targetId = null, metadata = {} }) {
  try {
    await sql`
      insert into audit_log (actor_id, action, target_type, target_id, metadata)
      values (${actorId}::uuid, ${action}, ${targetType}, ${targetId}, ${JSON.stringify(metadata)}::jsonb)
    `
  } catch (error) {
    console.error('[audit] no se pudo registrar la acción:', action, error)
  }
}
