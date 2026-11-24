import { neon } from '@neondatabase/serverless'
import { loadEnv } from './env.mjs'
import { hashPassword } from '../api/_lib/password.js'
import { validateDisplayName, validateEmail, validatePassword } from '../api/_lib/validation.js'

loadEnv()

async function main() {
  const url = process.env.DATABASE_URL
  if (!url) {
    console.error('✖ Falta DATABASE_URL en el entorno o en .env')
    process.exit(1)
  }

  const details = {}
  const email = validateEmail(process.env.SUPERADMIN_EMAIL, details)
  const password = validatePassword(process.env.SUPERADMIN_PASSWORD, details)
  const name = validateDisplayName(process.env.SUPERADMIN_NAME || 'Super Admin', details)
  if (Object.keys(details).length > 0) {
    console.error('✖ Revisá las variables SUPERADMIN_*:', details)
    process.exit(1)
  }

  const sql = neon(url)
  const existing = await sql`
    select id, email, role, status from users where lower(email) = ${email} limit 1
  `

  if (existing[0]) {
    const needsPasswordReset = process.argv.includes('--reset-password')
    const rows = await sql`
      update users
      set role = 'superadmin'::user_role, status = 'activo'::user_status, updated_at = now()
      where id = ${existing[0].id}::uuid
      returning id, email, role, status
    `
    if (needsPasswordReset) {
      const hash = await hashPassword(password)
      await sql`update users set password_hash = ${hash}, updated_at = now() where id = ${existing[0].id}::uuid`
    }
    console.log(`✔ Super admin actualizado: ${rows[0].email} (${rows[0].role}/${rows[0].status})`)
    console.log(needsPasswordReset ? '  Contraseña restablecida con SUPERADMIN_PASSWORD.' : '  Contraseña sin cambios (usá --reset-password para cambiarla).')
    return
  }

  const hash = await hashPassword(password)
  const rows = await sql`
    insert into users (email, password_hash, display_name, role, status, approved_at)
    values (${email}, ${hash}, ${name}, 'superadmin'::user_role, 'activo'::user_status, now())
    returning id, email, role, status
  `
  console.log(`✔ Super admin creado: ${rows[0].email} (${rows[0].role}/${rows[0].status})`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
