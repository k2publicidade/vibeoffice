// Exercises the production client helper with real RPC/Storage and scoped response faults.
import fs from 'node:fs'
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import type { Database } from '../src/lib/supabase/database.types'
import { uploadDriveFile, type DriveUploadAttempt } from '../src/lib/drive-upload'
import { DriveUploadPendingError } from '../src/types/drive'
config({path:'.env.local',quiet:true})
const base=process.env.NEXT_PUBLIC_SUPABASE_URL!,anon=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const options={auth:{persistSession:false,autoRefreshToken:false}}
const admin=createClient<Database>(base,process.env.SUPABASE_SERVICE_ROLE_KEY!,options)
const owner=createClient<Database>(base,anon,options)
const manifest='.agent/drive-upload-client-fixture.json'
type Fixture={userId:string|null;ids:string[];paths:string[];expiredId:string|null}
const fixture:Fixture=process.argv.includes('--verify')?JSON.parse(fs.readFileSync(manifest,'utf8')):{userId:null,ids:[],paths:[],expiredId:null}
const nativeFetch=global.fetch
global.fetch=async(input,init)=>typeof input==='string'&&input==='/api/drive/cleanup'
  ?new Response(JSON.stringify({error:'Simulated immediate cleanup unavailability'}),{status:503,headers:{'Content-Type':'application/json'}}):nativeFetch(input,init)
