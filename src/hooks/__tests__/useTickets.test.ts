import { renderHook, waitFor, act } from '@testing-library/react'
import { canCurrentUserSeeTicket, useTickets } from '../useTickets'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '../useAuth'

jest.mock('../useAuth')

describe('useTickets', () => {
  it('should only show tickets to collaborators when the linked kanban task is assigned to them', () => {
    const assignedTicket = { linkedTaskAssigneeIds: ['user-1'] }
    const unassignedTicket = { linkedTaskAssigneeIds: [] }
    const otherUserTicket = { linkedTaskAssigneeIds: ['user-2'] }

    expect(canCurrentUserSeeTicket(assignedTicket, { id: 'user-1', role: 'Colaborador' })).toBe(true)
    expect(canCurrentUserSeeTicket(unassignedTicket, { id: 'user-1', role: 'Colaborador' })).toBe(false)
    expect(canCurrentUserSeeTicket(otherUserTicket, { id: 'user-1', role: 'Colaborador' })).toBe(false)
    expect(canCurrentUserSeeTicket(unassignedTicket, { id: 'admin-1', role: 'Admin' })).toBe(true)
  })

  const mockUser = {
    id: 'user-1',
    email: 'test@vibedistro.com',
    name: 'Test User',
    avatar: null,
    sector: 'TI/Suporte' as const,
    role: 'Admin' as const,
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  const mockTicketData = {
    id: 'ticket-1',
    title: 'Test Ticket',
    description: 'Test Description',
    status: 'open',
    priority: 'medium',
    category: 'TI/Suporte',
    requester: 'user-1',
    assigned_to: null,
    created_by: 'user-1',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }

  beforeEach(() => {
    jest.clearAllMocks()
    ;(useAuth as jest.Mock).mockReturnValue({ user: mockUser })
  })

  it('should fetch tickets from Supabase when user is authenticated', async () => {
    const mockTickets = [mockTicketData]

    ;(supabase.from as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnThis(),
      order: jest.fn().mockResolvedValue({
        data: mockTickets,
        error: null,
      }),
    })

    const { result } = renderHook(() => useTickets())

    await waitFor(() => {
      expect(result.current.tickets).toHaveLength(1)
      expect(result.current.tickets[0].title).toBe('Test Ticket')
      expect(result.current.isLoading).toBe(false)
    })
  })

  it('should not fetch tickets when user is not authenticated', () => {
    ;(useAuth as jest.Mock).mockReturnValue({ user: null })

    const { result } = renderHook(() => useTickets())

    expect(result.current.tickets).toHaveLength(0)
    expect(result.current.isLoading).toBe(true)
  })

  it('should create a new ticket successfully', async () => {
    const newTicketInput = {
      title: 'New Ticket',
      description: 'New Description',
      category: 'TI/Suporte' as const,
      priority: 'high' as const,
    }

    ;(supabase.from as jest.Mock).mockReturnValueOnce({
      select: jest.fn().mockReturnThis(),
      order: jest.fn().mockResolvedValue({ data: [], error: null }),
    })

    const { result } = renderHook(() => useTickets())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    ;(supabase.from as jest.Mock).mockReturnValueOnce({
      insert: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: { ...mockTicketData, ...newTicketInput },
        error: null,
      }),
    })

    await act(async () => {
      await result.current.createTicket(newTicketInput)
    })

    expect(result.current.tickets).toHaveLength(1)
    expect(result.current.tickets[0].title).toBe('New Ticket')
  })

  it('should update ticket status successfully', async () => {
    ;(supabase.from as jest.Mock).mockReturnValueOnce({
      select: jest.fn().mockReturnThis(),
      order: jest.fn().mockResolvedValue({
        data: [mockTicketData],
        error: null,
      }),
    })

    const { result } = renderHook(() => useTickets())

    await waitFor(() => {
      expect(result.current.tickets).toHaveLength(1)
    })

    ;(supabase.from as jest.Mock).mockReturnValueOnce({
      update: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: { ...mockTicketData, status: 'in_progress' },
        error: null,
      }),
    })

    await act(async () => {
      await result.current.updateTicket('ticket-1', { status: 'in_progress' })
    })

    expect(result.current.tickets[0].status).toBe('in_progress')
  })

  it('should add comment to ticket successfully', async () => {
    const mockComment = {
      id: 'comment-1',
      ticket_id: 'ticket-1',
      user_id: 'user-1',
      content: 'Test comment',
      created_at: new Date().toISOString(),
    }

    ;(supabase.from as jest.Mock).mockReturnValueOnce({
      select: jest.fn().mockReturnThis(),
      order: jest.fn().mockResolvedValue({
        data: [mockTicketData],
        error: null,
      }),
    })

    const { result } = renderHook(() => useTickets())

    await waitFor(() => {
      expect(result.current.tickets).toHaveLength(1)
    })

    ;(supabase.from as jest.Mock).mockReturnValueOnce({
      insert: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: mockComment,
        error: null,
      }),
    })

    await act(async () => {
      await result.current.addComment('ticket-1', 'Test comment')
    })

    expect(supabase.from).toHaveBeenCalledWith('ticket_comments')
  })

  it('should filter tickets by status', async () => {
    const mockMultipleTickets = [
      { ...mockTicketData, id: 'ticket-1', status: 'open' },
      { ...mockTicketData, id: 'ticket-2', status: 'in_progress' },
      { ...mockTicketData, id: 'ticket-3', status: 'completed' },
    ]

    ;(supabase.from as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnThis(),
      order: jest.fn().mockResolvedValue({
        data: mockMultipleTickets,
        error: null,
      }),
    })

    const { result } = renderHook(() => useTickets())

    await waitFor(() => {
      expect(result.current.tickets).toHaveLength(3)
    })

    const openTickets = result.current.tickets.filter(t => t.status === 'open')
    expect(openTickets).toHaveLength(1)

    const completedTickets = result.current.tickets.filter(t => t.status === 'completed')
    expect(completedTickets).toHaveLength(1)
  })

  it('should filter tickets by priority', async () => {
    const mockMultipleTickets = [
      { ...mockTicketData, id: 'ticket-1', priority: 'low' },
      { ...mockTicketData, id: 'ticket-2', priority: 'high' },
      { ...mockTicketData, id: 'ticket-3', priority: 'high' },
    ]

    ;(supabase.from as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnThis(),
      order: jest.fn().mockResolvedValue({
        data: mockMultipleTickets,
        error: null,
      }),
    })

    const { result } = renderHook(() => useTickets())

    await waitFor(() => {
      expect(result.current.tickets).toHaveLength(3)
    })

    const highPriorityTickets = result.current.tickets.filter(t => t.priority === 'high')
    expect(highPriorityTickets).toHaveLength(2)
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

    const { result } = renderHook(() => useTickets())

    await waitFor(() => {
      expect(result.current.tickets).toHaveLength(0)
      expect(result.current.isLoading).toBe(false)
    })

    consoleErrorSpy.mockRestore()
  })
})
