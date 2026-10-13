import { act, renderHook, waitFor } from '@testing-library/react'
import { supabase } from '@/lib/supabase/client'
import { useDrive } from '../useDrive'
import { useAuth } from '../useAuth'
import { DriveUploadPendingError } from '@/types/drive'

jest.mock('../useAuth')
const user = { id: 'owner', role: 'Colaborador' }
const row = (id: string, extra = {}) => ({ id, name: id, type: 'folder', parent_id: null, uploaded_by: user.id, is_public: false, created_at: '2030-01-01Z', updated_at: '2030-01-01Z', shared_access: [], ...extra })
function deferred<T>() { let resolve!: (value: T) => void; const promise = new Promise<T>(done => { resolve = done }); return { promise, resolve } }
function database(rows = [row('parent', { is_public: true })]) {
  const state = { rows, read: undefined as Promise<unknown> | undefined, mutation: undefined as {data: unknown;error: unknown} | undefined }
  const insert = jest.fn(), update = jest.fn()
  ;(supabase.from as jest.Mock).mockImplementation(table => {
    let inserted: Record<string, unknown> | undefined, changes: Record<string, unknown> | undefined, id: string | undefined
    const query = {
      select: jest.fn(() => query), order: jest.fn(() => query),
      insert: (input: Record<string, unknown>) => { inserted=input;insert(input);return query },
      update: (input: Record<string, unknown>) => { changes=input;update(input);return query },
      eq: (column: string, value: string) => { if(column==='id')id=value;return query },
      single: async () => {
        if(state.mutation)return state.mutation
        const data=inserted ? row('new-'+insert.mock.calls.length,inserted) : {...state.rows.find(item=>item.id===id),...changes}
        state.rows=inserted ? [...state.rows,data] : state.rows.map(item=>item.id===id ? data : item)
        return {data,error:null}
      },
      then: (done: (value: unknown) => unknown) => (table==='drive_items' && state.read ? state.read : Promise.resolve({data:table==='drive_items'?state.rows:[],error:null})).then(done),
    };return query
  })
  const upload=jest.fn().mockResolvedValue({data:{},error:null}),remove=jest.fn().mockResolvedValue({data:[],error:null})
  const uploaded=new Set<string>(),attempts=new Map<string,Record<string,unknown>>()
  ;(supabase.storage.from as jest.Mock).mockReturnValue({upload:async(path:string,...args:unknown[])=>{const response=await upload(path,...args);if(!response.error)uploaded.add(path);return response},remove})
  ;(supabase.rpc as jest.Mock).mockImplementation(async(name,args)=>{
    if(name==='begin_office_drive_upload'){
      const path=`drive-uploads/${user.id}/${args.upload_id}`
      if(!attempts.has(args.upload_id))attempts.set(args.upload_id,{...args,path,state:'pending',item:null})
    }
    const attempt=attempts.get(args.upload_id)!
    if(name==='complete_office_drive_upload' && uploaded.has(String(attempt.path))){
      const saved=await supabase.from('drive_items').insert({id:args.upload_id,name:attempt.file_name,type:'file',parent_id:attempt.target_parent,uploaded_by:user.id,storage_path:attempt.path,size:attempt.file_size,mime_type:attempt.file_mime} as never).select().single()
      if(saved.error)return saved
      attempt.state='committed';attempt.item=saved.data
    }
    if(name==='abort_office_drive_upload' && attempt.state!=='committed')attempt.state='aborted'
    return {data:{upload_id:args.upload_id,storage_path:attempt.path,state:attempt.state,item:attempt.item},error:null}
  })
  let receive!: () => void
  const channel={on:jest.fn((_event,_filter,handler)=>{receive=handler;return channel}),subscribe:jest.fn(()=>channel)}
  ;(supabase.channel as jest.Mock).mockReturnValue(channel)
  return {state,insert,update,upload,remove,realtime:()=>receive()}
}
const file=()=>new File(['content'],'same.txt',{type:'text/plain'})
async function loaded(){ const hook=renderHook(useDrive);await waitFor(()=>expect(hook.result.current.isLoading).toBe(false));return hook }
beforeEach(()=>{jest.clearAllMocks();(useAuth as jest.Mock).mockReturnValue({user});jest.spyOn(console,'error').mockImplementation(()=>{})})
afterEach(()=>jest.restoreAllMocks())

