import pg from 'pg';
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { config } from 'dotenv';
config({path:'.env.local',quiet:true});
const db=new pg.Client({host:process.env.SUPABASE_DB_HOST,user:process.env.SUPABASE_DB_USER,password:process.env.SUPABASE_DB_PASSWORD,database:'postgres',port:5432,ssl:{ca:fs.readFileSync(process.env.DATABASE_SSL_CA,'utf8'),rejectUnauthorized:true}});
const admin=randomUUID(), member=randomUUID(), other=randomUUID();
async function actor(id) {
 await db.query('RESET ROLE');
 await db.query("select set_config('request.jwt.claims',$1,true)",[JSON.stringify({sub:id,role:'authenticated',aal:'aal1'})]);
 await db.query('SET LOCAL ROLE authenticated');
}
async function denied(sql,params=[]) {
 await db.query('SAVEPOINT deny');
 let failure;
 try {await db.query(sql,params)} catch(e) {failure=e}
 await db.query('ROLLBACK TO SAVEPOINT deny');
 assert.equal(failure?.code,'42501');
}
try {
 await db.connect(); await db.query('BEGIN');
 for(const [id,role] of [[admin,'Admin'],[member,'Colaborador'],[other,'Colaborador']]) {
  await db.query('insert into auth.users(id,email,raw_user_meta_data) values($1,$2,$3)',[id,'audit-'+id+'@example.invalid',{name:'Audit preferences'}]);
  await db.query("update public.users set active=true,role=$2,sector='Administrativo' where id=$1",[id,role]);
 }
 await actor(admin);
 const genre=(await db.query('insert into public.music_genres(name) values($1) returning *',['AUDIT '+randomUUID()])).rows[0];
 await actor(member);
 assert.equal((await db.query('select id from public.music_genres where id=$1',[genre.id])).rowCount,1);
 await denied('insert into public.music_genres(name) values($1)',['Blocked genre']);
 assert.equal((await db.query('delete from public.music_genres where id=$1 returning id',[genre.id])).rowCount,0);
 await db.query("insert into public.calendar_day_colors(user_id,day,color) values($1,'2035-10-22','#3b82f6')",[member]);
 await actor(other);
 assert.equal((await db.query("select * from public.calendar_day_colors where day='2035-10-22'")).rowCount,0);
 await denied("insert into public.calendar_day_colors(user_id,day,color) values($1,'2035-10-23','#3b82f6')",[member]);
 await actor(member);
 assert.equal((await db.query("update public.calendar_day_colors set color='#22c55e' where day='2035-10-22' returning color")).rows[0].color,'#22c55e');
 assert.equal((await db.query("delete from public.calendar_day_colors where day='2035-10-22' returning day")).rowCount,1);
 await actor(admin);
 assert.equal((await db.query('delete from public.music_genres where id=$1 returning id',[genre.id])).rowCount,1);
 console.log('PASS admin manages catalog; collaborators read only; day colors save/edit/remove and stay private. All fixtures rolled back.');
} finally {await db.query('ROLLBACK'); await db.end()}
