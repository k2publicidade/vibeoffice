import { act, renderHook, waitFor } from '@testing-library/react'
import { useChat } from '../useChat'
import { useAuth } from '../useAuth'
import { supabase } from '@/lib/supabase/client'
import type { ChatRoom } from '@/types/chat'

jest.mock('../useAuth')
const mockIsArchived = jest.fn(() => false), mockUnarchive = jest.fn().mockResolvedValue(undefined)
jest.mock('../useArchiveChat', () => ({ useArchiveChat: () => ({ isRoomArchived: mockIsArchived, unarchiveRoom: mockUnarchive }) }))
jest.mock('@/lib/supabase/storage', () => ({ uploadFile: jest.fn(), deleteFile: jest.fn() }))

const user = { id: 'owner', name: 'Owner', role: 'Colaborador', sector: 'Marketing' }
const row = (id = 'room-a') => ({ id, name: id, type: 'project', participants: ['owner', 'peer'], created_by: 'owner', description: 'Description', created_at: '2030-01-01Z', updated_at: '2030-01-01Z' })
const room = (id = 'room-a'): ChatRoom => ({ id, name: id, type: 'project', participants: ['owner', 'peer'], createdBy: 'owner', description: 'Description', createdAt: new Date('2030-01-01'), updatedAt: new Date('2030-01-01') })
const message = (id = 'message-a', room_id = 'room-a') => ({ id, room_id, user_id: 'peer', content: id, timestamp: '2030-01-01Z', type: 'text', read_by: {}, reactions: {} })
function deferred() { let resolve!: (value: any) => void; const promise = new Promise<any>(done => { resolve = done }); return { promise, resolve } }
let reads: Record<string, any[]>, messages: Record<string, any>, write: any, channels: any[]
beforeEach(() => {
  jest.clearAllMocks()
  jest.spyOn(console, 'error').mockImplementation(() => {})
  ;(useAuth as jest.Mock).mockReturnValue({ user })
  reads = { chat_rooms: [Promise.resolve({ data: [row(), row('room-b')], error: null })], users: [] }
  messages = {}; write = Promise.resolve({ data: row('new-room'), error: null }); channels = []
  ;(supabase.rpc as jest.Mock).mockResolvedValue({ data: [], error: null })
  ;(supabase.from as jest.Mock).mockImplementation((table: string) => {
    let mutation = false, selectedRoom = ''
    const finish = () => mutation ? write : table === 'messages' ? (messages[selectedRoom] || Promise.resolve({ data: [], error: null })) : (reads[table]?.shift() || Promise.resolve({ data: [], error: null }))
    const query: any = { select: jest.fn(() => query), order: jest.fn(finish), eq: jest.fn((key, value) => { if (key === 'room_id') selectedRoom = value; return query }), contains: jest.fn(() => query), insert: jest.fn(() => { mutation = true; return query }), update: jest.fn(() => { mutation = true; return query }), single: jest.fn(finish), maybeSingle: jest.fn(finish), then: (done: any, fail: any) => Promise.resolve(finish()).then(done, fail) }
    return query
  })
  ;(supabase.channel as jest.Mock).mockImplementation((name: string) => {
    const channel: any = { name, handlers: [], on: jest.fn((type, filter, callback) => { channel.handlers.push({ type, filter, callback }); return channel }), subscribe: jest.fn((callback) => { channel.subscribed = callback; return channel }), presenceState: jest.fn(() => ({})), track: jest.fn().mockResolvedValue('ok') }
    channels.push(channel); return channel
  })
})
afterEach(() => jest.restoreAllMocks())

async function open(result: any, id = 'room-a') {
  act(() => result.current.setCurrentRoom(room(id)))
  await waitFor(() => expect(channels.some(c => c.name === `office-room:${id}`)).toBe(true))
}

it('finishes loading without retaining chat data when there is no signed-in account', () => {
  ;(useAuth as jest.Mock).mockReturnValue({ user: null })
  const { result } = renderHook(() => useChat())
  expect(result.current.isLoading).toBe(false)
  expect(result.current.rooms).toEqual([])
})

it('clears selected room and messages on logout', async () => {
  messages['room-a'] = Promise.resolve({ data: [message()], error: null })
  const { result, rerender } = renderHook(() => useChat())
  await open(result); await waitFor(() => expect(result.current.messages).toHaveLength(1))
  ;(useAuth as jest.Mock).mockReturnValue({ user: null }); rerender()
  expect(result.current.currentRoom).toBeNull()
  expect(result.current.messages).toEqual([])
  expect(result.current.rooms).toEqual([])
})

