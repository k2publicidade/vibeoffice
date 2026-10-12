// Exercise deployed RLS with disposable fixtures inside one rolled-back transaction.
import fs from 'node:fs';
import { randomUUID } from 'node:crypto';
import assert from 'node:assert/strict';
import pg from 'pg';
import { config } from 'dotenv';
config({ path: '.env.local', quiet: true });
const db = new pg.Client({
  host: process.env.SUPABASE_DB_HOST, user: process.env.SUPABASE_DB_USER,
  password: process.env.SUPABASE_DB_PASSWORD, database: 'postgres', port: 5432,
  ssl: { ca: process.env.DATABASE_SSL_CA ? fs.readFileSync(process.env.DATABASE_SSL_CA, 'utf8') : undefined, rejectUnauthorized: true },
});
const admin = randomUUID(), collaborator = randomUUID();
async function actor(id) {
  await db.query('RESET ROLE');
  await db.query("select set_config('request.jwt.claims',$1,true)", [JSON.stringify({ sub: id, role: 'authenticated', aal: 'aal1' })]);
  await db.query('SET LOCAL ROLE authenticated');
}
async function insert(sql, args = []) { return (await db.query(sql + ' returning id', args)).rows[0].id; }
try {
  await db.connect(); await db.query('BEGIN');
  for (const [id, role] of [[admin, 'Admin'], [collaborator, 'Colaborador']]) {
    await db.query('insert into auth.users(id,email,raw_user_meta_data) values($1,$2,$3)', [id, 'audit-delete-' + id + '@example.invalid', { name: 'AUDITORIA EXCLUSAO' }]);
    await db.query("update public.users set active=true,role=$2,sector='Marketing' where id=$1", [id, role]);
  }
  const task = await insert("insert into public.tasks(title,sector,created_by) values('AUDITORIA EXCLUSAO','Marketing',$1)", [admin]);
  await db.query('insert into public.task_assignees(task_id,user_id) values($1,$2)', [task, collaborator]);
  const ticket = await insert("insert into public.tickets(title,description,category,requester,created_by,linked_task_id) values('AUDITORIA EXCLUSAO','Teste','Marketing',$1,$1,$2)", [admin, task]);
  const comment = await insert("insert into public.ticket_comments(ticket_id,user_id,content) values($1,$2,'Preservar comentário')", [ticket, admin]);
  const announcement = await insert("insert into public.company_announcements(title,message,created_by,expires_at) values('AUDITORIA EXCLUSAO','Teste',$1,'2035-01-01')", [admin]);
  const release = await insert("insert into public.releases(title,artist,created_by) values('AUDITORIA EXCLUSAO','Teste',$1)", [admin]);
  const course = await insert("insert into public.courses(title,author_id,is_published) values('AUDITORIA EXCLUSAO',$1,true)", [admin]);
  const courseModule = await insert("insert into public.modules(course_id,title) values($1,'Módulo')", [course]);
  const lesson = await insert("insert into public.lessons(course_id,module_id,title,type,content,\"order\") values($1,$2,'Aula','html','Teste',0)", [course, courseModule]);
  const notification = await insert("insert into public.notifications(user_id,type,title,message,entity_type,entity_id) values($1,'task','Teste','Preservar','task',$2)", [collaborator, task]);
  // Only these hard-coded tables are interpolated; IDs remain bound parameters.
  const records = [['ticket_comments', comment], ['tickets', ticket], ['tasks', task], ['company_announcements', announcement], ['releases', release], ['lessons', lesson], ['modules', courseModule], ['courses', course]];
  await actor(collaborator);
  for (const [table, id] of records) {
    assert.equal((await db.query(`select id from public.${table} where id=$1`, [id])).rowCount, 1, table + ' is visible');
    assert.equal((await db.query(`delete from public.${table} where id=$1 returning id`, [id])).rowCount, 0, table + ' is protected');
    assert.equal((await db.query(`select id from public.${table} where id=$1`, [id])).rowCount, 1, table + ' survives');
    console.log('PASS visible ' + table + ' cannot be deleted by collaborator; zero rows returned');
  }
  assert.equal((await db.query('select id from public.notifications where id=$1', [notification])).rowCount, 1);
  await actor(admin);
  for (const [table, id] of records) {
    assert.equal((await db.query(`delete from public.${table} where id=$1 returning id`, [id])).rowCount, 1, table + ' confirmed');
    assert.equal((await db.query(`delete from public.${table} where id=$1 returning id`, [id])).rowCount, 0, table + ' already absent');
    console.log('PASS authorized ' + table + ' deletion returns one row; repeated deletion returns none');
  }
  console.log('DELETE TRANSACTION AUDIT COMPLETE (ROLLBACK)');
} finally { await db.query('ROLLBACK'); await db.end(); }
