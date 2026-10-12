// --prepare leaves only disposable fixtures for an end-to-end worker/cron check.
// --verify confirms physical cleanup and removes the fixtures/tombstones/accounts.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
config({path:'.env.local',quiet:true});
const options={auth:{persistSession:false,autoRefreshToken:false}};
const service=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,options);
const client=()=>createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,options);
const fixtureFile='.agent/drive-cleanup-api-fixture.json';
const fixture=process.argv.includes('--verify') ? JSON.parse(fs.readFileSync(fixtureFile,'utf8')) : {users:[],paths:[],rootId:null,deletionId:null};
let prepared=false;
function checked(result,label){if(result.error)throw new Error(`${label}: ${result.error.message}`);return result.data;}
async function freshDownload(path,token=process.env.SUPABASE_SERVICE_ROLE_KEY){
  const encoded=path.split('/').map(encodeURIComponent).join('/');
  return fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/authenticated/drive-files/${encoded}?cacheNonce=${randomUUID()}`,{
    headers:{apikey:process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,Authorization:`Bearer ${token}`,'Cache-Control':'no-cache'},
  });
}
async function account(authenticated){
  const email=`audit-drive-${randomUUID()}@example.invalid`;
  const id=checked(await service.auth.admin.createUser({email,email_confirm:true,user_metadata:{name:'AUDITORIA DRIVE'}}),'account').user.id;
  fixture.users.push(id);
  checked(await service.from('users').update({active:true,role:'Colaborador',sector:'Marketing'}).eq('id',id).select('id').single(),'activate');
  const link=checked(await service.auth.admin.generateLink({type:'magiclink',email}),'session');
  checked(await authenticated.auth.verifyOtp({token_hash:link.properties.hashed_token,type:'magiclink'}),'authenticate');
  return id;
}
try {
  if(process.argv.includes('--verify')){
    const jobs=checked(await service.from('drive_cleanup_jobs').select('completed_at').eq('deletion_id',fixture.deletionId),'completed jobs');
    assert.equal(jobs.length,2);assert.ok(jobs.every(job=>job.completed_at),'Worker must confirm all jobs');
    for(const path of fixture.paths)assert.equal((await freshDownload(path)).ok,false,'An uncached origin download must confirm physical removal');
    assert.equal(checked(await service.from('drive_items').select('id').eq('id',fixture.rootId),'removed root').length,0);
    console.log('PASS worker/cron completed both jobs and physically removed both files');
  }else{
    assert.ok(process.argv.includes('--prepare'),'Use --prepare or --verify');
    assert.ok(!fs.existsSync(fixtureFile),'An existing fixture must be verified/cleaned before preparing another');
    const owner=client(),viewer=client();
    const ownerId=await account(owner),viewerId=await account(viewer);
    fixture.rootId=checked(await owner.from('drive_items').insert({name:'AUDITORIA LIMPEZA DRIVE',type:'folder',uploaded_by:ownerId}).select('id').single(),'folder').id;
    const nested=checked(await owner.from('drive_items').insert({name:'Subpasta técnica',type:'folder',parent_id:fixture.rootId,uploaded_by:ownerId}).select('id').single(),'nested folder').id;
    for(const [index,parent] of [fixture.rootId,nested].entries()){
      const path=`audit-drive-cleanup/${randomUUID()}/${index}.txt`,bytes=Buffer.from(`Disposable Drive cleanup ${index}`);
      checked(await owner.storage.from('drive-files').upload(path,bytes,{contentType:'text/plain'}),'upload');fixture.paths.push(path);
      checked(await owner.from('drive_items').insert({name:`Arquivo técnico ${index}.txt`,type:'file',parent_id:parent,storage_path:path,uploaded_by:ownerId,size:bytes.length,mime_type:'text/plain'}).select('id').single(),'metadata');
    }
    checked(await owner.from('shared_access').insert({item_id:fixture.rootId,user_id:viewerId,shared_by:ownerId,permission:'view'}),'share own fixture');
    assert.equal(await checked(await viewer.storage.from('drive-files').download(fixture.paths[0]),'shared download').text(),'Disposable Drive cleanup 0');
    const denied=await viewer.rpc('delete_office_drive_item',{item_id:fixture.rootId});assert.equal(denied.error?.code,'42501');
    checked(await owner.storage.from('drive-files').remove([fixture.paths[0]]),'legacy deletion attempt');
    assert.equal(await checked(await service.storage.from('drive-files').download(fixture.paths[0]),'live object preserved').text(),'Disposable Drive cleanup 0');
    checked(await service.from('users').update({active:false}).eq('id',ownerId).select('id').single(),'inactivate');
    const inactive=await owner.rpc('delete_office_drive_item',{item_id:fixture.rootId});assert.equal(inactive.error?.code,'42501');
    checked(await service.from('users').update({active:true}).eq('id',ownerId).select('id').single(),'reactivate');
    const deleted=checked(await owner.rpc('delete_office_drive_item',{item_id:fixture.rootId}),'delete atomically');fixture.deletionId=deleted.deletion_id;
    assert.equal(deleted.deleted_ids.length,4);assert.equal(deleted.cleanup_count,2);
    assert.ok((await owner.storage.from('drive-files').download(fixture.paths[0])).error,'Deleted objects cannot be read by the former owner while cleanup is pending');
    assert.equal(checked(await viewer.rpc('can_read_drive_object',{path:fixture.paths[0]}),'current viewer permission'),false);
    const viewerToken=checked(await viewer.auth.getSession(),'viewer session').session.access_token;
    const freshViewer=await freshDownload(fixture.paths[0],viewerToken);
    assert.equal(freshViewer.ok,false,'Fresh origin requests must deny the former viewer');
    const cachedViewer=await viewer.storage.from('drive-files').download(fixture.paths[0]);
    if(!cachedViewer.error)console.log('OBSERVED provider cache serves a previously authorized download; fresh origin authorization denies access');
    const reused=await owner.from('drive_items').insert({name:'Reuso bloqueado',type:'file',storage_path:fixture.paths[0],uploaded_by:ownerId}).select().single();assert.equal(reused.error?.code,'23514');
    const deniedJobs=await owner.from('drive_cleanup_jobs').select('id');assert.equal(deniedJobs.error?.code,'42501');
    const claims=checked(await service.rpc('claim_drive_cleanup',{deletion_id:fixture.deletionId}),'claim');assert.equal(claims.length,2);
    assert.equal(checked(await service.rpc('finish_drive_cleanup',{claims:claims.map(({id,claim_token})=>({id,claim_token})),succeeded:false}),'retry after failure'),2);
    const pending=checked(await service.from('drive_cleanup_jobs').select('id,completed_at,last_error').eq('deletion_id',fixture.deletionId),'retry state');
    assert.ok(pending.every(job=>!job.completed_at&&job.last_error));
    for(const path of fixture.paths)assert.ok(checked(await service.storage.from('drive-files').download(path),'preserved queued object'));
    checked(await service.from('drive_cleanup_jobs').update({next_attempt_at:new Date().toISOString()}).eq('deletion_id',fixture.deletionId),'make own jobs due');
    fs.writeFileSync(fixtureFile,JSON.stringify(fixture));prepared=true;
    console.log('PASS real sessions verify view/inactive denial, atomic tree deletion, fresh read authorization, reserved paths and durable retry');
    console.log('PREPARED two disposable file jobs for the production worker/cron check');
  }
}finally{
  if(!prepared){
    const failures=[];
    if(fixture.rootId){const r=await service.from('drive_items').delete().eq('id',fixture.rootId);if(r.error)failures.push(r.error);}
    if(fixture.paths.length){const r=await service.storage.from('drive-files').remove(fixture.paths);if(r.error)failures.push(r.error);const q=await service.from('drive_cleanup_jobs').delete().in('storage_path',fixture.paths);if(q.error)failures.push(q.error);}
    for(const id of fixture.users.reverse()){const r=await service.auth.admin.deleteUser(id);if(r.error)failures.push(r.error);}
    if(failures.length)throw new AggregateError(failures,'Drive cleanup fixture removal failed');
    if(fs.existsSync(fixtureFile))fs.unlinkSync(fixtureFile);
    console.log('CLEANUP disposable accounts, metadata, objects and queue rows removed');
  }
}
