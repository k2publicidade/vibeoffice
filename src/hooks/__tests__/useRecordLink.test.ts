import { act, renderHook } from '@testing-library/react'
import { useRecordLink } from '../useRecordLink'
import { toast } from 'sonner'

let mockQuery = ''
const mockReplace = jest.fn()
jest.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(mockQuery),
  usePathname: () => '/tasks',
  useRouter: () => ({ replace: mockReplace }),
}))
jest.mock('sonner', () => ({ toast: { error: jest.fn() } }))
const first = { id: '11111111-1111-4111-8111-111111111111', title: 'Primeira' }
const second = { id: '22222222-2222-4222-8222-222222222222', title: 'Segunda' }

describe('record links', () => {
  beforeEach(() => { jest.clearAllMocks(); mockQuery = `open=${first.id}` })

  it('waits for authorized records to finish loading before selecting', () => {
    const select = jest.fn()
    const { rerender } = renderHook(({ records, ready }) => useRecordLink('open', records, ready, select), {
      initialProps: { records: [] as typeof first[], ready: false },
    })
    expect(select).not.toHaveBeenCalled()
    expect(toast.error).not.toHaveBeenCalled()
    rerender({ records: [first, second], ready: true })
    expect(select).toHaveBeenCalledWith(first)
  })

  it('does not overwrite an open editor during Realtime refresh; can reopen after closing', () => {
    const select = jest.fn()
    const { result, rerender } = renderHook(() => useRecordLink('open', [first, second], true, select))
    rerender()
    expect(select).toHaveBeenCalledTimes(1)
    act(() => result.current.clearLink())
    expect(mockReplace).toHaveBeenCalledWith('/tasks', { scroll: false })
    mockQuery = ''; rerender()
    mockQuery = `open=${first.id}`; rerender()
    expect(select).toHaveBeenCalledTimes(2)
  })

  it('opens another notification while the same page remains mounted', () => {
    const select = jest.fn()
    const { rerender } = renderHook(() => useRecordLink('open', [first, second], true, select))
    mockQuery = `open=${second.id}`; rerender()
    expect(select).toHaveBeenLastCalledWith(second)
  })

  it('does not fetch or open unavailable records and preserves unrelated URL filters', () => {
    const select = jest.fn()
    mockQuery = `open=${second.id}&view=list`
    renderHook(() => useRecordLink('open', [first], true, select))
    expect(select).not.toHaveBeenCalled()
    expect(toast.error).toHaveBeenCalledWith('Registro não encontrado ou sem acesso')
    expect(mockReplace).toHaveBeenCalledWith('/tasks?view=list', { scroll: false })
  })
})