let prepared=false
function checked<T extends {data:unknown;error:unknown}>(result:T,label:string):NonNullable<T['data']> {
  if(result.error||result.data===null)throw new Error(`${label}: ${JSON.stringify(result.error)}`)
  return result.data as NonNullable<T['data']>
}
const file=()=>new File(['Disposable client recovery audit'],'Arquivo técnico.txt',{type:'text/plain'})
function attempt(){const id=randomUUID();fixture.ids.push(id);const path=`drive-uploads/${fixture.userId}/${id}`;fixture.paths.push(path);return {id,ownerId:fixture.userId!,parentId:null} satisfies DriveUploadAttempt}
async function fresh(path:string){return nativeFetch(`${base}/storage/v1/object/authenticated/drive-files/${path}?cacheNonce=${randomUUID()}`,{headers:{apikey:anon,Authorization:`Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`}})}
async function main(){try{
  if(process.argv.includes('--verify')){
    assert.ok(fixture.expiredId)
    const job=checked(await admin.from('drive_cleanup_jobs').select('completed_at,storage_path').eq('deletion_id',fixture.expiredId!).single(),'expired cleanup receipt')
    assert.ok(job?.completed_at,'The production worker must confirm physical cleanup')
    const response=await fresh(job!.storage_path),body=await response.json();assert.equal(String(body.statusCode),'404');assert.equal(body.code,'NoSuchKey')
    console.log('PASS production scheduler/worker physically removed the abandoned upload and confirmed its durable job')
  }else{
    assert.ok(process.argv.includes('--prepare'),'Use --prepare or --verify')
    assert.ok(!fs.existsSync(manifest),'An existing prepared fixture must be verified/cleaned first')
    const email=`audit-upload-${randomUUID()}@example.invalid`
    fixture.userId=checked(await admin.auth.admin.createUser({email,email_confirm:true,user_metadata:{name:'AUDITORIA CLIENTE UPLOAD'}}),'account').user!.id
    checked(await admin.from('users').update({active:true,role:'Colaborador',sector:'Marketing'}).eq('id',fixture.userId!).select().single(),'activate')
    const link=checked(await admin.auth.admin.generateLink({type:'magiclink',email}),'session')
    checked(await owner.auth.verifyOtp({token_hash:link.properties!.hashed_token,type:'magiclink'}),'authenticate')
    const session=checked(await owner.auth.getSession(),'session').session!
    async function faulty(mode:'binary'|'commit'|'pending'|'read-recovery'|'abandoned'){
      let discard=0
      const client=createClient<Database>(base,anon,{...options,global:{fetch:async(input,init)=>{
        const url=typeof input==='string'?input:input instanceof URL?input.href:input.url
        if((mode==='pending'||mode==='read-recovery'||mode==='abandoned')&&url.includes('/rpc/abort_office_drive_upload'))throw new Error('Simulated unavailable abort receipt')
        if((mode==='pending'||mode==='abandoned')&&url.startsWith(base+'/rest/v1/drive_items'))throw new Error('Simulated unavailable read receipt')
        if(mode==='abandoned'&&url.includes('/rpc/complete_office_drive_upload'))throw new Error('Simulated unavailable metadata endpoint')
        const response=await nativeFetch(input,init)
        const loseBinary=mode==='binary'&&url.startsWith(base+'/storage/v1/object/drive-files')&&init?.method==='POST'
        const loseCommit=url.includes('/rpc/complete_office_drive_upload')&&((mode==='commit'&&discard===0)||mode==='pending'||mode==='read-recovery')
        if(loseBinary||loseCommit){assert.equal(response.ok,true,'The scoped real write must succeed before discarding its receipt');discard++;await response.body?.cancel();throw new Error('Simulated lost response after commit')}
        return response
      }}})
      checked(await client.auth.setSession({access_token:session.access_token,refresh_token:session.refresh_token}),'fault session');return client
    }
    for(const mode of ['binary','commit','read-recovery'] as const){
      const input=file(),record=attempt(),saved=await uploadDriveFile(await faulty(mode),input,record)
      assert.equal(saved.id,record.id);assert.equal(saved.storage_path,fixture.paths.at(-1));assert.equal(saved.size,input.size)
      assert.equal(checked(await admin.from('drive_items').select('id').eq('id',record.id),'unique metadata').length,1)
      assert.equal(checked(await admin.from('drive_cleanup_jobs').select('id').eq('storage_path',saved.storage_path!),'live job').length,0)
      assert.equal(await (await fresh(saved.storage_path!)).text(),await input.text())
      console.log(`PASS client helper recovered ${mode} response loss with exactly one live file and no destructive cleanup`)
    }
    const uncertain=attempt(),input=file()
    await assert.rejects(uploadDriveFile(await faulty('pending'),input,uncertain),DriveUploadPendingError)
    const reconciled=await uploadDriveFile(owner,input,uncertain)
    assert.equal(reconciled.id,uncertain.id);assert.equal(checked(await admin.from('drive_items').select('id').eq('storage_path',reconciled.storage_path!),'reconciled record').length,1)
    console.log('PASS a fully unconfirmed result retains its identity and a retry reconciles without duplication')
    const abandoned=attempt()
    await assert.rejects(uploadDriveFile(await faulty('abandoned'),file(),abandoned),DriveUploadPendingError)
    assert.equal(checked(await admin.from('drive_items').select('id').eq('id',abandoned.id),'uncommitted record').length,0)
    assert.equal(checked(await admin.from('drive_uploads').select('state').eq('id',abandoned.id).single(),'registered orphan')?.state,'pending')
    checked(await admin.from('drive_uploads').update({expires_at:new Date(Date.now()-60000).toISOString()}).eq('id',abandoned.id).select().single(),'expire own fixture')
    fixture.expiredId=abandoned.id;fs.writeFileSync(manifest,JSON.stringify(fixture));prepared=true
    console.log('PREPARED one abandoned registered upload for the exact production scheduler/worker check')
  }
}finally{
  if(!prepared){
    const failures:unknown[]=[]
    if(fixture.ids.length){const r=await admin.from('drive_items').delete().in('id',fixture.ids);if(r.error)failures.push(r.error)}
    if(fixture.paths.length){const o=await admin.storage.from('drive-files').remove(fixture.paths);if(o.error)failures.push(o.error);const j=await admin.from('drive_cleanup_jobs').delete().in('storage_path',fixture.paths);if(j.error)failures.push(j.error)}
    if(fixture.ids.length){const r=await admin.from('drive_uploads').delete().in('id',fixture.ids);if(r.error)failures.push(r.error)}
    if(fixture.userId){const r=await admin.auth.admin.deleteUser(fixture.userId);if(r.error)failures.push(r.error)}
    if(failures.length)throw new AggregateError(failures,'Client upload audit cleanup failed')
    if(fs.existsSync(manifest))fs.unlinkSync(manifest)
    console.log('CLEANUP disposable account, metadata, objects, attempts and jobs removed')
  }
  global.fetch=nativeFetch
}
}
main().catch(error=>{console.error(error);process.exitCode=1})
