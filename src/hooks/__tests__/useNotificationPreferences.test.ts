import { act, renderHook, waitFor } from '@testing-library/react'
import { supabase } from '@/lib/supabase/client'
import { useNotificationPreferences } from '../useNotificationPreferences'
import type { NotificationPreference } from '@/types/notifications'
import { toast } from 'sonner'

jest.mock('sonner', () => ({ toast: { success: jest.fn(), error: jest.fn() } }))
const preference = (type: NotificationPreference['notification_type'] = 'task_assigned', email = false): NotificationPreference => ({ id: type, user_id: 'owner', notification_type: type, enable_in_app: true, enable_push: false, enable_email: email, created_at: '', updated_at: '' })
type Response = { data: Partial<NotificationPreference> | null; error: unknown }
function deferred() {
  let resolve!: (response: Response) => void
  const promise = new Promise<Response>(done => { resolve = done })
  return { promise, resolve }
}
function database(responses: Promise<Response>[]) {
  const writes = jest.fn()
  let index = 0
  ;(supabase.from as jest.Mock).mockImplementation(table => {
    expect(table).toBe('notification_preferences')
    let payload: unknown
    const filters: Record<string, string> = {}
    const response = responses[index++]
    const query = {
      update: jest.fn(value => { payload = value; return query }),
      eq: jest.fn((column, value) => { filters[column] = value; return query }),
      select: jest.fn(() => query),
      single: jest.fn(() => { writes(payload, filters); return response }),
      then: (done: (value: Response) => unknown) => { writes(payload, filters); return response.then(done) },
    }
    return query
  })
  return writes
}
beforeEach(() => { jest.clearAllMocks(); jest.spyOn(console, 'error').mockImplementation(() => {}) })
afterEach(() => jest.restoreAllMocks())

it('confirms the saved row and preserves other channels', async () => {
  const writes = database([Promise.resolve({ data: { ...preference(), enable_email: true }, error: null })])
  const { result } = renderHook(() => useNotificationPreferences('owner', [preference()]))
  await act(async () => { await result.current.updatePreference('task_assigned', 'email', true) })
  expect(writes).toHaveBeenCalledWith({ enable_email: true }, { user_id: 'owner', notification_type: 'task_assigned' })
  expect(result.current.preferences.task_assigned).toEqual({ inApp: true, push: false, email: true })
  expect(result.current.saving).toBe(false)
  expect(toast.success).toHaveBeenCalledTimes(1)
})

it('does not report success when no preference row is returned', async () => {
  database([Promise.resolve({ data: null, error: null })])
  const { result } = renderHook(() => useNotificationPreferences('owner', [preference()]))
  await act(async () => { await result.current.updatePreference('task_assigned', 'email', true) })
  expect(result.current.preferences.task_assigned.email).toBe(false)
  expect(toast.success).not.toHaveBeenCalled()
  expect(toast.error).toHaveBeenCalled()
})

it('restores the actual previous value after a failed unchanged request', async () => {
  database([Promise.resolve({ data: null, error: new Error('Sem permissão') })])
  const { result } = renderHook(() => useNotificationPreferences('owner', [preference()]))
  await act(async () => { await result.current.updatePreference('task_assigned', 'email', false) })
  expect(result.current.preferences.task_assigned.email).toBe(false)
  expect(result.current.saving).toBe(false)
})

it('loads updated server preferences for the same user', async () => {
  const { result, rerender } = renderHook(({ prefs }) => useNotificationPreferences('owner', prefs), { initialProps: { prefs: [preference()] } })
  rerender({ prefs: [preference('task_assigned', true)] })
  await waitFor(() => expect(result.current.preferences.task_assigned.email).toBe(true))
})

it('keeps saving visible until all independent writes finish', async () => {
  const first = deferred(), second = deferred()
  database([first.promise, second.promise])
  const initial = [preference(), preference('task_comment_added')]
  const { result } = renderHook(() => useNotificationPreferences('owner', initial))
  act(() => {
    void result.current.updatePreference('task_assigned', 'email', true)
    void result.current.updatePreference('task_comment_added', 'email', true)
  })
  expect(result.current.saving).toBe(true)
  await act(async () => { first.resolve({ data: { ...preference(), enable_email: true }, error: null }) })
  expect(result.current.saving).toBe(true)
  await act(async () => { second.resolve({ data: { ...preference('task_comment_added'), enable_email: true }, error: null }) })
  expect(result.current.saving).toBe(false)
})

it('serializes rapid changes of the same preference and keeps the latest intent', async () => {
  const first = deferred(), second = deferred()
  const writes = database([first.promise, second.promise])
  const initial = [preference()]
  const { result } = renderHook(() => useNotificationPreferences('owner', initial))
  act(() => {
    void result.current.updatePreference('task_assigned', 'email', true)
    void result.current.updatePreference('task_assigned', 'email', false)
  })
  await waitFor(() => expect(writes).toHaveBeenCalledTimes(1))
  expect(result.current.preferences.task_assigned.email).toBe(false)
  await act(async () => { first.resolve({ data: { ...preference(), enable_email: true }, error: null }) })
  await waitFor(() => expect(writes).toHaveBeenCalledTimes(2))
  expect(result.current.preferences.task_assigned.email).toBe(false)
  await act(async () => { second.resolve({ data: preference(), error: null }) })
  expect(result.current.preferences.task_assigned.email).toBe(false)
})

