'use client'

import { useState, useCallback, useMemo } from 'react'
import { Task } from '@/types/tasks'
import { mockTasks } from '@/lib/mock-data'
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
  createTask: (task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) => Task
  updateTask: (id: string, updates: Partial<Task>) => Task | null
  deleteTask: (id: string) => boolean
  getTaskById: (id: string) => Task | null
  getTasksByStatus: (status: string) => Task[]
  getOverdueTasks: () => Task[]
  getTasksDueToday: () => Task[]
  getTasksDueThisWeek: () => Task[]
  isLoading: boolean
}

export function useTasks(): UseTasksReturn {
  const [tasks, setTasks] = useState<Task[]>(mockTasks)
  const [filters, setFilters] = useState<TaskFilters>({})
  const [isLoading] = useState(false)

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
    const now = new Date()
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

  // Criar nova tarefa
  const createTask = useCallback((taskData: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newTask: Task = {
      ...taskData,
      dueDate: taskData.dueDate ? new Date(taskData.dueDate) : undefined,
      id: `task-${Date.now()}`,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    setTasks(prev => [...prev, newTask])
    return newTask
  }, [])

  // Atualizar tarefa
  const updateTask = useCallback((id: string, updates: Partial<Task>) => {
    let updatedTask: Task | null = null
    setTasks(prev =>
      prev.map(task => {
        if (task.id === id) {
          updatedTask = { ...task, ...updates, updatedAt: new Date() }
          return updatedTask
        }
        return task
      })
    )
    return updatedTask
  }, [])

  // Deletar tarefa
  const deleteTask = useCallback((id: string) => {
    const existed = tasks.some(t => t.id === id)
    if (existed) {
      setTasks(prev => prev.filter(t => t.id !== id))
    }
    return existed
  }, [tasks])

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