it('returns an uploaded file with immediate management and inherited public permissions',async()=>{
  database();const {result}=await loaded()
  let saved!: Awaited<ReturnType<typeof result.current.uploadFile>>
  await act(async()=>{saved=await result.current.uploadFile({file:file(),parentId:'parent'})})
  expect(saved).toMatchObject({canManage:true,inheritsPublic:true})
  expect(result.current.getItemById(saved.id)).toMatchObject({canManage:true,inheritsPublic:true})
})

it('returns a confirmed folder with permissions even when the subsequent refresh fails',async()=>{
  const {state}=database();const {result}=await loaded();state.read=Promise.resolve({data:null,error:new Error('offline')})
  let saved!: Awaited<ReturnType<typeof result.current.createFolder>>
  await act(async()=>{saved=await result.current.createFolder({name:'new',parentId:'parent'})})
  expect(saved).toMatchObject({canManage:true,inheritsPublic:true})
  expect(result.current.getItemById(saved.id)).toMatchObject({canManage:true,inheritsPublic:true})
})

it('keeps the upload indicator active between files in a batch',async()=>{
  const {upload}=database();const second=deferred<{error:null}>();upload.mockResolvedValueOnce({error:null}).mockReturnValueOnce(second.promise)
  const {result}=await loaded();let batch!: Promise<unknown>
  await act(async()=>{batch=result.current.uploadFiles([file(),file()])})
  await waitFor(()=>expect(upload).toHaveBeenCalledTimes(2))
  expect(result.current.isUploading).toBe(true)
  await act(async()=>{second.resolve({error:null});await batch})
  expect(result.current.isUploading).toBe(false)
  expect(result.current.items.filter(item=>item.type==='file')).toHaveLength(2)
})

it('keeps concurrent uploads active and gives identical filenames distinct paths',async()=>{
  const {upload}=database();const first=deferred<{error:null}>(),second=deferred<{error:null}>()
  upload.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);jest.spyOn(Date,'now').mockReturnValue(123)
  const {result}=await loaded();let a!:Promise<unknown>,b!:Promise<unknown>
  act(()=>{a=result.current.uploadFile({file:file()});b=result.current.uploadFile({file:file()})})
  await act(async()=>{first.resolve({error:null});await a})
  expect(result.current.isUploading).toBe(true)
  expect(upload.mock.calls[0][0]).not.toBe(upload.mock.calls[1][0])
  await act(async()=>{second.resolve({error:null});await b})
  expect(result.current.isUploading).toBe(false)
})

it('does not lose a confirmed upload when an older Realtime read finishes',async()=>{
  const {state,realtime}=database();const old=deferred<unknown>();const {result}=await loaded()
  state.read=old.promise;act(()=>realtime());state.read=undefined
  let id!:string;await act(async()=>{id=(await result.current.uploadFile({file:file()})).id})
  await act(async()=>{old.resolve({data:[row('parent',{is_public:true})],error:null});await old.promise})
  expect(result.current.getItemById(id)).not.toBeNull()
})

it('recomputes descendant permissions when a folder moves out of its shared/public ancestor',async()=>{
  const {state}=database([row('source',{uploaded_by:'other',is_public:true,shared_access:[{user_id:user.id,permission:'manage',shared_at:'2030-01-01Z',shared_by:'other'}]}),row('target',{uploaded_by:'another',shared_access:[{user_id:user.id,permission:'edit',shared_at:'2030-01-01Z',shared_by:'another'}]}),row('moving',{uploaded_by:'other',parent_id:'source'}),row('child',{uploaded_by:'other',parent_id:'moving',type:'file'})])
  const {result}=await loaded();expect(result.current.getItemById('child')).toMatchObject({canManage:true,inheritsPublic:true})
  await act(async()=>{await result.current.moveItem('moving','target')})
  expect(state.rows.find(item=>item.id==='moving')?.parent_id).toBe('target')
  expect(result.current.getItemById('child')).toMatchObject({canManage:false,inheritsPublic:false})
})

