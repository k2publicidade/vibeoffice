// Exercise application metadata/queue only; no SQL writes to the Storage schema.
// All fixtures, preview DDL, cron registration and simulated failures are rolled back.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import pg from 'pg';
import { config } from 'dotenv';
config({path:'.env.local',quiet:true});
const db=new pg.Client({host:process.env.SUPABASE_DB_HOST,user:process.env.SUPABASE_DB_USER,password:process.env.SUPABASE_DB_PASSWORD,database:'postgres',port:5432,
  ssl:{ca:process.env.DATABASE_SSL_CA ? fs.readFileSync(process.env.DATABASE_SSL_CA,'utf8') : undefined,rejectUnauthorized:true}});
const owner=randomUUID(),other=randomUUID(),folder=randomUUID(),nested=randomUUID(),file=randomUUID(),second=randomUUID();
const prefix='audit-drive-'+randomUUID()+'/';
async function actor(id,role='authenticated',aal='aal1') {
  await db.query('RESET ROLE');
  await db.query("select set_config('request.jwt.claims',$1,true)",[JSON.stringify({sub:id,role,aal})]);
  await db.query(`SET LOCAL ROLE ${role==='service_role' ? 'service_role' : role==='anon' ? 'anon' : 'authenticated'}`);
}
async function rejected(sql,args,code='42501') {
  await db.query('SAVEPOINT rejected_write'); let error;
  try{await db.query(sql,args);}catch(failure){error=failure;}
  await db.query('ROLLBACK TO SAVEPOINT rejected_write');assert.equal(error?.code,code);
}
try {
  await db.connect(); await db.query('BEGIN');
  if(process.argv.includes('--migration-preview')) await db.query(fs.readFileSync('supabase/migrations/202610120002_drive_cleanup.sql','utf8').replace(/^BEGIN;\s*/,'').replace(/COMMIT;\s*$/,''));
  for(const id of [owner,other]) {
    await db.query('INSERT INTO auth.users(id,email,raw_user_meta_data) VALUES($1,$2,$3)',[id,`audit-drive-${id}@example.invalid`,{name:'AUDITORIA DRIVE'}]);
    await db.query("UPDATE public.users SET active=true,role='Colaborador',sector='Marketing' WHERE id=$1",[id]);
  }
  await db.query("INSERT INTO public.drive_items(id,name,type,uploaded_by) VALUES($1,'Pasta técnica','folder',$2)",[folder,owner]);
  await db.query("INSERT INTO public.drive_items(id,name,type,parent_id,uploaded_by) VALUES($1,'Subpasta técnica','folder',$2,$3)",[nested,folder,owner]);
  for(const [id,parent,path] of [[file,folder,prefix+'one.txt'],[second,nested,prefix+'two.txt']]) await db.query("INSERT INTO public.drive_items(id,name,type,parent_id,storage_path,uploaded_by) VALUES($1,'Arquivo técnico','file',$2,$3,$4)",[id,parent,path,owner]);
  await actor(other);await rejected('SELECT public.delete_office_drive_item($1)',[folder]);
  await actor(owner);await rejected('SELECT * FROM public.drive_cleanup_jobs',[]);
  await rejected('SELECT * FROM public.claim_drive_cleanup(null)',[]);
  await rejected('SELECT public.finish_drive_cleanup($1,true)',[[]]);
  console.log('PASS acesso ao item, fila e funções internas é restrito');
  await db.query('RESET ROLE');await db.query('UPDATE public.users SET active=false WHERE id=$1',[owner]);
  await actor(owner);await rejected('SELECT public.delete_office_drive_item($1)',[folder]);
  await db.query('RESET ROLE');assert.equal((await db.query('SELECT count(*) n FROM public.drive_items WHERE id=ANY($1)',[[folder,nested,file,second]])).rows[0].n,'4');
  await db.query('UPDATE public.users SET active=true WHERE id=$1',[owner]);
  await db.query("ALTER TABLE public.drive_cleanup_jobs ADD CONSTRAINT audit_queue_failure CHECK (storage_path <> '"+prefix+"one.txt')");
  await actor(owner);await rejected('SELECT public.delete_office_drive_item($1)',[folder],'23514');
  await db.query('RESET ROLE');assert.equal((await db.query('SELECT count(*) n FROM public.drive_items WHERE id=ANY($1)',[[folder,nested,file,second]])).rows[0].n,'4');
  assert.equal((await db.query('SELECT count(*) n FROM public.drive_cleanup_jobs WHERE storage_path LIKE $1',[prefix+'%'])).rows[0].n,'0');
  await db.query('ALTER TABLE public.drive_cleanup_jobs DROP CONSTRAINT audit_queue_failure');
  console.log('PASS falha na fila desfaz exclusão da pasta e de todos os filhos');
  await actor(owner);
  const deletion=(await db.query('SELECT public.delete_office_drive_item($1) d',[folder])).rows[0].d;
  assert.equal(deletion.cleanup_count,2);assert.deepEqual(new Set(deletion.deleted_ids),new Set([folder,nested,file,second]));
  await db.query('RESET ROLE');assert.equal((await db.query('SELECT count(*) n FROM public.drive_items WHERE id=ANY($1)',[[folder,nested,file,second]])).rows[0].n,'0');
  assert.equal((await db.query('SELECT count(*) n FROM public.drive_cleanup_jobs WHERE deletion_id=$1',[deletion.deletion_id])).rows[0].n,'2');
  await db.query("SELECT set_config('request.jwt.claims','{}',true)");
  await rejected("INSERT INTO public.drive_items(name,type,storage_path,uploaded_by) VALUES('Reuso','file',$1,$2)",[prefix+'one.txt',owner],'23514');
  await actor(null,'service_role');
  const claims=(await db.query('SELECT * FROM public.claim_drive_cleanup($1)',[deletion.deletion_id])).rows;
  assert.equal(claims.length,2);assert.equal((await db.query('SELECT * FROM public.claim_drive_cleanup($1)',[deletion.deletion_id])).rowCount,0);
  const tokens=claims.map(({id,claim_token})=>({id,claim_token}));
  assert.equal((await db.query('SELECT public.finish_drive_cleanup($1,false) n',[JSON.stringify(tokens)])).rows[0].n,2);
  assert.equal((await db.query('SELECT * FROM public.claim_drive_cleanup($1)',[deletion.deletion_id])).rowCount,0);
  await db.query('UPDATE public.drive_cleanup_jobs SET next_attempt_at=now() WHERE deletion_id=$1',[deletion.deletion_id]);
  const retry=(await db.query('SELECT * FROM public.claim_drive_cleanup($1)',[deletion.deletion_id])).rows;
  assert.equal(retry.length,2);assert.ok(retry.every(row=>row.attempts===2));
  assert.equal((await db.query('SELECT public.finish_drive_cleanup($1,true) n',[JSON.stringify(tokens)])).rows[0].n,0);
  assert.equal((await db.query('SELECT public.finish_drive_cleanup($1,true) n',[JSON.stringify(retry.map(({id,claim_token})=>({id,claim_token})))])).rows[0].n,2);
  await db.query('RESET ROLE');
  await db.query("SELECT set_config('request.jwt.claims','{}',true)");
  await rejected("INSERT INTO public.drive_items(name,type,storage_path,uploaded_by) VALUES('Reuso concluído','file',$1,$2)",[prefix+'one.txt',owner],'23514');
  console.log('PASS lote, retry, tokens vencidos e reserva de caminhos protegem a limpeza');
  await actor(null);await db.query('RESET ROLE');
  const duplicateIds=[randomUUID(),randomUUID()];const sharedPath=prefix+'shared.txt';
  for(const id of duplicateIds)await db.query("INSERT INTO public.drive_items(id,name,type,storage_path,uploaded_by) VALUES($1,'Referência técnica','file',$2,$3)",[id,sharedPath,owner]);
  await actor(owner);
  assert.equal((await db.query('SELECT public.delete_office_drive_item($1) d',[duplicateIds[0]])).rows[0].d.cleanup_count,0);
  assert.equal((await db.query('SELECT public.delete_office_drive_item($1) d',[duplicateIds[1]])).rows[0].d.cleanup_count,1);
  await actor(null);await db.query('RESET ROLE');
  const shared=randomUUID();
  await db.query("INSERT INTO public.drive_items(id,name,type,uploaded_by) VALUES($1,'Pasta compartilhada técnica','folder',$2)",[shared,owner]);
  await actor(owner);await db.query("INSERT INTO public.shared_access(item_id,user_id,permission,shared_by) VALUES($1,$2,'view',$3)",[shared,other,owner]);
  await actor(other);await rejected('SELECT public.delete_office_drive_item($1)',[shared]);
  await actor(owner);await db.query("UPDATE public.shared_access SET permission='edit' WHERE item_id=$1 AND user_id=$2",[shared,other]);
  await actor(other);assert.equal((await db.query('SELECT public.delete_office_drive_item($1) d',[shared])).rows[0].d.cleanup_count,0);
  await actor(null);await db.query('RESET ROLE');
  const mfaFolder=randomUUID();
  await db.query("INSERT INTO public.drive_items(id,name,type,uploaded_by) VALUES($1,'Pasta MFA técnica','folder',$2)",[mfaFolder,owner]);
  await db.query("INSERT INTO auth.mfa_factors(id,user_id,factor_type,status,created_at,updated_at,secret) VALUES($1,$2,'totp','verified',now(),now(),'JBSWY3DPEHPK3PXP')",[randomUUID(),owner]);
  await actor(owner);await rejected('SELECT public.delete_office_drive_item($1)',[mfaFolder]);
  await actor(owner,'authenticated','aal2');assert.ok((await db.query('SELECT public.delete_office_drive_item($1) d',[mfaFolder])).rows[0].d.deleted_ids.includes(mfaFolder));
  console.log('PASS compartilhamento view/edit e sessão MFA mantêm suas permissões');
  await actor(null,'anon');await rejected('SELECT public.delete_office_drive_item($1)',[folder]);
  console.log('PASS referência ainda viva conserva arquivo e acesso anônimo é negado');
  console.log('DRIVE TRANSACTION AUDIT COMPLETE (ROLLBACK)');
}finally{await db.query('ROLLBACK');await db.end();}
