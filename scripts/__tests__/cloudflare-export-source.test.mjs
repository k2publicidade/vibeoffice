import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { exportSnapshot, verifySnapshot, quoteIdentifier } from '../cloudflare-export-source.mjs'

function fakeClient({ fail = false } = {}) {
  let fetched = false
  const queries = []
  return {
    queries,
    async query(sql) {
      queries.push(sql)
      if (sql.includes("n.nspname='public' AND c.relkind")) return { rows: [{ schema: 'public', name: 'tasks' }] }
      if (sql.startsWith('DECLARE')) { fetched = false; return { rows: [] } }
      if (sql.startsWith('FETCH')) {
        if (fail) throw Error('Simulated database failure')
        if (fetched) return { rows: [] }
        fetched = true
        return { rows: [{ raw_json: '{"id":"sample","precise_amount":9007199254740993,"tags":["a"],"note":"linha\\nseguinte"}' }] }
      }
      return { rows: [] }
    },
  }
}

function temporary(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'vibeoffice-export-test-'))
  t.after(() => fs.rmSync(root, { recursive: true, force: true }))
  return path.join(root, 'snapshot')
}

test('exports inside a read-only snapshot, preserves numeric bytes, and verifies table coverage', async t => {
  const directory = temporary(t)
  const client = fakeClient()
  const result = await exportSnapshot(client, directory, { includeAuth: true })
  assert.equal(client.queries[0], 'BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY')
  assert.equal(client.queries[1], 'SET LOCAL row_security = off')
  assert.equal(client.queries.at(-1), 'COMMIT')
  assert.equal(client.queries.some(sql => /^(INSERT|UPDATE|DELETE|ALTER|CREATE|DROP)\b/.test(sql)), false)
  assert.equal(result.complete, true)
  assert.equal(result.scope.storageBlobs, false)
  assert.equal(result.scope.authSessions, false)
  assert.match(fs.readFileSync(path.join(directory, 'public-tasks.ndjson'), 'utf8'), /9007199254740993/)
  const authQuery = client.queries.find(sql => sql.includes('FROM "auth"."users"'))
  assert.match(authQuery, /encrypted_password/)
  assert.doesNotMatch(authQuery, /recovery_token|confirmation_token|refresh_token/)
  const mfaQuery = client.queries.find(sql => sql.includes('FROM "auth"."mfa_factors"'))
  assert.doesNotMatch(mfaQuery, /secret/)
  assert.equal((await verifySnapshot(directory)).files.length, 6)
  await assert.rejects(exportSnapshot(client, directory), /EEXIST/)
})

test('failed export rolls back and remains explicitly incomplete', async t => {
  const directory = temporary(t)
  const client = fakeClient({ fail: true })
  await assert.rejects(exportSnapshot(client, directory), /Simulated/)
  assert.equal(client.queries.at(-1), 'ROLLBACK')
  assert.equal(JSON.parse(fs.readFileSync(path.join(directory, 'manifest.json'))).complete, false)
  await assert.rejects(verifySnapshot(directory), /incompleto/)
})

test('detects modified data, missing table entries, and path traversal', async t => {
  const directory = temporary(t)
  await exportSnapshot(fakeClient(), directory)
  const manifestPath = path.join(directory, 'manifest.json')
  const originalManifest = fs.readFileSync(manifestPath, 'utf8')
  const dataPath = path.join(directory, 'public-tasks.ndjson')
  const originalData = fs.readFileSync(dataPath, 'utf8')
  fs.appendFileSync(dataPath, '{}\n')
  await assert.rejects(verifySnapshot(directory), /Checksum/)
  fs.writeFileSync(dataPath, originalData)
  const missing = JSON.parse(originalManifest)
  missing.files = missing.files.filter(entry => entry.table !== 'tasks')
  fs.writeFileSync(manifestPath, JSON.stringify(missing))
  await assert.rejects(verifySnapshot(directory), /todas as tabelas/)
  const traversal = JSON.parse(originalManifest)
  traversal.files[0].file = '../outside.json'
  fs.writeFileSync(manifestPath, JSON.stringify(traversal))
  await assert.rejects(verifySnapshot(directory), /Nome de arquivo/)
})

test('escapes catalog identifiers instead of interpolating them as SQL', () => {
  assert.equal(quoteIdentifier('odd"name'), '"odd""name"')
})
