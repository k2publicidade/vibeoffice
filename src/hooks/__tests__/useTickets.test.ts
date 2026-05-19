import { renderHook, waitFor, act } from '@testing-library/react'
import { canCurrentUserSeeTicket, useTickets } from '../useTickets'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '../useAuth'

jest.mock('../useAuth')
jest.mock('@/lib/notifications/eventBus', () => ({
  EventBus: { emit: jest.fn(() => Promise.resolve()) },
}))

describe('useTickets', () => {
  const userId = '11111111-1111-4111-8111-111111111111'
  const user2Id = '22222222-2222-4222-8222-222222222222'

  function mockTicketAndCommentFetch(tickets: unknown[], ticketError: unknown = null, comments: unknown[] = []) {
    const ticketQuery = {
      select: jest.fn(() => ticketQuery),
      order: jest.fn().mockResolvedValue({ data: tickets, error: ticketError }),
    }
    const commentsQuery = {
      select: jest.fn(() => commentsQuery),
      order: jest.fn().mockResolvedValue({ data: comments, error: null }),
    }
    ;(supabase.from as jest.Mock)
      .mockReturnValueOnce(ticketQuery)
      .mockReturnValueOnce(commentsQuery)
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

  const mockTicketData = {
    id: 'ticket-1',
    title: 'Test Ticket',
    description: 'Test Description',
    status: 'open',
    priority: 'medium',
    category: 'TI/Suporte',
    requester: userId,
    assigned_to: null,
    created_by: userId,
    linked_task_id: 'task-1',
    tasks: { task_assignees: [{ user_id: userId }] },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }

  beforeEach(() => {
    jest.clearAllMocks()
    ;(useAuth as jest.Mock).mockReturnValue({ user: mockUser })
  })

  it('should only show tickets to collaborators when the linked kanban task is assigned to them', () => {
    const assignedTicket = { linkedTaskAssigneeIds: [userId] }
    const unassignedTicket = { linkedTaskAssigneeIds: [] }
    const otherUserTicket = { linkedTaskAssigneeIds: [user2Id] }

    expect(canCurrentUserSeeTicket(assignedTicket, { id: userId, role: 'Colaborador' })).toBe(true)
    expect(canCurrentUserSeeTicket(unassignedTicket, { id: userId, role: 'Colaborador' })).toBe(false)
    expect(canCurrentUserSeeTicket(otherUserTicket, { id: userId, role: 'Colaborador' })).toBe(false)
    expect(canCurrentUserSeeTicket(unassignedTicket, { id: 'admin-1', role: 'Admin' })).toBe(true)
  })

  it('should fetch tickets from Supabase when user is authenticated', async () => {
    mockTicketAndCommentFetch([mockTicketData])

    const { result } = renderHook(() => useTickets())

    await waitFor(() => {
      expect(result.current.tickets).toHaveLength(1)
      expect(result.current.tickets[0]).toMatchObject({
        title: 'Test Ticket',
        requester: userId,
        linkedTaskAssigneeIds: [userId],
      })
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
      status: 'open' as const,
      priority: 'high' as const,
      requester: userId,
    }

    mockTicketAndCommentFetch([])
    const { result } = renderHook(() => useTickets())

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    ;(supabase.from as jest.Mock).mockReturnValueOnce({
      insert: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: { ...mockTicketData, ...newTicketInput, assigned_to: null, linked_task_id: null },
        error: null,
      }),
    })

    await act(async () => {
      await result.current.createTicket(newTicketInput)
    })

    expect(result.current.tickets).toHaveLength(1)
    expect(result.current.tickets[0].title).toBe('New Ticket')
    expect(result.current.tickets[0].requester).toBe(userId)
  })

  it('should update ticket status successfully', async () => {
    mockTicketAndCommentFetch([mockTicketData])
    const { result } = renderHook(() => useTickets())

    await waitFor(() => expect(result.current.tickets).toHaveLength(1))

    ;(supabase.from as jest.Mock)
      .mockReturnValueOnce({
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { ...mockTicketData, status: 'in_progress' },
          error: null,
        }),
      })
      .mockReturnValueOnce({
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ error: null }),
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
      user_id: userId,
      content: 'Test comment',
      is_internal: false,
      attachments: [],
      created_at: new Date().toISOString(),
    }

    mockTicketAndCommentFetch([mockTicketData])
    const { result } = renderHook(() => useTickets())

    await waitFor(() => expect(result.current.tickets).toHaveLength(1))

    ;(supabase.from as jest.Mock).mockReturnValueOnce({
      insert: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: mockComment, error: null }),
    })

    await act(async () => {
      await result.current.addComment({ ticketId: 'ticket-1', content: 'Test comment' })
    })

    expect(supabase.from).toHaveBeenCalledWith('ticket_comments')
    expect(result.current.comments).toHaveLength(1)
  })

  it('should filter tickets by status', async () => {
    mockTicketAndCommentFetch([
      { ...mockTicketData, id: 'ticket-1', status: 'open' },
      { ...mockTicketData, id: 'ticket-2', status: 'in_progress' },
      { ...mockTicketData, id: 'ticket-3', status: 'completed' },
    ])

    const { result } = renderHook(() => useTickets())

    await waitFor(() => expect(result.current.tickets).toHaveLength(3))

    expect(result.current.tickets.filter(t => t.status === 'open')).toHaveLength(1)
    expect(result.current.tickets.filter(t => t.status === 'completed')).toHaveLength(1)
  })

  it('should filter tickets by priority', async () => {
    mockTicketAndCommentFetch([
      { ...mockTicketData, id: 'ticket-1', priority: 'low' },
      { ...mockTicketData, id: 'ticket-2', priority: 'high' },
      { ...mockTicketData, id: 'ticket-3', priority: 'high' },
    ])

    const { result } = renderHook(() => useTickets())

    await waitFor(() => expect(result.current.tickets).toHaveLength(3))

    expect(result.current.tickets.filter(t => t.priority === 'high')).toHaveLength(2)
  })

  it('should handle fetch error gracefully', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation()
    mockTicketAndCommentFetch([], { message: 'Database error' })

    const { result } = renderHook(() => useTickets())

    await waitFor(() => {
      expect(result.current.tickets).toHaveLength(0)
      expect(result.current.isLoading).toBe(false)
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error fetching tickets:',
        expect.objectContaining({ message: 'Database error' })
      )
    })

    consoleErrorSpy.mockRestore()
  })
})
