'use client'

import { useState, useCallback, useMemo, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
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

export type DateFilter = 'all' | 'overdue' | 'today' | 'tomorrow' | 'this_week' | 'this_month' | 'no_date'


export interface TaskFilters {
  sector?: string
  priority?: string
  status?: string
  assignees?: string[]
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

type TaskRow = {
  id: string
  title: string
  description: string | null
  status: Task['status']
  priority: Task['priority']
  due_date: string | null
  task_assignees?: Array<{ user_id: string | null }>
  assignees?: unknown
  assigned_to?: unknown
  sector: Task['sector']
  created_by: string
  tags: string[] | null
  created_at: string
  updated_at: string
  linked_ticket_id?: string | null
}

function getAssigneeIds(task: TaskRow): string[] {
  if (Array.isArray(task.task_assignees)) {
    return task.task_assignees
      .map((assignee) => assignee.user_id)
      .filter((userId: unknown): userId is string => typeof userId === 'string')
  }

  if (Array.isArray(task.assignees)) {
    return task.assignees.filter((userId: unknown): userId is string => typeof userId === 'string')
  }

  if (typeof task.assigned_to === 'string') {
    return [task.assigned_to]
  }

  return []
}

export function canCurrentUserSeeTask(
  currentUser: { id: string; role: string } | null | undefined,
  task: { assignees: string[] }
): boolean {
  if (!currentUser) return false
  if (currentUser.role === 'Admin' || currentUser.role === 'Gerente') return true
  return task.assignees.includes(currentUser.id)
}

export function getAllowedTaskAssigneesForWrite(
  currentUser: { id: string; role: string } | null | undefined,
  requestedAssignees: string[] | undefined
): string[] {
  if (!currentUser) return []

  if (currentUser.role === 'Colaborador') {
    return [currentUser.id]
  }

  return requestedAssignees ?? []
}

function mapTaskRow(task: TaskRow): Task {
  return {
    id: task.id,
    title: task.title,
    description: task.description || '',
    status: task.status,
    priority: task.priority,
    dueDate: task.due_date ? new Date(task.due_date) : undefined,
    assignees: getAssigneeIds(task),
    sector: task.sector,
    createdBy: task.created_by,
    tags: task.tags || [],
    createdAt: new Date(task.created_at),
    updatedAt: new Date(task.updated_at),
    linkedTicketId: task.linked_ticket_id ?? undefined,
  }
}

export function useTasks(): UseTasksReturn {
  const [tasks, setTasks] = useState<Task[]>([])
  const [filters, setFilters] = useState<TaskFilters>({})
  const [isLoading, setIsLoading] = useState(true)
  const { user } = useAuth()
  // [C05] Client criado por hook para evitar sessão stale
  const supabase = useMemo(() => createClient(), [])

  const fetchTasks = useCallback(async () => {
    if (!user) {
      setIsLoading(false)
      return
    }

    const currentUser = user

    setIsLoading(true)
    try {
      const selectColumns = currentUser.role !== 'Colaborador'
        ? `
          *,
          task_assignees (
            user_id
          )
        `
        : `
          *,
          task_assignees!inner (
            user_id
          )
        `

      let query = (supabase
        .from('tasks')
        .select(selectColumns) as any)

      if (currentUser.role === 'Colaborador') {
        query = query.eq('task_assignees.user_id', currentUser.id)
      }

      const { data, error } = await query.order('created_at', { ascending: false })

      if (error) throw error

      const visibleTasks = (data || [])
        .map(mapTaskRow)
        .filter((task: Task) => canCurrentUserSeeTask(currentUser, task))

      setTasks(visibleTasks)
    } catch (error) {
      console.error('Error fetching tasks:', error)
    } finally {
      setIsLoading(false)
    }
  }, [user, supabase])

  // Fetch inicial de tarefas + Realtime subscription
  useEffect(() => {
    if (!user) return

    fetchTasks()

    // Setup Realtime subscription
    const channel = supabase
      .channel('tasks-changes')
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to all events (INSERT, UPDATE, DELETE)
          schema: 'public',
          table: 'tasks',
        },
        () => {
          // O payload realtime de `tasks` não traz o join `task_assignees`.
          // Rebuscar garante que colaboradores só recebam tarefas em que são responsáveis
          // e que tarefas sem responsável continuem visíveis apenas para Admin.
          fetchTasks()
        }
      )
      .subscribe()

    // Cleanup subscription on unmount
    return () => {
      channel.unsubscribe()
    }
  }, [user, supabase, fetchTasks])

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


      // Filtro de responsável (agora verifica se o filtro está incluso na lista de assignees)
      if (filters.assignees && filters.assignees.length > 0) {
        // Se o filtro fosse multi-select também, seria interseção. 
        // Mas o filtro atual parece ser single select no visual, vamos assumir que queremos tasks que contenham QUALQUER um dos selecionados no filtro.
        // Se filtro.assignees for array de strings.
        const hasMatch = task.assignees.some(assigneeId => filters.assignees?.includes(assigneeId))
        if (!hasMatch) return false
      }

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

      const allowedAssignees = getAllowedTaskAssigneesForWrite(user, taskData.assignees)
      const isCollaboratorDemand = user.role === 'Colaborador'
      const normalizedTaskData = {
        ...taskData,
        assignees: allowedAssignees,
        createdBy: user.id,
        tags: isCollaboratorDemand
          ? Array.from(new Set([...(taskData.tags || []), 'demanda-interna']))
          : taskData.tags,
      }

      // ✅ Validação com Zod antes de inserir no banco
      const validation = CreateTaskSchema.safeParse(normalizedTaskData)
      if (!validation.success) {
        const errors = formatZodErrors(validation.error)
        throw new Error(`Dados inválidos: ${errors.join(', ')}`)
      }


      const { data, error } = await supabase.rpc('save_office_task', {
        task_id: null,
        changes: {
          title: normalizedTaskData.title,
          description: normalizedTaskData.description,
          status: normalizedTaskData.status,
          priority: normalizedTaskData.priority,
          due_date: normalizedTaskData.dueDate?.toISOString() ?? null,
          sector: normalizedTaskData.sector,
          tags: normalizedTaskData.tags || [],
          assignees: allowedAssignees,
        },
      })
      if (error) throw error
      const newTask = mapTaskRow(data as unknown as TaskRow)

      setTasks((prev) => [newTask, ...prev.filter(task => task.id !== newTask.id)])
      return newTask
    },
    [user, supabase]
  )

  // Atualizar tarefa
  const updateTask = useCallback(async (id: string, updates: Partial<Task>) => {
    if (!user) throw new Error('User not authenticated')

    const normalizedUpdates = user.role === 'Colaborador'
      ? (() => {
        // Colaboradores não podem trocar responsáveis. A criação já autoatribui
        // a tarefa; em edições posteriores preservamos o vínculo existente para
        // evitar que o usuário remova a si mesmo ou tente inserir outra pessoa.
        const safeUpdates = { ...updates }
        delete safeUpdates.assignees
        return safeUpdates
      })()
      : updates

    // ✅ Validação com Zod antes de atualizar no banco
    const validation = UpdateTaskSchema.safeParse(normalizedUpdates)
    if (!validation.success) {
      const errors = formatZodErrors(validation.error)
      throw new Error(`Dados inválidos: ${errors.join(', ')}`)
    }


    const { data, error } = await supabase.rpc('save_office_task', {
      task_id: id,
      changes: {
        title: normalizedUpdates.title,
        description: normalizedUpdates.description,
        status: normalizedUpdates.status,
        priority: normalizedUpdates.priority,
        due_date: Object.prototype.hasOwnProperty.call(normalizedUpdates, 'dueDate')
          ? normalizedUpdates.dueDate?.toISOString() ?? null
          : undefined,
        sector: normalizedUpdates.sector,
        tags: normalizedUpdates.tags,
        assignees: normalizedUpdates.assignees,
      },
    })
    if (error) throw error
    const updatedTask = mapTaskRow(data as unknown as TaskRow)

    setTasks((prev) =>
      prev.map((task) => (task.id === id ? updatedTask : task))
    )

    return updatedTask
  }, [supabase, user])

  // Deletar tarefa
  const deleteTask = useCallback(async (id: string) => {
    // 1. Deletar notificações relacionadas à tarefa ANTES de deletar a tarefa
    const { error: notifError } = await supabase
      .from('notifications')
      .delete()
      .eq('entity_type', 'task')
      .eq('entity_id', id)

    if (notifError) {
      console.error('Erro ao limpar notificações:', notifError)
      // Continuar mesmo se falhar - não bloquear deleção da tarefa
    }

    // 2. Deletar a tarefa
    const { error } = await supabase.from('tasks').delete().eq('id', id)

    if (error) throw error

    // 3. Atualizar state local
    setTasks((prev) => prev.filter((t) => t.id !== id))
    return true
  }, [supabase])

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

// [C07] Removida função duplicada mapTaskStatusToTicketStatus — mantida apenas a versão interna ao hook
