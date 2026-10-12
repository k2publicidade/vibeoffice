import { act, renderHook, waitFor } from '@testing-library/react'
import { supabase } from '@/lib/supabase/client'
import { useDrive } from '../useDrive'
import { useAuth } from '../useAuth'

jest.mock('../useAuth')
const user = { id: 'owner', role: 'Colaborador' }
const folder = { id: 'folder', name: 'Pasta', type: 'folder', parent_id: null, uploaded_by: user.id, created_at: '2030-01-01Z', updated_at: '2030-01-01Z', shared_access: [] }
const file = { ...folder, id: 'file', name: 'arquivo.txt', type: 'file', parent_id: 'folder', storage_path: 'folder/file.txt', size: 10, mime_type: 'text/plain' }
const originalFetch = global.fetch
function database() {
  const state = { rows: [folder, file] as Record<string, unknown>[], response: { data: { deletion_id: 'group', deleted_ids: ['folder', 'file'], cleanup_count: 1, parent_id: null }, error: null } as {data: unknown;error: unknown}, fetchResponse: undefined as Promise<unknown> | undefined }
  ;(supabase.from as jest.Mock).mockImplementation(table => {
    const query = {
      select: jest.fn(() => query), order: jest.fn(() => query), eq: jest.fn(() => query),
      then: (done: (value: unknown) => unknown) => (table === 'drive_items' && state.fetchResponse ? state.fetchResponse : Promise.resolve({ data: table === 'drive_items' ? state.rows : [], error: null })).then(done),
    }
    return query
  })
  ;(supabase.rpc as jest.Mock).mockImplementation(async name => {
    expect(name).toBe('delete_office_drive_item')
    if (!state.response.error && state.response.data) state.rows = []
    return state.response
  })
  global.fetch = jest.fn().mockResolvedValue({ ok: true })
  let receive!: () => void
  const channel = { on: jest.fn((_event, _filter, handler) => { receive = handler; return channel }), subscribe: jest.fn(() => channel) }
  ;(supabase.channel as jest.Mock).mockReturnValue(channel)
  return { state, realtime: () => receive(), channel }
}
async function loaded() {
  const hook = renderHook(useDrive)
  await waitFor(() => expect(hook.result.current.isLoading).toBe(false))
  expect(hook.result.current.items).toHaveLength(2)
  return hook
}
beforeEach(() => { jest.clearAllMocks(); (useAuth as jest.Mock).mockReturnValue({user}); jest.spyOn(console, 'error').mockImplementation(() => {}) })
afterEach(() => { global.fetch = originalFetch; jest.restoreAllMocks() })

it('preserves files and metadata when deletion is denied', async () => {
  const { state } = database(); const { result } = await loaded()
  state.response = { data: null, error: { code: '42501', message: 'Sem permissão' } }
  await expect(result.current.deleteItem('folder')).rejects.toMatchObject({ code: '42501' })
  expect(result.current.items).toHaveLength(2)
  expect(supabase.storage.from).not.toHaveBeenCalled()
  expect(global.fetch).not.toHaveBeenCalled()
})

it('removes a confirmed folder tree locally and requests its durable cleanup', async () => {
  database(); const { result } = await loaded()
  await act(async () => { result.current.navigateToFolder('folder') })
  await act(async () => { await result.current.deleteItem('folder') })
  expect(supabase.rpc).toHaveBeenCalledWith('delete_office_drive_item', { item_id: 'folder' })
  expect(global.fetch).toHaveBeenCalledWith('/api/drive/cleanup', expect.objectContaining({ body: JSON.stringify({deletionId:'group'}) }))
  expect(result.current.items).toHaveLength(0)
  expect(result.current.currentFolderId).toBeNull()
  expect(supabase.storage.from).not.toHaveBeenCalled()
})

it.each(['network','server'])('keeps a confirmed deletion when immediate cleanup has a %s failure', async failure => {
  database(); const { result } = await loaded()
  if(failure==='network') (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Offline'))
  else (global.fetch as jest.Mock).mockResolvedValueOnce({ok:false,status:503})
  await act(async () => { await expect(result.current.deleteItem('folder')).resolves.toBeUndefined() })
  expect(result.current.items).toHaveLength(0)
})

it('skips the cleanup request for a folder without file jobs', async () => {
  const { state } = database(); const { result } = await loaded()
  state.response = { data: { deletion_id: 'group', deleted_ids: ['folder','file'], cleanup_count: 0 }, error: null }
  await act(async () => { await result.current.deleteItem('folder') })
  expect(global.fetch).not.toHaveBeenCalled()
})

it('rejects an unconfirmed response instead of erasing local records', async () => {
  const { state } = database(); const { result } = await loaded()
  state.response = {data:null,error:null}
  await expect(result.current.deleteItem('folder')).rejects.toThrow('Exclusão não confirmada')
  expect(result.current.items).toHaveLength(2)
  expect(global.fetch).not.toHaveBeenCalled()
})

it('ignores a stale realtime snapshot after the deletion has committed', async () => {
  const { state, realtime } = database(); const { result } = await loaded()
  let complete!: (value: unknown) => void
  state.fetchResponse = new Promise(done => {complete=done})
  await act(async () => {realtime()})
  const oldRead=state.fetchResponse
  state.fetchResponse=undefined
  await act(async () => {await result.current.deleteItem('folder')})
  await act(async () => {complete({data:[folder,file],error:null}); await oldRead})
  expect(result.current.items).toHaveLength(0)
})

it('maps ownership, inherited public access, navigation and sharing without exposing another folder', async () => {
  const {state,channel}=database()
  state.rows=[{...folder,is_public:true},file,{...folder,id:'hidden',uploaded_by:'other',shared_access:[{user_id:user.id,permission:'view',shared_at:'2030-01-01Z',shared_by:'other'}]}]
  const {result,unmount}=renderHook(useDrive)
  await waitFor(()=>expect(result.current.isLoading).toBe(false))
  expect(result.current.getItemById('file')).toMatchObject({canManage:true,inheritsPublic:true})
  expect(result.current.getItemById('hidden')?.canManage).toBe(false)
  act(()=>result.current.navigateToFolder('folder'))
  expect(result.current.breadcrumbs.map(row=>row.id)).toEqual(['folder'])
  expect(result.current.getItemsInFolder('folder').map(row=>row.id)).toEqual(['file'])
  act(()=>result.current.navigateToFolder('unknown'))
  expect(result.current.currentFolderId).toBe('folder')
  act(()=>result.current.goBack())
  expect(result.current.currentFolderId).toBeNull()
  expect(result.current.getFolderPath('folder').map(row=>row.id)).toEqual(['folder'])
  expect(result.current.getSharedWithMe()).toHaveLength(1)
  unmount();expect(supabase.removeChannel).toHaveBeenCalledWith(channel)
})
