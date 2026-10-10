// Isolated database checks: all fixtures and writes are rolled back.
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
const owner = randomUUID(), staff = randomUUID();
async function actor(id) {
  await db.query('RESET ROLE');
  await db.query("select set_config('request.jwt.claims',$1,true)", [JSON.stringify({ sub: id, role: 'authenticated', aal: 'aal1' })]);
  await db.query('SET LOCAL ROLE authenticated');
}
async function denied(sql, args) {
  await db.query('SAVEPOINT denied_write');
  let error;
  try { await db.query(sql, args); } catch (failure) { error = failure; }
  await db.query('ROLLBACK TO SAVEPOINT denied_write');
  assert.equal(error?.code, '42501', 'Expected sector authorization to deny this write');
}
try {
  await db.connect();
  await db.query('BEGIN');
  if (process.argv.includes('--migration-preview')) {
    await db.query(fs.readFileSync('supabase/migrations/202610100002_calendar_sector_edits.sql', 'utf8').replace(/^BEGIN;\s*/, '').replace(/COMMIT;\s*$/, ''));
  }
  for (const [id, role] of [[owner, 'Colaborador'], [staff, 'Admin']]) {
    await db.query("insert into auth.users(id,email,raw_user_meta_data) values($1,$2,$3)", [id, 'audit-calendar-' + id + '@example.invalid', { name: 'AUDITORIA AGENDA' }]);
    await db.query("update public.users set active=true, role=$2, sector='Marketing' where id=$1", [id, role]);
  }
  await actor(owner);
  await denied("insert into public.calendar_events(title,start_time,end_time,type,sector,created_by) values('Setor proibido','2035-10-20T13:00Z','2035-10-20T14:00Z','sector','Financeiro',$1)", [owner]);
  const task = (await db.query('select public.save_office_task(null,$1) t', [{ title: 'AUDITORIA VINCULO MANUAL', status: 'todo', priority: 'medium', sector: 'Marketing' }])).rows[0].t;
  const event = (await db.query("insert into public.calendar_events(title,start_time,end_time,type,sector,created_by,linked_task_id) values('Reunião manual','2035-10-20T13:00Z','2035-10-20T14:00Z','sector','Marketing',$1,$2) returning *", [owner, task.id])).rows[0];
  await denied("update public.calendar_events set sector='Financeiro' where id=$1", [event.id]);
  console.log('PASS criação e edição negam publicar em outro setor');
  const updated = (await db.query("update public.calendar_events set title='Reunião editada',linked_task_id=null,linked_ticket_id=null where id=$1 returning *", [event.id])).rows[0];
  assert.equal(updated.title, 'Reunião editada');
  assert.equal(updated.linked_task_id, null);
  console.log('PASS edição grava título e remove vínculo manual');
  const duplicate = (await db.query("insert into public.calendar_events(title,start_time,end_time,type,sector,created_by) select title||' (Cópia)',start_time,end_time,type,sector,created_by from public.calendar_events where id=$1 returning *", [event.id])).rows[0];
  assert.equal(duplicate.sector, 'Marketing');
  assert.notEqual(duplicate.id, event.id);
  await actor(staff);
  assert.equal((await db.query("update public.calendar_events set sector='Financeiro' where id=$1 returning sector", [event.id])).rows[0].sector, 'Financeiro');
  console.log('PASS administrador altera setor e cópia preserva setor');
  await actor(owner);
  await db.query('RESET ROLE');
  await db.query('update public.users set active=false where id=$1', [owner]);
  await actor(owner);
  assert.equal((await db.query('delete from public.calendar_events where id=$1 returning id', [duplicate.id])).rowCount, 0);
  await db.query('RESET ROLE');
  await db.query('update public.users set active=true where id=$1', [owner]);
  await actor(owner);
  assert.equal((await db.query('delete from public.calendar_events where id=$1 returning id', [duplicate.id])).rowCount, 1);
  console.log('PASS exclusão confirma linha autorizada e bloqueia usuário inativo');
  console.log('CALENDAR TRANSACTION AUDIT COMPLETE (ROLLBACK)');
} finally {
  await db.query('ROLLBACK');
  await db.end();
}
