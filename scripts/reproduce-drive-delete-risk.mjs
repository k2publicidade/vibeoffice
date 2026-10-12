// Exercise the legacy browser hook sequence using a disposable file/account.
// The storage guard must now preserve the live file when metadata deletion fails.
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
config({path:'.env.local',quiet:true});
const options={auth:{persistSession:false,autoRefreshToken:false}};
const service=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,options);
const owner=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,options);
const path='audit-drive-delete/'+randomUUID()+'.txt';
let userId,itemId,uploaded=false;
function checked(result,label){if(result.error)throw new Error(`${label}: ${result.error.message}`);return result.data;}
try {
  const email=`audit-drive-${randomUUID()}@example.invalid`;
  userId=checked(await service.auth.admin.createUser({email,email_confirm:true,user_metadata:{name:'AUDITORIA DRIVE'}}),'account').user.id;
  checked(await service.from('users').update({active:true,role:'Colaborador',sector:'Marketing'}).eq('id',userId).select('id').single(),'activate');
  const link=checked(await service.auth.admin.generateLink({type:'magiclink',email}),'session');
  checked(await owner.auth.verifyOtp({token_hash:link.properties.hashed_token,type:'magiclink'}),'authenticate');
  checked(await owner.storage.from('drive-files').upload(path,Buffer.from('Temporary deletion reproduction'),{contentType:'text/plain'}),'upload'); uploaded=true;
  itemId=checked(await owner.from('drive_items').insert({name:'AUDITORIA EXCLUSÃO',type:'file',storage_path:path,uploaded_by:userId,size:31,mime_type:'text/plain'}).select('id').single(),'metadata').id;
  assert.equal(checked(await owner.rpc('can_drive',{i:itemId,writing:true}),'permission'),true);
  checked(await owner.storage.from('drive-files').remove([path]),'remove storage first');
  // Access may be revoked between independent requests, after the file was removed.
  checked(await service.from('users').update({active:false}).eq('id',userId).select('id').single(),'revoke own fixture');
  const deletion=await owner.from('drive_items').delete().eq('id',itemId).select('id').single();
  assert.equal(deletion.error?.code,'PGRST116');
  assert.equal(checked(await service.from('drive_items').select('id').eq('id',itemId).single(),'retained metadata').id,itemId);
  const preserved=checked(await service.storage.from('drive-files').download(path),'preserved file');
  assert.equal(await preserved.text(),'Temporary deletion reproduction');
  console.log('PASS legacy deletion race is blocked: denied metadata deletion leaves its file intact');
} finally {
  const failures=[];
  if(itemId){const r=await service.from('drive_items').delete().eq('id',itemId);if(r.error)failures.push(r.error);}
  if(uploaded){const r=await service.storage.from('drive-files').remove([path]);if(r.error)failures.push(r.error);}
  if(uploaded){const r=await service.from('drive_cleanup_jobs').delete().eq('storage_path',path);if(r.error)failures.push(r.error);}
  if(userId){const r=await service.auth.admin.deleteUser(userId);if(r.error)failures.push(r.error);}
  if(failures.length)throw new AggregateError(failures,'Drive reproduction cleanup failed');
  console.log('CLEANUP disposable metadata, file and account removed');
}
