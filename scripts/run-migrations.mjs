import pg from 'pg'
import { readFileSync, readdirSync } from 'fs'
import { join } from 'path'

const PASSWORD = process.env.SUPABASE_DB_PASSWORD
const PROJECT_REF = 'zdjujxuibbhfxmcrzgss'

if (!PASSWORD) {
  console.error('SUPABASE_DB_PASSWORD missing')
  process.exit(1)
}

// Try direct connection first, then pooler
const candidates = [
  {
    name: 'direct',
    config: {
      host: `db.${PROJECT_REF}.supabase.co`,
      port: 5432,
      user: 'postgres',
      password: PASSWORD,
      database: 'postgres',
      ssl: { rejectUnauthorized: false },
    },
  },
  {
    name: 'pooler-session-sa-east-1',
    config: {
      host: `aws-0-sa-east-1.pooler.supabase.com`,
      port: 5432,
      user: `postgres.${PROJECT_REF}`,
      password: PASSWORD,
      database: 'postgres',
      ssl: { rejectUnauthorized: false },
    },
  },
  {
    name: 'pooler-session-us-east-1',
    config: {
      host: `aws-0-us-east-1.pooler.supabase.com`,
      port: 5432,
      user: `postgres.${PROJECT_REF}`,
      password: PASSWORD,
      database: 'postgres',
      ssl: { rejectUnauthorized: false },
    },
  },
  {
    name: 'pooler-session-us-east-2',
    config: {
      host: `aws-0-us-east-2.pooler.supabase.com`,
      port: 5432,
      user: `postgres.${PROJECT_REF}`,
      password: PASSWORD,
      database: 'postgres',
      ssl: { rejectUnauthorized: false },
    },
  },
]

let client = null
for (const c of candidates) {
  console.log(`Trying ${c.name}: ${c.config.host}:${c.config.port}...`)
  const test = new pg.Client(c.config)
  try {
    await test.connect()
    const r = await test.query('SELECT current_database(), version()')
    console.log(`  OK -> ${r.rows[0].current_database}`)
    client = test
    break
  } catch (e) {
    console.log(`  FAIL: ${e.message.substring(0, 80)}`)
    try { await test.end() } catch {}
  }
}

if (!client) {
  console.error('No connection candidate worked.')
  process.exit(1)
}

// Build ordered migration list
const baseFile = 'docs/supabase-migrations.sql'
const migrationsDir = 'docs/supabase-migrations'
const files = [{ name: 'base_schema', path: baseFile }]
readdirSync(migrationsDir)
  .filter(f => f.endsWith('.sql'))
  .sort((a, b) => {
    const numA = parseInt(a.match(/^(\d+)/)?.[1] || '0')
    const numB = parseInt(b.match(/^(\d+)/)?.[1] || '0')
    if (numA !== numB) return numA - numB
    return a.localeCompare(b)
  })
  .forEach(f => files.push({ name: f, path: join(migrationsDir, f) }))

console.log(`\nApplying ${files.length} migrations:\n`)

const failures = []
for (const { name, path } of files) {
  const sql = readFileSync(path, 'utf8')
  process.stdout.write(`  ${name.padEnd(50)} ... `)
  try {
    await client.query(sql)
    console.log('OK')
  } catch (e) {
    console.log(`FAIL`)
    console.log(`    ${e.message.substring(0, 200)}`)
    failures.push({ name, error: e.message })
  }
}

console.log(`\nDone. ${files.length - failures.length}/${files.length} succeeded.`)
if (failures.length > 0) {
  console.log('\nFailures:')
  failures.forEach(f => console.log(`  - ${f.name}`))
}

await client.end()
