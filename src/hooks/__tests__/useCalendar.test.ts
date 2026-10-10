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