it('does not roll a newer intent back when an older write fails', async () => {
  const first = deferred(), second = deferred()
  database([first.promise, second.promise])
  const initial = [preference()]
  const { result } = renderHook(() => useNotificationPreferences('owner', initial))
  act(() => {
    void result.current.updatePreference('task_assigned', 'email', true)
    void result.current.updatePreference('task_assigned', 'email', true)
  })
  await act(async () => { first.resolve({ data: null, error: new Error('Falha antiga') }) })
  expect(result.current.preferences.task_assigned.email).toBe(true)
  await act(async () => { second.resolve({ data: { ...preference(), enable_email: true }, error: null }) })
  expect(result.current.preferences.task_assigned.email).toBe(true)
})

it('does not copy an old user response into another user settings', async () => {
  const saving = deferred()
  database([saving.promise])
  const { result, rerender } = renderHook(({ userId, prefs }) => useNotificationPreferences(userId, prefs), { initialProps: { userId: 'owner', prefs: [preference()] } })
  act(() => { void result.current.updatePreference('task_assigned', 'email', true) })
  rerender({ userId: 'other', prefs: [{ ...preference(), user_id: 'other' }] })
  await act(async () => { saving.resolve({ data: { ...preference(), enable_email: true }, error: null }) })
  expect(result.current.preferences.task_assigned.email).toBe(false)
  expect(toast.success).not.toHaveBeenCalled()
})

it('uses the confirmed value when the server normalizes a setting', async () => {
  database([Promise.resolve({ data: preference(), error: null })])
  const { result } = renderHook(() => useNotificationPreferences('owner', [preference()]))
  await act(async () => { await result.current.updatePreference('task_assigned', 'email', true) })
  expect(result.current.preferences.task_assigned.email).toBe(false)
})

it('rolls back two failed rapid changes to the last persisted value', async () => {
  const first = deferred(), second = deferred()
  database([first.promise, second.promise])
  const initial = [preference()]
  const { result } = renderHook(() => useNotificationPreferences('owner', initial))
  act(() => {
    void result.current.updatePreference('task_assigned', 'email', true)
    void result.current.updatePreference('task_assigned', 'email', true)
  })
  await act(async () => { first.resolve({ data: null, error: new Error('Falha antiga') }) })
  await act(async () => { second.resolve({ data: null, error: new Error('Falha recente') }) })
  expect(result.current.preferences.task_assigned.email).toBe(false)
  expect(result.current.saving).toBe(false)
  expect(toast.success).not.toHaveBeenCalled()
})

it('does not replace a pending optimistic change with a stale server refresh', async () => {
  const pending = deferred()
  database([pending.promise])
  const { result, rerender } = renderHook(({ prefs }) => useNotificationPreferences('owner', prefs), { initialProps: { prefs: [preference()] } })
  act(() => { void result.current.updatePreference('task_assigned', 'email', true) })
  rerender({ prefs: [{ ...preference(), enable_push: true }] })
  expect(result.current.preferences.task_assigned.email).toBe(true)
  await act(async () => { pending.resolve({ data: { ...preference(), enable_email: true, enable_push: true }, error: null }) })
  expect(result.current.preferences.task_assigned.email).toBe(true)
  expect(result.current.preferences.task_assigned.push).toBe(true)
})

it('keeps other channels unchanged when one fails and another succeeds', async () => {
  database([Promise.resolve({ data: null, error: new Error('Falha no email') }), Promise.resolve({ data: { ...preference(), enable_push: true }, error: null })])
  const initial = [preference()]
  const { result } = renderHook(() => useNotificationPreferences('owner', initial))
  await act(async () => {
    await Promise.all([result.current.updatePreference('task_assigned', 'email', true), result.current.updatePreference('task_assigned', 'push', true)])
  })
  expect(result.current.preferences.task_assigned).toEqual({ inApp: true, push: true, email: false })
})

it('rejects an unavailable preference before attempting a write', async () => {
  database([])
  const { result } = renderHook(() => useNotificationPreferences('owner', []))
  await act(async () => { await result.current.updatePreference('task_assigned', 'email', true) })
  expect(supabase.from).not.toHaveBeenCalled()
  expect(result.current.saving).toBe(false)
  expect(toast.error).toHaveBeenCalled()
})

it('does not show a late success after the settings are unmounted', async () => {
  const pending = deferred(), writes = database([pending.promise])
  const initial = [preference()]
  const {result,unmount} = renderHook(() => useNotificationPreferences('owner',initial))
  act(() => { void result.current.updatePreference('task_assigned','email',true) })
  await waitFor(() => expect(writes).toHaveBeenCalledTimes(1))
  unmount()
  await act(async () => {pending.resolve({data:{...preference(),enable_email:true},error:null})})
  expect(toast.success).not.toHaveBeenCalled()
})
