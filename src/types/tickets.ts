/**
 * Tickets Module Types
 * Defines support tickets and request workflow
 */

export type TicketStatus = 'open' | 'analyzing' | 'in_progress' | 'completed'
export type TicketPriority = 'low' | 'medium' | 'high'

export interface Ticket {
  requestType?: string
  requestStartDate?: Date
  requestEndDate?: Date
  id: string
  title: string
  description: string
  category: string
  status: TicketStatus
  priority: TicketPriority
  requester: string // User ID
  createdBy?: string // User ID who created the ticket
  assignedTo?: string // User ID
  createdAt: Date
  updatedAt: Date
  linkedTaskId?: string // UUID da task vinculada (sincronização 1:1)
  linkedTaskAssigneeIds?: string[] // Responsáveis da task vinculada (fonte da verdade do Kanban)
}

export interface TicketHistory {
  id: string
  ticketId: string
  action: string
  changedBy: string // User ID
  previousValue?: string
  newValue?: string
  timestamp: Date
}

export interface TicketComment {
  id: string
  ticketId: string
  userId: string // Who wrote the comment
  content: string
  isInternal: boolean // If true, only staff can see
  attachments?: string[] // URLs to attached files
  createdAt: Date
  updatedAt?: Date
  editedBy?: string
}

export interface CreateTicketInput {
  title: string
  description: string
  category: string
  priority: TicketPriority
}

export interface UpdateTicketInput {
  title?: string
  description?: string
  status?: TicketStatus
  priority?: TicketPriority
  assignedTo?: string
}
