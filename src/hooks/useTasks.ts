'use client'

import { toast } from 'sonner'
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


      // 1. Criar a task no banco
      const { data: taskInserted, error: taskError } = await supabase
        .from('tasks')
        .insert({
          title: taskData.title,
          description: taskData.description,
          status: taskData.status,
          priority: taskData.priority,
          due_date: taskData.dueDate?.toISOString(),
          // assigned_to removido — fonte da verdade e task_assignees (M2M)
          // Ver achado S-P0-05 do diagnostico 2026-05-17
          sector: taskData.sector,

          created_by: user.id,
          tags: normalizedTaskData.tags || [],
        })
        .select()
        .single()

      if (taskError) throw taskError

      // 1.5 Inserir Assignees
      if (allowedAssignees.length > 0) {
        const assigneesInsert = allowedAssignees.map(userId => ({
          task_id: taskInserted.id,
          user_id: userId
        }))

        const { error: assigneesError } = await supabase
          .from('task_assignees' as any)
          .insert(assigneesInsert)

        if (assigneesError) {
          console.error('[useTasks] Failed to insert assignees:', assigneesError)
          // Non-blocking for now
        }
      }

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
          assigned_to: allowedAssignees[0], // Ticket só suporta um assignee, pegamos o primeiro
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
        assignees: allowedAssignees,
        sector: taskInserted.sector,
        createdBy: taskInserted.created_by,
        tags: taskInserted.tags || [],
        createdAt: new Date(taskInserted.created_at),
        updatedAt: new Date(taskInserted.updated_at),
        linkedTicketId: ticketData.id,
      }

      // 6. Emitir evento de notificação
      if (allowedAssignees.length > 0) {
        // Notifications are generated by the database transaction.
      }

      setTasks((prev) => [newTask, ...prev.filter(task => task.id !== newTask.id)])
      return newTask
    },
    [user, supabase]
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

    // Guardar referência do oldTask ANTES do update
    const oldTask = tasks.find(t => t.id === id)

    // ✅ Validação com Zod antes de atualizar no banco
    const validation = UpdateTaskSchema.safeParse(normalizedUpdates)
    if (!validation.success) {
      const errors = formatZodErrors(validation.error)
      throw new Error(`Dados inválidos: ${errors.join(', ')}`)
    }


    // 1. Executar update (sem select para evitar erro 406)
    if (process.env.NODE_ENV === 'development') console.log('[useTasks] updateTask Step 1: Updating DB...', { id, updates: normalizedUpdates })
    const { error: updateError } = await supabase
      .from('tasks')
      .update({
        title: normalizedUpdates.title,
        description: normalizedUpdates.description,
        status: normalizedUpdates.status,
        priority: normalizedUpdates.priority,
        due_date: Object.prototype.hasOwnProperty.call(normalizedUpdates, 'dueDate')
          ? normalizedUpdates.dueDate?.toISOString() ?? null
          : undefined,
        // assigned_to removido — fonte da verdade e task_assignees (M2M)
        // Ver achado S-P0-05 do diagnostico 2026-05-17
        sector: normalizedUpdates.sector,
        tags: normalizedUpdates.tags,
      })
      .eq('id', id)

    if (updateError) {
      console.error('[useTasks] Core update failed:', updateError)
      toast.error(`Erro ao atualizar banco: ${updateError.message}`)
      throw updateError
    }

    // 1.5 Atualizar Assignees se fornecido
    if (normalizedUpdates.assignees !== undefined) {
      // Remove old
      await supabase.from('task_assignees' as any).delete().eq('task_id', id)
      // Insert new
      if (normalizedUpdates.assignees.length > 0) {
        const assigneesInsert = normalizedUpdates.assignees.map(userId => ({
          task_id: id,
          user_id: userId
        }))
        const { error: assignError } = await supabase.from('task_assignees' as any).insert(assigneesInsert)
        if (assignError) console.error('Error updating assignees', assignError)
      }
    }

    if (process.env.NODE_ENV === 'development') console.log('[useTasks] updateTask Step 2: DB Update Success. Fetching fresh data...')


    // 2. Buscar dados atualizados
    const { data: fetchedData, error: fetchError } = await (supabase
      .from('tasks')
      .select(`
        *,
        task_assignees (
          user_id
        )
      `) as any)
      .eq('id', id)
      .single()

    if (fetchError) throw fetchError
    const data = fetchedData

    const updatedTask: Task = {
      id: data.id,
      title: data.title,
      description: data.description || '',
      status: data.status,
      priority: data.priority,
      dueDate: data.due_date ? new Date(data.due_date) : undefined,
      assignees: data.task_assignees?.map((ta: any) => ta.user_id) || [],
      sector: data.sector,
      createdBy: data.created_by,
      tags: data.tags || [],
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
      linkedTicketId: (data as any).linked_ticket_id,
    }

    // NOVO: Sincronizar status com ticket vinculado
    // Atualizado para buscar pelo linked_task_id para maior robustez (caso o link reverso falhe)
    if (normalizedUpdates.status && oldTask && normalizedUpdates.status !== oldTask.status) {
      const ticketStatus = mapTaskStatusToTicketStatus(normalizedUpdates.status)

      if (process.env.NODE_ENV === 'development') console.log(`[useTasks] Syncing Ticket. Task: ${id}, Status: ${normalizedUpdates.status} -> ${ticketStatus}`)

      try {
        // PRIORIDADE 1: Atualizar pelo FK na tabela de tickets (mais confiável)
        const { data: ticketData, error: ticketError } = await supabase
          .from('tickets')
          .update({
            status: ticketStatus,
            updated_at: new Date().toISOString()
          })
          .eq('linked_task_id', id)
          .select('id')

        let synced = false

        if (ticketError) {
          console.error('[useTasks] Failed to sync ticket by linked_task_id:', ticketError)
        } else if (ticketData && ticketData.length > 0) {
          if (process.env.NODE_ENV === 'development') console.log('[useTasks] Synced via linked_task_id:', ticketData)
          synced = true
        }

        // PRIORIDADE 2: Se falhar (ex: ticket não tem o link), tentar pelo cache da task
        if (!synced && updatedTask.linkedTicketId) {
          if (process.env.NODE_ENV === 'development') console.log(`[useTasks] linked_task_id matched 0 rows. Trying linkedTicketId: ${updatedTask.linkedTicketId}`)

          const { data: fallbackData, error: fallbackError } = await supabase
            .from('tickets')
            .update({
              status: ticketStatus,
              updated_at: new Date().toISOString()
            })
            .eq('id', updatedTask.linkedTicketId)
            .select('id')

          if (fallbackError) {
            console.error('[useTasks] Failed to sync ticket by ID:', fallbackError)
            toast.error('Erro ao sincronizar Ticket.')
          } else if (fallbackData && fallbackData.length > 0) {
            if (process.env.NODE_ENV === 'development') console.log('[useTasks] Synced via ticket ID:', fallbackData)
            synced = true
          }
        }

        if (synced) {
          toast.success(`Ticket vinculado atualizado para: ${ticketStatus === 'completed' ? 'Concluído' : ticketStatus === 'in_progress' ? 'Em Progresso' : 'A Fazer'}`)
        } else {
          console.warn('[useTasks] No ticket found to sync (neither by linked_task_id nor linkedTicketId)')
        }

      } catch (err) {
        console.error('[useTasks] Exception syncing ticket:', err)
      }

    }

    // NOVO: Emitir evento se status mudou
    // Executar em background para não bloquear o fluxo principal ou causar erros visíveis se RLS falhar
    if (normalizedUpdates.status && oldTask && normalizedUpdates.status !== oldTask.status) {
      setTimeout(() => {
        // Notificações desabilitadas temporariamente para debug de RLS/403
        /*
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
            console.error('[useTasks] Failed to emit notification (likely RLS denied):', err)
          })
        }
        */
      }, 0)
    }

    setTasks((prev) =>
      prev.map((task) => (task.id === id ? updatedTask : task))
    )

    return updatedTask
  }, [tasks, supabase, user])

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
