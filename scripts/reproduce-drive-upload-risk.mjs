// Inject only response loss/provider failure on disposable real API requests.
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
config({path:'.env.local',quiet:true});
const base=process.env.NEXT_PUBLIC_SUPABASE_URL;
const options={auth:{persistSession:false,autoRefreshToken:false}};
const admin=createClient(base,process.env.SUPABASE_SERVICE_ROLE_KEY,options);
const owner=createClient(base,process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,options);
const paths=[],ids=[randomUUID(),randomUUID()];let userId;
function checked(result,label){if(result.error)throw new Error(`${label}: ${result.error.message}`);return result.data;}
try{
  const email=`audit-upload-${randomUUID()}@example.invalid`;
  userId=checked(await admin.auth.admin.createUser({email,email_confirm:true,user_metadata:{name:'AUDITORIA RECUPERAÇÃO UPLOAD'}}),'account').user.id;
  checked(await admin.from('users').update({active:true,role:'Colaborador',sector:'Marketing'}).eq('id',userId).select().single(),'activate');
  const link=checked(await admin.auth.admin.generateLink({type:'magiclink',email}),'session');
  checked(await owner.auth.verifyOtp({token_hash:link.properties.hashed_token,type:'magiclink'}),'authenticate');
  const session=checked(await owner.auth.getSession(),'current session').session;
  for(let index=0;index<2;index++){
    const path=`audit-upload-recovery/${randomUUID()}.txt`;paths.push(path);
    checked(await owner.storage.from('drive-files').upload(path,Buffer.from('Disposable recovery audit'),{contentType:'text/plain',cacheControl:'0'}),'upload');
    const faulty=createClient(base,process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,{...options,global:{fetch:async(input,init)=>{
      const url=typeof input==='string'?input:input.url||input.toString();const method=init?.method||'GET';
      if(index===0&&method==='POST'&&url.startsWith(base+'/rest/v1/drive_items')){
        const response=await fetch(input,init);assert.equal(response.ok,true,'The database write must commit before its receipt is discarded');
        throw new Error('Simulated receipt loss after commit');
      }
      if(index===1&&method==='DELETE'&&url.startsWith(base+'/storage/v1/object/drive-files'))return new Response(JSON.stringify({error:'provider_unavailable',message:'Simulated cleanup failure'}),{status:503,headers:{'Content-Type':'application/json'}});
      return fetch(input,init);
    }}});
    checked(await faulty.auth.setSession({access_token:session.access_token,refresh_token:session.refresh_token}),'fault session');
    const result=await faulty.from('drive_items').insert({id:ids[index],name:'Arquivo de auditoria.txt',type:'file',parent_id:index===1?randomUUID():null,uploaded_by:userId,storage_path:path,size:25,mime_type:'text/plain'}).select().single();
    assert.ok(result.error,'The legacy client must receive an error');
    const cleanup=await faulty.storage.from('drive-files').remove([path]);
    const rows=checked(await admin.from('drive_items').select('id').eq('id',ids[index]),'persisted metadata');
    assert.ok(checked(await admin.storage.from('drive-files').download(path),'preserved object'));
    if(index===0){assert.equal(rows.length,1);console.log('REPRODUCED legacy client reports upload failure although metadata committed and the file is available');}
    else{assert.equal(rows.length,0);assert.ok(cleanup.error);assert.equal(checked(await admin.from('drive_cleanup_jobs').select('id').eq('storage_path',path),'durable cleanup').length,0);console.log('REPRODUCED failed metadata + failed cleanup leaves an object without metadata or a durable cleanup job');}
  }
}finally{
  const failures=[];
  const records=await admin.from('drive_items').delete().in('id',ids);if(records.error)failures.push(records.error);
  if(paths.length){const objects=await admin.storage.from('drive-files').remove(paths);if(objects.error)failures.push(objects.error);const jobs=await admin.from('drive_cleanup_jobs').delete().in('storage_path',paths);if(jobs.error)failures.push(jobs.error);}
  if(userId){const user=await admin.auth.admin.deleteUser(userId);if(user.error)failures.push(user.error);}
  if(failures.length)throw new AggregateError(failures,'Upload recovery audit cleanup failed');
  console.log('CLEANUP disposable account, metadata, objects and cleanup jobs removed');
}