it('does not append a delayed send receipt to the newly selected conversation', async () => {
  const { result } = renderHook(() => useChat()); await open(result)
  const sending = deferred(); write = sending.promise
  let pending!: Promise<void>
  act(() => { pending = result.current.sendMessage('hello') })
  await open(result, 'room-b')
  await act(async () => { sending.resolve({ data: message('sent', 'room-a'), error: null }); await pending })
  expect(result.current.messages).toEqual([])
  expect(result.current.currentRoom?.id).toBe('room-b')
})

it('ignores queued Realtime messages from a conversation already left', async () => {
  const { result } = renderHook(() => useChat()); await open(result)
  const old = channels.find(c => c.name === 'office-room:room-a')
  const insert = old.handlers.find((h: any) => h.filter.event === 'INSERT').callback
  await open(result, 'room-b')
  await act(async () => { await insert({ new: message() }) })
  expect(result.current.messages).toEqual([])
})

it('preserves a confirmed new DM when an older room listing returns', async () => {
  const initial = deferred(); reads.chat_rooms = [initial.promise]
  write = Promise.resolve({ data: { ...row('new-dm'), type: 'dm' }, error: null })
  const { result } = renderHook(() => useChat())
  await act(async () => { await result.current.createDM('peer', 'Peer') })
  await act(async () => { initial.resolve({ data: [], error: null }); await initial.promise })
  expect(result.current.rooms.map(r => r.id)).toContain('new-dm')
})

it('does not let an earlier account listing replace the new account state', async () => {
  const initial = deferred(); reads.chat_rooms = [initial.promise, Promise.resolve({ data: [], error: null })]
  const { result, rerender } = renderHook(() => useChat())
  ;(useAuth as jest.Mock).mockReturnValue({ user: { ...user, id: 'another' } }); rerender()
  await act(async () => { initial.resolve({ data: [row()], error: null }); await initial.promise })
  expect(result.current.rooms).toEqual([])
})

it('does not overwrite a newer unread summary with a delayed earlier summary', async () => {
  const old = deferred(); (supabase.rpc as jest.Mock).mockReturnValueOnce(old.promise).mockResolvedValue({ data: [{ room_id: 'room-a', content: 'new', timestamp: '2030-01-01Z', unread: 2 }], error: null })
  const { result } = renderHook(() => useChat())
  const summary = channels.find(c => c.name === 'chat-summary:owner')
  await act(async () => { await summary.handlers[0].callback() })
  await act(async () => { old.resolve({ data: [{ room_id: 'room-a', content: 'old', timestamp: '2020-01-01Z', unread: 9 }], error: null }); await old.promise })
  expect(result.current.unreadCounts['room-a']).toBe(2)
  expect(result.current.lastMessages['room-a'].content).toBe('new')
})

it('refuses to report a group rename when the database returned no changed row', async () => {
  const { result } = renderHook(() => useChat())
  await waitFor(() => expect(result.current.rooms).toHaveLength(2))
  write = Promise.resolve({ data: null, error: null })
  let saved = true
  await act(async () => { saved = await result.current.updateProjectGroup('room-a', { name: 'changed' }) })
  expect(saved).toBe(false)
  expect(result.current.rooms[0].name).toBe('room-a')
})

it.each(['rename', 'add', 'remove'])('does not apply a delayed %s receipt to a different selected group', async mode => {
  const { result } = renderHook(() => useChat())
  await waitFor(() => expect(result.current.rooms).toHaveLength(2))
  await open(result)
  const change = deferred(); write = change.promise
  reads.chat_rooms.push(Promise.resolve({ data: { ...row(), name: 'changed', participants: ['owner', 'new-person'] }, error: null }))
  if (mode !== 'rename') (supabase.rpc as jest.Mock).mockReturnValueOnce(change.promise)
  let pending!: Promise<boolean>
  act(() => { pending = mode === 'rename' ? result.current.updateProjectGroup('room-a', { name: 'changed' }) : mode === 'add' ? result.current.addMemberToProject('room-a', 'new-person') : result.current.removeMemberFromProject('room-a', 'peer') })
  await open(result, 'room-b')
  await act(async () => { change.resolve({ data: { ...row(), name: 'changed', participants: ['owner', 'new-person'] }, error: null }); await pending })
  expect(result.current.currentRoom?.name).toBe('room-b')
  expect(result.current.currentRoom?.participants).toEqual(['owner', 'peer'])
  expect(result.current.rooms.find(r => r.id === 'room-a')?.name).toBe('changed')
})

it('rejects a callback retained from a previous account before writing', async () => {
  const { result, rerender } = renderHook(() => useChat()); await open(result)
  const oldSend = result.current.sendMessage, oldDM = result.current.createDM
  ;(useAuth as jest.Mock).mockReturnValue({ user: { ...user, id: 'another' } }); rerender()
  ;(supabase.from as jest.Mock).mockClear()
  await expect(oldSend('old account')).rejects.toThrow('Sessão alterada')
  await expect(oldDM('peer', 'Peer')).rejects.toThrow('not authenticated')
  expect(supabase.from).not.toHaveBeenCalled()
})

