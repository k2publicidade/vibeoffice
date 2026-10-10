import { act, renderHook, waitFor } from '@testing-library/react'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '../useAuth'
import { useCalendar } from '../useCalendar'

jest.mock('../useAuth')
const row = {
  id: 'event-1', title: '📋 Tarefa', description: '', type: 'personal',
  start_time: '2035-10-20T15:25:00Z', end_time: '2035-10-20T16:25:00Z',
  created_by: 'user-1', created_at: '2035-10-01T12:00:00Z', attendees: [],
  linked_task_id: 'task-1', generated_by_task: true,
}
function fetchRows(rows: unknown[]) {
  const query = { select: jest.fn().mockReturnThis(), order: jest.fn().mockResolvedValue({ data: rows, error: null }) }
  ;(supabase.from as jest.Mock).mockReturnValueOnce(query)
}
beforeEach(() => {
  jest.clearAllMocks()
  ;(useAuth as jest.Mock).mockReturnValue({ user: { id: 'user-1' } })
})

it('moves the task deadline when its generated event is dragged', async () => {
  fetchRows([row])
  const { result } = renderHook(() => useCalendar())
  await waitFor(() => expect(result.current.events).toHaveLength(1))
  const startTime = new Date('2035-10-21T17:40:00Z')
  ;(supabase.rpc as jest.Mock).mockResolvedValueOnce({ error: null })
  fetchRows([{ ...row, start_time: startTime.toISOString() }])
  await act(async () => { await result.current.updateEvent('event-1', { startTime }) })
  expect(supabase.rpc).toHaveBeenCalledWith('save_office_task', { task_id: 'task-1', changes: { due_date: startTime.toISOString() } })
  expect(result.current.events[0].startTime).toEqual(startTime)
})

it('preserves the displayed event when moving its task fails', async () => {
  fetchRows([row])
  const { result } = renderHook(() => useCalendar())
  await waitFor(() => expect(result.current.events).toHaveLength(1))
  ;(supabase.rpc as jest.Mock).mockResolvedValueOnce({ error: { message: 'Acesso negado' } })
  await expect(result.current.updateEvent('event-1', { startTime: new Date('2035-10-21T12:00:00Z') })).rejects.toMatchObject({ message: 'Acesso negado' })
  expect(result.current.events[0].startTime).toEqual(new Date(row.start_time))
})

it('keeps generated events tied to the task when deletion is attempted', async () => {
  fetchRows([row])
  const { result } = renderHook(() => useCalendar())
  await waitFor(() => expect(result.current.events).toHaveLength(1))
  await expect(result.current.deleteEvent('event-1')).rejects.toThrow('Remova o prazo na tarefa vinculada.')
  expect(result.current.events).toHaveLength(1)
  expect(supabase.from).toHaveBeenCalledTimes(1)
})

it('keeps a manual event when deletion affects no authorized row', async () => {
  fetchRows([{ ...row, generated_by_task: false }])
  const { result } = renderHook(() => useCalendar())
  await waitFor(() => expect(result.current.events).toHaveLength(1))
  const failure = { message: 'Evento indisponível', code: 'PGRST116' }
  ;(supabase.from as jest.Mock).mockReturnValueOnce({
    delete: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis(), select: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({ data: null, error: failure }),
  })
  await expect(result.current.deleteEvent('event-1')).rejects.toMatchObject(failure)
  expect(result.current.events).toHaveLength(1)
})

it('persists a sector change on a manual event', async () => {
  fetchRows([{ ...row, generated_by_task: false, type: 'sector', sector: 'Marketing' }])
  const { result } = renderHook(() => useCalendar())
  await waitFor(() => expect(result.current.events).toHaveLength(1))
  const update = jest.fn().mockReturnThis()
  ;(supabase.from as jest.Mock).mockReturnValueOnce({
    update, eq: jest.fn().mockReturnThis(), select: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({ data: { ...row, generated_by_task: false, type: 'sector', sector: 'Financeiro' }, error: null }),
  })
  await act(async () => { await result.current.updateEvent('event-1', { sector: 'Financeiro' }) })
  expect(update).toHaveBeenCalledWith(expect.objectContaining({ sector: 'Financeiro' }))
  expect(result.current.events[0].sector).toBe('Financeiro')
})

it('does not duplicate an event already delivered by Realtime during creation', async () => {
  fetchRows([])
  const { result } = renderHook(() => useCalendar())
  await waitFor(() => expect(result.current.isLoading).toBe(false))
  let resolveInsert!: (result: unknown) => void
  ;(supabase.from as jest.Mock).mockReturnValueOnce({
    insert: jest.fn().mockReturnThis(), select: jest.fn().mockReturnThis(),
    single: jest.fn(() => new Promise(resolve => { resolveInsert = resolve })),
  })
  fetchRows([{ ...row, generated_by_task: false }])
  const channel = (supabase.channel as jest.Mock).mock.results.at(-1)!.value
  const notification = channel.on.mock.calls[0][2]
  let saving!: Promise<void>
  await act(async () => {
    saving = result.current.createEvent({ title: row.title, startTime: new Date(row.start_time), endTime: new Date(row.end_time), type: 'personal' })
    notification()
  })
  expect(result.current.events).toHaveLength(1)
  await act(async () => { resolveInsert({ data: { ...row, generated_by_task: false }, error: null }); await saving })
  expect(result.current.events).toHaveLength(1)
})
