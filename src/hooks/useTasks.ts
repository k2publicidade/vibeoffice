'use client'

import { useState, useCallback, useMemo, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from './useAuth'
import { Task } from '@/types/tasks'
import { CreateTaskSchema, UpdateTaskSchema, formatZodErrors } from '@/lib/validation-schemas'
import {
  isToday,
  isTomorrow,
  isThisWeek,
  isThisMonth,
  isPast,
  startOfDay,
} from 'date-fns'
import { EventBus } from '@/lib/notifications/eventBus'

export type DateFilter = 'all' | 'overdue' | 'today' | 'tomorrow' | 'this_week' | 'this_month' | 'no_date'

export interface TaskFilters {
  sector?: string
  priority?: string
  status?: string
  assignedTo?: string
  dateFilter?: DateFilter
  searchQuery?: string
}

export interface TaskStats {
  total: number
  overdue: number
  dueToday: number
  dueTomorrow: number
  dueThisWeek: number
  completed: number
  inProgress: number
  todo: number
}

export interface UseTasksReturn {
  tasks: Task[]
  filteredTasks: Task[]
  filters: TaskFilters
  stats: TaskStats

  setFilters: (filters: TaskFilters) => void
  createTask: (task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Task>
  updateTask: (id: string, updates: Partial<Task>) => Promise<Task | null>
  deleteTask: (id: string) => Promise<boolean>
  getTaskById: (id: string) => Task | null
  getTasksByStatus: (status: string) => Task[]
  getOverdueTasks: () => Task[]
  getTasksDueToday: () => Task[]
  getTasksDueThisWeek: () => Task[]
  isLoading: boolean
}

export function useTasks(): UseTasksReturn {
  const [tasks, setTasks] = useState<Task[]>([])
  const [filters, setFilters] = useState<TaskFilters>({})
  const [isLoading, setIsLoading] = useState(true)
  const { user } = useAuth()

  // Fetch inicial de tarefas
  useEffect(() => {
    if (!user) return

    fetchTasks()
  }, [user])

  async function fetchTasks() {
    setIsLoading(true)
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error

      setTasks(
        data.map((t) => ({
          id: t.id,
          title: t.title,
          description: t.description || '',
          status: t.status,
          priority: t.priority,
          dueDate: t.due_date ? new Date(t.due_date) : undefined,
          assignedTo: t.assigned_to,
          sector: t.sector,
          createdBy: t.created_by,
          tags: t.tags || [],
          createdAt: new Date(t.created_at),
          updatedAt: new Date(t.updated_at),
          linkedTicketId: (t as any).linked_ticket_id,
        }))
      )
    } catch (error) {
      console.error('Error fetching tasks:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // Função auxiliar para verificar se tarefa está atrasada
  const isOverdue = useCallback((task: Task): boolean => {
    if (!task.dueDate || task.status === 'done') return false
    const dueDate = new Date(task.dueDate)
    const today = startOfDay(new Date())
    return dueDate < today
  }, [])

  // Função auxiliar para filtro de data
  const matchesDateFilter = useCallback((task: Task, dateFilter: DateFilter): boolean => {
    if (dateFilter === 'all') return true

    if (dateFilter === 'no_date') {
      return !task.dueDate
    }

    if (!task.dueDate) return false
    const dueDate = new Date(task.dueDate)

    switch (dateFilter) {
      case 'overdue':
        return isOverdue(task)
      case 'today':
        return isToday(dueDate)
      case 'tomorrow':
        return isTomorrow(dueDate)
      case 'this_week':
        return isThisWeek(dueDate, { weekStartsOn: 0 })
      case 'this_month':
        return isThisMonth(dueDate)
      default:
        return true
    }
  }, [isOverdue])

  // Calcular estatísticas
  const stats = useMemo((): TaskStats => {
    return {
      total: tasks.length,
      overdue: tasks.filter(t => isOverdue(t)).length,
      dueToday: tasks.filter(t => t.dueDate && isToday(new Date(t.dueDate)) && t.status !== 'done').length,
      dueTomorrow: tasks.filter(t => t.dueDate && isTomorrow(new Date(t.dueDate)) && t.status !== 'done').length,
      dueThisWeek: tasks.filter(t => t.dueDate && isThisWeek(new Date(t.dueDate), { weekStartsOn: 0 }) && t.status !== 'done').length,
      completed: tasks.filter(t => t.status === 'done').length,
      inProgress: tasks.filter(t => t.status === 'in_progress').length,
      todo: tasks.filter(t => t.status === 'todo').length,
    }
  }, [tasks, isOverdue])

  // Filtrar tarefas baseado nos filtros selecionados
  const filteredTasks = useMemo(() => {
    return tasks.filter(task => {
      // Filtro de setor
      if (filters.sector && task.sector !== filters.sector) return false

      // Filtro de prioridade
      if (filters.priority && task.priority !== filters.priority) return false

      // Filtro de status
      if (filters.status && task.status !== filters.status) return false

      // Filtro de responsável
      if (filters.assignedTo && task.assignedTo !== filters.assignedTo) return false

      // Filtro de data
      if (filters.dateFilter && filters.dateFilter !== 'all') {
        if (!matchesDateFilter(task, filters.dateFilter)) return false
      }

      // Filtro de busca
      if (filters.searchQuery) {
        const query = filters.searchQuery.toLowerCase()
        const matchesTitle = task.title.toLowerCase().includes(query)
        const matchesDescription = task.description?.toLowerCase().includes(query)
        if (!matchesTitle && !matchesDescription) return false
      }

      return true
    })
  }, [tasks, filters, matchesDateFilter])

  // Criar tarefa
  const createTask = useCallback(
    async (taskData: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) => {
      if (!user) throw new Error('User not authenticated')

      // ✅ Validação com Zod antes de inserir no banco
      const validation = CreateTaskSchema.safeParse(taskData)
      if (!validation.success) {
        const errors = formatZodErrors(validation.error)
        throw new Error(`Dados inválidos: ${errors.join(', ')}`)
      }

      // 1. Criar a task no banco
      const { data: taskInserted, error: taskError } = await supabase
        .from('tasks')
        .insert({
          title: taskData.title,
          description: taskData.description,
          status: taskData.status,
          priority: taskData.priority,
          due_date: taskData.dueDate?.toISOString(),
          assigned_to: taskData.assignedTo,
          sector: taskData.sector,
          created_by: user.id,
          tags: taskData.tags || [],
        })
        .select()
        .single()

      if (taskError) throw taskError

      // 2. Criar ticket vinculado automaticamente
      const { data: ticketData, error: ticketError } = await supabase
        .from('tickets')
        .insert({
          title: taskInserted.title,
          description: taskInserted.description || `Ticket gerado automaticamente para a tarefa: ${taskInserted.title}`,
          category: 'Task Vinculada',
          status: 'open', // Task 'todo' → Ticket 'open'
          priority: taskInserted.priority,
          requester: user.id,
          created_by: user.id,
          assigned_to: taskInserted.assigned_to,
          linked_task_id: taskInserted.id,
        })
        .select()
        .single()

      if (ticketError) {
        console.error('[useTasks] Failed to create linked ticket:', ticketError)
        throw ticketError
      }

      // 3. Atualizar task com linked_ticket_id
      const { error: updateError } = await supabase
        .from('tasks')
        .update({ linked_ticket_id: ticketData.id } as any)
        .eq('id', taskInserted.id)

      if (updateError) {
        console.error('[useTasks] Failed to link ticket to task:', updateError)
      }

      // 4. Criar evento de calendário se houver dueDate
      if (taskInserted.due_date) {
        const eventDate = new Date(taskInserted.due_date)
        eventDate.setHours(18, 0, 0, 0) // 18h

        const endDate = new Date(eventDate)
        endDate.setHours(19, 0, 0, 0) // 19h (duração de 1h)

        const { error: eventError } = await supabase
          .from('calendar_events')
          .insert({
            title: `📋 ${taskInserted.title}`,
            description: taskInserted.description || 'Tarefa agendada automaticamente',
            start_time: eventDate.toISOString(),
            end_time: endDate.toISOString(),
            type: 'personal',
            created_by: user.id,
            linked_task_id: taskInserted.id,
          })

        if (eventError) {
          console.error('[useTasks] Failed to create calendar event:', eventError)
        }
      }

      // 5. Criar objeto Task para o state
      const newTask: Task = {
        id: taskInserted.id,
        title: taskInserted.title,
        description: taskInserted.description || '',
        status: taskInserted.status,
        priority: taskInserted.priority,
        dueDate: taskInserted.due_date ? new Date(taskInserted.due_date) : undefined,
        assignedTo: taskInserted.assigned_to,
        sector: taskInserted.sector,
        createdBy: taskInserted.created_by,
        tags: taskInserted.tags || [],
        createdAt: new Date(taskInserted.created_at),
        updatedAt: new Date(taskInserted.updated_at),
        linkedTicketId: ticketData.id,
      }

      // 6. Emitir evento de notificação
      if (taskData.assignedTo) {
        EventBus.emit({
          type: 'task_assigned',
          recipientIds: [taskData.assignedTo],
          priority: taskData.priority === 'high' ? 'high' : 'medium',
          entityType: 'task',
          entityId: newTask.id,
          metadata: {
            taskTitle: taskData.title,
            dueDate: taskData.dueDate,
            assignedBy: user?.id,
            assignedByName: user?.name,
          },
        }).catch((err) => {
          console.error('[useTasks] Failed to emit notification:', err)
        })
      }

      setTasks((prev) => [newTask, ...prev])
      return newTask
    },
    [user]
  )

  // Função auxiliar para mapear TaskStatus → TicketStatus
  const mapTaskStatusToTicketStatus = (taskStatus: 'todo' | 'in_progress' | 'done'): 'open' | 'analyzing' | 'in_progress' | 'completed' => {
    switch (taskStatus) {
      case 'todo':
        return 'open'
      case 'in_progress':
        return 'in_progress'
      case 'done':
        return 'completed'
    }
  }

  // Atualizar tarefa
  const updateTask = useCallback(async (id: string, updates: Partial<Task>) => {
    // Guardar referência do oldTask ANTES do update
    const oldTask = tasks.find(t => t.id === id)

    // ✅ Validação com Zod antes de atualizar no banco
    const validation = UpdateTaskSchema.safeParse(updates)
    if (!validation.success) {
      const errors = formatZodErrors(validation.error)
      throw new Error(`Dados inválidos: ${errors.join(', ')}`)
    }

    const { data, error } = await supabase
      .from('tasks')
      .update({
        title: updates.title,
        description: updates.description,
        status: updates.status,
        priority: updates.priority,
        due_date: updates.dueDate?.toISOString(),
        assigned_to: updates.assignedTo,
        sector: updates.sector,
        tags: updates.tags,
      })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    const updatedTask: Task = {
      id: data.id,
      title: data.title,
      description: data.description || '',
      status: data.status,
      priority: data.priority,
      dueDate: data.due_date ? new Date(data.due_date) : undefined,
      assignedTo: data.assigned_to,
      sector: data.sector,
      createdBy: data.created_by,
      tags: data.tags || [],
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
      linkedTicketId: (data as any).linked_ticket_id,
    }

    // NOVO: Sincronizar status com ticket vinculado
    if (updates.status && updatedTask.linkedTicketId && oldTask && updates.status !== oldTask.status) {
      const ticketStatus = mapTaskStatusToTicketStatus(updates.status)

      const { error: ticketError } = await supabase
        .from('tickets')
        .update({ status: ticketStatus })
        .eq('id', updatedTask.linkedTicketId)

      if (ticketError) {
        console.error('[useTasks] Failed to sync ticket status:', ticketError)
      }
    }

    // NOVO: Emitir evento se status mudou
    if (updates.status && oldTask && updates.status !== oldTask.status) {
      const recipientIds = [
        updatedTask.createdBy,
        updatedTask.assignedTo,
      ].filter((id): id is string => id !== null && id !== undefined)

      if (recipientIds.length > 0) {
        EventBus.emit({
          type: 'task_status_changed',
          recipientIds,
          priority: 'low',
          entityType: 'task',
          entityId: id,
          metadata: {
            taskTitle: updatedTask.title,
            oldStatus: oldTask.status,
            newStatus: updates.status,
          },
        }).catch((err) => {
          console.error('[useTasks] Failed to emit notification:', err)
        })
      }
    }

    setTasks((prev) =>
      prev.map((task) => (task.id === id ? updatedTask : task))
    )

    return updatedTask
  }, [tasks])

  // Deletar tarefa
  const deleteTask = useCallback(async (id: string) => {
    const { error } = await supabase.from('tasks').delete().eq('id', id)

    if (error) throw error

    setTasks((prev) => prev.filter((t) => t.id !== id))
    return true
  }, [])

  // Obter tarefa por ID
  const getTaskById = useCallback((id: string) => {
    return tasks.find(t => t.id === id) || null
  }, [tasks])

  // Obter tarefas por status
  const getTasksByStatus = useCallback((status: string) => {
    return tasks.filter(t => t.status === status)
  }, [tasks])

  // Obter tarefas atrasadas
  const getOverdueTasks = useCallback(() => {
    return tasks.filter(t => isOverdue(t))
  }, [tasks, isOverdue])

  // Obter tarefas para hoje
  const getTasksDueToday = useCallback(() => {
    return tasks.filter(t => t.dueDate && isToday(new Date(t.dueDate)) && t.status !== 'done')
  }, [tasks])

  // Obter tarefas para esta semana
  const getTasksDueThisWeek = useCallback(() => {
    return tasks.filter(t => t.dueDate && isThisWeek(new Date(t.dueDate), { weekStartsOn: 0 }) && t.status !== 'done')
  }, [tasks])

  return {
    tasks,
    filteredTasks,
    filters,
    stats,
    setFilters,
    createTask,
    updateTask,
    deleteTask,
    getTaskById,
    getTasksByStatus,
    getOverdueTasks,
    getTasksDueToday,
    getTasksDueThisWeek,
    isLoading,
  }
}
