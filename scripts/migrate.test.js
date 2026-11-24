// @vitest-environment node
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { splitStatements } from './migrate.mjs'

const here = dirname(fileURLToPath(import.meta.url))

describe('splitStatements', () => {
  it('keeps dollar-quoted blocks in one statement', () => {
    const sql = `
      do $$ begin
        create type user_role as enum ('a', 'b');
      exception when duplicate_object then null; end $$;
      create table t (id int);
    `
    const statements = splitStatements(sql)
    expect(statements).toHaveLength(2)
    expect(statements[0]).toMatch(/^do \$\$/)
    expect(statements[0]).toContain("enum ('a', 'b')")
    expect(statements[1]).toBe('create table t (id int)')
  })

  it('does not split on semicolons inside strings', () => {
    const statements = splitStatements("insert into t values ('a;b'); select 1")
    expect(statements).toEqual(["insert into t values ('a;b')", 'select 1'])
  })

  it('splits the real schema without losing the enum blocks', () => {
    const schema = readFileSync(join(here, '..', 'api', '_lib', 'schema.sql'), 'utf8')
    const statements = splitStatements(schema)

    expect(statements.length).toBeGreaterThan(8)
    expect(statements.filter((statement) => statement.includes('do $$'))).toHaveLength(3)
    expect(statements.some((statement) => statement.includes('create table if not exists users'))).toBe(true)
  })
})
