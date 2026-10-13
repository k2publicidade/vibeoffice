import { act, render, renderHook } from '@testing-library/react'
import { createElement, StrictMode } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useReadReceipts } from '../useReadReceipts'

// Hook scheduling tests use an actor-checking RPC stub. The HTTP/token binding
// of the production helper is verified separately.
jest.mock('@/lib/chat-read-receipts', () => ({ markChatReadBatch: async (client: any, actor: string, ids: string[]) => {
  const session = await client.auth.getSession()
  if (session.data.session?.user.id !== actor) return 'session-changed'
  const result = await client.rpc('mark_messages_read', { message_ids: ids })
  if (result.error) throw result.error
  return { status: 'sent', messageIds: ids }
} }))

let actor: string, observers: any[], calls: { actor: string; ids: string[] }[]
beforeEach(() => {
  jest.useFakeTimers(); jest.clearAllMocks(); jest.spyOn(console, 'error').mockImplementation(() => {})
  actor = 'user-a'; observers = []; calls = []
  ;(supabase.auth.getSession as jest.Mock).mockImplementation(async () => ({ data: { session: { user: { id: actor }, access_token: 'test-token' } }, error: null }))
  ;(supabase.rpc as jest.Mock).mockImplementation(async (_name, args) => { calls.push({ actor, ids: args.message_ids }); return { data: null, error: null } })
  global.IntersectionObserver = jest.fn().mockImplementation(callback => { const observer = { callback, observe: jest.fn(), disconnect: jest.fn() }; observers.push(observer); return observer })
})
afterEach(() => { jest.useRealTimers(); jest.restoreAllMocks() })
const advance = async (time: number) => { await act(async () => { jest.advanceTimersByTime(time) }) }

it('does not submit old visible messages under a newly authenticated account during cleanup', async () => {
  const { result, rerender } = renderHook(({ user }) => useReadReceipts(user, 'room-a'), { initialProps: { user: 'user-a' } })
  result.current.markAsRead('message-a', 'peer')
  actor = 'user-b'; rerender({ user: 'user-b' })
  await advance(1000)
  expect(calls).toEqual([])
})

it('ignores an old callback after switching accounts', async () => {
  const { result, rerender } = renderHook(({ user }) => useReadReceipts(user, 'room-a'), { initialProps: { user: 'user-a' } })
  const mark = result.current.markAsRead
  actor = 'user-b'; rerender({ user: 'user-b' })
  mark('message-a', 'peer'); await advance(1000)
  expect(calls).toEqual([])
})

it('disconnects every registered observer on unmount', () => {
  const { result, unmount } = renderHook(() => useReadReceipts('user-a', 'room-a'))
  result.current.observeMessage(document.createElement('div'), 'message-a', 'peer')
  result.current.observeMessage(document.createElement('div'), 'message-b', 'peer')
  unmount()
  expect(observers).toHaveLength(2)
  expect(observers.every(observer => observer.disconnect.mock.calls.length > 0)).toBe(true)
})

it('requires at least half the message to be visible before queuing a receipt', async () => {
  const { result } = renderHook(() => useReadReceipts('user-a', 'room-a'))
  result.current.observeMessage(document.createElement('div'), 'message-a', 'peer')
  observers[0].callback([{ isIntersecting: true, intersectionRatio: 0.1 }])
  await advance(1000)
  expect(calls).toEqual([])
  observers[0].callback([{ isIntersecting: true, intersectionRatio: 0.5 }])
  await advance(1000)
  expect(calls[0]?.ids).toEqual(['message-a'])
})

it('flushes within one second even while more messages keep arriving', async () => {
  const { result } = renderHook(() => useReadReceipts('user-a', 'room-a'))
  result.current.markAsRead('message-a', 'peer'); await advance(500)
  result.current.markAsRead('message-b', 'peer'); await advance(500)
  expect(calls[0]?.ids).toEqual(['message-a', 'message-b'])
})

