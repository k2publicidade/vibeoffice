// Uses only disposable fixtures; credentials must remain outside source control.
import fs from 'node:fs';
import { randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { config } from 'dotenv';

config({ path: '.env.local', quiet: true });
const env = process.env;
if (!env.OFFICE_AUDIT_ACCOUNTS) throw Error('Set OFFICE_AUDIT_ACCOUNTS to private account JSON');
const accounts = JSON.parse(fs.readFileSync(env.OFFICE_AUDIT_ACCOUNTS, 'utf8'));
const origin = process.argv[2]; // Omit for database-only checks.
const options = { auth: { persistSession: false, autoRefreshToken: false } };
const service = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, options);
const anonymous = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, options);
const tag = 'AUDITORIA DRIVE ' + randomUUID().slice(0, 8);
const paths = [], ids = [];
let temporaryUser;

function data(result, label) {
  if (result.error) throw Error(label + ': ' + result.error.message);
  return result.data;
}
function pass(label) { console.log('PASS ' + label); }
function denied(result, label) {
  if (!result.error && (Array.isArray(result.data) ? result.data.length : result.data)) throw Error('Unauthorized: ' + label);
  pass('denied ' + label);
}
async function session(account) {
  const jar = new Map();
  const client = createServerClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    cookies: { getAll: () => [...jar].map(([name, value]) => ({ name, value })), setAll: cookies => cookies.forEach(c => jar.set(c.name, c.value)) },
    auth: { autoRefreshToken: false },
  });
  data(await client.auth.signInWithPassword(account), 'login');
  return { client, cookie: () => [...jar].map(([name, value]) => name + '=' + value).join('; ') };
}
async function item(client, fields) {
  const row = data(await client.from('drive_items').insert(fields).select().single(), 'create fixture');
  ids.push(row.id);
  return row;
}
async function share(client, itemId, userId, sharedBy, permission) {
  return data(await client.from('shared_access').upsert({ item_id: itemId, user_id: userId, shared_by: sharedBy, permission }, { onConflict: 'item_id,user_id' }).select().single(), 'share fixture');
}
async function request(path, session) {
  return fetch(origin + path, { redirect: 'manual', headers: session ? { cookie: session.cookie() } : {} });
}
async function expectStatus(path, status, who, label) {
  const response = await request(path, who);
  if (response.status !== status) throw Error(label + ': HTTP ' + response.status);
  pass(label);
  return response;
}

