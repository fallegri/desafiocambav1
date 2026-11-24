import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { neon } from '@neondatabase/serverless'
import { loadEnv } from './env.mjs'

loadEnv()

const here = dirname(fileURLToPath(import.meta.url))
const schemaPath = join(here, '..', 'api', '_lib', 'schema.sql')

// Splits a SQL file on semicolons while respecting dollar-quoted blocks
// ($$ ... $$) and quoted strings. Neon's HTTP driver runs one statement per
// request, so the migration file cannot be sent whole.
export function splitStatements(source) {
  const statements = []
  let current = ''
  let dollarTag = null
  let inSingle = false
  let inDouble = false

  for (let i = 0; i < source.length; i += 1) {
    const char = source[i]

    if (dollarTag) {
      if (source.startsWith(dollarTag, i)) {
        current += dollarTag
        i += dollarTag.length - 1
        dollarTag = null
      } else {
        current += char
      }
      continue
    }

    if (!inSingle && !inDouble && char === '$') {
      const match = source.slice(i).match(/^\$[A-Za-z_]*\$/)
      if (match) {
        dollarTag = match[0]
        current += dollarTag
        i += dollarTag.length - 1
        continue
      }
    }

    if (char === "'" && !inDouble) inSingle = !inSingle
    if (char === '"' && !inSingle) inDouble = !inDouble

    if (char === ';' && !inSingle && !inDouble) {
      if (current.trim()) statements.push(current.trim())
      current = ''
      continue
    }

    current += char
  }

  if (current.trim()) statements.push(current.trim())
  return statements
}

async function main() {
  const url = process.env.DATABASE_URL
  if (!url) {
    console.error('✖ Falta DATABASE_URL. Copiá .env.example a .env y completá la connection string de Neon.')
    process.exit(1)
  }

  const sql = neon(url)
  const statements = splitStatements(readFileSync(schemaPath, 'utf8'))
  console.log(`▶ Aplicando ${statements.length} sentencias de esquema…`)

  for (const statement of statements) {
    const preview = statement.replace(/\s+/g, ' ').slice(0, 70)
    try {
      await sql.query(statement)
      console.log(`  ✔ ${preview}…`)
    } catch (error) {
      console.error(`  ✖ Falló: ${preview}…`)
      console.error(error)
      process.exit(1)
    }
  }

  console.log('✅ Esquema aplicado correctamente.')
}

const isDirectRun = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]
if (isDirectRun) {
  main().catch((error) => {
    console.error(error)
    process.exit(1)
  })
}
