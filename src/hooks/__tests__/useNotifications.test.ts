import { act, renderHook, waitFor } from '@testing-library/react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '../useAuth'
import { useNotifications } from '../useNotifications'

jest.mock('../useAuth')
jest.mock('sonner', () => ({ toast: { error: jest.fn(), success: jest.fn() } }))

const client = createClient() as unknown as { from: jest.Mock; channel: jest.Mock; removeChannel: jest.Mock }
const profile = { id: 'office-user' }
type Binding = { table: string; event: string; callback: (payload: unknown) => void }
let rows: { id: string; type: string; read: boolean; archived: boolean }[]
let inApp: boolean
let bindings: Binding[]
let failUpdate: boolean

beforeEach(() => {
  jest.clearAllMocks()
  ;(useAuth as jest.Mock).mockReturnValue({ user: profile })
  rows = [{ id: 'notice', type: 'task_assigned', read: false, archived: false }]
  inApp = true; bindings = []; failUpdate = false
  client.from.mockImplementation(table => {
    const result = () => table === 'notifications' ? { data: rows.filter(row => !row.archived), error: null } : { data: [{ notification_type: 'task_assigned', enable_in_app: inApp }], error: null }
    const query: Record<string, unknown> = {}
    for (const method of ['select', 'eq', 'order', 'limit', 'update']) query[method] = jest.fn(() => query)
    query.single = jest.fn(async () => failUpdate ? { data: null, error: new Error('Record unavailable') } : { data: { id: 'notice' }, error: null })
    query.then = (resolve: (value: unknown) => unknown) => Promise.resolve(result()).then(resolve)
    return query
  })
  const channels = new Map()
  client.channel.mockImplementation(name => {
    if (channels.has(name)) return channels.get(name)
    let subscribed = false
    const channel = {
      on: jest.fn((_kind, filter, callback) => { bindings.push({ ...filter, callback }); return channel }),
      subscribe: jest.fn(() => { if (subscribed) throw new Error('Channel already subscribed'); subscribed = true; return channel }),
    }
    channels.set(name, channel)
    return channel
  })
})

it('keeps the bell and toast subscribed independently and removes only their own channels', async () => {
  const bell = renderHook(() => useNotifications())
  const toast = renderHook(() => useNotifications())
  await waitFor(() => expect(bell.result.current.unreadCount).toBe(1))
  await waitFor(() => expect(toast.result.current.unreadCount).toBe(1))
  bell.unmount()
  expect(client.removeChannel).toHaveBeenCalledTimes(1)
  expect(client.removeChannel).toHaveBeenCalledWith(client.channel.mock.results[0].value)
  toast.unmount()
  expect(client.removeChannel).toHaveBeenCalledTimes(2)
})

it('removes remotely archived notices and honors preference changes without reloading the page', async () => {
  const hook = renderHook(() => useNotifications())
  await waitFor(() => expect(hook.result.current.unreadCount).toBe(1))
  rows[0].archived = true
  await act(async () => { bindings.find(binding => binding.table === 'notifications' && binding.event === 'UPDATE')!.callback({}) })
  await waitFor(() => expect(hook.result.current.notifications).toHaveLength(0))
  rows[0].archived = false; inApp = false
  await act(async () => { bindings.find(binding => binding.table === 'notification_preferences')!.callback({}) })
  expect(hook.result.current.notifications).toHaveLength(0)
  inApp = true
  await act(async () => { bindings.find(binding => binding.table === 'notification_preferences')!.callback({}) })
  await waitFor(() => expect(hook.result.current.unreadCount).toBe(1))
})

it('rejects a failed read update instead of falsely consuming the notice', async () => {
  const hook = renderHook(() => useNotifications())
  await waitFor(() => expect(hook.result.current.unreadCount).toBe(1))
  failUpdate = true
  await act(async () => { await expect(hook.result.current.markAsRead('notice')).rejects.toThrow('Record unavailable') })
  expect(hook.result.current.unreadCount).toBe(1)
})
