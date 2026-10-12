// Real RLS and trigger checks. Every fixture and optional migration preview is rolled back.
import fs from 'node:fs';
import { randomUUID } from 'node:crypto';
import assert from 'node:assert/strict';
import pg from 'pg';
import { config } from 'dotenv';
config({ path: '.env.local', quiet: true });
const db = new pg.Client({ host: process.env.SUPABASE_DB_HOST, user: process.env.SUPABASE_DB_USER,
  password: process.env.SUPABASE_DB_PASSWORD, database: 'postgres', port: 5432,
  ssl: { ca: process.env.DATABASE_SSL_CA ? fs.readFileSync(process.env.DATABASE_SSL_CA, 'utf8') : undefined, rejectUnauthorized: true } });
const owner = randomUUID(), other = randomUUID(), admin = randomUUID();
async function actor(id, role = 'authenticated', aal = 'aal1') {
  await db.query('RESET ROLE');
  await db.query("select set_config('request.jwt.claims',$1,true)", [JSON.stringify({ sub: id, role, aal })]);
  await db.query(`SET LOCAL ROLE ${role === 'anon' ? 'anon' : 'authenticated'}`);
}
async function rejected(sql, args, code) {
  await db.query('SAVEPOINT rejected_write');
  let failure;
  try { await db.query(sql, args); } catch (error) { failure = error; }
  await db.query('ROLLBACK TO SAVEPOINT rejected_write');
  assert.ok(failure, 'Write must fail');
  if (code) assert.equal(failure.code, code);
}
async function save(id, changes) { return (await db.query('SELECT public.save_office_release($1,$2) r', [id, changes])).rows[0].r; }
async function events(id) { return (await db.query('SELECT * FROM public.calendar_events WHERE linked_release_id=$1 ORDER BY generated_by_release DESC', [id])).rows; }
try {
  await db.connect(); await db.query('BEGIN');
  if (process.argv.includes('--migration-preview')) await db.query(fs.readFileSync('supabase/migrations/202610120001_atomic_releases.sql', 'utf8').replace(/^BEGIN;\s*/, '').replace(/COMMIT;\s*$/, ''));
  for (const [id, role] of [[owner, 'Colaborador'], [other, 'Colaborador'], [admin, 'Admin']]) {
    await db.query('INSERT INTO auth.users(id,email,raw_user_meta_data) VALUES($1,$2,$3)', [id, `audit-release-${id}@example.invalid`, { name: 'AUDITORIA LANÇAMENTOS' }]);
    await db.query("UPDATE public.users SET active=true,role=$2,sector='Marketing' WHERE id=$1", [id, role]);
  }
  await actor(owner);
  const r = await save(null, { title: 'AUDITORIA ATÔMICA', artist: 'Artista', release_type: 'single', sector: 'Marketing', release_date: '2035-10-20', release_at: '2035-10-20T21:35:00Z' });
  assert.equal(r.created_by, owner); assert.equal(new Date(r.release_at).toISOString(), '2035-10-20T21:35:00.000Z');
  let generated = (await events(r.id))[0]; assert.equal(generated.generated_by_release, true);
  assert.equal(new Date(generated.start_time).toISOString(), '2035-10-20T21:35:00.000Z');
  assert.equal(new Date(generated.end_time) - new Date(generated.start_time), 3600000);
  const manual = (await db.query("INSERT INTO public.calendar_events(title,start_time,end_time,type,created_by,linked_release_id) VALUES('Reunião manual','2035-10-20T13:00Z','2035-10-20T14:00Z','company',$1,$2) RETURNING id", [owner,r.id])).rows[0];
  await save(r.id, { title: 'Título editado', artist: 'Novo artista', genre: 'Pop', sector: 'A&R', release_type: 'ep' });
  let all = await events(r.id); assert.equal(all.length, 2); generated=all[0];
  assert.equal(generated.title, 'Novo artista - Título editado'); assert.equal(generated.description, 'Lançamento: EP | Pop'); assert.equal(generated.sector, 'A&R');
  assert.equal(new Date(generated.start_time).toISOString(), '2035-10-20T21:35:00.000Z'); assert.equal(all[1].title, 'Reunião manual');
  console.log('PASS criação, horário persistido e metadados sincronizados preservam reunião manual');
  assert.equal((await db.query("UPDATE public.calendar_events SET title='Indevido' WHERE id=$1 RETURNING id", [generated.id])).rowCount,0);
  assert.equal((await db.query('DELETE FROM public.calendar_events WHERE id=$1 RETURNING id', [generated.id])).rowCount,0);
  await rejected("INSERT INTO public.calendar_events(title,start_time,end_time,type,created_by,linked_release_id,generated_by_release) VALUES('Forjado','2035-10-20T13:00Z','2035-10-20T14:00Z','company',$1,$2,true)", [owner,r.id], '42501');
  await actor(other); await rejected('SELECT public.save_office_release($1,$2)', [r.id,{title:'Outro dono'}], '42501');
  await actor(admin); assert.equal((await save(r.id,{notes:'Admin autorizado'})).notes,'Admin autorizado');
  await actor(owner); await rejected('SELECT public.save_office_release($1,$2)', [r.id,{created_by:other}]);
  console.log('PASS eventos automáticos protegidos, dono/admin autorizados e outro colaborador bloqueado');
  await db.query('RESET ROLE');
  await db.query("ALTER TABLE public.calendar_events ADD CONSTRAINT audit_release_failure CHECK (title <> 'Novo artista - Falha atômica')");
  await actor(owner); await rejected('SELECT public.save_office_release($1,$2)', [r.id,{title:'Falha atômica'}], '23514');
  assert.equal((await db.query('SELECT title FROM public.releases WHERE id=$1',[r.id])).rows[0].title,'Título editado');
  assert.equal((await events(r.id))[0].title,'Novo artista - Título editado');
  await rejected('SELECT public.save_office_release($1,$2)', [null,{title:'Falha atômica',artist:'Novo artista',release_type:'single',release_date:'2035-10-20'}], '23514');
  assert.equal((await db.query("SELECT count(*) n FROM public.releases WHERE title='Falha atômica'")).rows[0].n,'0');
  console.log('PASS falha real na agenda desfaz criação e edição do lançamento');
  const cleared=await save(r.id,{release_date:null,release_at:null,composers:[],tracks:[],platform_links:[],notes:null});
  assert.equal(cleared.release_at,null); assert.equal(cleared.notes,null); assert.deepEqual(cleared.tracks,[]);
  all=await events(r.id); assert.equal(all.length,1); assert.equal(all[0].id,manual.id);
  await save(r.id,{release_date:'2035-10-22',release_at:'2035-10-22T19:10Z'});
  assert.equal((await events(r.id)).length,2);
  await save(r.id,{release_date:'2035-10-23'});
  assert.equal(new Date((await events(r.id))[0].start_time).toISOString(),'2035-10-23T15:00:00.000Z');
  assert.equal((await db.query('DELETE FROM public.releases WHERE id=$1 RETURNING id',[r.id])).rowCount,1);
  assert.equal((await db.query('SELECT linked_release_id FROM public.calendar_events WHERE id=$1',[manual.id])).rows[0].linked_release_id,null);
  assert.equal((await events(r.id)).length,0);
  console.log('PASS remover data/excluir lançamento preserva reunião manual e remove apenas evento automático');
  await db.query('RESET ROLE'); await db.query('UPDATE public.users SET active=false WHERE id=$1',[owner]);
  await actor(owner); await rejected('SELECT public.save_office_release(null,$1)',[{title:'Inativo',artist:'A',release_type:'single'}],'42501');
  await actor(owner,'anon'); await rejected('SELECT public.save_office_release(null,$1)',[{}],'42501');
  console.log('PASS usuário inativo e anônimo bloqueados');
  await db.query('RESET ROLE');
  await db.query('UPDATE public.users SET active=true WHERE id=$1',[owner]);
  await db.query("INSERT INTO auth.mfa_factors(id,user_id,factor_type,status,created_at,updated_at,secret) VALUES($1,$2,'totp','verified',now(),now(),'JBSWY3DPEHPK3PXP')",[randomUUID(),owner]);
  await actor(owner); await rejected('SELECT public.save_office_release(null,$1)',[{title:'MFA negado',artist:'A',release_type:'single'}],'42501');
  await actor(owner,'authenticated','aal2');
  assert.equal((await save(null,{title:'MFA autorizado',artist:'A',release_type:'single'})).title,'MFA autorizado');
  console.log('PASS MFA habilitado exige sessão aal2 para salvar lançamento');
  console.log('RELEASE TRANSACTION AUDIT COMPLETE (ROLLBACK)');
} finally { await db.query('ROLLBACK'); await db.end(); }
