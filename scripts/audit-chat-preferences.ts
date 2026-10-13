// Private disposable fixtures only; never log sessions, MFA secrets or keys.
import assert from 'node:assert/strict'
import { createHmac, randomUUID } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import type { Database } from '../src/lib/supabase/database.types'
import { markChatReadBatch } from '../src/lib/chat-read-receipts'
config({ path: '.env.local', quiet: true })
const base = process.env.NEXT_PUBLIC_SUPABASE_URL!, anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const options = { auth: { persistSession: false, autoRefreshToken: false } }
const admin = createClient<Database>(base, process.env.SUPABASE_SERVICE_ROLE_KEY!, options)
const users: string[] = [], rooms: string[] = []
function totp(secret: string) {
  const bits = [...secret.toUpperCase().replace(/=/g, '')].map(char => 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'.indexOf(char).toString(2).padStart(5, '0')).join('')
  const key = Buffer.from((bits.match(/.{8}/g) || []).map(byte => parseInt(byte, 2))), time = Buffer.alloc(8)
  time.writeBigUInt64BE(BigInt(Math.floor(Date.now() / 30000)))
  const hash = createHmac('sha1', key).update(time).digest(), offset = hash[19] & 15
  return String((hash.readUInt32BE(offset) & 0x7fffffff) % 1000000).padStart(6, '0')
}
function data<T extends { data: unknown; error: unknown }>(result: T, label: string): NonNullable<T['data']> {
  if (result.error || result.data === null) throw new Error(`${label}: unavailable receipt`)
  return result.data as NonNullable<T['data']>
}
async function account() {
  const email = `audit-preferences-${randomUUID()}@example.invalid`
  const user = data(await admin.auth.admin.createUser({ email, email_confirm: true, user_metadata: { name: 'AUDITORIA PREFERENCIAS' } }), 'account').user!
  users.push(user.id)
  data(await admin.from('users').update({ role: 'Colaborador', active: true, sector: 'Marketing' }).eq('id', user.id).select().single(), 'activate')
  const client = createClient<Database>(base, anon, options)
  const link = data(await admin.auth.admin.generateLink({ type: 'magiclink', email }), 'unsent session')
  data(await client.auth.verifyOtp({ token_hash: link.properties!.hashed_token, type: 'magiclink' }), 'authenticate')
  return { id: user.id, client, session: data(await client.auth.getSession(), 'session').session! }
}
async function main() { try {
  const a = await account(), b = await account(), sender = await account(), outsider = await account()
  const project = data(await sender.client.from('chat_rooms').insert({ name: 'AUDITORIA PREFERENCIAS', type: 'project', description: 'Sala privada descartável', created_by: sender.id, participants: [a.id, b.id, sender.id] }).select().single(), 'private room')
  rooms.push(project.id)
  const makeMessage = async () => data(await sender.client.from('messages').insert({ room_id: project.id, user_id: sender.id, content: 'AUDITORIA PRIVADA DE LEITURA' }).select().single(), 'message')
  const one = await makeMessage(), two = await makeMessage()
  const getReads = async (id: string) => data(await sender.client.from('messages').select('read_by').eq('id', id).single(), 'read markers').read_by as Record<string, string>
  const originalGetUser = a.client.auth.getUser.bind(a.client.auth)
  let switchOnce = true
  a.client.auth.getUser = async token => {
    const verified = await originalGetUser(token)
    if (switchOnce) { switchOnce = false; data(await a.client.auth.setSession({ access_token: b.session.access_token, refresh_token: b.session.refresh_token }), 'switch shared session') }
    return verified
  }
  const receipt = await markChatReadBatch(a.client, a.id, [one.id])
  assert.deepEqual(receipt, { status: 'sent', messageIds: [one.id] })
  const reads = await getReads(one.id)
  assert.ok(reads[a.id]); assert.equal(reads[b.id], undefined)
  assert.equal(await markChatReadBatch(a.client, a.id, [two.id]), 'session-changed')
  assert.deepEqual(await getReads(two.id), {})
  assert.deepEqual(await markChatReadBatch(a.client, b.id, [two.id]), { status: 'sent', messageIds: [two.id] })
  assert.ok((await getReads(two.id))[b.id]); assert.equal((await getReads(two.id))[a.id], undefined)
  a.client.auth.getUser = originalGetUser
  data(await a.client.auth.setSession({ access_token: a.session.access_token, refresh_token: a.session.refresh_token }), 'restore A')
  console.log('PASS same production helper binds the verified actor/token across a real shared-client account switch')
  const firstTimestamp = (await getReads(one.id))[a.id]
  await markChatReadBatch(a.client, a.id, [one.id, one.id])
  assert.equal((await getReads(one.id))[a.id], firstTimestamp)
  assert.deepEqual(await markChatReadBatch(sender.client, sender.id, [one.id]), { status: 'sent', messageIds: [] })
  assert.deepEqual(await markChatReadBatch(outsider.client, outsider.id, [one.id]), { status: 'sent', messageIds: [] })
  const tooLarge = await a.client.rpc('mark_office_messages_read', { message_ids: Array(201).fill(one.id) })
  assert.ok(tooLarge.error)
  assert.ok((await admin.rpc('mark_office_messages_read', { message_ids: [one.id] })).error)
  console.log('PASS precise/idempotent receipts, own messages/outsiders excluded, batch cap and service access denied')
  data(await admin.from('users').update({ active: false }).eq('id', a.id).select().single(), 'deactivate')
  // The old void API may return success without modifying a row. Updated
  // clients use the new explicit receipt/active-account check instead.
  assert.ifError((await a.client.rpc('mark_messages_read', { message_ids: [two.id] })).error)
  assert.equal((await getReads(two.id))[a.id], undefined)
  await assert.rejects(markChatReadBatch(a.client, a.id, [two.id]))
  data(await admin.from('users').update({ active: true }).eq('id', a.id).select().single(), 'reactivate')
  console.log('REPRODUCED legacy zero-row success; PASS canonical RPC denies inactive actor without a false receipt')
  const factor = data(await a.client.auth.mfa.enroll({ factorType: 'totp', issuer: 'Auditoria privada' }), 'own MFA factor')
  data(await a.client.auth.mfa.challengeAndVerify({ factorId: factor.id, code: totp(factor.totp!.secret) }), 'own MFA verification')
  const aal2 = data(await a.client.auth.getSession(), 'MFA session').session!
  data(await a.client.auth.setSession({ access_token: a.session.access_token, refresh_token: a.session.refresh_token }), 'old AAL1 session')
  await assert.rejects(markChatReadBatch(a.client, a.id, [two.id]))
  assert.equal((await getReads(two.id))[a.id], undefined)
  data(await a.client.auth.setSession({ access_token: aal2.access_token, refresh_token: aal2.refresh_token }), 'verified session')
  await markChatReadBatch(a.client, a.id, [two.id])
  assert.ok((await getReads(two.id))[a.id]); assert.ok((await getReads(two.id))[b.id])
  const concurrent = await makeMessage()
  await Promise.all([markChatReadBatch(a.client, a.id, [concurrent.id]), markChatReadBatch(b.client, b.id, [concurrent.id])])
  assert.deepEqual(Object.keys(await getReads(concurrent.id)).sort(), [a.id, b.id].sort())
  console.log('PASS verified MFA required, AAL2 accepted and simultaneous readers preserve both independent markers')
  const dm = data(await a.client.from('chat_rooms').insert({ name: 'AUDITORIA PREFS DM', type: 'dm', created_by: a.id, participants: [a.id, b.id] }).select().single(), 'private DM')
  rooms.push(dm.id)
  const fields = 'room_id,user_id,is_muted,is_blocked,is_archived,archived_at,updated_at'
  const archiveAt = new Date().toISOString()
  data(await a.client.from('user_chat_preferences').upsert({ room_id: dm.id, user_id: a.id, is_muted: true, is_blocked: true, is_archived: true, archived_at: archiveAt }, { onConflict: 'user_id,room_id' }).select(fields).single(), 'initial prefs')
  const unarchived = data(await a.client.from('user_chat_preferences').upsert({ room_id: dm.id, user_id: a.id, is_archived: false, archived_at: null }, { onConflict: 'user_id,room_id' }).select(fields).single(), 'partial upsert receipt')
  assert.equal(unarchived.is_archived, false); assert.equal(unarchived.is_muted, true); assert.equal(unarchived.is_blocked, true)
  const blockedSend = await b.client.from('messages').insert({ room_id: dm.id, user_id: b.id, content: 'This disposable blocked attempt must fail' })
  assert.ok(blockedSend.error)
  assert.ok((await b.client.from('user_chat_preferences').upsert({ room_id: dm.id, user_id: a.id, is_blocked: false }, { onConflict: 'user_id,room_id' })).error)
  const own = data(await a.client.from('user_chat_preferences').select(fields, { count: 'exact' }).eq('user_id', a.id).order('room_id').range(0, 499), 'canonical preferences')
  assert.equal(own.find(row => row.room_id === dm.id)?.is_blocked, true)
  console.log('PASS partial preference writes preserve mute/block, canonical reads and cross-user/blocked-DM denials')
} finally {
  const errors: string[] = []
  if (rooms.length) { const r = await admin.from('chat_rooms').delete().in('id', rooms); if (r.error) errors.push(r.error.message) }
  if (users.length) { const r = await admin.from('notifications').delete().in('user_id', users); if (r.error) errors.push(r.error.message) }
  for (const id of users) { const r = await admin.auth.admin.deleteUser(id); if (r.error) errors.push(r.error.message) }
  if (errors.length) throw new Error('Own fixture cleanup failed: ' + errors.join('; '))
  console.log('CLEANUP private rooms/messages/preferences/notifications and all disposable accounts removed')
} }
main().catch(error => { console.error(error instanceof Error ? error.message : 'Audit failed'); process.exitCode = 1 })
