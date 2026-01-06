'use client'

import { useState, useCallback, useMemo } from 'react'
import { Ticket, TicketComment } from '@/types/tickets'
import { mockTickets, mockTicketComments, mockUsers } from '@/lib/mock-data'

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
  createTicket: (ticket: Omit<Ticket, 'id' | 'createdAt' | 'updatedAt'>) => Ticket
  updateTicket: (id: string, updates: Partial<Ticket>) => Ticket | null
  deleteTicket: (id: string) => boolean
  getTicketById: (id: string) => Ticket | null
  getTicketsByStatus: (status: string) => Ticket[]
  // Funções de comentários
  getCommentsByTicketId: (ticketId: string) => TicketComment[]
  addComment: (input: AddCommentInput) => TicketComment
  deleteComment: (commentId: string) => boolean
  updateComment: (commentId: string, content: string) => TicketComment | null
  // Usuário
  getUserById: (userId: string) => { name: string; avatar?: string } | null
  isLoading: boolean
}

export function useTickets(): UseTicketsReturn {
  const [tickets, setTickets] = useState<Ticket[]>(mockTickets)
  const [comments, setComments] = useState<TicketComment[]>(mockTicketComments)
  const [filters, setFilters] = useState<TicketFilters>({})
  const [isLoading] = useState(false)

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
  const createTicket = useCallback((ticketData: Omit<Ticket, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newTicket: Ticket = {
      ...ticketData,
      id: `ticket-${Date.now()}`,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    setTickets(prev => [...prev, newTicket])
    return newTicket
  }, [])

  // Atualizar ticket
  const updateTicket = useCallback((id: string, updates: Partial<Ticket>) => {
    let updatedTicket: Ticket | null = null
    setTickets(prev =>
      prev.map(ticket => {
        if (ticket.id === id) {
          updatedTicket = { ...ticket, ...updates, updatedAt: new Date() }
          return updatedTicket
        }
        return ticket
      })
    )
    return updatedTicket
  }, [])

  // Deletar ticket
  const deleteTicket = useCallback((id: string) => {
    const existed = tickets.some(t => t.id === id)
    if (existed) {
      setTickets(prev => prev.filter(t => t.id !== id))
      // Também remove comentários associados
      setComments(prev => prev.filter(c => c.ticketId !== id))
    }
    return existed
  }, [tickets])

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
  const addComment = useCallback((input: AddCommentInput) => {
    const newComment: TicketComment = {
      id: `comment-${Date.now()}`,
      ticketId: input.ticketId,
      userId: 'current-user', // Usuário logado
      content: input.content,
      isInternal: input.isInternal || false,
      attachments: input.attachments,
      createdAt: new Date(),
    }
    setComments(prev => [...prev, newComment])

    // Atualiza o updatedAt do ticket
    setTickets(prev =>
      prev.map(t => t.id === input.ticketId ? { ...t, updatedAt: new Date() } : t)
    )

    return newComment
  }, [])

  // Deletar comentário
  const deleteComment = useCallback((commentId: string) => {
    const existed = comments.some(c => c.id === commentId)
    if (existed) {
      setComments(prev => prev.filter(c => c.id !== commentId))
    }
    return existed
  }, [comments])

  // Atualizar comentário
  const updateComment = useCallback((commentId: string, content: string) => {
    let updatedComment: TicketComment | null = null
    setComments(prev =>
      prev.map(comment => {
        if (comment.id === commentId) {
          updatedComment = {
            ...comment,
            content,
            updatedAt: new Date(),
            editedBy: 'current-user',
          }
          return updatedComment
        }
        return comment
      })
    )
    return updatedComment
  }, [])

  // Obter usuário por ID
  const getUserById = useCallback((userId: string) => {
    const user = mockUsers.find(u => u.id === userId)
    if (!user) return null
    return { name: user.name, avatar: user.avatar }
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
