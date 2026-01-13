/**
 * Tasks Module Types
 * Defines task structure, status, and priority
 */

import { Sector } from './auth'

export type TaskStatus = 'todo' | 'in_progress' | 'done'
export type TaskPriority = 'low' | 'medium' | 'high'


export interface Task {
  id: string
  title: string
  description: string
  status: TaskStatus
  priority: TaskPriority
  dueDate?: Date
  assignees: string[] // Array of User IDs
  sector: Sector
  createdBy: string // User ID
  createdAt: Date
  updatedAt: Date
  tags?: string[]
  linkedTicketId?: string // UUID do ticket vinculado (sincronização 1:1)
}

export interface CreateTaskInput {
  title: string
  description?: string
  priority: TaskPriority
  assignees: string[]
  dueDate?: string
}

export interface UpdateTaskInput {
  title?: string
  description?: string
  status?: TaskStatus
  priority?: TaskPriority
  assignees?: string[]
  dueDate?: string
}

export interface TaskFilters {
  status?: TaskStatus
  priority?: TaskPriority
  sector?: Sector
  assignees?: string[] // Agora busca se contem algum dos assignees
  searchTerm?: string
}