try {
  const admin = await session({ email: accounts[0].email, password: accounts[0].password });
  const manager = await session({ email: accounts[1].email, password: accounts[1].password });
  const email = 'audit-drive-' + randomUUID() + '@example.invalid', password = randomUUID() + '!';
  const created = data(await service.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { name: tag } }), 'temporary collaborator');
  temporaryUser = created.user.id;
  data(await service.from('users').update({ active: true }).eq('id', temporaryUser), 'activate fixture');
  const collaborator = await session({ email, password });
  const folder = await item(admin.client, { name: tag, type: 'folder', uploaded_by: accounts[0].id });
  const nested = await item(admin.client, { name: tag + ' subpasta', type: 'folder', parent_id: folder.id, uploaded_by: accounts[0].id });
  const content = 'Arquivo técnico descartável de auditoria do Drive.\n';
  const path = accounts[0].id + '/audit-' + randomUUID() + '.txt';
  data(await admin.client.storage.from('drive-files').upload(path, content, { contentType: 'text/plain' }), 'upload fixture'); paths.push(path);
  const file = await item(admin.client, { name: tag + '.txt', type: 'file', mime_type: 'text/plain', size: Buffer.byteLength(content), storage_path: path, parent_id: nested.id, uploaded_by: accounts[0].id });
  denied(await manager.client.from('drive_items').select('id').eq('id', file.id), 'unshared private file');
  denied(await anonymous.rpc('drive_is_public', { i: file.id }), 'anonymous privileged RPC');
  denied(await anonymous.from('drive_items').select('id').eq('id', file.id), 'anonymous metadata');
  if (origin) {
    await expectStatus('/drive/share/' + file.id, 307, null, 'private link requires login');
    await expectStatus('/drive/share/' + file.id, 404, manager, 'signed-in outsider cannot open private link');
    await expectStatus('/drive/share/' + file.id + '/download', 404, null, 'anonymous private download blocked');
    await expectStatus('/drive/share/not-a-uuid', 404, null, 'malformed link rejected');
  }
  await share(admin.client, file.id, accounts[1].id, accounts[0].id, 'view');
  const visible = data(await manager.client.from('drive_items').select('id,shared_access(user_id,permission)').eq('id', file.id).single(), 'read shared file');
  if (visible.shared_access[0]?.permission !== 'view') throw Error('Sharing grants missing from relation');
  denied(await manager.client.from('drive_items').select('id').eq('id', folder.id), 'shared leaf does not expose parent');
  data(await manager.client.storage.from('drive-files').createSignedUrl(path, 60), 'shared file storage access');
  denied(await manager.client.from('drive_items').update({ name: 'Unauthorized' }).eq('id', file.id).select(), 'viewer cannot rename');
  denied(await manager.client.storage.from('drive-files').remove([path]), 'viewer cannot delete stored bytes');
  data(await admin.client.storage.from('drive-files').createSignedUrl(path, 60), 'viewer deletion kept file');
  pass('file-level grants returned with permission');
  if (origin) {
    await expectStatus('/drive/share/' + file.id, 200, manager, 'authorized private page works');
    await expectStatus('/drive/share/' + file.id + '/download', 307, manager, 'authorized private download works');
  }
  await share(admin.client, file.id, accounts[1].id, accounts[0].id, 'edit');
  data(await manager.client.from('drive_items').update({ name: tag + ' editado.txt' }).eq('id', file.id).select().single(), 'editor rename');
  denied(await manager.client.from('drive_items').update({ is_public: true }).eq('id', file.id).select(), 'editor cannot publish');
  denied(await manager.client.from('shared_access').insert({ item_id: file.id, user_id: temporaryUser, shared_by: accounts[1].id, permission: 'manage' }).select(), 'editor cannot grant access');
  denied(await manager.client.from('drive_items').update({ uploaded_by: accounts[1].id }).eq('id', file.id).select(), 'immutable owner');
  denied(await manager.client.from('drive_items').update({ storage_path: 'other-object' }).eq('id', file.id).select(), 'immutable storage identity');
  denied(await manager.client.from('drive_items').insert({ name: tag + ' falsificação', type: 'file', uploaded_by: accounts[1].id, storage_path: path }).select(), 'cannot forge another owner storage object');
  await share(admin.client, file.id, accounts[1].id, accounts[0].id, 'manage');
  data(await manager.client.from('drive_items').update({ is_public: true }).eq('id', file.id).select().single(), 'manager can publish');
  data(await manager.client.from('drive_items').update({ is_public: false }).eq('id', file.id).select().single(), 'manager can restrict again');
  await share(manager.client, file.id, temporaryUser, accounts[1].id, 'view');
  data(await collaborator.client.from('drive_items').select('id').eq('id', file.id).single(), 'manager can grant collaborator access');
  data(await manager.client.from('shared_access').delete().eq('item_id', file.id).eq('user_id', temporaryUser).select().single(), 'revoke collaborator access');
  denied(await collaborator.client.from('drive_items').select('id').eq('id', file.id), 'revocation removes access');
  data(await admin.client.from('shared_access').delete().eq('item_id', file.id).eq('user_id', accounts[1].id), 'remove direct grant');
  await share(admin.client, folder.id, accounts[1].id, accounts[0].id, 'view');
  data(await manager.client.from('drive_items').select('id').eq('id', file.id).single(), 'inherited nested access');
  data(await manager.client.storage.from('drive-files').createSignedUrl(path, 60), 'inherited storage access');
  denied(await manager.client.from('drive_items').update({ name: 'Unauthorized' }).eq('id', file.id).select(), 'inherited viewer cannot write');
  denied(await admin.client.from('drive_items').update({ parent_id: nested.id }).eq('id', folder.id).select(), 'folder cycle');
  denied(await admin.client.from('drive_items').update({ parent_id: file.id }).eq('id', nested.id).select(), 'file cannot be parent');
  const destination = await item(collaborator.client, { name: tag + ' restrita', type: 'folder', uploaded_by: temporaryUser });
  await share(admin.client, file.id, accounts[1].id, accounts[0].id, 'edit');
  denied(await manager.client.from('drive_items').update({ parent_id: destination.id }).eq('id', file.id).select(), 'destination must be writable');
  data(await admin.client.from('drive_items').update({ is_public: true }).eq('id', folder.id).select().single(), 'publish benign fixture folder');
  if (!data(await service.rpc('drive_is_public', { i: file.id }), 'public inheritance')) throw Error('Public folder not inherited');
  if (origin) {
    const page = await expectStatus('/drive/share/' + folder.id, 200, null, 'public folder page works');
    if (!(await page.text()).includes(nested.id)) throw Error('Public folder child missing');
    await expectStatus('/drive/share/' + file.id, 200, null, 'nested public file page works');
    const download = await expectStatus('/drive/share/' + file.id + '/download', 307, null, 'public download authorized');
    const bytes = await fetch(download.headers.get('location'));
    if (bytes.status !== 200 || await bytes.text() !== content) throw Error('Public download content incorrect');
    pass('public download returns exact uploaded content');
  }
  data(await admin.client.from('drive_items').update({ is_public: false }).eq('id', folder.id).select().single(), 'revoke public access');
  if (data(await service.rpc('drive_is_public', { i: file.id }), 'private inheritance')) throw Error('Public access not revoked');
  if (origin) {
    await expectStatus('/drive/share/' + file.id, 307, null, 'revoked public link requires login');
    await expectStatus('/drive/share/' + file.id + '/download', 404, null, 'revoked public download blocked');
  }
  const removed = data(await manager.client.storage.from('drive-files').remove([path]), 'editor deletes authorized stored bytes');
  if (removed.length !== 1) throw Error('Authorized Storage deletion silently skipped');
  denied(await admin.client.storage.from('drive-files').createSignedUrl(path, 60), 'deleted object no longer downloadable');
  data(await manager.client.from('drive_items').delete().eq('id', file.id).select().single(), 'editor deletes file metadata');
  pass('authorized deletion removes both stored bytes and metadata');
  pass('DRIVE AUDIT COMPLETE');
} catch (error) { console.error(error.message); process.exitCode = 1; }
finally {
  let cleanupFailed = false;
  for (const id of ids.reverse()) {
    const result = await service.from('drive_items').delete().eq('id', id);
    if (result.error) { cleanupFailed = true; console.error('Fixture metadata cleanup failed'); }
  }
  if (paths.length && (await service.storage.from('drive-files').remove(paths)).error) { cleanupFailed = true; console.error('Fixture storage cleanup failed'); }
  if (temporaryUser && (await service.auth.admin.deleteUser(temporaryUser)).error) { cleanupFailed = true; console.error('Fixture account cleanup failed'); }
  if (cleanupFailed) process.exitCode = 1;
  else pass('disposable fixtures removed');
}
