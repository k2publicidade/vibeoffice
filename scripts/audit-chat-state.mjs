// Disposable accounts and a private room. No mail or message to a real employee.
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
config({ path: '.env.local', quiet: true })
const env = process.env, options = { auth: { persistSession: false, autoRefreshToken: false } }
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, options)
const users = []; let roomId
function data(result, label) { if (result.error || !result.data) throw Error(`${label}: ${JSON.stringify(result.error)}`); return result.data }
async function account(name) {
  const email = `audit-chat-${randomUUID()}@example.invalid`
  const user = data(await admin.auth.admin.createUser({ email, email_confirm: true, user_metadata: { name: 'AUDITORIA CHAT ' + name } }), 'create account').user
  users.push(user.id)
  data(await admin.from('users').update({ active: true, role: 'Colaborador', sector: 'Marketing' }).eq('id', user.id).select().single(), 'activate')
  const client = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, options)
  const link = data(await admin.auth.admin.generateLink({ type: 'magiclink', email }), 'unsent session')
  data(await client.auth.verifyOtp({ token_hash: link.properties.hashed_token, type: 'magiclink' }), 'authenticate')
  return { id: user.id, client }
}
try {
  const owner = await account('OWNER'), peer = await account('PEER'), first = await account('FIRST'), second = await account('SECOND')
  const initial = data(await owner.client.from('chat_rooms').insert({ name: 'AUDITORIA CHAT', type: 'project', description: 'Grupo privado descartável', participants: [owner.id, peer.id], created_by: owner.id }).select().single(), 'create private room')
  roomId = initial.id
  const renamed = data(await owner.client.from('chat_rooms').update({ name: 'AUDITORIA CHAT EDITADO' }).eq('id', roomId).eq('created_by', owner.id).eq('type', 'project').select('*').single(), 'rename receipt')
  assert.equal(renamed.name, 'AUDITORIA CHAT EDITADO')
  const forbidden = await peer.client.from('chat_rooms').update({ name: 'Unauthorized' }).eq('id', roomId).eq('created_by', peer.id).eq('type', 'project').select('*').single()
  assert.ok(forbidden.error); assert.equal(forbidden.data, null)
  const forbiddenMember = await peer.client.rpc('manage_group_member', { room_id: roomId, member_id: first.id, adding: true })
  assert.ok(forbiddenMember.error)
  console.log('PASS confirmed creator rename and denied unconfirmed/non-creator mutations')
  const receipts = await Promise.all([first, second].map(member => owner.client.rpc('manage_group_member', { room_id: roomId, member_id: member.id, adding: true })))
  const saved = receipts.map(receipt => data(receipt, 'concurrent membership receipt')).sort((a, b) => a.participants.length - b.participants.length)
  assert.deepEqual(saved.map(row => row.participants.length), [3, 4])
  const expected = [owner.id, peer.id, first.id, second.id].sort()
  for (const receipt of saved.reverse()) {
    assert.equal(receipt.id, roomId)
    const canonical = data(await owner.client.from('chat_rooms').select('*').eq('id', roomId).maybeSingle(), 'fresh canonical room')
    assert.deepEqual([...canonical.participants].sort(), expected)
  }
  console.log('PASS old/new real membership receipts both reconcile to the complete current row')
  const message = data(await owner.client.from('messages').insert({ room_id: roomId, user_id: owner.id, content: 'AUDITORIA CHAT - mensagem privada descartável' }).select().single(), 'message receipt')
  assert.equal(message.room_id, roomId)
  assert.ifError((await peer.client.rpc('toggle_message_reaction', { message_id: message.id, emoji: '✅' })).error)
  assert.ifError((await peer.client.rpc('mark_messages_read', { message_ids: [message.id] })).error)
  const current = data(await owner.client.from('messages').select('*').eq('id', message.id).single(), 'fresh message')
  assert.ok(current.reactions['✅'].includes(peer.id)); assert.ok(current.read_by[peer.id])
  data(await owner.client.from('messages').delete().eq('id', message.id).select().single(), 'delete own message')
  assert.equal(data(await owner.client.from('messages').select('id').eq('id', message.id), 'deleted history').length, 0)
  console.log('PASS canonical message content, reactions, read receipt and deletion')
} finally {
  const errors = []
  if (roomId) { const r = await admin.from('chat_rooms').delete().eq('id', roomId); if (r.error) errors.push(r.error) }
  if (users.length) { const r = await admin.from('notifications').delete().in('user_id', users); if (r.error) errors.push(r.error) }
  for (const id of users) { const r = await admin.auth.admin.deleteUser(id); if (r.error) errors.push(r.error) }
  if (errors.length) throw new AggregateError(errors, 'Chat fixture cleanup failed')
  console.log('CLEANUP private room/messages/notifications and own accounts removed')
}
