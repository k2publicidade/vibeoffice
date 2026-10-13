import { supabase } from '@/lib/supabase/client'
import { uploadDriveFile, type DriveUploadAttempt } from '../drive-upload'
import { DriveUploadPendingError } from '@/types/drive'

const originalFetch=global.fetch
const file=()=>new File(['hello'],'hello.txt',{type:'text/plain'})
const newAttempt=():DriveUploadAttempt=>({id:crypto.randomUUID(),ownerId:'owner',parentId:'parent'})
function backend(attempt:DriveUploadAttempt){
  const state={phase:'pending',item:null as Record<string,unknown>|null,beginFailure:false,commitFailures:0,abortFailure:false,commitDespiteError:false,readAvailable:false}
  const upload=jest.fn().mockResolvedValue({error:null}),remove=jest.fn()
  ;(supabase.storage.from as jest.Mock).mockReturnValue({upload,remove})
  const row=()=>({id:attempt.id,name:'hello.txt',type:'file',uploaded_by:attempt.ownerId,parent_id:attempt.parentId,storage_path:`drive-uploads/${attempt.ownerId}/${attempt.id}`,size:5,mime_type:'text/plain',is_public:false,created_at:'2030-01-01Z',updated_at:'2030-01-01Z'})
  const receipt=()=>({upload_id:attempt.id,storage_path:`drive-uploads/${attempt.ownerId}/${attempt.id}`,state:state.phase,item:state.item})
  ;(supabase.rpc as jest.Mock).mockImplementation(async(name)=>{
    if(name==='begin_office_drive_upload'&&state.beginFailure)return {data:null,error:{code:'42501',message:'Destination denied'}}
    if(name==='complete_office_drive_upload'){
      if(state.commitFailures>0){state.commitFailures--;if(state.commitDespiteError){state.phase='committed';state.item=row()}return {data:null,error:new Error('receipt lost')}}
      state.phase='committed';state.item=row()
    }
    if(name==='abort_office_drive_upload'){
      if(state.abortFailure)return {data:null,error:new Error('offline')}
      if(state.phase!=='committed')state.phase='aborted'
    }
    return {data:receipt(),error:null}
  })
  ;(supabase.from as jest.Mock).mockImplementation(()=>{
    const query={select:()=>query,eq:()=>query,single:async()=>state.readAvailable?{data:state.item,error:null}:{data:null,error:new Error('offline')}};return query
  })
  global.fetch=jest.fn().mockResolvedValue({ok:true})
  return {state,upload,remove,row,receipt}
}
beforeEach(()=>jest.clearAllMocks())
afterEach(()=>{global.fetch=originalFetch;jest.restoreAllMocks()})

it('registers the attempt before sending bytes and returns a verified server row',async()=>{
  const attempt=newAttempt(),{upload,remove}=backend(attempt)
  const saved=await uploadDriveFile(supabase,file(),attempt)
  expect(saved.id).toBe(attempt.id)
  expect(supabase.rpc).toHaveBeenNthCalledWith(1,'begin_office_drive_upload',{upload_id:attempt.id,file_name:'hello.txt',file_size:5,file_mime:'text/plain',target_parent:'parent'})
  expect(upload).toHaveBeenCalledWith(`drive-uploads/owner/${attempt.id}`,expect.any(File),expect.objectContaining({upsert:false,cacheControl:'0'}))
  expect(remove).not.toHaveBeenCalled()
})

it('recovers a committed write whose receipt was lost without cancelling or uploading again',async()=>{
  const attempt=newAttempt(),{state,upload}=backend(attempt);state.commitFailures=1;state.commitDespiteError=true
  expect((await uploadDriveFile(supabase,file(),attempt)).id).toBe(attempt.id)
  expect(upload).toHaveBeenCalledTimes(1)
  expect((supabase.rpc as jest.Mock).mock.calls.some(([name])=>name==='abort_office_drive_upload')).toBe(false)
})

it('recovers an ambiguous binary response using the confirmed metadata receipt',async()=>{
  const attempt=newAttempt(),{upload,remove}=backend(attempt);upload.mockResolvedValueOnce({error:new Error('binary receipt lost')})
  expect((await uploadDriveFile(supabase,file(),attempt)).id).toBe(attempt.id)
  expect(remove).not.toHaveBeenCalled()
})

it('uses cancellation as atomic reconciliation when both commit receipts are unavailable',async()=>{
  const attempt=newAttempt(),{state,remove}=backend(attempt);state.commitFailures=2;state.commitDespiteError=true
  expect((await uploadDriveFile(supabase,file(),attempt)).id).toBe(attempt.id)
  expect(supabase.rpc).toHaveBeenCalledWith('abort_office_drive_upload',{upload_id:attempt.id})
  expect(remove).not.toHaveBeenCalled();expect(global.fetch).not.toHaveBeenCalled()
})