it('updates inherited public visibility immediately when the parent becomes private',async()=>{
  database([row('parent',{is_public:true}),row('child',{parent_id:'parent'})]);const {result}=await loaded()
  await act(async()=>{await result.current.togglePublicAccess('parent')})
  expect(result.current.getItemById('child')?.inheritsPublic).toBe(false)
})

it('uses the confirmed name instead of the requested name and ignores old reads',async()=>{
  const {state,realtime}=database();const {result}=await loaded();const old=deferred<unknown>()
  state.read=old.promise;act(()=>realtime());state.mutation={data:row('parent',{name:'normalized'}),error:null}
  await act(async()=>{await result.current.renameItem('parent',' requested ')})
  await act(async()=>{old.resolve({data:[row('parent')],error:null});await old.promise})
  expect(result.current.getItemById('parent')?.name).toBe('normalized')
})

it('preserves the tree when moving is denied',async()=>{
  const {state}=database([row('parent'),row('target'),row('child',{parent_id:'parent'})]);const {result}=await loaded()
  state.mutation={data:null,error:{code:'42501'}}
  await act(async()=>{await expect(result.current.moveItem('child','target')).rejects.toMatchObject({code:'42501'})})
  expect(result.current.getItemById('child')?.parentId).toBe('parent')
})

it('keeps failed Storage uploads out of metadata and restores the indicator',async()=>{
  const {insert,upload}=database();const {result}=await loaded();upload.mockResolvedValueOnce({error:new Error('offline')})
  await act(async()=>{await expect(result.current.uploadFile({file:file()})).rejects.toThrow('offline')})
  expect(insert).not.toHaveBeenCalled();expect(result.current.isUploading).toBe(false)
})

it('queues cleanup and preserves the tree if metadata creation fails, without directly removing an uncertain object',async()=>{
  const {state,upload,remove}=database();const {result}=await loaded();state.mutation={data:null,error:new Error('metadata denied')}
  await act(async()=>{await expect(result.current.uploadFile({file:file()})).rejects.toThrow('metadata denied')})
  expect(supabase.rpc).toHaveBeenCalledWith('abort_office_drive_upload',{upload_id:upload.mock.calls[0][0].split('/').at(-1)})
  expect(remove).not.toHaveBeenCalled()
  expect(result.current.items).toHaveLength(1);expect(result.current.isUploading).toBe(false)
})

it.each(['rename','move','public'])('preserves local state when %s returns no confirmed record',async operation=>{
  const {state}=database([row('parent'),row('target')]);const {result}=await loaded();state.mutation={data:null,error:null}
  await act(async()=>{
    const mutation=operation==='rename'?result.current.renameItem('parent','new'):operation==='move'?result.current.moveItem('parent','target'):result.current.togglePublicAccess('parent')
    await expect(mutation).rejects.toThrow('Alteração não confirmada')
  })
  expect(result.current.getItemById('parent')).toMatchObject({name:'parent',parentId:undefined,isPublic:false})
})

it.each(['move','public'])('ignores an old read after a confirmed %s update',async operation=>{
  const initial=[row('parent',{is_public:true}),row('target'),row('child',{parent_id:'parent'})]
  const {state,realtime}=database(initial);const {result}=await loaded();const old=deferred<unknown>();state.read=old.promise;act(()=>realtime())
  await act(async()=>{if(operation==='move')await result.current.moveItem('child','target');else await result.current.togglePublicAccess('parent')})
  await act(async()=>{old.resolve({data:initial,error:null});await old.promise})
  if(operation==='move')expect(result.current.getItemById('child')?.parentId).toBe('target')
  expect(result.current.getItemById('child')?.inheritsPublic).toBe(false)
})

