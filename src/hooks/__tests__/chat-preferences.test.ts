import { act, renderHook, waitFor } from '@testing-library/react'
import { supabase } from '@/lib/supabase/client'
import { useRoomPreferences } from '../useRoomPreferences'
import { useArchiveChat } from '../useArchiveChat'

const pref = (room_id = 'room-a', user_id = 'user-a', fields = {}) => ({ room_id, user_id, is_muted: false, is_blocked: false, is_archived: false, archived_at: null, ...fields })
function deferred() { let resolve!: (value: any) => void; const promise = new Promise<any>(done => { resolve = done }); return { promise, resolve } }
let reads: any[], writes: any[], channels: any[]
beforeEach(() => {
  jest.clearAllMocks(); jest.spyOn(console, 'error').mockImplementation(() => {})
  reads = []; writes = []; channels = []
  ;(supabase.from as jest.Mock).mockImplementation(() => {
    let mutation = false, fields = ''
    const finish = async () => {
      const result = await ((mutation ? writes.shift() : reads.shift()) || { data: mutation ? pref() : [], error: null })
      return !mutation && fields === 'is_muted,is_blocked' && Array.isArray(result.data) ? { ...result, data: result.data[0] || null } : { ...result, count: result.count ?? (Array.isArray(result.data) ? result.data.length : 0) }
    }
    const query: any = { select: jest.fn(value => { fields = value; return query }), eq: jest.fn(() => query), order: jest.fn(() => query), range: jest.fn(() => query), abortSignal: jest.fn(() => query), maybeSingle: jest.fn(() => query), single: jest.fn(() => query), upsert: jest.fn(() => { mutation = true; return query }), then: (done: any, fail: any) => finish().then(done, fail) }
    return query
  })
  ;(supabase.channel as jest.Mock).mockImplementation(() => { const channel: any = { on: jest.fn((_type, _filter, callback) => { channel.refresh = callback; return channel }), subscribe: jest.fn(() => channel) }; channels.push(channel); return channel })
})
afterEach(() => { jest.useRealTimers(); jest.restoreAllMocks() })

it('does not apply a delayed mute confirmation to a different conversation', async () => {
  const pending = deferred(); writes.push(pending.promise)
  const { result, rerender } = renderHook(({ room }) => useRoomPreferences(room, 'user-a'), { initialProps: { room: 'room-a' } })
  await waitFor(() => expect(result.current.loading).toBe(false))
  let saved!: Promise<void>; act(() => { saved = result.current.update('is_muted', true) })
  rerender({ room: 'room-b' }); await waitFor(() => expect(result.current.loading).toBe(false))
  await act(async () => { pending.resolve({ data: pref('room-a', 'user-a', { is_muted: true }), error: null }); await expect(saved).rejects.toThrow('mudou') })
  expect(result.current.muted).toBe(false)
})

it('does not overwrite a confirmed mute with an earlier preference read', async () => {
  const old = deferred(); reads.push(old.promise); writes.push({ data: pref('room-a', 'user-a', { is_muted: true }), error: null })
  const { result } = renderHook(() => useRoomPreferences('room-a', 'user-a'))
  reads.push({ data: [pref('room-a', 'user-a', { is_muted: true })], error: null })
  await act(async () => { await result.current.update('is_muted', true) })
  await act(async () => { old.resolve({ data: [pref()], error: null }); await old.promise })
  expect(result.current.muted).toBe(true)
})

it('keeps saving active until all overlapping preference operations finish', async () => {
  const a = deferred(), b = deferred(); writes.push(a.promise, b.promise)
  const { result } = renderHook(() => useRoomPreferences('room-a', 'user-a')); await waitFor(() => expect(result.current.loading).toBe(false))
  let first!: Promise<void>, second!: Promise<void>
  act(() => { first = result.current.update('is_muted', true); second = result.current.update('is_blocked', true) })
  reads.push({ data: [pref('room-a', 'user-a', { is_muted: true })], error: null })
  await act(async () => { a.resolve({ data: pref('room-a', 'user-a', { is_muted: true }), error: null }); await first })
  expect(result.current.saving).toBe(true)
  reads.push({ data: [pref('room-a', 'user-a', { is_muted: true, is_blocked: true })], error: null })
  await act(async () => { b.resolve({ data: pref('room-a', 'user-a', { is_blocked: true }), error: null }); await second })
  expect(result.current.saving).toBe(false)
})

it('rejects a retained update callback from the previous account before writing', async () => {
  const { result, rerender } = renderHook(({ user }) => useRoomPreferences('room-a', user), { initialProps: { user: 'user-a' } })
  await waitFor(() => expect(result.current.loading).toBe(false)); const update = result.current.update
  rerender({ user: 'user-b' }); await waitFor(() => expect(result.current.loading).toBe(false))
  ;(supabase.from as jest.Mock).mockClear()
  await expect(update('is_muted', true)).rejects.toThrow()
  expect(supabase.from).not.toHaveBeenCalled()
})

it('does not announce success without a returned preference row', async () => {
  const { result } = renderHook(() => useRoomPreferences('room-a', 'user-a')); await waitFor(() => expect(result.current.loading).toBe(false))
  writes.push({ data: null, error: null })
  await expect(result.current.update('is_muted', true)).rejects.toThrow()
  expect(result.current.muted).toBe(false)
})

