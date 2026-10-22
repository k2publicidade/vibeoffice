import pg from 'pg';
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {config} from 'dotenv';
config({path:'.env.local',quiet:true});
const db=new pg.Client({host:process.env.SUPABASE_DB_HOST,user:process.env.SUPABASE_DB_USER,password:process.env.SUPABASE_DB_PASSWORD,database:'postgres',port:5432,ssl:{ca:fs.readFileSync(process.env.DATABASE_SSL_CA,'utf8'),rejectUnauthorized:true}});
const admin=randomUUID(),owner=randomUUID(),other=randomUUID();let release;
async function actor(id) {await db.query('RESET ROLE');await db.query("select set_config('request.jwt.claims',$1,true)",[JSON.stringify({sub:id,role:'authenticated',aal:'aal1'})]);await db.query('SET LOCAL ROLE authenticated')}
async function fails(sql,args,code) {await db.query('SAVEPOINT fail');let error;try{await db.query(sql,args)}catch(e){error=e}await db.query('ROLLBACK TO SAVEPOINT fail');assert.ok(error,'Expected rejection');if(code)assert.equal(error.code,code)}
async function action(name,payload={}) {return (await db.query('select public.change_release_distribution($1,$2,$3) result',[release.id,name,payload])).rows[0].result}
const report=[{month:'2026-09',platform:'Spotify',country:'BR',streams:100,revenue:12.5,currency:'USD',upc:'123456789012'},{month:'2026-09',platform:'Spotify',country:'BR',streams:50,revenue:1.5,currency:'USD',upc:'123456789012'}];
try {
 await db.connect();await db.query('BEGIN');
 if(process.argv.includes('--migration-preview'))await db.query(fs.readFileSync('supabase/migrations/202610220002_release_operations.sql','utf8').replace(/^BEGIN;\s*/,'').replace(/COMMIT;\s*$/,''));
 for(const [id,role] of [[admin,'Admin'],[owner,'Colaborador'],[other,'Colaborador']]) {await db.query('insert into auth.users(id,email,raw_user_meta_data) values($1,$2,$3)',[id,'audit-ops-'+id+'@example.invalid',{name:'AUDIT RELEASE OPS'}]);await db.query("update public.users set active=true,role=$2,sector='Administrativo' where id=$1",[id,role])}
 await actor(owner);
 release=(await db.query('select public.save_office_release(null,$1) r',[{title:'Audit Single',artist:'Audit Artist',release_type:'single',release_date:'2035-10-22',cover_url:'cover',wav_url:'audio',composers:[{name:'Author'}],isrc:'BRABC2600001',upc:'123456789012'}])).rows[0].r;
 let w=await action('submit_review',{revision:0,rights_confirmed:true});assert.equal(w.stage,'in_review');
 await fails('select public.change_release_distribution($1,$2,$3)',[release.id,'approve',{revision:1}],'42501');
 await actor(other);await fails('select public.change_release_distribution($1,$2,$3)',[release.id,'approve',{revision:1}],'42501');
 await actor(admin);w=await action('approve',{revision:1});assert.equal(w.stage,'approved');
 await fails('select public.change_release_distribution($1,$2,$3)',[release.id,'record_submission',{revision:1,revelator_release_id:'123',stores:['Spotify']}],'40001');
 await actor(owner);await db.query('select public.save_office_release($1,$2)',[release.id,{title:'Changed title'}]);
 let snap=(await db.query('select public.release_operations_snapshot() r')).rows[0].r;w=snap.workflows[0];assert.equal(w.stage,'draft');assert.equal(w.rights_confirmed,false);
 await action('submit_review',{revision:w.revision,rights_confirmed:true});
 await actor(admin);snap=(await db.query('select public.release_operations_snapshot() r')).rows[0].r;w=snap.workflows.find(w=>w.release_id===release.id);w=await action('approve',{revision:w.revision});
 w=await action('record_submission',{revision:w.revision,revelator_release_id:'123456',revelator_url:'https://audit.revelator.pro/releases/123456',stores:['Spotify','Apple Music']});assert.equal(w.stage,'submitted');
 w=await action('mark_live',{revision:w.revision,notes:'Publication verified in Revelator and DSP'});assert.equal(w.stage,'live');
 assert.equal((await db.query('select status from public.releases where id=$1',[release.id])).rows[0].status,'released');
 await db.query('select public.import_release_performance($1,$2,$3)',[release.id,JSON.stringify(report),'audit.csv']);
 await db.query('select public.import_release_performance($1,$2,$3)',[release.id,JSON.stringify(report),'audit.csv']);
 const metrics=(await db.query('select * from public.release_performance where release_id=$1',[release.id])).rows;assert.equal(metrics.length,1);assert.equal(Number(metrics[0].streams),150);assert.equal(Number(metrics[0].revenue),14);
 await fails('select public.import_release_performance($1,$2,$3)',[release.id,JSON.stringify([{...report[0],upc:'999999999999'}]),'wrong.csv']);
 assert.equal((await db.query('select * from public.release_performance where release_id=$1',[release.id])).rowCount,1);
 await actor(owner);snap=(await db.query('select public.release_operations_snapshot() r')).rows[0].r;assert.equal(snap.metrics.find(m=>m.release_id===release.id).revenue,null);
 assert.equal((await db.query('select * from public.release_performance where release_id=$1',[release.id])).rowCount,0);
 await fails('select public.import_release_performance($1,$2,$3)',[release.id,JSON.stringify(report),'forbidden.csv'],'42501');
 await fails("update public.release_distribution set stage='approved' where release_id=$1",[release.id],'42501');
 await actor(other);snap=(await db.query('select public.release_operations_snapshot() r')).rows[0].r;assert.equal(snap.metrics.some(m=>m.release_id===release.id),false);assert.equal(snap.workflows.some(w=>w.release_id===release.id),false);
 await db.query('RESET ROLE');await db.query('update public.users set active=false where id=$1',[admin]);await actor(admin);await fails('select public.release_operations_snapshot()',[],'42501');
 console.log('PASS review permissions, revision conflicts, approval invalidation, submission/live history, atomic report reimport, UPC mismatch, currency privacy and inactive access. ROLLBACK.');
} finally {await db.query('ROLLBACK');await db.end()}