it('keeps an unknown result pending and reconciles a retry without a second physical upload',async()=>{
  const attempt=newAttempt(),{state,upload}=backend(attempt);state.commitFailures=2;state.commitDespiteError=true;state.abortFailure=true
  await expect(uploadDriveFile(supabase,file(),attempt)).rejects.toBeInstanceOf(DriveUploadPendingError)
  expect((await uploadDriveFile(supabase,file(),attempt)).id).toBe(attempt.id)
  expect(upload).toHaveBeenCalledTimes(1)
})

it('accepts an independently confirmed database read when the receipt endpoints are unavailable',async()=>{
  const attempt=newAttempt(),{state}=backend(attempt);state.commitFailures=2;state.commitDespiteError=true;state.abortFailure=true;state.readAvailable=true
  expect((await uploadDriveFile(supabase,file(),attempt)).id).toBe(attempt.id)
})

it('requests only durable cleanup after a known aborted operation and preserves the original failure',async()=>{
  const attempt=newAttempt(),{state,upload,remove}=backend(attempt);state.commitFailures=2;upload.mockRejectedValueOnce(new Error('offline'));global.fetch=jest.fn().mockRejectedValue(new Error('cleanup offline'))
  await expect(uploadDriveFile(supabase,file(),attempt)).rejects.toThrow('offline')
  expect(global.fetch).toHaveBeenCalledWith('/api/drive/cleanup',expect.objectContaining({body:JSON.stringify({deletionId:attempt.id})}))
  expect(remove).not.toHaveBeenCalled()
})

it('rejects a denied preparation before any bytes are uploaded',async()=>{
  const attempt=newAttempt(),{state,upload}=backend(attempt);state.beginFailure=true
  await expect(uploadDriveFile(supabase,file(),attempt)).rejects.toThrow('Destination denied')
  expect(upload).not.toHaveBeenCalled()
})

it('starts a new identifier only after the previous attempt is confirmed aborted',async()=>{
  const attempt=newAttempt(),{state}=backend(attempt),previous=attempt.id;state.phase='aborted'
  ;(supabase.rpc as jest.Mock).mockImplementationOnce(async()=>({data:{upload_id:previous,storage_path:`drive-uploads/owner/${previous}`,state:'aborted',item:null},error:null}))
  state.phase='pending'
  expect((await uploadDriveFile(supabase,file(),attempt,'new-parent')).id).not.toBe(previous)
  expect(attempt.parentId).toBe('new-parent')
})

it('refuses an unverified owner/path receipt and never directly removes the object',async()=>{
  const attempt=newAttempt(),{remove}=backend(attempt)
  ;(supabase.rpc as jest.Mock).mockResolvedValue({data:{upload_id:attempt.id,storage_path:'another-owner/path',state:'committed',item:{}},error:null})
  await expect(uploadDriveFile(supabase,file(),attempt)).rejects.toBeInstanceOf(DriveUploadPendingError)
  expect(remove).not.toHaveBeenCalled()
})

it('does not recreate a previously committed item that was subsequently deleted',async()=>{
  const attempt=newAttempt(),{state,upload}=backend(attempt);state.phase='committed'
  await expect(uploadDriveFile(supabase,file(),attempt)).rejects.toThrow('não está mais disponível')
  expect(upload).not.toHaveBeenCalled()
})

it('ends an indefinitely unavailable preparation as unconfirmed without sending bytes',async()=>{
  jest.useFakeTimers()
  try{
    const attempt=newAttempt(),{upload}=backend(attempt)
    ;(supabase.rpc as jest.Mock).mockReturnValue(new Promise(()=>{}))
    const result=expect(uploadDriveFile(supabase,file(),attempt)).rejects.toBeInstanceOf(DriveUploadPendingError)
    await jest.advanceTimersByTimeAsync(30001);await result
    expect(upload).not.toHaveBeenCalled();expect(jest.getTimerCount()).toBe(0)
  }finally{jest.useRealTimers()}
})

it('reconciles a hung binary request and queues cleanup once cancellation is confirmed',async()=>{
  jest.useFakeTimers()
  try{
    const attempt=newAttempt(),{upload}=backend(attempt)
    upload.mockReturnValue(new Promise(()=>{}))
    const original=(supabase.rpc as jest.Mock).getMockImplementation()!
    ;(supabase.rpc as jest.Mock).mockImplementation(async(name,args)=>name==='complete_office_drive_upload'
      ?{data:{upload_id:attempt.id,storage_path:`drive-uploads/owner/${attempt.id}`,state:'pending',item:null},error:null}:original(name,args))
    const result=expect(uploadDriveFile(supabase,file(),attempt)).rejects.toThrow('tempo de espera')
    await jest.advanceTimersByTimeAsync(30*60*1000+1);await result
    expect(global.fetch).toHaveBeenCalled();expect(jest.getTimerCount()).toBe(0)
  }finally{jest.useRealTimers()}
})
