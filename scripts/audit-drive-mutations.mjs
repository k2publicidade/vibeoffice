// Uses disposable accounts/files and real RLS; cleanup uses the Storage API.
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
config({path:'.env.local',quiet:true});
const options={auth:{persistSession:false,autoRefreshToken:false}};
const service=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,options);
const client=()=>createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,options);
const users=[],roots=[],paths=[];
function checked(result,label){if(result.error)throw new Error(`${label}: ${result.error.message}`);return result.data;}
async function account(session){
  const email=`audit-drive-${randomUUID()}@example.invalid`;
  const id=checked(await service.auth.admin.createUser({email,email_confirm:true,user_metadata:{name:'AUDITORIA UPLOAD DRIVE'}}),'account').user.id;users.push(id);
  checked(await service.from('users').update({active:true,role:'Colaborador',sector:'Marketing'}).eq('id',id).select().single(),'activate');
  const link=checked(await service.auth.admin.generateLink({type:'magiclink',email}),'session');
  checked(await session.auth.verifyOtp({token_hash:link.properties.hashed_token,type:'magiclink'}),'authenticate');return id;
}
async function folder(session,owner,parent=null){
  const record=checked(await session.from('drive_items').insert({name:'AUDITORIA ESTADO DRIVE',type:'folder',uploaded_by:owner,parent_id:parent}).select().single(),'folder');
  if(!parent)roots.push(record.id);return record;
}
async function upload(session,owner,parent){
  const path=`audit-drive-mutations/${randomUUID()}-same.txt`;paths.push(path);
  checked(await session.storage.from('drive-files').upload(path,Buffer.from('Disposable upload audit'),{contentType:'text/plain'}),'upload');
  return checked(await session.from('drive_items').insert({name:'same.txt',type:'file',uploaded_by:owner,parent_id:parent,storage_path:path,size:23,mime_type:'text/plain'}).select().single(),'metadata');
}
try{
  const owner=client(),editor=client(),ownerId=await account(owner),editorId=await account(editor);
  const source=await folder(owner,ownerId),target=await folder(owner,ownerId),moving=await folder(owner,ownerId,source.id);
  checked(await owner.from('shared_access').insert([{item_id:source.id,user_id:editorId,shared_by:ownerId,permission:'manage'},{item_id:target.id,user_id:editorId,shared_by:ownerId,permission:'edit'}]),'share disposable folders');
  checked(await owner.from('drive_items').update({is_public:true}).eq('id',source.id).select().single(),'public source');
  const child=await upload(owner,ownerId,moving.id);
  assert.equal(checked(await editor.rpc('can_manage_drive',{i:child.id}),'inherited manage'),true);
  assert.equal(checked(await service.rpc('drive_is_public',{i:child.id}),'inherited public'),true);
  const moved=checked(await editor.from('drive_items').update({parent_id:target.id}).eq('id',moving.id).select().single(),'move to writable target');assert.equal(moved.parent_id,target.id);
  assert.equal(checked(await editor.rpc('can_manage_drive',{i:child.id}),'manage after move'),false);
  assert.equal(checked(await service.rpc('drive_is_public',{i:child.id}),'public after move'),false);
  const denied=await editor.from('drive_items').update({is_public:true}).eq('id',child.id).select().single();assert.ok(denied.error,'Edit access must not grant sharing management');
  const files=await Promise.all([upload(editor,editorId,target.id),upload(editor,editorId,target.id)]);assert.notEqual(files[0].storage_path,files[1].storage_path);
  for(const file of files){assert.equal(checked(await editor.rpc('can_manage_drive',{i:file.id}),'uploaded file owner'),true);assert.equal(await checked(await editor.storage.from('drive-files').download(file.storage_path),'download own upload').text(),'Disposable upload audit');}
  const ownedFolder=await folder(editor,editorId,target.id);assert.equal(checked(await editor.rpc('can_manage_drive',{i:ownedFolder.id}),'folder owner'),true);
  const renamed=checked(await editor.from('drive_items').update({name:'Renomeado técnico.txt'}).eq('id',files[0].id).select().single(),'rename');assert.equal(renamed.name,'Renomeado técnico.txt');
  checked(await owner.from('drive_items').update({is_public:true}).eq('id',target.id).select().single(),'public target');assert.equal(checked(await service.rpc('drive_is_public',{i:child.id}),'public target child'),true);
  checked(await owner.from('drive_items').update({is_public:false}).eq('id',target.id).select().single(),'private target');assert.equal(checked(await service.rpc('drive_is_public',{i:child.id}),'private target child'),false);
  console.log('PASS real sessions: concurrent uploads, folder/file ownership, rename, move, inherited manage/public changes and sharing denial for editors');
}finally{
  const failures=[];
  if(roots.length){const r=await service.from('drive_items').delete().in('id',roots);if(r.error)failures.push(r.error);}
  if(paths.length){const r=await service.storage.from('drive-files').remove(paths);if(r.error)failures.push(r.error);const q=await service.from('drive_cleanup_jobs').delete().in('storage_path',paths);if(q.error)failures.push(q.error);}
  for(const id of users.reverse()){const r=await service.auth.admin.deleteUser(id);if(r.error)failures.push(r.error);}
  if(failures.length)throw new AggregateError(failures,'Drive mutation audit cleanup failed');
  console.log('CLEANUP disposable accounts, folders, files, shares, objects and cleanup jobs removed');
}