it('retains earlier successful files when a later file in the batch fails',async()=>{
  const {upload}=database();const {result}=await loaded();upload.mockResolvedValueOnce({error:null}).mockResolvedValueOnce({error:new Error('second failed')})
  await act(async()=>{await expect(result.current.uploadFiles([file(),file()])).rejects.toThrow('second failed')})
  expect(result.current.items.filter(item=>item.type==='file')).toHaveLength(1)
  expect(result.current.isUploading).toBe(false)
})

it('clears the previous account tree while another account loads and rejects its old response',async()=>{
  const {state,realtime}=database();const {result,rerender}=await loaded();const old=deferred<unknown>(),current=deferred<unknown>()
  act(()=>result.current.navigateToFolder('parent'));state.read=old.promise;act(()=>realtime())
  state.read=current.promise;(useAuth as jest.Mock).mockReturnValue({user:{id:'another',role:'Colaborador'}});rerender()
  expect(result.current.items).toEqual([]);expect(result.current.currentFolderId).toBeNull()
  await act(async()=>{old.resolve({data:[row('parent')],error:null});await old.promise})
  expect(result.current.items).toEqual([])
  await act(async()=>{current.resolve({data:[row('new-account',{uploaded_by:'another'})],error:null});await current.promise})
  expect(result.current.items.map(item=>item.id)).toEqual(['new-account'])
})

it('bounds breadcrumb/path traversal and rejects moving into a malformed folder cycle',async()=>{
  database([row('a',{parent_id:'b'}),row('b',{parent_id:'a'}),row('c')]);const {result}=await loaded()
  expect(result.current.getFolderPath('a').map(item=>item.id)).toEqual(['b','a'])
  act(()=>result.current.navigateToFolder('a'));expect(result.current.breadcrumbs.map(item=>item.id)).toEqual(['b','a'])
  await expect(result.current.moveItem('c','a')).rejects.toThrow('Invalid folder hierarchy')
  await expect(result.current.moveItem('a','b')).rejects.toThrow('Cannot move folder into itself')
})

it('rejects an upload or folder callback retained from the previous account',async()=>{
  const {upload,insert}=database();const {result,rerender}=await loaded();const oldUpload=result.current.uploadFile,oldFolder=result.current.createFolder
  ;(useAuth as jest.Mock).mockReturnValue({user:{id:'another',role:'Colaborador'}});rerender()
  await expect(oldUpload({file:file()})).rejects.toThrow('Sessão alterada')
  await expect(oldFolder({name:'old callback'})).rejects.toThrow('Sessão alterada')
  expect(upload).not.toHaveBeenCalled();expect(insert).not.toHaveBeenCalled()
})

it('retains an unconfirmed attempt across retries and never sends the same File twice after a lost commit receipt',async()=>{
  const {state,upload}=database();const {result}=await loaded();const input=file()
  const original=(supabase.rpc as jest.Mock).getMockImplementation()!
  let committed=false
  ;(supabase.rpc as jest.Mock).mockImplementation(async(name,args)=>{
    if(name==='complete_office_drive_upload'){
      if(!committed){await original(name,args);committed=true;state.mutation={data:null,error:new Error('reads offline')}}
      return {data:null,error:new Error('receipt offline')}
    }
    if(name==='abort_office_drive_upload')return {data:null,error:new Error('receipt offline')}
    return original(name,args)
  })
  await act(async()=>{await expect(result.current.uploadFile({file:input})).rejects.toBeInstanceOf(DriveUploadPendingError)})
  expect(result.current.isUploading).toBe(false)
  state.mutation=undefined;(supabase.rpc as jest.Mock).mockImplementation(original)
  await act(async()=>{await result.current.uploadFile({file:input})})
  expect(upload).toHaveBeenCalledTimes(1)
  expect(result.current.items.filter(item=>item.type==='file')).toHaveLength(1)
})
