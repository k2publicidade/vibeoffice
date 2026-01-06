import { renderHook, waitFor, act } from '@testing-library/react'
import { useTasks } from '../useTasks'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '../useAuth'

// Mock useAuth
jest.mock('../useAuth')

describe('useTasks', () => {
  const mockUser = {
    id: 'user-1',
    email: 'test@vibedistro.com',
    name: 'Test User',
    avatar: null,
    sector: 'TI/Suporte' as const,
    role: 'colaborador' as const,
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
    assigned_to: 'user-1',
    created_by: 'user-1',
    due_date: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }

  beforeEach(() => {
    jest.clearAllMocks()
    ;(useAuth as jest.Mock).mockReturnValue({ user: mockUser })
  })

  it('should fetch tasks from Supabase when user is authenticated', async () => {
    const mockTasks = [mockTaskData]

    ;(supabase.from as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnThis(),
      order: jest.fn().mockResolvedValue({
        data: mockTasks,
        error: null,
      }),
    })

    const { result } = renderHook(() => useTasks())

    await waitFor(() => {
      expect(result.current.tasks).toHaveLength(1)
      expect(result.current.tasks[0].title).toBe('Test Task')
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
      assignedTo: 'user-1',
      dueDate: new Date(),
    }

    // Mock: fetch inicial vazio
    ;(supabase.from as jest.Mock).mockReturnValueOnce({
      select: jest.fn().mockReturnThis(),
      order: jest.fn().mockResolvedValue({ data: [], error: null }),
    })

    const { result } = renderHook(() => useTasks())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    // Mock: insert da nova task
    ;(supabase.from as jest.Mock).mockReturnValueOnce({
      insert: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: { ...mockTaskData, ...newTaskInput },
        error: null,
      }),
    })

    await act(async () => {
      await result.current.createTask(newTaskInput)
    })

    expect(result.current.tasks).toHaveLength(1)
    expect(result.current.tasks[0].title).toBe('New Task')
  })

  it('should update task successfully', async () => {
    // Mock: fetch inicial
    ;(supabase.from as jest.Mock).mockReturnValueOnce({
      select: jest.fn().mockReturnThis(),
      order: jest.fn().mockResolvedValue({
        data: [mockTaskData],
        error: null,
      }),
    })

    const { result } = renderHook(() => useTasks())

    await waitFor(() => {
      expect(result.current.tasks).toHaveLength(1)
    })

    // Mock: update
    ;(supabase.from as jest.Mock).mockReturnValueOnce({
      update: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: { ...mockTaskData, title: 'Updated Task' },
        error: null,
      }),
    })

    await act(async () => {
      await result.current.updateTask('task-1', { title: 'Updated Task' })
    })

    expect(result.current.tasks[0].title).toBe('Updated Task')
  })

  it('should delete task successfully', async () => {
    // Mock: fetch inicial
    ;(supabase.from as jest.Mock).mockReturnValueOnce({
      select: jest.fn().mockReturnThis(),
      order: jest.fn().mockResolvedValue({
        data: [mockTaskData],
        error: null,
      }),
    })

    const { result } = renderHook(() => useTasks())

    await waitFor(() => {
      expect(result.current.tasks).toHaveLength(1)
    })

    // Mock: delete
    ;(supabase.from as jest.Mock).mockReturnValueOnce({
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockResolvedValue({
        error: null,
      }),
    })

    await act(async () => {
      await result.current.deleteTask('task-1')
    })

    expect(result.current.tasks).toHaveLength(0)
  })

  it('should filter tasks by status', async () => {
    const mockMultipleTasks = [
      { ...mockTaskData, id: 'task-1', status: 'todo' },
      { ...mockTaskData, id: 'task-2', status: 'in_progress' },
      { ...mockTaskData, id: 'task-3', status: 'done' },
    ]

    ;(supabase.from as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnThis(),
      order: jest.fn().mockResolvedValue({
        data: mockMultipleTasks,
        error: null,
      }),
    })

    const { result } = renderHook(() => useTasks())

    await waitFor(() => {
      expect(result.current.tasks).toHaveLength(3)
    })

    const todoTasks = result.current.tasks.filter(t => t.status === 'todo')
    expect(todoTasks).toHaveLength(1)

    const doneTasks = result.current.tasks.filter(t => t.status === 'done')
    expect(doneTasks).toHaveLength(1)
  })

  it('should filter tasks by assigned user', async () => {
    const mockMultipleTasks = [
      { ...mockTaskData, id: 'task-1', assigned_to: 'user-1' },
      { ...mockTaskData, id: 'task-2', assigned_to: 'user-2' },
      { ...mockTaskData, id: 'task-3', assigned_to: 'user-1' },
    ]

    ;(supabase.from as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnThis(),
      order: jest.fn().mockResolvedValue({
        data: mockMultipleTasks,
        error: null,
      }),
    })

    const { result } = renderHook(() => useTasks())

    await waitFor(() => {
      expect(result.current.tasks).toHaveLength(3)
    })

    const myTasks = result.current.tasks.filter(t => t.assignedTo === 'user-1')
    expect(myTasks).toHaveLength(2)
  })

  it('should filter tasks by sector', async () => {
    const mockMultipleTasks = [
      { ...mockTaskData, id: 'task-1', sector: 'TI/Suporte' },
      { ...mockTaskData, id: 'task-2', sector: 'Marketing' },
      { ...mockTaskData, id: 'task-3', sector: 'TI/Suporte' },
    ]

    ;(supabase.from as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnThis(),
      order: jest.fn().mockResolvedValue({
        data: mockMultipleTasks,
        error: null,
      }),
    })

    const { result } = renderHook(() => useTasks())

    await waitFor(() => {
      expect(result.current.tasks).toHaveLength(3)
    })

    const tiTasks = result.current.tasks.filter(t => t.sector === 'TI/Suporte')
    expect(tiTasks).toHaveLength(2)
  })

  it('should handle fetch error gracefully', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation()

    ;(supabase.from as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnThis(),
      order: jest.fn().mockResolvedValue({
        data: null,
        error: { message: 'Database error' },
      }),
    })

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
    ;(supabase.from as jest.Mock).mockReturnValueOnce({
      select: jest.fn().mockReturnThis(),
      order: jest.fn().mockResolvedValue({ data: [], error: null }),
    })

    const { result } = renderHook(() => useTasks())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    ;(supabase.from as jest.Mock).mockReturnValueOnce({
      insert: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: null,
        error: { message: 'Insert failed' },
      }),
    })

    await expect(
      result.current.createTask({
        title: 'Test',
        description: 'Test',
        status: 'todo',
        priority: 'medium',
        sector: 'TI/Suporte',
      })
    ).rejects.toThrow()
  })
})
