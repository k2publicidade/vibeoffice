// Real owner/editor sessions; only disposable upload objects and application rows.
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
config({path:'.env.local',quiet:true});
const base=process.env.NEXT_PUBLIC_SUPABASE_URL;
const options={auth:{persistSession:false,autoRefreshToken:false}};
const admin=createClient(base,process.env.SUPABASE_SERVICE_ROLE_KEY,options);
const client=()=>createClient(base,process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,options);
const users=[],uploads=[],folders=[],paths=[];const bytes=Buffer.from('Disposable receipt audit');
function checked(result,label){if(result.error)throw new Error(`${label}: ${result.error.message}`);return result.data;}
async function account(session){
  const email=`audit-upload-${randomUUID()}@example.invalid`;
  const id=checked(await admin.auth.admin.createUser({email,email_confirm:true,user_metadata:{name:'AUDITORIA RECIBO UPLOAD'}}),'account').user.id;users.push(id);
  checked(await admin.from('users').update({active:true,role:'Colaborador',sector:'Marketing'}).eq('id',id).select().single(),'activate');
  const link=checked(await admin.auth.admin.generateLink({type:'magiclink',email}),'session');
  checked(await session.auth.verifyOtp({token_hash:link.properties.hashed_token,type:'magiclink'}),'authenticate');return id;
}
async function begin(session,parent=null,size=bytes.length){
  const id=randomUUID();uploads.push(id);
  const args={upload_id:id,file_name:'Arquivo técnico.txt',file_size:size,file_mime:'text/plain',target_parent:parent};
  const receipt=checked(await session.rpc('begin_office_drive_upload',args),'begin');assert.equal(receipt.state,'pending');paths.push(receipt.storage_path);
  return {id,args,path:receipt.storage_path};
}
async function put(session,attempt){checked(await session.storage.from('drive-files').upload(attempt.path,bytes,{contentType:'text/plain',cacheControl:'0'}),'physical upload');}
async function finish(session,attempt){return checked(await session.rpc('complete_office_drive_upload',{upload_id:attempt.id}),'complete');}
async function cancel(session,attempt){return checked(await session.rpc('abort_office_drive_upload',{upload_id:attempt.id}),'abort');}
async function fresh(path){
  const encoded=path.split('/').map(encodeURIComponent).join('/');
  return fetch(`${base}/storage/v1/object/authenticated/drive-files/${encoded}?cacheNonce=${randomUUID()}`,{headers:{apikey:process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,Authorization:`Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`}});
}
try{
  const owner=client(),other=client(),ownerId=await account(owner),otherId=await account(other);
  assert.equal((await owner.from('drive_uploads').select('id')).error?.code,'42501');
  assert.equal((await owner.rpc('expire_drive_uploads')).error?.code,'42501');
  const stray=`drive-uploads/${ownerId}/${randomUUID()}`;paths.push(stray);
  assert.ok((await owner.storage.from('drive-files').upload(stray,bytes,{contentType:'text/plain'})).error,'Canonical upload requires a registered attempt');
  const valid=await begin(owner);
  assert.equal(checked(await owner.rpc('begin_office_drive_upload',valid.args),'repeat begin').storage_path,valid.path);
  assert.equal((await other.rpc('begin_office_drive_upload',valid.args)).error?.code,'42501');
  assert.equal((await owner.rpc('begin_office_drive_upload',{...valid.args,file_name:'Different name'})).error?.code,'23514');
  assert.equal((await finish(owner,valid)).state,'pending','Metadata cannot confirm before the object exists');
  await put(owner,valid);
  assert.ok((await other.storage.from('drive-files').upload(valid.path,bytes,{contentType:'text/plain'})).error);
  assert.equal((await other.rpc('complete_office_drive_upload',{upload_id:valid.id})).error?.code,'42501');
  const forged=await owner.from('drive_items').insert({id:randomUUID(),name:'Forged reference',type:'file',uploaded_by:ownerId,storage_path:valid.path,size:bytes.length,mime_type:'text/plain'}).select().single();
  assert.equal(forged.error?.code,'23514');
  let discard=true;const faulty=createClient(base,process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,{...options,global:{fetch:async(input,init)=>{
    const url=typeof input==='string'?input:input.url||input.toString();const response=await fetch(input,init);
    if(discard&&url.startsWith(base+'/rest/v1/rpc/complete_office_drive_upload')){discard=false;assert.equal(response.ok,true);throw new Error('Simulated lost commit receipt');}
    return response;
  }}});
  const session=checked(await owner.auth.getSession(),'session').session;
  checked(await faulty.auth.setSession({access_token:session.access_token,refresh_token:session.refresh_token}),'fault session');
  assert.ok((await faulty.rpc('complete_office_drive_upload',{upload_id:valid.id})).error);
  const recovered=await finish(owner,valid);assert.equal(recovered.state,'committed');assert.equal(recovered.item.id,valid.id);
  assert.deepEqual((await finish(owner,valid)).item,recovered.item);
  assert.equal((await cancel(owner,valid)).state,'committed');
  assert.equal(checked(await admin.from('drive_items').select('id').eq('id',valid.id),'one metadata record').length,1);
  assert.equal(checked(await admin.from('drive_cleanup_jobs').select('id').eq('storage_path',valid.path),'live cleanup').length,0);
  assert.equal((await fresh(valid.path)).ok,true);
  assert.ok((await owner.storage.from('drive-files').update(valid.path,bytes,{contentType:'text/plain'})).error,'Confirmed object cannot be overwritten');
  console.log('PASS private attempts, ownership, reserved metadata, idempotent begin/commit and recovery of a lost commit receipt');

  const aborted=await begin(owner);await put(owner,aborted);assert.equal((await cancel(owner,aborted)).state,'aborted');
  assert.equal((await finish(owner,aborted)).state,'aborted');
  assert.ok((await owner.storage.from('drive-files').upload(aborted.path,bytes,{contentType:'text/plain',upsert:true})).error);
  assert.equal(checked(await admin.from('drive_cleanup_jobs').select('id').eq('storage_path',aborted.path),'durable cancellation').length,1);
  const claims=checked(await admin.rpc('claim_drive_cleanup',{deletion_id:aborted.id}),'claim cancellation');
  if(claims.length){
    checked(await admin.storage.from('drive-files').remove([aborted.path]),'physical cleanup');
    assert.equal(checked(await admin.rpc('finish_drive_cleanup',{claims:claims.map(({id,claim_token})=>({id,claim_token})),succeeded:true}),'confirm cleanup'),claims.length);
  }
  const missing=await fresh(aborted.path);assert.equal(String((await missing.json()).statusCode),'404');
  // A service upload simulates a provider write that arrived after cancellation.
  checked(await admin.storage.from('drive-files').upload(aborted.path,bytes,{contentType:'text/plain'}),'late disposable provider object');
  checked(await admin.rpc('expire_drive_uploads'),'late sweep');
  assert.equal(checked(await admin.from('drive_cleanup_jobs').select('completed_at').eq('storage_path',aborted.path).single(),'late retry').completed_at,null);
  console.log('PASS cancellation is durable, blocks replay and requeues a late provider object');

  const abandoned=await begin(owner);await put(owner,abandoned);
  checked(await admin.from('drive_uploads').update({expires_at:new Date(Date.now()-60000).toISOString()}).eq('id',abandoned.id),'expire own fixture');
  checked(await admin.rpc('expire_drive_uploads'),'expiration');
  assert.equal((await finish(owner,abandoned)).state,'aborted');
  assert.equal(checked(await admin.from('drive_cleanup_jobs').select('id').eq('storage_path',abandoned.path),'expired cleanup').length,1);
  const parent=checked(await owner.from('drive_items').insert({name:'AUDITORIA DESTINO UPLOAD',type:'folder',uploaded_by:ownerId}).select().single(),'parent').id;folders.push(parent);
  const moved=await begin(other,parent).catch(async()=>{
    checked(await owner.from('shared_access').insert({item_id:parent,user_id:otherId,shared_by:ownerId,permission:'edit'}),'allow temporary editor');return begin(other,parent);
  });
  await put(other,moved);
  checked(await owner.from('shared_access').delete().eq('item_id',parent).eq('user_id',otherId).select().single(),'revoke temporary editor');
  assert.equal((await other.rpc('complete_office_drive_upload',{upload_id:moved.id})).error?.code,'42501');
  assert.equal((await cancel(other,moved)).state,'aborted');
  const wrongSize=await begin(owner,null,bytes.length+1);await put(owner,wrongSize);
  assert.equal((await owner.rpc('complete_office_drive_upload',{upload_id:wrongSize.id})).error?.code,'23514');await cancel(owner,wrongSize);
  const inactive=await begin(owner);await put(owner,inactive);
  checked(await admin.from('users').update({active:false}).eq('id',ownerId).select().single(),'inactivate fixture');
  assert.equal((await owner.rpc('complete_office_drive_upload',{upload_id:inactive.id})).error?.code,'42501');
  checked(await admin.from('drive_uploads').update({expires_at:new Date(Date.now()-60000).toISOString()}).eq('id',inactive.id),'expire inactive upload');
  checked(await admin.rpc('expire_drive_uploads'),'inactive cleanup');
  assert.equal(checked(await admin.from('drive_uploads').select('state').eq('id',inactive.id).single(),'inactive state').state,'aborted');
  console.log('PASS abandoned/inactive uploads receive cleanup jobs; finalization rechecks parent access and physical size');
}finally{
  const failures=[];
  const records=await admin.from('drive_items').delete().in('id',[...uploads,...folders]);if(records.error)failures.push(records.error);
  if(paths.length){const objects=await admin.storage.from('drive-files').remove(paths);if(objects.error)failures.push(objects.error);const jobs=await admin.from('drive_cleanup_jobs').delete().in('storage_path',paths);if(jobs.error)failures.push(jobs.error);}
  if(uploads.length){const attempts=await admin.from('drive_uploads').delete().in('id',uploads);if(attempts.error)failures.push(attempts.error);}
  for(const id of users.reverse()){const user=await admin.auth.admin.deleteUser(id);if(user.error)failures.push(user.error);}
  if(failures.length)throw new AggregateError(failures,'Upload receipt audit cleanup failed');
  console.log('CLEANUP disposable accounts, metadata, objects, attempts and jobs removed');
}
