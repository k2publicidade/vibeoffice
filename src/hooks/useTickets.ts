'use client'

import { useState, useCallback, useMemo, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from './useAuth'
import { Ticket, TicketComment } from '@/types/tickets'
import { CreateTicketSchema, UpdateTicketSchema, CreateTicketCommentSchema, formatZodErrors } from '@/lib/validation-schemas'

function formatLocalDate(date: Date) { return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}` }

type TicketRow = {
  request_type?: string | null
  request_start_date?: string | null
  request_end_date?: string | null
  id: string
  title: string
  description: string | null
  category: string
  status: Ticket['status']
  priority: Ticket['priority']
  requester: string
  created_by: string | null
  assigned_to: string | null
  created_at: string
  updated_at: string
  linked_task_id?: string | null
  tasks?: {
    task_assignees?: Array<{ user_id: string | null }>
  } | null
}

function getLinkedTaskAssigneeIds(ticket: TicketRow): string[] {
  if (!ticket.tasks || !Array.isArray(ticket.tasks.task_assignees)) return []

  return ticket.tasks.task_assignees
    .map((assignee) => assignee.user_id)
    .filter((userId): userId is string => Boolean(userId))
}

export function canCurrentUserSeeTicket(
  ticket: Pick<Ticket, 'linkedTaskAssigneeIds'> & Partial<Pick<Ticket, 'requester' | 'assignedTo'>>,
  user: { id: string; role: string }
): boolean {
  if (user.role === 'Admin' || user.role === 'Gerente') return true
  if (ticket.requester === user.id || ticket.assignedTo === user.id) return true

  return ticket.linkedTaskAssigneeIds?.includes(user.id) ?? false
}

function mapTicketRow(ticket: TicketRow): Ticket {
  return {
    requestType: ticket.request_type || undefined,
    requestStartDate: ticket.request_start_date ? new Date(ticket.request_start_date + 'T12:00:00') : undefined,
    requestEndDate: ticket.request_end_date ? new Date(ticket.request_end_date + 'T12:00:00') : undefined,
    id: ticket.id,
    title: ticket.title,
    description: ticket.description ?? '',
    category: ticket.category,
    status: ticket.status,
    priority: ticket.priority,
    requester: ticket.requester,
    createdBy: ticket.created_by ?? undefined,
    assignedTo: ticket.assigned_to ?? undefined,
    createdAt: new Date(ticket.created_at),
    updatedAt: new Date(ticket.updated_at),
    linkedTaskId: ticket.linked_task_id ?? undefined,
    linkedTaskAssigneeIds: getLinkedTaskAssigneeIds(ticket),
  }
}

export interface TicketFilters {
  status?: string[]  // Suporta multi-seleção
  priority?: string
  category?: string
  assignedTo?: string
  searchQuery?: string
}

export interface TicketStats {
  total: number
  open: number
  analyzing: number
  inProgress: number
  completed: number
  highPriority: number
}

export interface AddCommentInput {
  ticketId: string
  content: string
  isInternal?: boolean
  attachments?: string[]
}

export interface UseTicketsReturn {
  tickets: Ticket[]
  filteredTickets: Ticket[]
  comments: TicketComment[]
  filters: TicketFilters
  stats: TicketStats
  setFilters: (filters: TicketFilters) => void
  createTicket: (ticket: Omit<Ticket, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Ticket>
  updateTicket: (id: string, updates: Partial<Ticket>) => Promise<Ticket | null>
  deleteTicket: (id: string) => Promise<boolean>
  getTicketById: (id: string) => Ticket | null
  getTicketsByStatus: (status: string) => Ticket[]
  // Funções de comentários
  getCommentsByTicketId: (ticketId: string) => TicketComment[]
  addComment: (input: AddCommentInput) => Promise<TicketComment>
  deleteComment: (commentId: string) => Promise<boolean>
  updateComment: (commentId: string, content: string) => Promise<TicketComment | null>
  // Usuário
  getUserById: (userId: string) => Promise<{ name: string; avatar?: string } | null>
  isLoading: boolean
}

export function useTickets(): UseTicketsReturn {
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [comments, setComments] = useState<TicketComment[]>([])
  const [filters, setFilters] = useState<TicketFilters>({})
  const [isLoading, setIsLoading] = useState(true)
  const { user } = useAuth()
  // [C05] Client criado por hook para evitar sessão stale
  const supabase = useMemo(() => createClient(), [])

  // Fetch inicial de tickets
  useEffect(() => {
    if (!user) return

    fetchTickets()
    fetchComments()

    // Setup Realtime subscription
    const channel = supabase
      .channel('tickets-changes')
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to all events (INSERT, UPDATE, DELETE)
          schema: 'public',
          table: 'tickets',
        },
        () => {
          // Tickets são espelhos das tarefas do Kanban. Como o payload realtime
          // não traz a task vinculada nem seus responsáveis, rebuscamos para
          // manter a regra: colaborador só vê ticket cuja task está atribuída a ele.
          fetchTickets()
        }
      )
      .subscribe()

    // Cleanup subscription on unmount
    return () => {
      channel.unsubscribe()
    }
  }, [user, supabase])

  async function fetchTickets() {
    if (!user) {
      setIsLoading(false)
      return
    }

    const currentUser = user

    setIsLoading(true)
    try {
      const selectColumns = '*, tasks!tickets_linked_task_id_fkey(task_assignees(user_id))'
      const query = supabase
        .from('tickets')
        .select(selectColumns)
        .order('created_at', { ascending: false })

      const { data, error } = await query

      if (error) throw error

      const visibleTickets = ((data ?? []) as TicketRow[])
        .map(mapTicketRow)
        .filter((ticket) => canCurrentUserSeeTicket(ticket, currentUser))

      setTickets(visibleTickets)
    } catch (error) {
      console.error('Error fetching tickets:', error)
    } finally {
      setIsLoading(false)
    }
  }

  async function fetchComments() {
    try {
      const { data, error } = await supabase
        .from('ticket_comments')
        .select('*')
        .order('created_at', { ascending: true })

      if (error) throw error

      setComments(
        data.map((c) => ({
          id: c.id,
          ticketId: c.ticket_id,
          userId: c.user_id,
          content: c.content,
          isInternal: c.is_internal,
          attachments: c.attachments,
          createdAt: new Date(c.created_at),
          updatedAt: c.updated_at ? new Date(c.updated_at) : undefined,
          editedBy: c.edited_by ?? undefined,
        }))
      )
    } catch (error) {
      console.error('Error fetching comments:', error)
    }
  }

  // Calcular estatísticas
  const stats = useMemo((): TicketStats => {
    return {
      total: tickets.length,
      open: tickets.filter(t => t.status === 'open').length,
      analyzing: tickets.filter(t => t.status === 'analyzing').length,
      inProgress: tickets.filter(t => t.status === 'in_progress').length,
      completed: tickets.filter(t => t.status === 'completed').length,
      highPriority: tickets.filter(t => t.priority === 'high' && t.status !== 'completed').length,
    }
  }, [tickets])

  // Filtrar tickets baseado nos filtros selecionados
  const filteredTickets = useMemo(() => {
    return tickets.filter(ticket => {
      // Status: multi-seleção - verifica se o status está no array
      if (filters.status && filters.status.length > 0) {
        if (!filters.status.includes(ticket.status)) return false
      }
      if (filters.priority && ticket.priority !== filters.priority) return false
      if (filters.category && ticket.category !== filters.category) return false
      if (filters.assignedTo && ticket.assignedTo !== filters.assignedTo) return false

      // Busca por texto
      if (filters.searchQuery) {
        const query = filters.searchQuery.toLowerCase()
        const matchesTitle = ticket.title.toLowerCase().includes(query)
        const matchesDescription = ticket.description.toLowerCase().includes(query)
        if (!matchesTitle && !matchesDescription) return false
      }

      return true
    })
  }, [tickets, filters])

  // Criar novo ticket
  const createTicket = useCallback(
    async (ticketData: Omit<Ticket, 'id' | 'createdAt' | 'updatedAt'>) => {
      if (!user) throw new Error('User not authenticated')

      // ✅ Validação com Zod antes de inserir no banco
      const validation = CreateTicketSchema.safeParse({ ...ticketData, requester: user.id })
      if (!validation.success) {
        const errors = formatZodErrors(validation.error)
        throw new Error(`Dados inválidos: ${errors.join(', ')}`)
      }

      // [M08] Forçar created_by = user?.id para segurança (ignora input do client)
      const { data, error } = await supabase
        .from('tickets')
        .insert({
          title: ticketData.title,
          description: ticketData.description,
          category: ticketData.category,
          status: ticketData.status,
          priority: ticketData.priority,
          requester: user.id,
          created_by: user.id,
          assigned_to: ticketData.assignedTo,
          request_type: ticketData.requestType,
          request_start_date: ticketData.requestStartDate ? formatLocalDate(ticketData.requestStartDate) : null,
          request_end_date: ticketData.requestEndDate ? formatLocalDate(ticketData.requestEndDate) : null,
        })
        .select()
        .single()

      if (error) throw error

      const insertedTicket = data as TicketRow
      const newTicket: Ticket = {
        requestType: ticketData.requestType,
        requestStartDate: ticketData.requestStartDate,
        requestEndDate: ticketData.requestEndDate,
        id: data.id,
        title: data.title,
        description: data.description,
        category: data.category,
        status: data.status,
        priority: data.priority,
        requester: data.requester,
        createdBy: data.created_by ?? undefined,
        assignedTo: data.assigned_to ?? undefined,
        createdAt: new Date(data.created_at),
        updatedAt: new Date(data.updated_at),
        linkedTaskId: insertedTicket.linked_task_id ?? undefined,
        linkedTaskAssigneeIds: [],
      }

      setTickets(prev => [newTicket, ...prev.filter(ticket => ticket.id !== newTicket.id)])

      // Notify requester that ticket was created
      // Notifications are generated by the database transaction.

      // If ticket is assigned, notify assignee
      if (ticketData.assignedTo) {
        // Notifications are generated by the database transaction.
      }

      return newTicket
    },
    [user, supabase]
  )

  // Atualizar ticket
  const updateTicket = useCallback(
    async (id: string, updates: Partial<Ticket>): Promise<Ticket | null> => {
      if (!user) throw new Error('User not authenticated')

      try {
        // Capturar oldTicket do estado atual ANTES de qualquer operação
        const oldTicket = tickets.find(t => t.id === id)

        // Validação early-return (Issue #2)
        if (!oldTicket) {
          console.warn('[useTickets] Cannot update: ticket not found in local state')
          return null
        }

        // Detectar mudanças ANTES do update
        const statusChanged = updates.status && oldTicket.status !== updates.status
        const assigneeChanged = updates.assignedTo && oldTicket.assignedTo !== updates.assignedTo

        // Fazer update no banco
        const { data, error } = await supabase
          .from('tickets')
          .update({
            title: updates.title,
            description: updates.description,
            category: updates.category,
            status: updates.status,
            priority: updates.priority,
            assigned_to: updates.assignedTo,
            updated_at: new Date().toISOString(),
          })
          .eq('id', id)
          .select()
          .single()

        if (error) throw error

        // Mapear resultado
        const updatedTicketRow = data as TicketRow
        const updatedTicket: Ticket = {
          id: data.id,
          title: data.title,
          description: data.description,
          category: data.category,
          status: data.status,
          priority: data.priority,
          requester: data.requester,
          createdBy: data.created_by ?? undefined,
          assignedTo: data.assigned_to ?? undefined,
          createdAt: new Date(data.created_at),
          updatedAt: new Date(data.updated_at),
          linkedTaskId: updatedTicketRow.linked_task_id ?? undefined,
          linkedTaskAssigneeIds: oldTicket.linkedTaskAssigneeIds,
        }

        // Atualizar estado local
        setTickets(prev => prev.map(ticket => (ticket.id === id ? updatedTicket : ticket)))

        // Emitir eventos DEPOIS do update, usando as flags capturadas antes
        if (statusChanged) {
          const recipients = [oldTicket.requester, oldTicket.assignedTo].filter(Boolean) as string[]

          // Notifications are generated by the database transaction.
        }

        if (assigneeChanged && updates.assignedTo) {
          // Notifications are generated by the database transaction.
        }

        // NOVO: Sincronizar com Task vinculada (Reverse Sync)
        if ((statusChanged || assigneeChanged) && (oldTicket.linkedTaskId || (data as any).linked_task_id)) {
          const linkedTaskId = oldTicket.linkedTaskId || (data as any).linked_task_id
          const taskUpdates: any = {}

          if (statusChanged && updates.status) {
            // Map TicketStatus -> TaskStatus
            let taskStatus = 'todo'
            if (updates.status === 'in_progress') taskStatus = 'in_progress'
            if (updates.status === 'completed') taskStatus = 'done'
            // 'analyzing' defaults to 'todo' or maybe 'in_progress'? Let's keep 'todo' for now or 'in_progress' if analyzing? 
            // Usually Analyzing is actively working, so 'in_progress' might be better, but let's stick to 'todo' if it aligns with "Backlog" mental model, or 'in_progress' if it means "Started".
            // User previously mapped 'todo' -> 'open'. 'in_progress' -> 'in_progress'.
            // Let's map 'analyzing' to 'in_progress' to be safe, as it implies work.
            if (updates.status === 'analyzing') taskStatus = 'in_progress'

            taskUpdates.status = taskStatus
          }

          // assigned_to removido do sync reverso ticket → task
          // Fonte da verdade dos assignees da task agora e exclusivamente
          // a tabela M2M task_assignees. Ver achado S-P0-05 do diagnostico 2026-05-17.
          // (TODO futuro: sincronizar task_assignees a partir de tickets.assigned_to se necessario)
          if (Object.keys(taskUpdates).length > 0) {
            const { error: taskError } = await supabase
              .from('tasks')
              .update(taskUpdates)
              .eq('id', linkedTaskId)

            if (taskError) {
              console.error('[useTickets] Failed to sync task:', taskError)
            } else {
              if (process.env.NODE_ENV === 'development') console.log('[useTickets] Task synced successfully')
            }
          }
        }

        return updatedTicket
      } catch (error) {
        console.error('Error updating ticket:', error)
        return null
      }
    },
    [user, tickets, supabase]
  )

  // Deletar ticket
  const deleteTicket = useCallback(async (id: string) => {
    const { error } = await supabase.from('tickets').delete().eq('id', id)

    if (error) throw error

    setTickets(prev => prev.filter(t => t.id !== id))
    // Comentários serão removidos automaticamente via CASCADE
    setComments(prev => prev.filter(c => c.ticketId !== id))
    return true
  }, [supabase])

  // Obter ticket por ID
  const getTicketById = useCallback((id: string) => {
    return tickets.find(t => t.id === id) || null
  }, [tickets])

  // Obter tickets por status
  const getTicketsByStatus = useCallback((status: string) => {
    return tickets.filter(t => t.status === status)
  }, [tickets])

  // Obter comentários por ID do ticket
  const getCommentsByTicketId = useCallback((ticketId: string) => {
    return comments
      .filter(c => c.ticketId === ticketId)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
  }, [comments])

  // Adicionar comentário
  const addComment = useCallback(
    async (input: AddCommentInput) => {
      if (!user) throw new Error('User not authenticated')

      const { data, error } = await supabase
        .from('ticket_comments')
        .insert({
          ticket_id: input.ticketId,
          user_id: user.id,
          content: input.content,
          is_internal: input.isInternal || false,
          attachments: input.attachments || [],
        })
        .select()
        .single()

      if (error) throw error

      const newComment: TicketComment = {
        id: data.id,
        ticketId: data.ticket_id,
        userId: data.user_id,
        content: data.content,
        isInternal: data.is_internal,
        attachments: data.attachments,
        createdAt: new Date(data.created_at),
      }

      setComments(prev => [...prev, newComment])

      // Atualiza o updatedAt do ticket (feito automaticamente pelo trigger)
      setTickets(prev =>
        prev.map(t => t.id === input.ticketId ? { ...t, updatedAt: new Date() } : t)
      )

      return newComment
    },
    [user, supabase]
  )

  // Deletar comentário
  const deleteComment = useCallback(async (commentId: string) => {
    const { error } = await supabase
      .from('ticket_comments')
      .delete()
      .eq('id', commentId)

    if (error) throw error

    setComments(prev => prev.filter(c => c.id !== commentId))
    return true
  }, [supabase])

  // Atualizar comentário
  const updateComment = useCallback(
    async (commentId: string, content: string) => {
      if (!user) throw new Error('User not authenticated')

      const { data, error } = await supabase
        .from('ticket_comments')
        .update({
          content,
          edited_by: user.id,
        })
        .eq('id', commentId)
        .select()
        .single()

      if (error) throw error

      const updatedComment: TicketComment = {
        id: data.id,
        ticketId: data.ticket_id,
        userId: data.user_id,
        content: data.content,
        isInternal: data.is_internal,
        attachments: data.attachments,
        createdAt: new Date(data.created_at),
        updatedAt: data.updated_at ? new Date(data.updated_at) : undefined,
        editedBy: data.edited_by ?? undefined,
      }

      setComments(prev =>
        prev.map(comment => (comment.id === commentId ? updatedComment : comment))
      )

      return updatedComment
    },
    [user, supabase]
  )

  // Obter usuário por ID
  const getUserById = useCallback(async (userId: string) => {
    const { data, error } = await supabase
      .from('users')
      .select('name, avatar')
      .eq('id', userId)
      .single()

    if (error) return null

    return { name: data.name, avatar: data.avatar || undefined }
  }, [supabase])

  return {
    tickets,
    filteredTickets,
    comments,
    filters,
    stats,
    setFilters,
    createTicket,
    updateTicket,
    deleteTicket,
    getTicketById,
    getTicketsByStatus,
    getCommentsByTicketId,
    addComment,
    deleteComment,
    updateComment,
    getUserById,
    isLoading,
  }
}
