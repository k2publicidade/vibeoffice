// Disposable sessions only; no notifications or outgoing messages are generated.
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
config({ path: '.env.local', quiet: true });
const options = { auth: { persistSession: false, autoRefreshToken: false } };
const service = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, options);
const client = () => createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, options);
const owner = client(), other = client();
const users = [];
function checked(response, label) { if (response.error) throw new Error(`${label}: ${response.error.message}`); return response.data; }
async function account(authenticated) {
  const email = `audit-preferences-${randomUUID()}@example.invalid`;
  const { user } = checked(await service.auth.admin.createUser({ email, email_confirm: true, user_metadata: { name: 'AUDITORIA PREFERÊNCIAS' } }), 'create account');
  users.push(user.id);
  checked(await service.from('users').update({ active: true, role: 'Colaborador', sector: 'Marketing' }).eq('id', user.id).select('id').single(), 'activate profile');
  const link = checked(await service.auth.admin.generateLink({ type: 'magiclink', email }), 'generate session');
  checked(await authenticated.auth.verifyOtp({ token_hash: link.properties.hashed_token, type: 'magiclink' }), 'authenticate');
  return user.id;
}
const filters = (query, id) => query.eq('user_id', id).eq('notification_type', 'task_assigned');
try {
  const id = await account(owner); await account(other);
  checked(await owner.from('notification_preferences').upsert({ user_id: id, notification_type: 'task_assigned', enable_in_app: true, enable_push: false, enable_email: false }, { onConflict: 'user_id,notification_type' }).select().single(), 'initialize preference');
  const saved = checked(await filters(owner.from('notification_preferences').update({ enable_email: true }), id).select().single(), 'confirmed update');
  assert.equal(saved.enable_email, true); assert.equal(saved.enable_in_app, true); assert.equal(saved.enable_push, false);
  const read = checked(await filters(owner.from('notification_preferences').select('*'), id).single(), 'read preference');
  assert.equal(read.enable_email, true);
  const plainDenied = await filters(other.from('notification_preferences').update({ enable_email: false }), id);
  assert.equal(plainDenied.error, null, 'Unconfirmed UPDATE can return success while RLS hides every row');
  const confirmedDenied = await filters(other.from('notification_preferences').update({ enable_email: false }), id).select().single();
  assert.equal(confirmedDenied.error?.code, 'PGRST116');
  assert.equal(checked(await filters(owner.from('notification_preferences').select('enable_email'), id).single(), 'unchanged owner').enable_email, true);
  console.log('PASS own preference persists and untouched channels are retained; confirmation detects denied zero-row write');
  checked(await filters(service.from('notification_preferences').delete(), id), 'remove own disposable preference');
  const plainMissing = await filters(owner.from('notification_preferences').update({ enable_email: false }), id);
  assert.equal(plainMissing.error, null);
  const confirmedMissing = await filters(owner.from('notification_preferences').update({ enable_email: false }), id).select().single();
  assert.equal(confirmedMissing.error?.code, 'PGRST116');
  console.log('PASS confirmation detects a missing row instead of falsely reporting a saved preference');
  checked(await owner.from('notification_preferences').insert({ user_id: id, notification_type: 'task_assigned', enable_in_app: true, enable_push: false, enable_email: false }).select().single(), 'restore disposable preference');
  checked(await service.from('users').update({ active: false }).eq('id', id).select('id').single(), 'inactivate own fixture');
  const inactive = await filters(owner.from('notification_preferences').update({ enable_email: true }), id).select().single();
  assert.equal(inactive.error?.code, 'PGRST116');
  console.log('PASS inactive user cannot change preferences');
  console.log('NOTIFICATION PREFERENCES API AUDIT COMPLETE');
} finally {
  const failures = [];
  for (const id of users.reverse()) { const result = await service.auth.admin.deleteUser(id); if (result.error) failures.push(result.error); }
  if (failures.length) throw new AggregateError(failures, 'Preference fixture cleanup failed');
  console.log('CLEANUP temporary accounts and preferences removed');
}
