import { test } from 'node:test'
import assert from 'node:assert/strict'
import { inspectSource } from '../cloudflare-inventory.mjs'

test('finds multiline queries and RPCs without treating comments or strings as calls', () => {
  const result = inspectSource(`
    // supabase.from('not_a_table')
    const text = "supabase.rpc('not_a_function')"
    await supabase\n.from('tasks').select('*')
    await client.rpc('save_office_task', { changes: {} })
    Array.from(values)
  `, 'hooks/tasks.ts')
  assert.deepEqual(result.map(call => [call.kind, call.target]), [
    ['table', 'tasks'], ['rpc', 'save_office_task'],
  ])
  assert.equal(result[0].file, 'hooks/tasks.ts')
  assert.equal(result[0].line, 4)
})

test('separates file buckets from tables and reports dynamic table/bucket access', () => {
  const result = inspectSource(`
    supabase.storage.from('drive-files').download(path)
    supabase.storage.from(bucket).upload(path, bytes)
    admin.from(tableName).select('*')
    supabase.channel('office-room:' + roomId)
    supabase.auth.mfa.getAuthenticatorAssuranceLevel()
  `)
  assert.deepEqual(result.map(call => [call.kind, call.target, call.dynamic]), [
    ['storage', 'drive-files', false], ['storage', null, true],
    ['table', null, true], ['realtime', null, false], ['auth', null, false],
  ])
})

test('also discovers Supabase operations embedded in TSX', () => {
  const result = inspectSource(`export function Example() {
    return <button onClick={() => client.rpc('delete_office_drive_item', { item_id: id })}>Excluir</button>
  }`, 'Example.tsx')
  assert.equal(result[0].target, 'delete_office_drive_item')
})
