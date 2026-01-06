'use client'

import { useState, useCallback, useMemo, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from './useAuth'
import { Ticket, TicketComment } from '@/types/tickets'
import { CreateTicketSchema, UpdateTicketSchema, CreateTicketCommentSchema, formatZodErrors } from '@/lib/validation-schemas'

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

  // Fetch inicial de tickets
  useEffect(() => {
    if (!user) return

    fetchTickets()
    fetchComments()
  }, [user])

  async function fetchTickets() {
    setIsLoading(true)
    try {
      const { data, error } = await supabase
        .from('tickets')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error

      setTickets(
        data.map((t) => ({
          id: t.id,
          title: t.title,
          description: t.description,
          category: t.category,
          status: t.status,
          priority: t.priority,
          requester: t.requester,
          createdBy: t.created_by ?? undefined,
          assignedTo: t.assigned_to ?? undefined,
          createdAt: new Date(t.created_at),
          updatedAt: new Date(t.updated_at),
        }))
      )
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

      const { data, error } = await supabase
        .from('tickets')
        .insert({
          title: ticketData.title,
          description: ticketData.description,
          category: ticketData.category,
          status: ticketData.status,
          priority: ticketData.priority,
          requester: user.id,
          created_by: ticketData.createdBy,
          assigned_to: ticketData.assignedTo,
        })
        .select()
        .single()

      if (error) throw error

      const newTicket: Ticket = {
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
      }

      setTickets(prev => [newTicket, ...prev])
      return newTicket
    },
    [user]
  )

  // Atualizar ticket
  const updateTicket = useCallback(async (id: string, updates: Partial<Ticket>) => {
    const { data, error } = await supabase
      .from('tickets')
      .update({
        title: updates.title,
        description: updates.description,
        category: updates.category,
        status: updates.status,
        priority: updates.priority,
        assigned_to: updates.assignedTo,
      })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

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
    }

    setTickets(prev =>
      prev.map(ticket => (ticket.id === id ? updatedTicket : ticket))
    )

    return updatedTicket
  }, [])

  // Deletar ticket
  const deleteTicket = useCallback(async (id: string) => {
    const { error } = await supabase.from('tickets').delete().eq('id', id)

    if (error) throw error

    setTickets(prev => prev.filter(t => t.id !== id))
    // Comentários serão removidos automaticamente via CASCADE
    setComments(prev => prev.filter(c => c.ticketId !== id))
    return true
  }, [])

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
    [user]
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
  }, [])

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
    [user]
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
  }, [])

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
