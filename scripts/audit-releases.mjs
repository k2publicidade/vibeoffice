// Verify release persistence and private files using disposable accounts and fixtures.
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
config({ path: '.env.local', quiet: true });
const options = { auth: { persistSession: false, autoRefreshToken: false } };
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const service = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY, options);
const client = () => createClient(url, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, options);
const owner = client(), other = client();
const users = [], paths = [];
let releaseId;
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a2S8AAAAASUVORK5CYII=', 'base64');
const audio = Buffer.alloc(46);
audio.write('RIFF', 0); audio.writeUInt32LE(38, 4); audio.write('WAVEfmt ', 8); audio.writeUInt32LE(16, 16); audio.writeUInt16LE(1, 20); audio.writeUInt16LE(1, 22); audio.writeUInt32LE(44100, 24); audio.writeUInt32LE(88200, 28); audio.writeUInt16LE(2, 32); audio.writeUInt16LE(16, 34); audio.write('data', 36); audio.writeUInt32LE(2, 40);
function checked(response, label) { if (response.error) throw new Error(label + ': ' + response.error.message); return response.data; }
async function account(authenticated) {
  const email = `audit-release-${randomUUID()}@example.invalid`;
  const { user } = checked(await service.auth.admin.createUser({ email, email_confirm: true, user_metadata: { name: 'AUDITORIA LANCAMENTOS' } }), 'create account');
  users.push(user.id);
  checked(await service.from('users').update({ active: true, role: 'Colaborador', sector: 'Marketing' }).eq('id', user.id).select('id').single(), 'activate profile');
  const link = checked(await service.auth.admin.generateLink({ type: 'magiclink', email }), 'generate session');
  checked(await authenticated.auth.verifyOtp({ token_hash: link.properties.hashed_token, type: 'magiclink' }), 'authenticate');
  return user.id;
}
try {
  await account(owner);
  await account(other);
  const prefix = 'audit-releases/' + randomUUID();
  for (const [name, bytes, contentType] of [['cover.png', png, 'image/png'], ['audio.wav', audio, 'audio/wav']]) {
    const filePath = prefix + '/' + name;
    checked(await owner.storage.from('release-assets').upload(filePath, bytes, { contentType, upsert: false }), 'upload fixture');
    paths.push(filePath);
  }
  const created = checked(await owner.rpc('save_office_release', { release_id: null, changes: { title: 'AUDITORIA LANCAMENTOS', artist: 'Teste', release_type: 'single', release_date: '2030-10-20', release_at: '2030-10-20T21:35:00Z', cover_url: 'storage://release-assets/' + paths[0], wav_url: 'storage://release-assets/' + paths[1], notes: 'Original', composers: [{ name: 'Compositor' }], tracks: [{ title: 'Faixa' }], platform_links: [{ platform: 'Teste', url: 'https://example.test' }] } }), 'create release');
  releaseId = created.id;
  assert.equal(new Date(created.release_at).toISOString(), '2030-10-20T21:35:00.000Z');
  const event = checked(await owner.from('calendar_events').select('start_time').eq('linked_release_id', releaseId).eq('generated_by_release', true).single(), 'generated event');
  assert.equal(new Date(event.start_time).toISOString(), '2030-10-20T21:35:00.000Z');
  checked(await other.from('releases').select('id').eq('id', releaseId).single(), 'read another user release');
  for (const [index, expected] of [png, audio].entries()) {
    const signed = checked(await other.storage.from('release-assets').createSignedUrl(paths[index], 60), 'sign private file');
    const response = await fetch(signed.signedUrl);
    assert.equal(response.status, 200); assert.deepEqual(Buffer.from(await response.arrayBuffer()), expected);
  }
  console.log('PASS another active employee reads release and downloads its private PNG/WAV files');
  const denied = await other.rpc('save_office_release', { release_id: releaseId, changes: { title: 'Indevido' } });
  assert.equal(denied.error?.code, '42501');
  const partial = checked(await owner.rpc('save_office_release', { release_id: releaseId, changes: { title: 'Editado', notes: undefined } }), 'partial update');
  assert.equal(partial.notes, 'Original');
  const updated = checked(await owner.rpc('save_office_release', { release_id: releaseId, changes: { notes: null, cover_url: null, wav_url: null, release_date: null, release_at: null, composers: [], tracks: [], platform_links: [] } }), 'remove fields');
  for (const key of ['notes', 'cover_url', 'wav_url', 'release_date']) assert.equal(updated[key], null);
  for (const key of ['composers', 'tracks', 'platform_links']) assert.deepEqual(updated[key], []);
  const read = checked(await other.from('releases').select('notes,release_date').eq('id', releaseId).single(), 'read removed fields');
  assert.equal(read.notes, null); assert.equal(read.release_date, null);
  console.log('PASS unauthorized RPC is denied; omitted fields persist and explicit removals are visible');
  console.log('RELEASE API AUDIT COMPLETE');
} finally {
  const failures = [];
  if (releaseId) { const result = await service.from('releases').delete().eq('id', releaseId); if (result.error) failures.push(result.error); }
  if (paths.length) { const result = await service.storage.from('release-assets').remove(paths); if (result.error) failures.push(result.error); }
  for (const id of users.reverse()) { const result = await service.auth.admin.deleteUser(id); if (result.error) failures.push(result.error); }
  if (failures.length) throw new AggregateError(failures, 'Release fixture cleanup failed');
  console.log('CLEANUP release, private files and temporary accounts removed');
}