it('clears archived room data immediately when the account changes', async () => {
  reads.push({ data: [pref('room-a', 'user-a', { is_archived: true })], error: null })
  const { result, rerender } = renderHook(({ user }) => useArchiveChat(user), { initialProps: { user: 'user-a' } })
  await waitFor(() => expect(result.current.isRoomArchived('room-a')).toBe(true))
  reads.push(deferred().promise); rerender({ user: 'user-b' })
  expect(result.current.archivedRoomIds.size).toBe(0)
})

it('does not apply an old account archive listing after a new account has loaded', async () => {
  const old = deferred(); reads.push(old.promise, { data: [], error: null })
  const { result, rerender } = renderHook(({ user }) => useArchiveChat(user), { initialProps: { user: 'user-a' } })
  rerender({ user: 'user-b' })
  await waitFor(() => expect(result.current.isLoading).toBe(false))
  await act(async () => { old.resolve({ data: [pref('room-a', 'user-a', { is_archived: true })], error: null }); await old.promise })
  expect(result.current.archivedRoomIds.size).toBe(0)
})

it('preserves a confirmed archive when an earlier listing arrives afterwards', async () => {
  const old = deferred(); reads.push(old.promise); writes.push({ data: pref('room-a', 'user-a', { is_archived: true }), error: null })
  const { result } = renderHook(() => useArchiveChat('user-a'))
  reads.push({ data: [pref('room-a', 'user-a', { is_archived: true })], error: null })
  await act(async () => { await result.current.archiveRoom('room-a') })
  await act(async () => { old.resolve({ data: [], error: null }); await old.promise })
  expect(result.current.isRoomArchived('room-a')).toBe(true)
})

it('does not apply a delayed archive write to a new account', async () => {
  const pending = deferred(); writes.push(pending.promise)
  const { result, rerender } = renderHook(({ user }) => useArchiveChat(user), { initialProps: { user: 'user-a' } })
  await waitFor(() => expect(result.current.isLoading).toBe(false))
  let saved!: Promise<void>; act(() => { saved = result.current.archiveRoom('room-a') })
  rerender({ user: 'user-b' }); await waitFor(() => expect(result.current.isLoading).toBe(false))
  await act(async () => { pending.resolve({ data: pref('room-a', 'user-a', { is_archived: true }), error: null }); await expect(saved).rejects.toThrow('mudou') })
  expect(result.current.archivedRoomIds.size).toBe(0)
})

it('rejects archiving without a signed-in account', async () => {
  const { result } = renderHook(() => useArchiveChat(undefined))
  await expect(result.current.archiveRoom('room-a')).rejects.toThrow()
})

it('loads all archive preferences even when the provider caps each page below the requested size', async () => {
  reads.push({ data: [pref('room-a', 'user-a', { is_archived: true }), pref('room-b', 'user-a', { is_archived: true })], count: 3, error: null }, { data: [pref('room-c', 'user-a', { is_archived: true })], count: 3, error: null })
  const { result } = renderHook(() => useArchiveChat('user-a'))
  await waitFor(() => expect(result.current.archivedRoomIds.size).toBe(3))
  expect(result.current.isRoomArchived('room-c')).toBe(true)
})

it('recovers a lost archive response from the canonical date normalized by Postgres', async () => {
  jest.useFakeTimers()
  const { result } = renderHook(() => useArchiveChat('user-a')); await waitFor(() => expect(result.current.isLoading).toBe(false))
  writes.push({ data: null, error: new Error('Response lost') })
  reads.push({ data: [pref('room-a', 'user-a', { is_archived: true, archived_at: new Date().toISOString().replace('Z', '+00:00') })], error: null })
  await act(async () => { await result.current.archiveRoom('room-a') })
  expect(result.current.isRoomArchived('room-a')).toBe(true)
})

it('recovers a lost mute receipt when the fresh row proves the desired choice', async () => {
  const { result } = renderHook(() => useRoomPreferences('room-a', 'user-a')); await waitFor(() => expect(result.current.loading).toBe(false))
  writes.push({ data: null, error: new Error('Response lost') })
  reads.push({ data: [pref('room-a', 'user-a', { is_muted: true })], error: null })
  await act(async () => { await result.current.update('is_muted', true) })
  expect(result.current.muted).toBe(true)
})

it('exposes an unresponsive read as a retryable failure within its deadline', async () => {
  jest.useFakeTimers(); reads.push(deferred().promise)
  const { result } = renderHook(() => useRoomPreferences('room-a', 'user-a'))
  await act(async () => { await jest.advanceTimersByTimeAsync(15001) })
  expect(result.current.loading).toBe(false)
  expect(result.current.error).toContain('carregar')
  reads.push({ data: [pref('room-a', 'user-a', { is_blocked: true })], error: null })
  await act(async () => { await result.current.refresh() })
  expect(result.current.error).toBeNull(); expect(result.current.blocked).toBe(true)
})

it('does not hide archive read errors or lose the last confirmed choices', async () => {
  reads.push({ data: [pref('room-a', 'user-a', { is_archived: true })], error: null })
  const { result } = renderHook(() => useArchiveChat('user-a')); await waitFor(() => expect(result.current.isLoading).toBe(false))
  reads.push({ data: null, error: new Error('Offline') })
  await act(async () => { await result.current.refresh() })
  expect(result.current.error).toContain('carregar')
  expect(result.current.isRoomArchived('room-a')).toBe(true)
})
