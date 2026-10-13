// Cross-connection metadata fixtures; no Storage objects or real user records are changed.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import pg from 'pg';
import { config } from 'dotenv';
config({path:'.env.local',quiet:true});
const connection={host:process.env.SUPABASE_DB_HOST,user:process.env.SUPABASE_DB_USER,password:process.env.SUPABASE_DB_PASSWORD,database:'postgres',port:5432,
  ssl:{ca:fs.readFileSync(process.env.DATABASE_SSL_CA || 'C:/Users/LiPeX/Downloads/prod-ca-2021.crt','utf8'),rejectUnauthorized:true}};
const setup=new pg.Client(connection),first=new pg.Client(connection),second=new pg.Client(connection);
const owner=randomUUID(),editor=randomUUID(),a=randomUUID(),b=randomUUID(),c=randomUUID(),d=randomUUID();
const isolation=process.argv.includes('--serializable')?'SERIALIZABLE':process.argv.includes('--repeatable-read')?'REPEATABLE READ':'READ COMMITTED';
assert.ok(process.argv.includes('--reproduce')!==process.argv.includes('--verify'),'Choose --reproduce (unpatched database only) or --verify');
async function actor(client,id=owner){
  await client.query(`BEGIN ISOLATION LEVEL ${isolation}`);await client.query("SET LOCAL statement_timeout='15s'");
  await client.query("SELECT set_config('request.jwt.claims',$1,true)",[JSON.stringify({sub:id,role:'authenticated',aal:'aal1'})]);
  await client.query('SET LOCAL ROLE authenticated');
}
async function rootFolders(){
  for(const id of [a,b])await setup.query("INSERT INTO public.drive_items(id,name,type,uploaded_by) VALUES($1,'AUDITORIA CONCORRÊNCIA DRIVE','folder',$2) ON CONFLICT(id) DO UPDATE SET parent_id=NULL",[id,owner]);
}
async function competing(sql,args){
  const pid=(await second.query('SELECT pg_backend_pid() pid')).rows[0].pid;
  let done=false;const pending=second.query(sql,args).then(result=>({result,error:null}),error=>({result:null,error})).finally(()=>{done=true});
  let waiting=false;
  for(let attempt=0;attempt<30&&!done;attempt++){
    waiting=(await setup.query("SELECT EXISTS(SELECT 1 FROM pg_stat_activity WHERE pid=$1 AND wait_event_type='Lock' AND wait_event='advisory') waiting",[pid])).rows[0].waiting;
    if(waiting)break;
    await new Promise(resolve=>setTimeout(resolve,100));
  }
  assert.equal(waiting,true,'The conflicting statement must wait before changing the tree');
  await first.query('COMMIT');return pending;
}
try{
  await Promise.all([setup.connect(),first.connect(),second.connect()]);
  if(process.argv.includes('--reproduce')){
    const protectedDatabase=(await setup.query("SELECT EXISTS(SELECT 1 FROM pg_trigger WHERE tgrelid='public.drive_items'::regclass AND tgname='drive_tree_write_lock') protected")).rows[0].protected;
    assert.equal(protectedDatabase,false,'This database is already protected; use --verify');
  }
  await setup.query('BEGIN');
  await setup.query('INSERT INTO auth.users(id,email,raw_user_meta_data) VALUES($1,$2,$3)',[owner,`audit-drive-concurrency-${owner}@example.invalid`,{name:'AUDITORIA CONCORRÊNCIA DRIVE'}]);
  await setup.query("UPDATE public.users SET active=true,role='Colaborador',sector='Marketing' WHERE id=$1",[owner]);
  await rootFolders();
  await setup.query('COMMIT');
  await actor(first);await actor(second);
  await first.query('UPDATE public.drive_items SET parent_id=$1 WHERE id=$2',[b,a]);
  if(process.argv.includes('--reproduce')){
    await second.query('UPDATE public.drive_items SET parent_id=$1 WHERE id=$2',[a,b]);
    await first.query('COMMIT');await second.query('COMMIT');
    const rows=(await setup.query('SELECT id,parent_id FROM public.drive_items WHERE id=ANY($1::uuid[])',[[a,b]])).rows;
    assert.equal(rows.find(row=>row.id===a).parent_id,b);assert.equal(rows.find(row=>row.id===b).parent_id,a);
    console.log('REPRODUCED crossed concurrent moves both committed and created a folder cycle');
  }else{
    assert.ok(process.argv.includes('--verify'),'Use --reproduce or --verify');
    const result=await competing('UPDATE public.drive_items SET parent_id=$1 WHERE id=$2',[a,b]);
    assert.ok(result.error,'The second move must reject the now-visible cycle');
    if(isolation!=='READ COMMITTED')assert.equal(result.error.code,'40001');
    else assert.match(result.error.message,/itself/);
    await second.query('ROLLBACK');
    const rows=(await setup.query('SELECT id,parent_id FROM public.drive_items WHERE id=ANY($1::uuid[])',[[a,b]])).rows;
    assert.equal(rows.find(row=>row.id===a).parent_id,b);assert.equal(rows.find(row=>row.id===b).parent_id,null);
    console.log(`PASS crossed moves serialize in ${isolation} and the second move rejects a cycle/stale snapshot after the first commits`);
    if(isolation==='READ COMMITTED'){
      await rootFolders();await actor(first);await actor(second);
      await first.query('UPDATE public.drive_items SET parent_id=$1 WHERE id=$2',[b,a]);
      const deleted=await competing('SELECT public.delete_office_drive_item($1) receipt',[b]);
      assert.equal(deleted.error,null);assert.deepEqual(new Set(deleted.result.rows[0].receipt.deleted_ids),new Set([a,b]));
      await second.query('COMMIT');assert.equal((await setup.query('SELECT id FROM public.drive_items WHERE id=ANY($1::uuid[])',[[a,b]])).rowCount,0);
      console.log('PASS a deletion waiting for a move returns exactly the newly committed subtree, without deadlock');

      await rootFolders();await actor(first);await actor(second);
      const receipt=(await first.query('SELECT public.delete_office_drive_item($1) receipt',[b])).rows[0].receipt;assert.deepEqual(receipt.deleted_ids,[b]);
      const missing=await competing('UPDATE public.drive_items SET parent_id=$1 WHERE id=$2',[b,a]);
      assert.match(missing.error?.message||'',/Parent must be a folder/);await second.query('ROLLBACK');
      assert.equal((await setup.query('SELECT parent_id FROM public.drive_items WHERE id=$1',[a])).rows[0].parent_id,null);
      console.log('PASS moving to a concurrently deleted destination fails and preserves the source');

      await rootFolders();await actor(first);await actor(second);
      await first.query('SELECT public.delete_office_drive_item($1)',[b]);
      const duplicate=await competing('SELECT public.delete_office_drive_item($1)',[b]);
      assert.equal(duplicate.error?.code,'42501');await second.query('ROLLBACK');
      console.log('PASS a duplicate concurrent deletion cannot announce a second success');

      await rootFolders();
      await setup.query('INSERT INTO auth.users(id,email,raw_user_meta_data) VALUES($1,$2,$3)',[editor,`audit-drive-concurrency-${editor}@example.invalid`,{name:'AUDITORIA DESTINO DRIVE'}]);
      await setup.query("UPDATE public.users SET active=true,role='Colaborador',sector='Marketing' WHERE id=$1",[editor]);
      for(const id of [c,d])await setup.query("INSERT INTO public.drive_items(id,name,type,uploaded_by) VALUES($1,'AUDITORIA DESTINO DRIVE','folder',$2)",[id,owner]);
      await setup.query("INSERT INTO public.shared_access(item_id,user_id,permission,shared_by) VALUES($1,$2,'edit',$3)",[d,editor,owner]);
      await setup.query('UPDATE public.drive_items SET parent_id=$1 WHERE id=$2',[d,b]);
      // A separate source owned by the editor; identity remains immutable for authenticated clients.
      await setup.query('UPDATE public.drive_items SET uploaded_by=$1 WHERE id=$2',[editor,a]);
      await actor(first);await actor(second,editor);
      await first.query('UPDATE public.drive_items SET parent_id=$1 WHERE id=$2',[c,b]);
      const revoked=await competing('UPDATE public.drive_items SET parent_id=$1 WHERE id=$2',[b,a]);
      assert.match(revoked.error?.message||'',/Destination folder is not writable/);await second.query('ROLLBACK');
      assert.equal((await setup.query('SELECT parent_id FROM public.drive_items WHERE id=$1',[a])).rows[0].parent_id,null);
      console.log('PASS destination write permission is checked again after its inherited access changes');

      await setup.query('UPDATE public.drive_items SET parent_id=$1 WHERE id=$2',[d,b]);
      await setup.query('UPDATE public.drive_items SET uploaded_by=$1,parent_id=$2 WHERE id=$3',[owner,b,a]);
      await actor(first);await actor(second,editor);
      await first.query('UPDATE public.drive_items SET parent_id=$1 WHERE id=$2',[c,b]);
      const sourceRevoked=await competing('UPDATE public.drive_items SET parent_id=$1 WHERE id=$2',[d,a]);
      assert.equal(sourceRevoked.error?.code,'42501');await second.query('ROLLBACK');
      assert.equal((await setup.query('SELECT parent_id FROM public.drive_items WHERE id=$1',[a])).rows[0].parent_id,b);
      console.log('PASS source write permission is checked again after inherited access is lost while waiting');

      await rootFolders();await actor(first);
      const bulk=await first.query('UPDATE public.drive_items SET parent_id=CASE WHEN id=$1 THEN $2 ELSE $1 END WHERE id=ANY($3::uuid[])',[a,b,[a,b]]).then(()=>null,error=>error);
      assert.match(bulk?.message||'',/itself/);await first.query('ROLLBACK');
      assert.ok((await setup.query('SELECT parent_id FROM public.drive_items WHERE id=ANY($1::uuid[])',[[a,b]])).rows.every(row=>row.parent_id===null));
      console.log('PASS a cycle attempted in a multi-row update rolls back the entire statement');
    }
  }
}finally{
  await Promise.allSettled([first.query('ROLLBACK'),second.query('ROLLBACK'),setup.query('ROLLBACK')]);
  await setup.query('UPDATE public.drive_items SET parent_id=NULL WHERE id=ANY($1::uuid[])',[[a,b,c,d]]);
  await setup.query('DELETE FROM public.drive_items WHERE id=ANY($1::uuid[])',[[a,b,c,d]]);
  await setup.query('DELETE FROM auth.users WHERE id=ANY($1::uuid[])',[[owner,editor]]);
  await Promise.all([first.end(),second.end(),setup.end()]);
  console.log('CLEANUP disposable folders and account removed');
}
