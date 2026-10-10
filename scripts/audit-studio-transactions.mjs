// Test real RLS and booking constraints without retaining any fixture.
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
const owner = randomUUID(), other = randomUUID(), studio = 'AUDITORIA ESTUDIO ' + randomUUID();
async function actor(id) {
  await db.query('RESET ROLE');
  await db.query("select set_config('request.jwt.claims',$1,true)", [JSON.stringify({ sub: id, role: 'authenticated', aal: 'aal1' })]);
  await db.query('SET LOCAL ROLE authenticated');
}
async function rejected(sql, values, code) {
  await db.query('SAVEPOINT rejected_write');
  let failure;
  try { await db.query(sql, values); } catch (error) { failure = error; }
  await db.query('ROLLBACK TO SAVEPOINT rejected_write');
  assert.equal(failure?.code, code);
}
try {
  await db.connect(); await db.query('BEGIN');
  for (const id of [owner, other]) {
    await db.query('insert into auth.users(id,email,raw_user_meta_data) values($1,$2,$3)', [id, 'audit-studio-' + id + '@example.invalid', { name: 'AUDITORIA ESTUDIO' }]);
    await db.query("update public.users set active=true,role='Colaborador',sector='Marketing' where id=$1", [id]);
  }
  await actor(other);
  const session = (await db.query("insert into public.studio_bookings(track_title,studio_name,booking_date,start_time,end_time,created_by) values('Reserva de outro colaborador',$1,'2035-10-20','13:00','14:00',$2) returning id", [studio, other])).rows[0];
  await actor(owner);
  assert.equal((await db.query('select id from public.studio_bookings where id=$1', [session.id])).rowCount, 1);
  assert.equal((await db.query('delete from public.studio_bookings where id=$1 returning id', [session.id])).rowCount, 0);
  assert.equal((await db.query('update public.studio_bookings set track_title=$2 where id=$1 returning id', [session.id, 'Edição indevida'])).rowCount, 0);
  console.log('PASS sessão visível de outro colaborador não pode ser excluída ou editada');
  const insert = "insert into public.studio_bookings(track_title,studio_name,booking_date,start_time,end_time,created_by) values('Reserva própria',$1,'2035-10-20',$2,$3,$4) returning id";
  await rejected(insert, [studio, '13:30', '14:30', owner], '23P01');
  await rejected(insert, [studio, '15:00', '14:00', owner], '23514');
  const own = (await db.query(insert, [studio, '14:00', '15:00', owner])).rows[0];
  console.log('PASS conflito e intervalo inválido negados; horários adjacentes permitidos');
  await rejected('update public.studio_bookings set start_time=$2 where id=$1', [own.id, '13:45'], '23P01');
  assert.equal((await db.query('select start_time from public.studio_bookings where id=$1', [own.id])).rows[0].start_time, '14:00:00');
  assert.equal((await db.query('delete from public.studio_bookings where id=$1 returning id', [own.id])).rowCount, 1);
  console.log('PASS edição conflitante preserva horário; exclusão própria retorna confirmação');
  console.log('STUDIO TRANSACTION AUDIT COMPLETE (ROLLBACK)');
} finally { await db.query('ROLLBACK'); await db.end(); }