it('automatically retries a failed read batch without waiting for another visibility event', async () => {
  ;(supabase.rpc as jest.Mock).mockResolvedValueOnce({ error: new Error('Offline') })
  const { result } = renderHook(() => useReadReceipts('user-a', 'room-a'))
  result.current.markAsRead('message-a', 'peer'); await advance(1000); await advance(2000)
  expect(supabase.rpc).toHaveBeenCalledTimes(2)
  expect(calls[0]?.ids).toEqual(['message-a'])
})

it('does not send a second receipt for a message already confirmed', async () => {
  const { result } = renderHook(() => useReadReceipts('user-a', 'room-a'))
  result.current.markAsRead('message-a', 'peer'); await advance(1000)
  result.current.markAsRead('message-a', 'peer'); await advance(1000)
  expect(calls).toHaveLength(1)
})

it('ignores own messages and messages without a selected room or account', async () => {
  const { result, rerender } = renderHook(({ user, room }) => useReadReceipts(user, room), { initialProps: { user: 'user-a' as string | undefined, room: 'room-a' as string | undefined } })
  result.current.markAsRead('own', 'user-a'); await advance(1000)
  rerender({ user: 'user-a', room: undefined }); result.current.markAsRead('orphan', 'peer'); await advance(1000)
  rerender({ user: undefined, room: undefined }); result.current.markAsRead('anonymous', 'peer'); await advance(1000)
  expect(calls).toEqual([])
})

it('keeps message observation active through React StrictMode setup and cleanup', () => {
  function Message() {
    const { observeMessage } = useReadReceipts('user-a', 'room-a')
    return createElement('div', { ref: (element: HTMLDivElement | null) => element ? observeMessage(element, 'message-a', 'peer') : undefined })
  }
  render(createElement(StrictMode, null, createElement(Message)))
  expect(observers.filter(observer => observer.observe.mock.calls.length && !observer.disconnect.mock.calls.length)).toHaveLength(1)
})

it('does not mark background-tab messages and resumes visible observations when the tab returns', async () => {
  const visibility = jest.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden')
  const { result } = renderHook(() => useReadReceipts('user-a', 'room-a'))
  result.current.observeMessage(document.createElement('div'), 'message-a', 'peer')
  observers[0].callback([{ isIntersecting: true, intersectionRatio: 1 }]); await advance(1000)
  expect(calls).toEqual([])
  visibility.mockReturnValue('visible'); document.dispatchEvent(new Event('visibilitychange')); await advance(1000)
  expect(calls[0]?.ids).toEqual(['message-a'])
})

it('chunks a large visible history into bounded batches without duplicates', async () => {
  const { result } = renderHook(() => useReadReceipts('user-a', 'room-a'))
  for (let index = 0; index < 451; index++) result.current.markAsRead(`message-${index}`, 'peer')
  await advance(1000); await advance(0); await advance(0); await advance(1); await advance(1)
  expect(calls).toHaveLength(3)
  expect(calls.every(call => call.ids.length <= 200)).toBe(true)
  expect(new Set(calls.flatMap(call => call.ids)).size).toBe(451)
})

it('keeps messages observed during an in-flight request for the next batch', async () => {
  let finish!: (value: unknown) => void
  ;(supabase.rpc as jest.Mock).mockReturnValueOnce(new Promise(done => { finish = done }))
  const { result } = renderHook(() => useReadReceipts('user-a', 'room-a'))
  result.current.markAsRead('message-a', 'peer'); await advance(1000)
  result.current.markAsRead('message-b', 'peer'); result.current.markAsRead('message-a', 'peer')
  await act(async () => { finish({ error: null }) }); await advance(1)
  expect(supabase.rpc).toHaveBeenCalledTimes(2)
  expect(calls[0]?.ids).toEqual(['message-b'])
})

it('flushes a viewed old-room batch on navigation without mixing it with the new room', async () => {
  const { result, rerender } = renderHook(({ room }) => useReadReceipts('user-a', room), { initialProps: { room: 'room-a' } })
  result.current.markAsRead('old-room-message', 'peer')
  rerender({ room: 'room-b' }); await advance(0)
  result.current.markAsRead('new-room-message', 'peer'); await advance(1000)
  expect(calls.map(call => call.ids)).toEqual([['old-room-message'], ['new-room-message']])
})
