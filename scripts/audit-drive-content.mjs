// Own disposable accounts/files only. No email is sent and no credentials are logged.
import assert from 'node:assert/strict'
import { randomUUID, randomBytes, createHash } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { config } from 'dotenv'
config({ path: '.env.local', quiet: true })
const origin = process.argv[2]
assert.ok(origin && /^https?:\/\//.test(origin), 'Pass the application origin')
const env = process.env, options = { auth: { persistSession: false, autoRefreshToken: false } }
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, options)
const users = [], ids = [], paths = []
function data(result, label) { if (result.error || result.data === null) throw Error(`${label}: ${JSON.stringify(result.error)}`); return result.data }
async function session() {
  const email = `audit-content-${randomUUID()}@example.invalid`
  const user = data(await admin.auth.admin.createUser({ email, email_confirm: true, user_metadata: { name: 'AUDITORIA DOWNLOAD' } }), 'create account').user
  users.push(user.id)
  data(await admin.from('users').update({ active: true, role: 'Colaborador', sector: 'Marketing' }).eq('id', user.id).select().single(), 'activate')
  const jar = new Map()
  const client = createServerClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { cookies: { getAll: () => [...jar].map(([name, value]) => ({ name, value })), setAll: entries => entries.forEach(c => jar.set(c.name, c.value)) }, auth: { autoRefreshToken: false } })
  const link = data(await admin.auth.admin.generateLink({ type: 'magiclink', email }), 'unsent session')
  data(await client.auth.verifyOtp({ token_hash: link.properties.hashed_token, type: 'magiclink' }), 'authenticate')
  return { id: user.id, client, cookie: () => [...jar].map(([name, value]) => `${name}=${value}`).join('; ') }
}
async function read(path, who, status, headers = {}) {
  const response = await fetch(origin + path, { redirect: 'manual', headers: { ...headers, ...(who ? { cookie: who.cookie() } : {}) } })
  assert.equal(response.status, status, `${path} HTTP ${response.status}`)
  assert.ok(response.headers.get('cache-control')?.includes('no-store'))
  assert.equal(response.headers.get('location'), null)
  return response
}
async function grant(owner, item, viewer) {
  data(await owner.client.from('shared_access').insert({ item_id: item, user_id: viewer.id, shared_by: owner.id, permission: 'view' }).select().single(), 'grant')
}
async function revoke(owner, item, viewer) {
  data(await owner.client.from('shared_access').delete().eq('item_id', item).eq('user_id', viewer.id).select().single(), 'revoke')
}
const digest = bytes => createHash('sha256').update(bytes).digest('hex')
try {
  const owner = await session(), viewer = await session()
  const folder = data(await owner.client.from('drive_items').insert({ name: 'AUDITORIA DOWNLOAD', type: 'folder', uploaded_by: owner.id }).select().single(), 'folder'); ids.push(folder.id)
  const id = randomUUID(); ids.push(id)
  const bytes = randomBytes(6 * 1024 * 1024 + 17)
  const intent = data(await owner.client.rpc('begin_office_drive_upload', { upload_id: id, file_name: 'Auditoria 6MB.bin', file_size: bytes.length, file_mime: 'application/octet-stream', target_parent: folder.id }), 'intent')
  const path = `drive-uploads/${owner.id}/${id}`; paths.push(path)
  assert.ok(intent)
  data(await owner.client.storage.from('drive-files').upload(path, bytes, { contentType: 'application/octet-stream' }), 'upload')
  data(await owner.client.rpc('complete_office_drive_upload', { upload_id: id }), 'commit')
  const privateUrl = `/api/drive/files/${id}/content?request=${randomUUID()}`, sharedUrl = `/drive/share/${id}/download`
  await read(privateUrl, null, 401)
  await read(privateUrl, viewer, 404)
  const full = await read(privateUrl, owner, 200)
  assert.equal(digest(Buffer.from(await full.arrayBuffer())), digest(bytes))
  console.log('PASS exact unbuffered file larger than 4.5MB, authenticated and no signed redirect')
  const part = await read(privateUrl, owner, 206, { Range: 'bytes=1024-2047' })
  assert.equal(part.headers.get('content-range'), `bytes 1024-2047/${bytes.length}`)
  assert.deepEqual(Buffer.from(await part.arrayBuffer()), bytes.subarray(1024, 2048))
  const head = await fetch(origin + privateUrl, { method: 'HEAD', headers: { cookie: owner.cookie() } })
  assert.equal(head.status, 200); assert.equal((await head.arrayBuffer()).byteLength, 0)
  await read(privateUrl, owner, 416, { Range: 'bytes=0-4,6-8' })
  console.log('PASS byte Range, HEAD and rejection of multiple ranges')
  await grant(owner, id, viewer)
  assert.equal(digest(Buffer.from(await (await read(privateUrl, viewer, 200)).arrayBuffer())), digest(bytes))
  await read(sharedUrl, viewer, 200)
  await revoke(owner, id, viewer)
  await read(privateUrl, viewer, 404); await read(sharedUrl, viewer, 404)
  console.log('PASS reused private URL denies access immediately after direct grant revocation')
  await grant(owner, folder.id, viewer)
  await read(privateUrl, viewer, 200)
  await revoke(owner, folder.id, viewer)
  await read(privateUrl, viewer, 404)
  console.log('PASS inherited access and parent grant revocation')
  data(await owner.client.from('drive_items').update({ is_public: true }).eq('id', folder.id).select().single(), 'publish own benign fixture')
  const publicBytes = await read(sharedUrl, null, 200)
  assert.equal(digest(Buffer.from(await publicBytes.arrayBuffer())), digest(bytes))
  await read(privateUrl, null, 401)
  data(await owner.client.from('drive_items').update({ is_public: false }).eq('id', folder.id).select().single(), 'restrict')
  await read(sharedUrl, null, 401)
  console.log('PASS public folder inheritance revoked on the same download URL; private API always requires login')
  await grant(owner, id, viewer)
  data(await admin.from('users').update({ active: false }).eq('id', viewer.id).select().single(), 'deactivate own account')
  await read(privateUrl, viewer, 404)
  data(await admin.from('users').update({ active: true }).eq('id', viewer.id).select().single(), 'reactivate')
  console.log('PASS inactive account denied despite a retained grant and session')
  data(await owner.client.from('drive_items').delete().eq('id', id).select().single(), 'delete own metadata')
  await read(privateUrl, owner, 404); await read(sharedUrl, owner, 404)
  console.log('PASS formerly downloaded bytes cannot be requested through the application after metadata deletion')
} finally {
  const errors = []
  if (ids.length) { const r = await admin.from('drive_items').delete().in('id', ids); if (r.error) errors.push(r.error) }
  if (paths.length) { const r = await admin.storage.from('drive-files').remove(paths); if (r.error) errors.push(r.error); const q = await admin.from('drive_cleanup_jobs').delete().in('storage_path', paths); if (q.error) errors.push(q.error) }
  if (ids.length) { const r = await admin.from('drive_uploads').delete().in('id', ids); if (r.error) errors.push(r.error) }
  for (const id of users) { const r = await admin.auth.admin.deleteUser(id); if (r.error) errors.push(r.error) }
  if (errors.length) throw new AggregateError(errors, 'Own audit fixture cleanup failed')
  console.log('CLEANUP own accounts, objects, metadata, upload receipts and jobs removed')
}
