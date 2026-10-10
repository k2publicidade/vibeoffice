import { renderHook, waitFor, act } from '@testing-library/react'
import { canCurrentUserSeeTask, getAllowedTaskAssigneesForWrite, useTasks } from '../useTasks'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '../useAuth'

jest.mock('../useAuth')
jest.mock('@/lib/notifications/eventBus', () => ({
  EventBus: { emit: jest.fn(() => Promise.resolve()) },
}))

describe('useTasks', () => {
  const userId = '11111111-1111-4111-8111-111111111111'
  const user2Id = '22222222-2222-4222-8222-222222222222'

  function mockTaskFetch(data: unknown[], error: unknown = null) {
    const query = {
      select: jest.fn(() => query),
      order: jest.fn().mockResolvedValue({ data, error }),
    }
    ;(supabase.from as jest.Mock).mockReturnValueOnce(query)
  }

  const mockUser = {
    id: userId,
    email: 'test@vibedistro.com',
    name: 'Test User',
    avatar: null,
    sector: 'TI/Suporte' as const,
    role: 'Admin' as const,
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  const mockTaskData = {
    id: 'task-1',
    title: 'Test Task',
    description: 'Test Description',
    status: 'todo',
    priority: 'medium',
    sector: 'TI/Suporte',
    task_assignees: [{ user_id: userId }],
    created_by: userId,
    tags: [],
    due_date: null,
    linked_ticket_id: 'ticket-1',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }

  beforeEach(() => {
    jest.clearAllMocks()
    ;(useAuth as jest.Mock).mockReturnValue({ user: mockUser })
  })

  it('should only show unassigned tasks to Admin', () => {
    const unassignedTask = { assignees: [] }
    const assignedTask = { assignees: [userId] }

    expect(canCurrentUserSeeTask({ id: 'admin-1', role: 'Admin' }, unassignedTask)).toBe(true)
    expect(canCurrentUserSeeTask({ id: userId, role: 'Colaborador' }, unassignedTask)).toBe(false)
    expect(canCurrentUserSeeTask({ id: userId, role: 'Colaborador' }, assignedTask)).toBe(true)
    expect(canCurrentUserSeeTask({ id: user2Id, role: 'Colaborador' }, assignedTask)).toBe(false)
  })

  it('should force collaborator task writes to themselves', () => {
    expect(getAllowedTaskAssigneesForWrite(
      { id: userId, role: 'Colaborador' },
      [user2Id]
    )).toEqual([userId])

    expect(getAllowedTaskAssigneesForWrite(
      { id: 'admin-1', role: 'Admin' },
      [userId, user2Id]
    )).toEqual([userId, user2Id])
  })

  it('should fetch tasks from Supabase when user is authenticated', async () => {
    mockTaskFetch([mockTaskData])

    const { result } = renderHook(() => useTasks())

    await waitFor(() => {
      expect(result.current.tasks).toHaveLength(1)
      expect(result.current.tasks[0].title).toBe('Test Task')
      expect(result.current.tasks[0].assignees).toEqual([userId])
      expect(result.current.isLoading).toBe(false)
    })
  })

  it('should not fetch tasks when user is not authenticated', () => {
    ;(useAuth as jest.Mock).mockReturnValue({ user: null })

    const { result } = renderHook(() => useTasks())

    expect(result.current.tasks).toHaveLength(0)
    expect(result.current.isLoading).toBe(true)
  })

  it('should create a new task successfully', async () => {
    const newTaskInput = {
      title: 'New Task',
      description: 'New Description',
      status: 'todo' as const,
      priority: 'high' as const,
      sector: 'TI/Suporte' as const,
      assignees: [userId],
    }

    mockTaskFetch([])
    const { result } = renderHook(() => useTasks())

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    const insertedTask = {
      ...mockTaskData,
      id: 'task-new',
      title: 'New Task',
      description: 'New Description',
      priority: 'high',
      created_by: userId,
      linked_ticket_id: null,
    }

    ;(supabase.rpc as jest.Mock).mockResolvedValueOnce({ data: { ...insertedTask, linked_ticket_id: 'ticket-new' }, error: null })

    await act(async () => {
      await result.current.createTask(newTaskInput)
    })

    expect(result.current.tasks).toHaveLength(1)
    expect(result.current.tasks[0]).toMatchObject({
      id: 'task-new',
      title: 'New Task',
      assignees: [userId],
      linkedTicketId: 'ticket-new',
    })
  })

  it('should update task successfully', async () => {
    mockTaskFetch([mockTaskData])
    const { result } = renderHook(() => useTasks())

    await waitFor(() => expect(result.current.tasks).toHaveLength(1))

    const updatedRow = { ...mockTaskData, title: 'Updated Task' }
    ;(supabase.rpc as jest.Mock).mockResolvedValueOnce({ data: updatedRow, error: null })

    await act(async () => {
      await result.current.updateTask('task-1', { title: 'Updated Task' })
    })

    expect(result.current.tasks[0].title).toBe('Updated Task')
  })

  it('reports an assignment failure without adding a partial task to the list', async () => {
    mockTaskFetch([])
    const { result } = renderHook(() => useTasks())
    await waitFor(() => expect(result.current.isLoading).toBe(false))
    const failure = { message: 'Responsável inexistente', code: '23503' }
    ;(supabase.rpc as jest.Mock).mockResolvedValueOnce({ data: null, error: failure })
    await expect(result.current.createTask({ title: 'Teste', description: '', status: 'todo', priority: 'medium', sector: 'TI/Suporte', assignees: [user2Id] })).rejects.toMatchObject(failure)
    expect(result.current.tasks).toHaveLength(0)
  })

  it('keeps the existing task when its transactional update fails', async () => {
    mockTaskFetch([mockTaskData])
    const { result } = renderHook(() => useTasks())
    await waitFor(() => expect(result.current.tasks).toHaveLength(1))
    ;(supabase.rpc as jest.Mock).mockResolvedValueOnce({ data: null, error: { message: 'Falha na atribuição' } })
    await expect(result.current.updateTask('task-1', { title: 'Alterado', assignees: [user2Id] })).rejects.toMatchObject({ message: 'Falha na atribuição' })
    expect(result.current.tasks[0]).toMatchObject({ title: 'Test Task', assignees: [userId] })
  })

  it('clears a deadline when the editor explicitly removes it', async () => {
    mockTaskFetch([{ ...mockTaskData, due_date: '2026-10-20T15:00:00Z' }])
    const { result } = renderHook(() => useTasks())
    await waitFor(() => expect(result.current.tasks).toHaveLength(1))
    ;(supabase.rpc as jest.Mock).mockResolvedValueOnce({ data: mockTaskData, error: null })
    await act(async () => { await result.current.updateTask('task-1', { dueDate: undefined }) })
    expect(supabase.rpc).toHaveBeenCalledWith('save_office_task', expect.objectContaining({ changes: expect.objectContaining({ due_date: null }) }))
    expect(result.current.tasks[0].dueDate).toBeUndefined()
  })

  it('should delete task successfully', async () => {
    mockTaskFetch([mockTaskData])
    const { result } = renderHook(() => useTasks())

    await waitFor(() => expect(result.current.tasks).toHaveLength(1))

    ;(supabase.from as jest.Mock)
      .mockReturnValueOnce({
        delete: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
      })
      .mockReturnValueOnce({
        delete: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ error: null }),
      })

    await act(async () => {
      await result.current.deleteTask('task-1')
    })

    expect(result.current.tasks).toHaveLength(0)
  })

  it('should filter tasks by status', async () => {
    mockTaskFetch([
      { ...mockTaskData, id: 'task-1', status: 'todo' },
      { ...mockTaskData, id: 'task-2', status: 'in_progress' },
      { ...mockTaskData, id: 'task-3', status: 'done' },
    ])

    const { result } = renderHook(() => useTasks())

    await waitFor(() => expect(result.current.tasks).toHaveLength(3))

    expect(result.current.tasks.filter(t => t.status === 'todo')).toHaveLength(1)
    expect(result.current.tasks.filter(t => t.status === 'done')).toHaveLength(1)
  })

  it('should filter tasks by assigned user', async () => {
    mockTaskFetch([
      { ...mockTaskData, id: 'task-1', task_assignees: [{ user_id: userId }] },
      { ...mockTaskData, id: 'task-2', task_assignees: [{ user_id: user2Id }] },
      { ...mockTaskData, id: 'task-3', task_assignees: [{ user_id: userId }, { user_id: user2Id }] },
    ])

    const { result } = renderHook(() => useTasks())

    await waitFor(() => expect(result.current.tasks).toHaveLength(3))

    const myTasks = result.current.tasks.filter(t => t.assignees.includes(userId))
    expect(myTasks).toHaveLength(2)
  })

  it('should filter tasks by sector', async () => {
    mockTaskFetch([
      { ...mockTaskData, id: 'task-1', sector: 'TI/Suporte' },
      { ...mockTaskData, id: 'task-2', sector: 'Marketing' },
      { ...mockTaskData, id: 'task-3', sector: 'TI/Suporte' },
    ])

    const { result } = renderHook(() => useTasks())

    await waitFor(() => expect(result.current.tasks).toHaveLength(3))

    const tiTasks = result.current.tasks.filter(t => t.sector === 'TI/Suporte')
    expect(tiTasks).toHaveLength(2)
  })

  it('should handle fetch error gracefully', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation()
    mockTaskFetch([], { message: 'Database error' })

    const { result } = renderHook(() => useTasks())

    await waitFor(() => {
      expect(result.current.tasks).toHaveLength(0)
      expect(result.current.isLoading).toBe(false)
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error fetching tasks:',
        expect.objectContaining({ message: 'Database error' })
      )
    })

    consoleErrorSpy.mockRestore()
  })

  it('should handle create error by throwing', async () => {
    mockTaskFetch([])
    const { result } = renderHook(() => useTasks())

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    ;(supabase.rpc as jest.Mock).mockResolvedValueOnce({ data: null, error: { message: 'Insert failed' } })

    await expect(
      result.current.createTask({
        title: 'Test',
        description: 'Test',
        status: 'todo',
        priority: 'medium',
        sector: 'TI/Suporte',
        assignees: [],
      })
    ).rejects.toEqual(expect.objectContaining({ message: 'Insert failed' }))
  })
})
