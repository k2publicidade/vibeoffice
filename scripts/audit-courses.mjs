// Live API checks with disposable accounts, courses and private storage objects.
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
config({ path: '.env.local', quiet: true });
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const options = { auth: { persistSession: false, autoRefreshToken: false } };
const service = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY, options);
const client = () => createClient(url, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, options);
const admin = client(), student = client();
const users = [], objects = [];
let courseId;
const nonce = randomUUID();
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a2S8AAAAASUVORK5CYII=', 'base64');
function checked(response, label) {
  if (response.error) throw new Error(label + ': ' + response.error.message);
  return response.data;
}
async function account(authenticated, role) {
  const email = `audit-course-${randomUUID()}@example.invalid`;
  const { user } = checked(await service.auth.admin.createUser({ email, email_confirm: true, user_metadata: { name: 'AUDITORIA CURSOS' } }), 'create disposable account');
  users.push(user.id);
  checked(await service.from('users').update({ active: true, role, sector: 'Marketing' }).eq('id', user.id).select('id').single(), 'activate disposable profile');
  const link = checked(await service.auth.admin.generateLink({ type: 'magiclink', email }), 'generate disposable session');
  checked(await authenticated.auth.verifyOtp({ token_hash: link.properties.hashed_token, type: 'magiclink' }), 'authenticate disposable account');
  return user.id;
}
try {
  const owner = await account(admin, 'Admin');
  const learner = await account(student, 'Colaborador');
  const path = `audit-courses/${nonce}/cover.png`;
  for (const bucket of ['course-assets', 'drive-files']) {
    checked(await admin.storage.from(bucket).upload(path, png, { contentType: 'image/png', upsert: false }), 'upload ' + bucket);
    objects.push([bucket, path]);
  }
  const course = checked(await admin.from('courses').insert({ title: 'AUDITORIA CURSOS ' + nonce, description: 'Original', subtitle: 'Original', instructor: 'Equipe', author_id: owner, thumbnail: 'storage://course-assets/' + path, is_published: true }).select().single(), 'create course');
  courseId = course.id;
  const courseModule = checked(await admin.from('modules').insert({ course_id: courseId, title: 'Módulo' }).select().single(), 'create module');
  const lesson = checked(await admin.from('lessons').insert({ course_id: courseId, module_id: courseModule.id, title: 'Aula', type: 'html', content: 'Teste', order: 0 }).select().single(), 'create lesson');
  checked(await admin.from('lessons').update({ chapter: 'Original', content_url: 'https://example.test/video', type: 'video' }).eq('id', lesson.id).select().single(), 'prepare editable video');
  const omitted = checked(await admin.from('lessons').update({ title: 'Aula editada', chapter: undefined, content_url: undefined }).eq('id', lesson.id).select().single(), 'partial lesson edit');
  assert.equal(omitted.chapter, 'Original'); assert.equal(omitted.content_url, 'https://example.test/video');
  checked(await admin.from('lessons').update({ chapter: null, content_url: null, type: 'html' }).eq('id', lesson.id).select('id').single(), 'clear video and chapter');
  const cleared = checked(await student.from('lessons').select('chapter,content_url,type').eq('id', lesson.id).single(), 'learner reads cleared lesson');
  assert.equal(cleared.chapter, null); assert.equal(cleared.content_url, null); assert.equal(cleared.type, 'html');
  console.log('PASS omitted lesson fields persist; explicit removals are visible to learner');
  checked(await student.from('courses').select('id').eq('id', courseId).single(), 'learner reads published course');
  const signed = checked(await student.storage.from('course-assets').createSignedUrl(path, 60), 'learner signs edited course image');
  const response = await fetch(signed.signedUrl);
  assert.equal(response.status, 200);
  assert.deepEqual(Buffer.from(await response.arrayBuffer()), png);
  const denied = await student.storage.from('drive-files').createSignedUrl(path, 60);
  assert.ok(denied.error, 'personal Drive upload must remain private from the learner');
  console.log('PASS learner downloads private course image; former Drive bucket denies access');
  const updated = checked(await admin.from('courses').update({ description: '', subtitle: null, thumbnail: null, duration: 0, tags: [], is_published: false }).eq('id', courseId).select().single(), 'clear course metadata');
  assert.equal(updated.description, ''); assert.equal(updated.subtitle, null); assert.equal(updated.thumbnail, null); assert.equal(updated.duration, 0); assert.deepEqual(updated.tags, []);
  assert.equal(checked(await student.from('courses').select('id').eq('id', courseId), 'read unpublished course').length, 0);
  checked(await admin.from('courses').update({ is_published: true }).eq('id', courseId).select('id').single(), 'publish again');
  console.log('PASS metadata clears persist; unpublished course hidden from learner');
  checked(await student.from('user_course_progress').upsert({ user_id: learner, course_id: courseId, lesson_id: lesson.id }, { onConflict: 'user_id,lesson_id' }), 'record progress');
  checked(await student.from('user_course_progress').upsert({ user_id: learner, course_id: courseId, lesson_id: lesson.id }, { onConflict: 'user_id,lesson_id' }), 'repeat progress');
  assert.equal(checked(await student.from('user_course_progress').select('lesson_id').eq('course_id', courseId), 'count persisted progress').length, 1);
  checked(await admin.from('lessons').delete().eq('id', lesson.id).select('id').single(), 'delete fixture lesson');
  assert.equal(checked(await student.from('user_course_progress').select('lesson_id').eq('course_id', courseId), 'progress cascade').length, 0);
  console.log('PASS repeated completion persists once; deleting lesson removes persisted progress');
  console.log('COURSES API AUDIT COMPLETE');
} finally {
  const failures = [];
  if (courseId) { const result = await service.from('courses').delete().eq('id', courseId); if (result.error) failures.push(result.error); }
  for (const [bucket, path] of objects) { const result = await service.storage.from(bucket).remove([path]); if (result.error) failures.push(result.error); }
  for (const id of users.reverse()) { const result = await service.auth.admin.deleteUser(id); if (result.error) failures.push(result.error); }
  if (failures.length) throw new AggregateError(failures, 'Course audit cleanup failed');
  console.log('CLEANUP temporary courses, files and accounts removed');
}
