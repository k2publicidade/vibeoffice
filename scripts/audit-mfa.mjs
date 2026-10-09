import fs from 'node:fs';
import crypto from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
config({ path: '.env.local', quiet: true });
const env = process.env;
const options = { auth: { persistSession: false, autoRefreshToken: false } };
const service = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, options);
const client = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, options);
if (!env.OFFICE_AUDIT_ACCOUNTS) throw Error('Set OFFICE_AUDIT_ACCOUNTS to private account JSON');
const accounts = JSON.parse(fs.readFileSync(env.OFFICE_AUDIT_ACCOUNTS, 'utf8'));
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, options);
const records = []; let userId, objectPath;
const tag = 'AUDITORIA MFA ' + crypto.randomUUID().slice(0, 8);
function ok(result) { if (result.error) throw Error(result.error.message); return result.data; }
function pass(label) { console.log('PASS ' + label); }
function blocked(result, label) {
  if (!result.error && (Array.isArray(result.data) ? result.data.length : result.data)) throw Error('MFA bypass: ' + label);
  pass('denied ' + label);
}
async function insert(table, fields) {
  const row = ok(await client.from(table).insert(fields).select().single()); records.push([table, row.id]); return row;
}
function totp(secret) {
  let bits = '';
  for (const c of secret.toUpperCase().replace(/=/g, '')) bits += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'.indexOf(c).toString(2).padStart(5, '0');
  const key = Buffer.from(bits.match(/.{8}/g).map(b => parseInt(b, 2))), time = Buffer.alloc(8);
  time.writeBigUInt64BE(BigInt(Math.floor(Date.now() / 30000)));
  const h = crypto.createHmac('sha1', key).update(time).digest(), offset = h[19] & 15;
  return String((h.readUInt32BE(offset) & 0x7fffffff) % 1000000).padStart(6, '0');
}
try {
  ok(await admin.auth.signInWithPassword({ email: accounts[0].email, password: accounts[0].password }));
  const email = 'audit-mfa-' + crypto.randomUUID() + '@example.invalid', password = crypto.randomUUID() + '!';
  userId = ok(await service.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { name: tag } })).user.id;
  ok(await service.from('users').update({ active: true }).eq('id', userId));
  ok(await client.auth.signInWithPassword({ email, password }));
  const task = await insert('tasks', { title: tag, sector: 'Administrativo', created_by: userId });
  const room = await insert('chat_rooms', { name: tag, type: 'dm', participants: [accounts[0].id, userId], created_by: userId });
  const message = ok(await admin.from('messages').insert({ room_id: room.id, user_id: accounts[0].id, content: tag }).select().single()); records.push(['messages', message.id]);
  objectPath = userId + '/audit-mfa-' + crypto.randomUUID() + '.txt';
  ok(await client.storage.from('drive-files').upload(objectPath, tag, { contentType: 'text/plain' }));
  await insert('drive_items', { name: tag + '.txt', type: 'file', storage_path: objectPath, uploaded_by: userId });
  ok(await client.from('tasks').select('id').eq('id', task.id).single()); pass('optional MFA permits account without verified factor');
  const factor = ok(await client.auth.mfa.enroll({ factorType: 'totp', issuer: 'Auditoria' }));
  ok(await client.auth.mfa.challengeAndVerify({ factorId: factor.id, code: totp(factor.totp.secret) }));
  const signin = ok(await client.auth.signInWithPassword({ email, password }));
  const stale = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { ...options, global: { headers: { Authorization: 'Bearer ' + signin.session.access_token } } });
  ok(await client.from('users').select('role,active').eq('id', userId).single()); pass('own sign-in profile remains readable before MFA');
  blocked(await client.from('tasks').select('id').eq('id', task.id), 'direct database read before MFA');
  blocked(await client.from('tasks').insert({ title: tag + ' bypass', sector: 'Administrativo', created_by: userId }).select(), 'direct database insert before MFA');
  blocked(await client.from('users').select('id').eq('id', accounts[0].id), 'employee directory before MFA');
  blocked(await client.from('users').update({ name: tag + ' bypass' }).eq('id', userId).select(), 'profile update before MFA');
  blocked(await client.storage.from('drive-files').createSignedUrl(objectPath, 60), 'private stored file before MFA');
  if (ok(await client.rpc('can_room', { r: room.id }))) throw Error('MFA bypass: room permission RPC');
  blocked(await client.rpc('toggle_message_reaction', { message_id: message.id, emoji: '👍' }), 'reaction RPC before MFA');
  ok(await client.rpc('mark_messages_read', { message_ids: [message.id] }));
  if (ok(await service.from('messages').select('read_by').eq('id', message.id).single()).read_by[userId]) throw Error('MFA bypass: read receipt RPC');
  pass('read receipt RPC cannot mutate before MFA');
  ok(await client.auth.mfa.challengeAndVerify({ factorId: factor.id, code: totp(factor.totp.secret) }));
  ok(await client.from('tasks').select('id').eq('id', task.id).single());
  ok(await client.storage.from('drive-files').createSignedUrl(objectPath, 60));
  ok(await client.rpc('toggle_message_reaction', { message_id: message.id, emoji: '👍' })); pass('verified MFA permits database, Storage and RPC');
  blocked(await stale.from('tasks').select('id').eq('id', task.id), 'old AAL1 token after verified MFA');
  ok(await client.auth.mfa.unenroll({ factorId: factor.id }));
  ok(await client.auth.refreshSession());
  ok(await client.from('tasks').select('id').eq('id', task.id).single()); pass('unenrollment restores optional MFA access');
  ok(await service.from('users').update({ active: false }).eq('id', userId));
  if (ok(await client.rpc('can_room', { r: room.id }))) throw Error('Inactive profile bypass: room RPC');
  blocked(await client.rpc('toggle_message_reaction', { message_id: message.id, emoji: '👍' }), 'inactive profile reaction RPC');
  pass('MFA AUDIT COMPLETE');
} catch (error) { console.error(error.message); process.exitCode = 1; }
finally {
  let failed = false;
  for (const [table, id] of records.reverse()) if ((await service.from(table).delete().eq('id', id)).error) failed = true;
  if (objectPath && (await service.storage.from('drive-files').remove([objectPath])).error) failed = true;
  if (userId && (await service.auth.admin.deleteUser(userId)).error) failed = true;
  if (failed) { console.error('Fixture cleanup failed'); process.exitCode = 1; } else pass('disposable fixtures removed');
}
