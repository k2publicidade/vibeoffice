import { act, renderHook, waitFor } from '@testing-library/react'
import { supabase } from '@/lib/supabase/client'
import { useStudio } from '../useStudio'
import { toast } from 'sonner'
import type { StudioBooking } from '@/types/studio'

jest.mock('sonner', () => ({ toast: { success: jest.fn(), error: jest.fn() } }))

const input: Omit<StudioBooking, 'id' | 'created_by' | 'created_at' | 'updated_at'> = {
  track_title: 'Faixa auditada', studio_name: 'Studio A',
  booking_date: '2035-10-20', start_time: '13:00', end_time: '14:00',
  session_types: ['Gravacao'], producers: [], artists: [], composers: [],
  status: 'scheduled',
}
const row: StudioBooking = { ...input, id: 'booking-1', created_by: 'user-1' }

function fetchRows(rows: StudioBooking[], error: unknown = null) {
  const query = { select: jest.fn().mockReturnThis(), order: jest.fn() }
  query.order.mockReturnValueOnce(query).mockResolvedValueOnce({ data: rows, error })
  ;(supabase.from as jest.Mock).mockReturnValueOnce(query)
}
function mutation(data: unknown, error: unknown = null) {
  const query = {
    error: null, // A delete without returning a row reports no error even when RLS filters it.
    insert: jest.fn().mockReturnThis(), update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis(), select: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({ data, error }),
  }
  ;(supabase.from as jest.Mock).mockReturnValueOnce(query)
  return query
}
async function loaded(rows: StudioBooking[] = [row]) {
  fetchRows(rows)
  const hook = renderHook(() => useStudio())
  await waitFor(() => expect(hook.result.current.loading).toBe(false))
  return hook
}
beforeEach(() => {
  jest.clearAllMocks()
  ;(supabase.auth.getUser as jest.Mock).mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null })
})

it('preserves the session when deletion affects no authorized row', async () => {
  const { result } = await loaded()
  const error = { code: 'PGRST116', message: 'Sessão indisponível' }
  mutation(null, error)
  await expect(result.current.deleteBooking(row.id)).rejects.toMatchObject(error)
  expect(result.current.bookings).toEqual([row])
  expect(toast.success).not.toHaveBeenCalled()
})

it('removes a session after the database confirms deletion', async () => {
  const { result } = await loaded()
  mutation({ id: row.id })
  await act(async () => { expect(await result.current.deleteBooking(row.id)).toBe(true) })
  expect(result.current.bookings).toEqual([])
  expect(toast.success).toHaveBeenCalledWith('Sessão removida!')
})

it('keeps the schedule unchanged and explains an overlapping reservation', async () => {
  const { result } = await loaded()
  const conflict = { code: '23P01', message: 'overlap' }
  mutation(null, conflict)
  await expect(result.current.createBooking(input)).rejects.toMatchObject(conflict)
  expect(result.current.bookings).toEqual([row])
  expect(toast.error).toHaveBeenCalledWith('Este estúdio já está reservado nesse horário.')
})

it('keeps the original session when editing fails', async () => {
  const { result } = await loaded()
  const error = { code: '23514', message: 'invalid session time' }
  mutation(null, error)
  await expect(result.current.updateBooking(row.id, { end_time: '12:00' })).rejects.toMatchObject(error)
  expect(result.current.bookings).toEqual([row])
  expect(toast.success).not.toHaveBeenCalled()
})

it('requires an authenticated user before creating a reservation', async () => {
  const { result } = await loaded([])
  ;(supabase.auth.getUser as jest.Mock).mockResolvedValueOnce({ data: { user: null }, error: null })
  await expect(result.current.createBooking(input)).rejects.toThrow('User not authenticated')
  expect(supabase.from).toHaveBeenCalledTimes(1)
  expect(result.current.bookings).toEqual([])
})

it('does not duplicate a reservation delivered by Realtime during creation', async () => {
  const { result } = await loaded([])
  const query = mutation(row)
  let resolveInsert!: (value: unknown) => void
  query.single.mockImplementationOnce(() => new Promise(resolve => { resolveInsert = resolve }))
  const channel = (supabase.channel as jest.Mock).mock.results.at(-1)!.value
  const notify = channel.on.mock.calls[0][2]
  let saving!: ReturnType<typeof result.current.createBooking>
  await act(async () => { saving = result.current.createBooking(input); notify({ eventType: 'INSERT', new: row }) })
  expect(result.current.bookings).toHaveLength(1)
  await act(async () => { resolveInsert({ data: row, error: null }); await saving })
  expect(result.current.bookings).toEqual([row])
})

it('applies remote edits and removals and releases its subscription', async () => {
  const { result, unmount } = await loaded()
  const channel = (supabase.channel as jest.Mock).mock.results.at(-1)!.value
  const notify = channel.on.mock.calls[0][2]
  act(() => notify({ eventType: 'UPDATE', new: { ...row, status: 'completed' } }))
  expect(result.current.bookings[0].status).toBe('completed')
  act(() => notify({ eventType: 'DELETE', old: { id: row.id } }))
  expect(result.current.bookings).toEqual([])
  unmount()
  expect(supabase.removeChannel).toHaveBeenCalledWith(channel)
})

it('reports a failed initial load and permits a later refresh', async () => {
  fetchRows([], { message: 'connection lost' })
  const { result } = renderHook(() => useStudio())
  await waitFor(() => expect(result.current.loading).toBe(false))
  expect(toast.error).toHaveBeenCalledWith('Erro ao carregar agendamentos')
  fetchRows([row])
  await act(async () => { await result.current.refresh() })
  expect(result.current.bookings).toEqual([row])
})