it('does not mix a delayed previous room history into the current room', async () => {
  const history = deferred(); messages['room-a'] = history.promise
  const { result } = renderHook(() => useChat())
  act(() => result.current.setCurrentRoom(room()))
  await open(result, 'room-b')
  await act(async () => { history.resolve({ data: [message()], error: null }); await history.promise })
  expect(result.current.messages).toEqual([])
})

it('reconciles a concurrent DM creation using the unique database receipt', async () => {
  const { result } = renderHook(() => useChat())
  await waitFor(() => expect(result.current.rooms).toHaveLength(2))
  write = Promise.resolve({ data: null, error: { code: '23505' } })
  reads.chat_rooms.push(Promise.resolve({ data: { ...row('dm-existing'), type: 'dm' }, error: null }))
  let saved!: ChatRoom
  await act(async () => { saved = await result.current.createDM('peer', 'Peer') })
  expect(saved.id).toBe('dm-existing')
  expect(result.current.rooms.filter(r => r.id === saved.id)).toHaveLength(1)
})

it('retains a single message when Realtime confirms an INSERT before its send response', async () => {
  const { result } = renderHook(() => useChat()); await open(result)
  const response = deferred(); write = response.promise
  let pending!: Promise<void>
  act(() => { pending = result.current.sendMessage('hello') })
  const channel = channels.find(c => c.name === 'office-room:room-a'), insert = channel.handlers.find((h: any) => h.filter.event === 'INSERT').callback
  await act(async () => { await insert({ new: message('sent') }) })
  await act(async () => { response.resolve({ data: message('sent'), error: null }); await pending })
  expect(result.current.messages.map(m => m.id)).toEqual(['sent'])
})

it('merges live inserts, updates and deletions while the initial history is loading', async () => {
  const history = deferred(); messages['room-a'] = history.promise
  const { result } = renderHook(() => useChat())
  await open(result)
  const channel = channels.find(c => c.name === 'office-room:room-a')
  const callback = (event: string) => channel.handlers.find((h: any) => h.filter.event === event).callback
  await act(async () => {
    await callback('INSERT')({ new: message('live') })
    await callback('UPDATE')({ new: { ...message('existing'), content: 'edited', reactions: { heart: ['peer'] } } })
    await callback('DELETE')({ old: { id: 'deleted' } })
  })
  await act(async () => { history.resolve({ data: [message('existing'), message('deleted')], error: null }); await history.promise })
  expect(result.current.messages.map(m => m.id).sort()).toEqual(['existing', 'live'])
  expect(result.current.messages.find(m => m.id === 'existing')?.content).toBe('edited')
})

it('does not restore a message deleted before its delayed send response', async () => {
  const { result } = renderHook(() => useChat()); await open(result)
  const sent = deferred(); write = sent.promise
  let pending!: Promise<void>
  act(() => { pending = result.current.sendMessage('hello') })
  const channel = channels.find(c => c.name === 'office-room:room-a')
  const callback = (event: string) => channel.handlers.find((h: any) => h.filter.event === event).callback
  await act(async () => { await callback('INSERT')({ new: message('sent') }); await callback('DELETE')({ old: { id: 'sent' } }) })
  await act(async () => { sent.resolve({ data: message('sent'), error: null }); await pending })
  expect(result.current.messages).toEqual([])
})

it('retains both confirmed participants when concurrent membership receipts arrive backwards', async () => {
  const { result } = renderHook(() => useChat()); await waitFor(() => expect(result.current.rooms).toHaveLength(2))
  const first = deferred(), second = deferred()
  ;(supabase.rpc as jest.Mock).mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise)
  const final = { ...row(), participants: ['owner', 'peer', 'first', 'second'] }
  reads.chat_rooms.push(Promise.resolve({ data: final, error: null }), Promise.resolve({ data: final, error: null }))
  let a!: Promise<boolean>, b!: Promise<boolean>
  act(() => { a = result.current.addMemberToProject('room-a', 'first'); b = result.current.addMemberToProject('room-a', 'second') })
  await act(async () => { second.resolve({ data: final, error: null }); await b })
  await act(async () => { first.resolve({ data: { ...row(), participants: ['owner', 'peer', 'first'] }, error: null }); await a })
  expect(result.current.rooms.find(r => r.id === 'room-a')?.participants).toEqual(final.participants)
})

it('creates a validated project group with unique members and preserves the confirmed receipt', async () => {
  const { result } = renderHook(() => useChat()); await waitFor(() => expect(result.current.rooms).toHaveLength(2))
  write = Promise.resolve({ data: row('created-group'), error: null })
  let created: ChatRoom | null = null
  await act(async () => { created = await result.current.createProjectGroup({ name: ' Project ', description: ' Description ', memberIds: ['peer', 'owner', 'peer'] }) })
  expect(created).toMatchObject({ id: 'created-group', createdBy: 'owner' })
  expect(result.current.currentRoom?.id).toBe('created-group')
  expect(result.current.rooms.filter(r => r.id === 'created-group')).toHaveLength(1)
})

it('rejects invalid groups and creator removal before issuing a write', async () => {
  const { result } = renderHook(() => useChat()); await waitFor(() => expect(result.current.rooms).toHaveLength(2))
  ;(supabase.from as jest.Mock).mockClear(); (supabase.rpc as jest.Mock).mockClear()
  await act(async () => {
    expect(await result.current.createProjectGroup({ name: '', description: 'Description', memberIds: ['peer'] })).toBeNull()
    expect(await result.current.removeMemberFromProject('room-a', 'owner')).toBe(false)
    expect(await result.current.addMemberToProject('room-a', 'peer')).toBe(false)
    expect(await result.current.updateProjectGroup('missing', { name: 'changed' })).toBe(false)
  })
  expect(supabase.from).not.toHaveBeenCalled(); expect(supabase.rpc).not.toHaveBeenCalled()
})

it('does not change the room after a failed canonical read following a committed member write', async () => {
  const { result } = renderHook(() => useChat()); await waitFor(() => expect(result.current.rooms).toHaveLength(2))
  ;(supabase.rpc as jest.Mock).mockResolvedValueOnce({ data: { ...row(), participants: ['owner', 'peer', 'new-person'] }, error: null })
  reads.chat_rooms.push(Promise.resolve({ data: null, error: new Error('Read unavailable') }))
  await act(async () => { expect(await result.current.addMemberToProject('room-a', 'new-person')).toBe(false) })
  expect(result.current.rooms.find(r => r.id === 'room-a')?.participants).toEqual(['owner', 'peer'])
})

it('surfaces an unconfirmed send and never adds it to the conversation', async () => {
  const { result } = renderHook(() => useChat()); await open(result)
  write = Promise.resolve({ data: null, error: null })
  await act(async () => { await expect(result.current.sendMessage('hello')).rejects.toThrow('não foi salva') })
  expect(result.current.messages).toEqual([])
})

it('refreshes after Realtime subscribes without overwriting newer live history', async () => {
  const { result } = renderHook(() => useChat()); await open(result)
  const channel = channels.find(c => c.name === 'office-room:room-a')
  await act(async () => { await channel.handlers.find((h: any) => h.filter.event === 'INSERT').callback({ new: message('existing') }) })
  messages['room-a'] = Promise.resolve({ data: [{ ...message('existing'), content: 'canonical edit' }, message('missed-before-subscription')], error: null })
  await act(async () => { channel.subscribed('SUBSCRIBED') })
  await waitFor(() => expect(result.current.messages).toHaveLength(2))
  expect(result.current.messages.find(m => m.id === 'existing')?.content).toBe('canonical edit')
  expect(channel.track).toHaveBeenCalledWith(expect.objectContaining({ userId: 'owner', typing: false }))
})

it('ends loading after a failed group reconciliation invalidates an older listing', async () => {
  const { result } = renderHook(() => useChat()); await waitFor(() => expect(result.current.rooms).toHaveLength(2))
  const old = deferred(); reads.chat_rooms.push(old.promise, Promise.resolve({ data: null, error: new Error('Read unavailable') }))
  const summary = channels.find(c => c.name === 'chat-summary:owner')
  act(() => { summary.handlers.find((h: any) => h.filter.table === 'chat_rooms').callback() })
  expect(result.current.isLoading).toBe(true)
  ;(supabase.rpc as jest.Mock).mockResolvedValueOnce({ data: row(), error: null })
  await act(async () => { await result.current.addMemberToProject('room-a', 'new') })
  expect(result.current.isLoading).toBe(false)
  await act(async () => { old.resolve({ data: [], error: null }); await old.promise })
  expect(result.current.rooms).toHaveLength(2)
})

it('does not select a room through a callback retained from a previous account', async () => {
  const { result, rerender } = renderHook(() => useChat()); await waitFor(() => expect(result.current.rooms).toHaveLength(2))
  const select = result.current.setCurrentRoom
  ;(useAuth as jest.Mock).mockReturnValue({ user: { ...user, id: 'another' } }); rerender()
  act(() => select(room()))
  expect(result.current.currentRoom).toBeNull()
})
