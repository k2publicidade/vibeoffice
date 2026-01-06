# Backend Integration Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace all mock data with real API integration, implementing a complete backend-ready architecture for VIBEDISTRO Intranet/CRM.

**Architecture:** Implement API client layer with axios/fetch, create API route handlers that connect to real backend, add loading states, error handling, and data validation. Use React Query for caching and state management. Maintain backward compatibility during migration.

**Tech Stack:** Next.js 16, React Query (TanStack Query), Zod validation, Axios, NextAuth.js v5 with real OAuth provider

---

## Prerequisites

**Before starting:**
1. Backend API must be deployed and accessible
2. API documentation with endpoints available
3. Authentication provider configured (e.g., Auth0, Supabase, Firebase)
4. Environment variables template ready

**Dependencies to install:**
```bash
npm install @tanstack/react-query axios
npm install -D @types/node
```

---

## Task 1: Setup API Client Infrastructure

**Files:**
- Create: `src/lib/api-client.ts`
- Create: `src/lib/api-types.ts`
- Create: `src/lib/api-errors.ts`
- Modify: `src/app/providers.tsx`
- Create: `.env.example`

### Step 1: Create environment variables template

Create `.env.example`:

```env
# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:3001/api
NEXT_PUBLIC_API_TIMEOUT=30000

# Authentication
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key-here
AUTH_TRUST_HOST=true

# OAuth Provider (example: Auth0)
AUTH_PROVIDER_ID=auth0
AUTH_PROVIDER_ISSUER=https://your-domain.auth0.com
AUTH_CLIENT_ID=your-client-id
AUTH_CLIENT_SECRET=your-client-secret

# Feature Flags
NEXT_PUBLIC_USE_MOCK_DATA=false
```

### Step 2: Create API error handling

Create `src/lib/api-errors.ts`:

```typescript
export class APIError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public code?: string,
    public details?: unknown
  ) {
    super(message)
    this.name = 'APIError'
  }
}

export class NetworkError extends Error {
  constructor(message: string = 'Erro de conexão com o servidor') {
    super(message)
    this.name = 'NetworkError'
  }
}

export class ValidationError extends Error {
  constructor(
    message: string,
    public fields?: Record<string, string[]>
  ) {
    super(message)
    this.name = 'ValidationError'
  }
}

export function handleAPIError(error: unknown): never {
  if (error instanceof APIError) {
    throw error
  }

  if (error instanceof Error) {
    if (error.message.includes('fetch') || error.message.includes('network')) {
      throw new NetworkError()
    }
    throw new APIError(error.message, 500)
  }

  throw new APIError('Erro desconhecido', 500)
}
```

### Step 3: Create API types

Create `src/lib/api-types.ts`:

```typescript
import { z } from 'zod'

// Generic API Response
export interface APIResponse<T> {
  data: T
  message?: string
  meta?: {
    page?: number
    perPage?: number
    total?: number
  }
}

// Pagination
export interface PaginationParams {
  page?: number
  perPage?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

// Request config
export interface RequestConfig {
  params?: Record<string, unknown>
  headers?: Record<string, string>
  timeout?: number
}

// API endpoints
export const API_ENDPOINTS = {
  // Auth
  auth: {
    me: '/auth/me',
    login: '/auth/login',
    logout: '/auth/logout',
    refresh: '/auth/refresh',
  },
  // Users
  users: {
    list: '/users',
    get: (id: string) => `/users/${id}`,
    create: '/users',
    update: (id: string) => `/users/${id}`,
    delete: (id: string) => `/users/${id}`,
  },
  // Tickets
  tickets: {
    list: '/tickets',
    get: (id: string) => `/tickets/${id}`,
    create: '/tickets',
    update: (id: string) => `/tickets/${id}`,
    delete: (id: string) => `/tickets/${id}`,
    comments: (id: string) => `/tickets/${id}/comments`,
    addComment: (id: string) => `/tickets/${id}/comments`,
  },
  // Tasks
  tasks: {
    list: '/tasks',
    get: (id: string) => `/tasks/${id}`,
    create: '/tasks',
    update: (id: string) => `/tasks/${id}`,
    delete: (id: string) => `/tasks/${id}`,
    updateStatus: (id: string) => `/tasks/${id}/status`,
  },
  // Chat
  chat: {
    rooms: '/chat/rooms',
    messages: (roomId: string) => `/chat/rooms/${roomId}/messages`,
    sendMessage: (roomId: string) => `/chat/rooms/${roomId}/messages`,
    directMessages: (userId: string) => `/chat/direct/${userId}`,
  },
  // Drive
  drive: {
    list: '/drive/items',
    get: (id: string) => `/drive/items/${id}`,
    upload: '/drive/upload',
    createFolder: '/drive/folders',
    delete: (id: string) => `/drive/items/${id}`,
    share: (id: string) => `/drive/items/${id}/share`,
  },
  // Courses
  courses: {
    list: '/courses',
    get: (id: string) => `/courses/${id}`,
    lessons: (courseId: string) => `/courses/${courseId}/lessons`,
    progress: (courseId: string) => `/courses/${courseId}/progress`,
    completeLesson: (courseId: string, lessonId: string) =>
      `/courses/${courseId}/lessons/${lessonId}/complete`,
  },
  // Calendar
  calendar: {
    events: '/calendar/events',
    get: (id: string) => `/calendar/events/${id}`,
    create: '/calendar/events',
    update: (id: string) => `/calendar/events/${id}`,
    delete: (id: string) => `/calendar/events/${id}`,
  },
} as const
```

### Step 4: Create API client with axios

Create `src/lib/api-client.ts`:

```typescript
import axios, { AxiosInstance, AxiosError, AxiosRequestConfig } from 'axios'
import { APIError, NetworkError, handleAPIError } from './api-errors'
import type { APIResponse, RequestConfig } from './api-types'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'
const API_TIMEOUT = Number(process.env.NEXT_PUBLIC_API_TIMEOUT) || 30000

class APIClient {
  private client: AxiosInstance

  constructor() {
    this.client = axios.create({
      baseURL: API_URL,
      timeout: API_TIMEOUT,
      headers: {
        'Content-Type': 'application/json',
      },
    })

    this.setupInterceptors()
  }

  private setupInterceptors() {
    // Request interceptor - add auth token
    this.client.interceptors.request.use(
      (config) => {
        // Get token from session/cookie
        const token = this.getAuthToken()
        if (token) {
          config.headers.Authorization = `Bearer ${token}`
        }
        return config
      },
      (error) => Promise.reject(error)
    )

    // Response interceptor - handle errors
    this.client.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        if (!error.response) {
          throw new NetworkError()
        }

        const { status, data } = error.response

        // Handle 401 - Unauthorized (refresh token or redirect to login)
        if (status === 401) {
          // TODO: Implement token refresh logic
          // For now, just throw error
          throw new APIError('Não autorizado', 401, 'UNAUTHORIZED')
        }

        // Handle other errors
        const errorData = data as { message?: string; code?: string; details?: unknown }
        throw new APIError(
          errorData.message || 'Erro na requisição',
          status,
          errorData.code,
          errorData.details
        )
      }
    )
  }

  private getAuthToken(): string | null {
    // TODO: Get token from NextAuth session
    // For now, return null
    return null
  }

  async get<T>(
    url: string,
    config?: RequestConfig
  ): Promise<APIResponse<T>> {
    try {
      const response = await this.client.get<APIResponse<T>>(url, config as AxiosRequestConfig)
      return response.data
    } catch (error) {
      return handleAPIError(error)
    }
  }

  async post<T>(
    url: string,
    data?: unknown,
    config?: RequestConfig
  ): Promise<APIResponse<T>> {
    try {
      const response = await this.client.post<APIResponse<T>>(url, data, config as AxiosRequestConfig)
      return response.data
    } catch (error) {
      return handleAPIError(error)
    }
  }

  async put<T>(
    url: string,
    data?: unknown,
    config?: RequestConfig
  ): Promise<APIResponse<T>> {
    try {
      const response = await this.client.put<APIResponse<T>>(url, data, config as AxiosRequestConfig)
      return response.data
    } catch (error) {
      return handleAPIError(error)
    }
  }

  async patch<T>(
    url: string,
    data?: unknown,
    config?: RequestConfig
  ): Promise<APIResponse<T>> {
    try {
      const response = await this.client.patch<APIResponse<T>>(url, data, config as AxiosRequestConfig)
      return response.data
    } catch (error) {
      return handleAPIError(error)
    }
  }

  async delete<T>(
    url: string,
    config?: RequestConfig
  ): Promise<APIResponse<T>> {
    try {
      const response = await this.client.delete<APIResponse<T>>(url, config as AxiosRequestConfig)
      return response.data
    } catch (error) {
      return handleAPIError(error)
    }
  }
}

// Export singleton instance
export const apiClient = new APIClient()

// Export for testing
export { APIClient }
```

### Step 5: Add React Query provider

Modify `src/app/providers.tsx`:

```typescript
'use client'

import { SessionProvider } from 'next-auth/react'
import { ThemeProvider } from 'next-themes'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { useState } from 'react'

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 1000 * 60 * 5, // 5 minutes
        retry: 1,
        refetchOnWindowFocus: false,
      },
    },
  }))

  return (
    <SessionProvider>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
        {process.env.NODE_ENV === 'development' && <ReactQueryDevtools />}
      </QueryClientProvider>
    </SessionProvider>
  )
}
```

### Step 6: Commit infrastructure

```bash
git add src/lib/api-client.ts src/lib/api-types.ts src/lib/api-errors.ts src/app/providers.tsx .env.example
git commit -m "feat: add API client infrastructure with React Query"
```

---

## Task 2: Create Tickets API Service

**Files:**
- Create: `src/services/tickets.service.ts`
- Create: `src/hooks/api/useTicketsAPI.ts`
- Modify: `src/hooks/useTickets.ts`

### Step 1: Create tickets API service

Create `src/services/tickets.service.ts`:

```typescript
import { apiClient } from '@/lib/api-client'
import { API_ENDPOINTS } from '@/lib/api-types'
import type { Ticket, TicketComment, CreateTicketInput, UpdateTicketInput } from '@/types/tickets'

export class TicketsService {
  async getTickets(params?: {
    status?: string[]
    priority?: string
    category?: string
    assignedTo?: string
  }) {
    const response = await apiClient.get<Ticket[]>(
      API_ENDPOINTS.tickets.list,
      { params }
    )
    return response.data
  }

  async getTicketById(id: string) {
    const response = await apiClient.get<Ticket>(
      API_ENDPOINTS.tickets.get(id)
    )
    return response.data
  }

  async createTicket(data: CreateTicketInput) {
    const response = await apiClient.post<Ticket>(
      API_ENDPOINTS.tickets.create,
      data
    )
    return response.data
  }

  async updateTicket(id: string, data: UpdateTicketInput) {
    const response = await apiClient.patch<Ticket>(
      API_ENDPOINTS.tickets.update(id),
      data
    )
    return response.data
  }

  async deleteTicket(id: string) {
    await apiClient.delete(API_ENDPOINTS.tickets.delete(id))
    return true
  }

  async getComments(ticketId: string) {
    const response = await apiClient.get<TicketComment[]>(
      API_ENDPOINTS.tickets.comments(ticketId)
    )
    return response.data
  }

  async addComment(ticketId: string, data: {
    content: string
    isInternal?: boolean
    attachments?: string[]
  }) {
    const response = await apiClient.post<TicketComment>(
      API_ENDPOINTS.tickets.addComment(ticketId),
      data
    )
    return response.data
  }
}

export const ticketsService = new TicketsService()
```

### Step 2: Create React Query hook for tickets

Create `src/hooks/api/useTicketsAPI.ts`:

```typescript
'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ticketsService } from '@/services/tickets.service'
import type { TicketFilters } from '@/hooks/useTickets'
import { toast } from 'sonner'

const QUERY_KEYS = {
  tickets: 'tickets',
  ticketDetail: (id: string) => ['tickets', id],
  comments: (ticketId: string) => ['tickets', ticketId, 'comments'],
}

export function useTicketsAPI(filters?: TicketFilters) {
  const queryClient = useQueryClient()

  // Get all tickets
  const {
    data: tickets = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: [QUERY_KEYS.tickets, filters],
    queryFn: () => ticketsService.getTickets(filters),
  })

  // Create ticket mutation
  const createTicketMutation = useMutation({
    mutationFn: ticketsService.createTicket,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.tickets] })
      toast.success('Ticket criado com sucesso')
    },
    onError: () => {
      toast.error('Erro ao criar ticket')
    },
  })

  // Update ticket mutation
  const updateTicketMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      ticketsService.updateTicket(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.tickets] })
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ticketDetail(variables.id) })
      toast.success('Ticket atualizado com sucesso')
    },
    onError: () => {
      toast.error('Erro ao atualizar ticket')
    },
  })

  // Delete ticket mutation
  const deleteTicketMutation = useMutation({
    mutationFn: ticketsService.deleteTicket,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.tickets] })
      toast.success('Ticket excluído com sucesso')
    },
    onError: () => {
      toast.error('Erro ao excluir ticket')
    },
  })

  return {
    tickets,
    isLoading,
    error,
    createTicket: createTicketMutation.mutateAsync,
    updateTicket: (id: string, data: any) =>
      updateTicketMutation.mutateAsync({ id, data }),
    deleteTicket: deleteTicketMutation.mutateAsync,
  }
}

// Hook for single ticket detail
export function useTicketDetail(id: string) {
  const { data: ticket, isLoading } = useQuery({
    queryKey: QUERY_KEYS.ticketDetail(id),
    queryFn: () => ticketsService.getTicketById(id),
    enabled: !!id,
  })

  return { ticket, isLoading }
}

// Hook for ticket comments
export function useTicketComments(ticketId: string) {
  const queryClient = useQueryClient()

  const { data: comments = [], isLoading } = useQuery({
    queryKey: QUERY_KEYS.comments(ticketId),
    queryFn: () => ticketsService.getComments(ticketId),
    enabled: !!ticketId,
  })

  const addCommentMutation = useMutation({
    mutationFn: (data: { content: string; isInternal?: boolean }) =>
      ticketsService.addComment(ticketId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.comments(ticketId) })
      toast.success('Comentário adicionado')
    },
    onError: () => {
      toast.error('Erro ao adicionar comentário')
    },
  })

  return {
    comments,
    isLoading,
    addComment: addCommentMutation.mutateAsync,
  }
}
```

### Step 3: Add feature flag to useTickets

Modify `src/hooks/useTickets.ts` to support both mock and API:

```typescript
'use client'

import { useState, useCallback, useMemo } from 'react'
import { Ticket, TicketComment } from '@/types/tickets'
import { mockTickets, mockTicketComments, mockUsers } from '@/lib/mock-data'
import { useTicketsAPI } from '@/hooks/api/useTicketsAPI'

// Feature flag to switch between mock and API
const USE_API = process.env.NEXT_PUBLIC_USE_MOCK_DATA === 'false'

export interface TicketFilters {
  status?: string[]
  priority?: string
  category?: string
  assignedTo?: string
  searchQuery?: string
}

// ... rest of the existing code ...

export function useTickets(): UseTicketsReturn {
  // If using API, delegate to API hook
  if (USE_API) {
    return useTicketsWithAPI()
  }

  // Otherwise, use existing mock implementation
  const [tickets, setTickets] = useState<Ticket[]>(mockTickets)
  const [comments, setComments] = useState<TicketComment[]>(mockTicketComments)
  const [filters, setFilters] = useState<TicketFilters>({})
  const [isLoading] = useState(false)

  // ... rest of existing mock implementation ...
}

// New API-based implementation
function useTicketsWithAPI(): UseTicketsReturn {
  const [filters, setFilters] = useState<TicketFilters>({})

  const {
    tickets,
    isLoading,
    createTicket: apiCreateTicket,
    updateTicket: apiUpdateTicket,
    deleteTicket: apiDeleteTicket,
  } = useTicketsAPI(filters)

  // Calculate stats
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

  // Filter tickets
  const filteredTickets = useMemo(() => {
    return tickets.filter(ticket => {
      if (filters.status && filters.status.length > 0) {
        if (!filters.status.includes(ticket.status)) return false
      }
      if (filters.priority && ticket.priority !== filters.priority) return false
      if (filters.category && ticket.category !== filters.category) return false
      if (filters.assignedTo && ticket.assignedTo !== filters.assignedTo) return false

      if (filters.searchQuery) {
        const query = filters.searchQuery.toLowerCase()
        return (
          ticket.title.toLowerCase().includes(query) ||
          ticket.description.toLowerCase().includes(query)
        )
      }

      return true
    })
  }, [tickets, filters])

  const createTicket = useCallback(async (ticketData: Omit<Ticket, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newTicket = await apiCreateTicket(ticketData)
    return newTicket
  }, [apiCreateTicket])

  const updateTicket = useCallback(async (id: string, updates: Partial<Ticket>) => {
    const updated = await apiUpdateTicket(id, updates)
    return updated
  }, [apiUpdateTicket])

  const deleteTicket = useCallback(async (id: string) => {
    await apiDeleteTicket(id)
    return true
  }, [apiDeleteTicket])

  const getTicketById = useCallback((id: string) => {
    return tickets.find(t => t.id === id) || null
  }, [tickets])

  const getTicketsByStatus = useCallback((status: string) => {
    return tickets.filter(t => t.status === status)
  }, [tickets])

  const getUserById = useCallback((userId: string) => {
    const user = mockUsers.find(u => u.id === userId)
    return user ? { name: user.name, avatar: user.avatar } : null
  }, [])

  // Comment functions (simplified for now)
  const getCommentsByTicketId = useCallback(() => [], [])
  const addComment = useCallback(() => ({} as TicketComment), [])
  const deleteComment = useCallback(() => false, [])
  const updateComment = useCallback(() => null, [])

  return {
    tickets,
    filteredTickets,
    comments: [],
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
```

### Step 4: Update ticket types

Modify `src/types/tickets.ts` to add input types:

```typescript
// Add these types to the existing file

export interface CreateTicketInput {
  title: string
  description: string
  category: string
  priority: string
  sector: string
  requester: string
  assignedTo?: string
}

export interface UpdateTicketInput {
  title?: string
  description?: string
  status?: string
  priority?: string
  assignedTo?: string
}
```

### Step 5: Commit tickets API integration

```bash
git add src/services/tickets.service.ts src/hooks/api/useTicketsAPI.ts src/hooks/useTickets.ts src/types/tickets.ts
git commit -m "feat: add tickets API service with React Query integration"
```

---

## Task 3: Create Tasks API Service

**Files:**
- Create: `src/services/tasks.service.ts`
- Create: `src/hooks/api/useTasksAPI.ts`
- Modify: `src/hooks/useTasks.ts`
- Modify: `src/types/tasks.ts`

### Step 1: Create tasks API service

Create `src/services/tasks.service.ts`:

```typescript
import { apiClient } from '@/lib/api-client'
import { API_ENDPOINTS } from '@/lib/api-types'
import type { Task } from '@/types/tasks'

export interface CreateTaskInput {
  title: string
  description?: string
  status: string
  priority: string
  sector: string
  assignedTo?: string
  dueDate?: Date
  tags?: string[]
}

export interface UpdateTaskInput {
  title?: string
  description?: string
  status?: string
  priority?: string
  assignedTo?: string
  dueDate?: Date
  tags?: string[]
}

export class TasksService {
  async getTasks(params?: {
    sector?: string
    priority?: string
    status?: string
    assignedTo?: string
  }) {
    const response = await apiClient.get<Task[]>(
      API_ENDPOINTS.tasks.list,
      { params }
    )
    return response.data
  }

  async getTaskById(id: string) {
    const response = await apiClient.get<Task>(
      API_ENDPOINTS.tasks.get(id)
    )
    return response.data
  }

  async createTask(data: CreateTaskInput) {
    const response = await apiClient.post<Task>(
      API_ENDPOINTS.tasks.create,
      data
    )
    return response.data
  }

  async updateTask(id: string, data: UpdateTaskInput) {
    const response = await apiClient.patch<Task>(
      API_ENDPOINTS.tasks.update(id),
      data
    )
    return response.data
  }

  async updateTaskStatus(id: string, status: string) {
    const response = await apiClient.patch<Task>(
      API_ENDPOINTS.tasks.updateStatus(id),
      { status }
    )
    return response.data
  }

  async deleteTask(id: string) {
    await apiClient.delete(API_ENDPOINTS.tasks.delete(id))
    return true
  }
}

export const tasksService = new TasksService()
```

### Step 2: Create React Query hook for tasks

Create `src/hooks/api/useTasksAPI.ts`:

```typescript
'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { tasksService } from '@/services/tasks.service'
import type { TaskFilters } from '@/hooks/useTasks'
import { toast } from 'sonner'

const QUERY_KEYS = {
  tasks: 'tasks',
  taskDetail: (id: string) => ['tasks', id],
}

export function useTasksAPI(filters?: TaskFilters) {
  const queryClient = useQueryClient()

  const {
    data: tasks = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: [QUERY_KEYS.tasks, filters],
    queryFn: () => tasksService.getTasks({
      sector: filters?.sector,
      priority: filters?.priority,
      status: filters?.status,
      assignedTo: filters?.assignedTo,
    }),
  })

  const createTaskMutation = useMutation({
    mutationFn: tasksService.createTask,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.tasks] })
      toast.success('Tarefa criada com sucesso')
    },
    onError: () => {
      toast.error('Erro ao criar tarefa')
    },
  })

  const updateTaskMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      tasksService.updateTask(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.tasks] })
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.taskDetail(variables.id) })
      toast.success('Tarefa atualizada')
    },
    onError: () => {
      toast.error('Erro ao atualizar tarefa')
    },
  })

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      tasksService.updateTaskStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.tasks] })
    },
    onError: () => {
      toast.error('Erro ao atualizar status')
    },
  })

  const deleteTaskMutation = useMutation({
    mutationFn: tasksService.deleteTask,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.tasks] })
      toast.success('Tarefa excluída')
    },
    onError: () => {
      toast.error('Erro ao excluir tarefa')
    },
  })

  return {
    tasks,
    isLoading,
    error,
    createTask: createTaskMutation.mutateAsync,
    updateTask: (id: string, data: any) =>
      updateTaskMutation.mutateAsync({ id, data }),
    updateTaskStatus: (id: string, status: string) =>
      updateStatusMutation.mutateAsync({ id, status }),
    deleteTask: deleteTaskMutation.mutateAsync,
  }
}
```

### Step 3: Commit tasks API integration

```bash
git add src/services/tasks.service.ts src/hooks/api/useTasksAPI.ts
git commit -m "feat: add tasks API service with React Query"
```

---

## Task 4: Create Chat/Messages API Service

**Files:**
- Create: `src/services/chat.service.ts`
- Create: `src/hooks/api/useChatAPI.ts`
- Create: `src/lib/websocket-client.ts`

### Step 1: Create WebSocket client for real-time chat

Create `src/lib/websocket-client.ts`:

```typescript
import { io, Socket } from 'socket.io-client'

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3001'

class WebSocketClient {
  private socket: Socket | null = null
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5

  connect(userId: string) {
    if (this.socket?.connected) {
      return this.socket
    }

    this.socket = io(WS_URL, {
      auth: {
        userId,
      },
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    })

    this.setupEventListeners()
    return this.socket
  }

  private setupEventListeners() {
    if (!this.socket) return

    this.socket.on('connect', () => {
      console.log('WebSocket connected')
      this.reconnectAttempts = 0
    })

    this.socket.on('disconnect', () => {
      console.log('WebSocket disconnected')
    })

    this.socket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error)
      this.reconnectAttempts++

      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        this.socket?.disconnect()
      }
    })
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect()
      this.socket = null
    }
  }

  emit(event: string, data: any) {
    if (this.socket?.connected) {
      this.socket.emit(event, data)
    }
  }

  on(event: string, callback: (...args: any[]) => void) {
    this.socket?.on(event, callback)
  }

  off(event: string, callback?: (...args: any[]) => void) {
    this.socket?.off(event, callback)
  }

  getSocket() {
    return this.socket
  }
}

export const wsClient = new WebSocketClient()
```

### Step 2: Create chat API service

Create `src/services/chat.service.ts`:

```typescript
import { apiClient } from '@/lib/api-client'
import { API_ENDPOINTS } from '@/lib/api-types'
import type { ChatRoom, Message } from '@/types/chat'

export class ChatService {
  async getRooms() {
    const response = await apiClient.get<ChatRoom[]>(
      API_ENDPOINTS.chat.rooms
    )
    return response.data
  }

  async getMessages(roomId: string, params?: { limit?: number; before?: string }) {
    const response = await apiClient.get<Message[]>(
      API_ENDPOINTS.chat.messages(roomId),
      { params }
    )
    return response.data
  }

  async sendMessage(roomId: string, data: {
    content: string
    type?: 'text' | 'image' | 'file'
    attachments?: string[]
  }) {
    const response = await apiClient.post<Message>(
      API_ENDPOINTS.chat.sendMessage(roomId),
      data
    )
    return response.data
  }

  async getDirectMessages(userId: string, params?: { limit?: number; before?: string }) {
    const response = await apiClient.get<Message[]>(
      API_ENDPOINTS.chat.directMessages(userId),
      { params }
    )
    return response.data
  }
}

export const chatService = new ChatService()
```

### Step 3: Create React Query + WebSocket hook for chat

Create `src/hooks/api/useChatAPI.ts`:

```typescript
'use client'

import { useEffect, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { chatService } from '@/services/chat.service'
import { wsClient } from '@/lib/websocket-client'
import type { Message } from '@/types/chat'
import { toast } from 'sonner'

const QUERY_KEYS = {
  rooms: 'chat-rooms',
  messages: (roomId: string) => ['chat-messages', roomId],
  directMessages: (userId: string) => ['direct-messages', userId],
}

export function useChatRooms() {
  const { data: rooms = [], isLoading } = useQuery({
    queryKey: [QUERY_KEYS.rooms],
    queryFn: chatService.getRooms,
  })

  return { rooms, isLoading }
}

export function useChatMessages(roomId: string) {
  const queryClient = useQueryClient()
  const [isConnected, setIsConnected] = useState(false)

  const {
    data: messages = [],
    isLoading,
  } = useQuery({
    queryKey: QUERY_KEYS.messages(roomId),
    queryFn: () => chatService.getMessages(roomId),
    enabled: !!roomId,
  })

  const sendMessageMutation = useMutation({
    mutationFn: (data: { content: string; type?: string }) =>
      chatService.sendMessage(roomId, data),
    onError: () => {
      toast.error('Erro ao enviar mensagem')
    },
  })

  // Setup WebSocket for real-time messages
  useEffect(() => {
    if (!roomId) return

    const socket = wsClient.connect('current-user-id') // TODO: Get from session

    socket.on('connect', () => setIsConnected(true))
    socket.on('disconnect', () => setIsConnected(false))

    // Join room
    socket.emit('join-room', { roomId })

    // Listen for new messages
    socket.on('new-message', (message: Message) => {
      queryClient.setQueryData<Message[]>(
        QUERY_KEYS.messages(roomId),
        (old = []) => [...old, message]
      )
    })

    // Cleanup
    return () => {
      socket.emit('leave-room', { roomId })
      socket.off('new-message')
    }
  }, [roomId, queryClient])

  return {
    messages,
    isLoading,
    isConnected,
    sendMessage: sendMessageMutation.mutateAsync,
  }
}
```

### Step 4: Install socket.io-client

```bash
npm install socket.io-client
npm install -D @types/socket.io-client
```

### Step 5: Commit chat API integration

```bash
git add src/services/chat.service.ts src/hooks/api/useChatAPI.ts src/lib/websocket-client.ts
git commit -m "feat: add chat API service with WebSocket support"
```

---

## Task 5: Create Drive API Service

**Files:**
- Create: `src/services/drive.service.ts`
- Create: `src/hooks/api/useDriveAPI.ts`

### Step 1: Create drive API service

Create `src/services/drive.service.ts`:

```typescript
import { apiClient } from '@/lib/api-client'
import { API_ENDPOINTS } from '@/lib/api-types'
import type { DriveItem } from '@/types/drive'

export class DriveService {
  async getItems(params?: { folderId?: string; type?: string }) {
    const response = await apiClient.get<DriveItem[]>(
      API_ENDPOINTS.drive.list,
      { params }
    )
    return response.data
  }

  async getItemById(id: string) {
    const response = await apiClient.get<DriveItem>(
      API_ENDPOINTS.drive.get(id)
    )
    return response.data
  }

  async uploadFile(file: File, folderId?: string) {
    const formData = new FormData()
    formData.append('file', file)
    if (folderId) {
      formData.append('folderId', folderId)
    }

    const response = await apiClient.post<DriveItem>(
      API_ENDPOINTS.drive.upload,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    )
    return response.data
  }

  async createFolder(data: { name: string; parentId?: string; sector: string }) {
    const response = await apiClient.post<DriveItem>(
      API_ENDPOINTS.drive.createFolder,
      data
    )
    return response.data
  }

  async deleteItem(id: string) {
    await apiClient.delete(API_ENDPOINTS.drive.delete(id))
    return true
  }

  async shareItem(id: string, data: { userIds: string[]; permissions: string }) {
    const response = await apiClient.post<DriveItem>(
      API_ENDPOINTS.drive.share(id),
      data
    )
    return response.data
  }
}

export const driveService = new DriveService()
```

### Step 2: Create React Query hook for drive

Create `src/hooks/api/useDriveAPI.ts`:

```typescript
'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { driveService } from '@/services/drive.service'
import { toast } from 'sonner'

const QUERY_KEYS = {
  items: 'drive-items',
  itemDetail: (id: string) => ['drive-items', id],
  folderContents: (folderId: string) => ['drive-folder', folderId],
}

export function useDriveAPI(folderId?: string) {
  const queryClient = useQueryClient()

  const {
    data: items = [],
    isLoading,
  } = useQuery({
    queryKey: folderId
      ? QUERY_KEYS.folderContents(folderId)
      : [QUERY_KEYS.items],
    queryFn: () => driveService.getItems({ folderId }),
  })

  const uploadFileMutation = useMutation({
    mutationFn: ({ file, folderId }: { file: File; folderId?: string }) =>
      driveService.uploadFile(file, folderId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.items] })
      toast.success('Arquivo enviado com sucesso')
    },
    onError: () => {
      toast.error('Erro ao enviar arquivo')
    },
  })

  const createFolderMutation = useMutation({
    mutationFn: driveService.createFolder,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.items] })
      toast.success('Pasta criada com sucesso')
    },
    onError: () => {
      toast.error('Erro ao criar pasta')
    },
  })

  const deleteItemMutation = useMutation({
    mutationFn: driveService.deleteItem,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.items] })
      toast.success('Item excluído')
    },
    onError: () => {
      toast.error('Erro ao excluir item')
    },
  })

  const shareItemMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      driveService.shareItem(id, data),
    onSuccess: () => {
      toast.success('Item compartilhado')
    },
    onError: () => {
      toast.error('Erro ao compartilhar item')
    },
  })

  return {
    items,
    isLoading,
    uploadFile: uploadFileMutation.mutateAsync,
    createFolder: createFolderMutation.mutateAsync,
    deleteItem: deleteItemMutation.mutateAsync,
    shareItem: (id: string, data: any) =>
      shareItemMutation.mutateAsync({ id, data }),
  }
}
```

### Step 3: Commit drive API integration

```bash
git add src/services/drive.service.ts src/hooks/api/useDriveAPI.ts
git commit -m "feat: add drive API service with file upload support"
```

---

## Task 6: Create Courses API Service

**Files:**
- Create: `src/services/courses.service.ts`
- Create: `src/hooks/api/useCoursesAPI.ts`

### Step 1: Create courses API service

Create `src/services/courses.service.ts`:

```typescript
import { apiClient } from '@/lib/api-client'
import { API_ENDPOINTS } from '@/lib/api-types'
import type { Course, Lesson, CourseProgress } from '@/types/courses'

export class CoursesService {
  async getCourses() {
    const response = await apiClient.get<Course[]>(
      API_ENDPOINTS.courses.list
    )
    return response.data
  }

  async getCourseById(id: string) {
    const response = await apiClient.get<Course>(
      API_ENDPOINTS.courses.get(id)
    )
    return response.data
  }

  async getCourseLessons(courseId: string) {
    const response = await apiClient.get<Lesson[]>(
      API_ENDPOINTS.courses.lessons(courseId)
    )
    return response.data
  }

  async getCourseProgress(courseId: string) {
    const response = await apiClient.get<CourseProgress>(
      API_ENDPOINTS.courses.progress(courseId)
    )
    return response.data
  }

  async completeLesson(courseId: string, lessonId: string) {
    const response = await apiClient.post<CourseProgress>(
      API_ENDPOINTS.courses.completeLesson(courseId, lessonId)
    )
    return response.data
  }
}

export const coursesService = new CoursesService()
```

### Step 2: Create React Query hook for courses

Create `src/hooks/api/useCoursesAPI.ts`:

```typescript
'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { coursesService } from '@/services/courses.service'
import { toast } from 'sonner'

const QUERY_KEYS = {
  courses: 'courses',
  courseDetail: (id: string) => ['courses', id],
  lessons: (courseId: string) => ['courses', courseId, 'lessons'],
  progress: (courseId: string) => ['courses', courseId, 'progress'],
}

export function useCoursesAPI() {
  const { data: courses = [], isLoading } = useQuery({
    queryKey: [QUERY_KEYS.courses],
    queryFn: coursesService.getCourses,
  })

  return { courses, isLoading }
}

export function useCourseDetail(courseId: string) {
  const queryClient = useQueryClient()

  const { data: course, isLoading: courseLoading } = useQuery({
    queryKey: QUERY_KEYS.courseDetail(courseId),
    queryFn: () => coursesService.getCourseById(courseId),
    enabled: !!courseId,
  })

  const { data: lessons = [], isLoading: lessonsLoading } = useQuery({
    queryKey: QUERY_KEYS.lessons(courseId),
    queryFn: () => coursesService.getCourseLessons(courseId),
    enabled: !!courseId,
  })

  const { data: progress, isLoading: progressLoading } = useQuery({
    queryKey: QUERY_KEYS.progress(courseId),
    queryFn: () => coursesService.getCourseProgress(courseId),
    enabled: !!courseId,
  })

  const completeLessonMutation = useMutation({
    mutationFn: (lessonId: string) =>
      coursesService.completeLesson(courseId, lessonId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.progress(courseId) })
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.lessons(courseId) })
      toast.success('Aula concluída!')
    },
    onError: () => {
      toast.error('Erro ao marcar aula como concluída')
    },
  })

  return {
    course,
    lessons,
    progress,
    isLoading: courseLoading || lessonsLoading || progressLoading,
    completeLesson: completeLessonMutation.mutateAsync,
  }
}
```

### Step 3: Commit courses API integration

```bash
git add src/services/courses.service.ts src/hooks/api/useCoursesAPI.ts
git commit -m "feat: add courses API service"
```

---

## Task 7: Create Calendar API Service

**Files:**
- Create: `src/services/calendar.service.ts`
- Create: `src/hooks/api/useCalendarAPI.ts`

### Step 1: Create calendar API service

Create `src/services/calendar.service.ts`:

```typescript
import { apiClient } from '@/lib/api-client'
import { API_ENDPOINTS } from '@/lib/api-types'
import type { CalendarEvent } from '@/types/calendar'

export interface CreateEventInput {
  title: string
  description?: string
  start: Date
  end: Date
  type: 'personal' | 'sector' | 'company'
  sector?: string
  attendees?: string[]
  location?: string
}

export class CalendarService {
  async getEvents(params?: {
    start?: Date
    end?: Date
    type?: string
    sector?: string
  }) {
    const response = await apiClient.get<CalendarEvent[]>(
      API_ENDPOINTS.calendar.events,
      { params }
    )
    return response.data
  }

  async getEventById(id: string) {
    const response = await apiClient.get<CalendarEvent>(
      API_ENDPOINTS.calendar.get(id)
    )
    return response.data
  }

  async createEvent(data: CreateEventInput) {
    const response = await apiClient.post<CalendarEvent>(
      API_ENDPOINTS.calendar.create,
      data
    )
    return response.data
  }

  async updateEvent(id: string, data: Partial<CreateEventInput>) {
    const response = await apiClient.patch<CalendarEvent>(
      API_ENDPOINTS.calendar.update(id),
      data
    )
    return response.data
  }

  async deleteEvent(id: string) {
    await apiClient.delete(API_ENDPOINTS.calendar.delete(id))
    return true
  }
}

export const calendarService = new CalendarService()
```

### Step 2: Create React Query hook for calendar

Create `src/hooks/api/useCalendarAPI.ts`:

```typescript
'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { calendarService } from '@/services/calendar.service'
import { toast } from 'sonner'

const QUERY_KEYS = {
  events: 'calendar-events',
  eventDetail: (id: string) => ['calendar-events', id],
}

export function useCalendarAPI(filters?: {
  start?: Date
  end?: Date
  type?: string
  sector?: string
}) {
  const queryClient = useQueryClient()

  const {
    data: events = [],
    isLoading,
  } = useQuery({
    queryKey: [QUERY_KEYS.events, filters],
    queryFn: () => calendarService.getEvents(filters),
  })

  const createEventMutation = useMutation({
    mutationFn: calendarService.createEvent,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.events] })
      toast.success('Evento criado com sucesso')
    },
    onError: () => {
      toast.error('Erro ao criar evento')
    },
  })

  const updateEventMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      calendarService.updateEvent(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.events] })
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.eventDetail(variables.id) })
      toast.success('Evento atualizado')
    },
    onError: () => {
      toast.error('Erro ao atualizar evento')
    },
  })

  const deleteEventMutation = useMutation({
    mutationFn: calendarService.deleteEvent,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.events] })
      toast.success('Evento excluído')
    },
    onError: () => {
      toast.error('Erro ao excluir evento')
    },
  })

  return {
    events,
    isLoading,
    createEvent: createEventMutation.mutateAsync,
    updateEvent: (id: string, data: any) =>
      updateEventMutation.mutateAsync({ id, data }),
    deleteEvent: deleteEventMutation.mutateAsync,
  }
}
```

### Step 3: Commit calendar API integration

```bash
git add src/services/calendar.service.ts src/hooks/api/useCalendarAPI.ts
git commit -m "feat: add calendar API service"
```

---

## Task 8: Update Authentication with Real Provider

**Files:**
- Modify: `src/app/api/auth/[...nextauth]/route.ts`
- Modify: `src/lib/auth.ts`
- Create: `src/services/auth.service.ts`

### Step 1: Create auth API service

Create `src/services/auth.service.ts`:

```typescript
import { apiClient } from '@/lib/api-client'
import { API_ENDPOINTS } from '@/lib/api-types'
import type { User } from '@/types/auth'

export interface LoginCredentials {
  email: string
  password: string
}

export interface AuthResponse {
  user: User
  accessToken: string
  refreshToken: string
}

export class AuthService {
  async login(credentials: LoginCredentials) {
    const response = await apiClient.post<AuthResponse>(
      API_ENDPOINTS.auth.login,
      credentials
    )
    return response.data
  }

  async logout() {
    await apiClient.post(API_ENDPOINTS.auth.logout)
  }

  async getMe() {
    const response = await apiClient.get<User>(API_ENDPOINTS.auth.me)
    return response.data
  }

  async refreshToken(refreshToken: string) {
    const response = await apiClient.post<AuthResponse>(
      API_ENDPOINTS.auth.refresh,
      { refreshToken }
    )
    return response.data
  }
}

export const authService = new AuthService()
```

### Step 2: Update NextAuth configuration for real provider

Modify `src/app/api/auth/[...nextauth]/route.ts`:

```typescript
import NextAuth from 'next-auth'
import type { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { authService } from '@/services/auth.service'

// For OAuth providers (example with Auth0)
// import Auth0Provider from 'next-auth/providers/auth0'

export const authOptions: NextAuthOptions = {
  providers: [
    // Real credentials provider
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Email e senha são obrigatórios')
        }

        try {
          const response = await authService.login({
            email: credentials.email,
            password: credentials.password,
          })

          return {
            id: response.user.id,
            name: response.user.name,
            email: response.user.email,
            image: response.user.avatar,
            sector: response.user.sector,
            role: response.user.role,
            accessToken: response.accessToken,
            refreshToken: response.refreshToken,
          }
        } catch (error) {
          console.error('Login error:', error)
          throw new Error('Email ou senha inválidos')
        }
      },
    }),

    // Example OAuth provider (uncomment to use)
    // Auth0Provider({
    //   clientId: process.env.AUTH_CLIENT_ID!,
    //   clientSecret: process.env.AUTH_CLIENT_SECRET!,
    //   issuer: process.env.AUTH_PROVIDER_ISSUER,
    // }),
  ],

  pages: {
    signIn: '/login',
    error: '/login',
  },

  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },

  callbacks: {
    async jwt({ token, user, account }) {
      // Initial sign in
      if (user) {
        token.id = user.id
        token.sector = user.sector
        token.role = user.role
        token.accessToken = user.accessToken
        token.refreshToken = user.refreshToken
      }

      // TODO: Implement token refresh logic
      // Check if token is expired and refresh if needed

      return token
    },

    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string
        session.user.sector = token.sector as string
        session.user.role = token.role as string
        session.accessToken = token.accessToken as string
      }

      return session
    },
  },

  debug: process.env.NODE_ENV === 'development',
}

const handler = NextAuth(authOptions)
export { handler as GET, handler as POST }
```

### Step 3: Update session types

Modify `src/types/next-auth.d.ts`:

```typescript
import 'next-auth'
import 'next-auth/jwt'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      name: string
      email: string
      image?: string
      sector: string
      role: string
    }
    accessToken?: string
  }

  interface User {
    id: string
    sector: string
    role: string
    accessToken?: string
    refreshToken?: string
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string
    sector: string
    role: string
    accessToken?: string
    refreshToken?: string
  }
}
```

### Step 4: Update API client to use session token

Modify `src/lib/api-client.ts` to get token from NextAuth:

```typescript
// Update the getAuthToken method in APIClient class

import { getSession } from 'next-auth/react'

class APIClient {
  // ... existing code ...

  private async getAuthToken(): Promise<string | null> {
    try {
      const session = await getSession()
      return session?.accessToken || null
    } catch {
      return null
    }
  }

  // ... rest of existing code ...
}
```

### Step 5: Commit auth integration

```bash
git add src/services/auth.service.ts src/app/api/auth/[...nextauth]/route.ts src/types/next-auth.d.ts src/lib/api-client.ts
git commit -m "feat: integrate real authentication with NextAuth and API"
```

---

## Task 9: Add Loading States and Error Boundaries

**Files:**
- Create: `src/components/ui/error-boundary.tsx`
- Create: `src/components/ui/loading-skeleton.tsx`
- Create: `src/components/ui/error-message.tsx`

### Step 1: Create error boundary component

Create `src/components/ui/error-boundary.tsx`:

```typescript
'use client'

import React, { Component, ReactNode } from 'react'
import { Button } from './button'
import { AlertTriangle } from 'lucide-react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error?: Error
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className="flex min-h-[400px] flex-col items-center justify-center p-8">
          <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
          <h2 className="text-2xl font-bold mb-2">Algo deu errado</h2>
          <p className="text-muted-foreground mb-4 text-center max-w-md">
            {this.state.error?.message || 'Ocorreu um erro inesperado'}
          </p>
          <Button
            onClick={() => {
              this.setState({ hasError: false, error: undefined })
              window.location.reload()
            }}
          >
            Recarregar página
          </Button>
        </div>
      )
    }

    return this.props.children
  }
}
```

### Step 2: Create loading skeleton component

Create `src/components/ui/loading-skeleton.tsx`:

```typescript
import { Skeleton } from './skeleton'
import { Card } from './card'

export function LoadingCard() {
  return (
    <Card className="p-6">
      <Skeleton className="h-6 w-3/4 mb-4" />
      <Skeleton className="h-4 w-full mb-2" />
      <Skeleton className="h-4 w-5/6 mb-2" />
      <Skeleton className="h-4 w-4/6" />
    </Card>
  )
}

export function LoadingList({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <LoadingCard key={i} />
      ))}
    </div>
  )
}

export function LoadingTable() {
  return (
    <div className="space-y-2">
      <Skeleton className="h-10 w-full" />
      {Array.from({ length: 5 }).map((_, i) => (
        <Skeleton key={i} className="h-16 w-full" />
      ))}
    </div>
  )
}
```

### Step 3: Create error message component

Create `src/components/ui/error-message.tsx`:

```typescript
import { AlertTriangle, RefreshCw } from 'lucide-react'
import { Button } from './button'
import { Alert, AlertDescription, AlertTitle } from './alert'

interface ErrorMessageProps {
  title?: string
  message?: string
  onRetry?: () => void
}

export function ErrorMessage({
  title = 'Erro ao carregar dados',
  message = 'Não foi possível carregar as informações. Tente novamente.',
  onRetry,
}: ErrorMessageProps) {
  return (
    <Alert variant="destructive">
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription className="mt-2">
        {message}
        {onRetry && (
          <Button
            variant="outline"
            size="sm"
            onClick={onRetry}
            className="mt-3"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Tentar novamente
          </Button>
        )}
      </AlertDescription>
    </Alert>
  )
}
```

### Step 4: Commit UI improvements

```bash
git add src/components/ui/error-boundary.tsx src/components/ui/loading-skeleton.tsx src/components/ui/error-message.tsx
git commit -m "feat: add loading states and error boundaries"
```

---

## Task 10: Create Integration Tests

**Files:**
- Create: `__tests__/services/api-client.test.ts`
- Create: `__tests__/hooks/useTicketsAPI.test.tsx`
- Create: `jest.config.js`
- Create: `jest.setup.js`

### Step 1: Install testing dependencies

```bash
npm install -D jest @testing-library/react @testing-library/jest-dom @testing-library/user-event jest-environment-jsdom
npm install -D @types/jest
```

### Step 2: Create Jest configuration

Create `jest.config.js`:

```javascript
const nextJest = require('next/jest')

const createJestConfig = nextJest({
  dir: './',
})

const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'jest-environment-jsdom',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  testMatch: [
    '**/__tests__/**/*.test.[jt]s?(x)',
  ],
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.stories.tsx',
  ],
}

module.exports = createJestConfig(customJestConfig)
```

### Step 3: Create Jest setup

Create `jest.setup.js`:

```javascript
import '@testing-library/jest-dom'

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
  }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}))

// Mock next-auth
jest.mock('next-auth/react', () => ({
  useSession: () => ({
    data: {
      user: {
        id: 'test-user',
        name: 'Test User',
        email: 'test@example.com',
        sector: 'TI/Suporte',
        role: 'Admin',
      },
    },
    status: 'authenticated',
  }),
  getSession: () => Promise.resolve({
    user: {
      id: 'test-user',
      name: 'Test User',
      email: 'test@example.com',
    },
    accessToken: 'test-token',
  }),
}))
```

### Step 4: Write API client test

Create `__tests__/services/api-client.test.ts`:

```typescript
import { apiClient, APIClient } from '@/lib/api-client'
import { APIError, NetworkError } from '@/lib/api-errors'

// Mock axios
jest.mock('axios')

describe('APIClient', () => {
  let client: APIClient

  beforeEach(() => {
    client = new APIClient()
  })

  describe('GET requests', () => {
    it('should make successful GET request', async () => {
      const mockData = { data: [{ id: '1', name: 'Test' }] }

      // Mock axios response
      jest.spyOn(client as any, 'client').mockResolvedValue({
        data: mockData,
      })

      const result = await client.get('/test')

      expect(result).toEqual(mockData)
    })

    it('should throw NetworkError on connection failure', async () => {
      jest.spyOn(client as any, 'client').mockRejectedValue(
        new Error('Network Error')
      )

      await expect(client.get('/test')).rejects.toThrow(NetworkError)
    })
  })

  describe('POST requests', () => {
    it('should make successful POST request', async () => {
      const mockData = { data: { id: '1', name: 'Created' } }
      const postData = { name: 'New Item' }

      jest.spyOn(client as any, 'client').mockResolvedValue({
        data: mockData,
      })

      const result = await client.post('/test', postData)

      expect(result).toEqual(mockData)
    })
  })

  describe('Error handling', () => {
    it('should throw APIError with status code', async () => {
      const errorResponse = {
        response: {
          status: 400,
          data: { message: 'Bad Request' },
        },
      }

      jest.spyOn(client as any, 'client').mockRejectedValue(errorResponse)

      await expect(client.get('/test')).rejects.toThrow(APIError)
    })
  })
})
```

### Step 5: Write React Query hook test

Create `__tests__/hooks/useTicketsAPI.test.tsx`:

```typescript
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useTicketsAPI } from '@/hooks/api/useTicketsAPI'
import { ticketsService } from '@/services/tickets.service'

// Mock tickets service
jest.mock('@/services/tickets.service')

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  })

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
}

describe('useTicketsAPI', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should fetch tickets successfully', async () => {
    const mockTickets = [
      { id: '1', title: 'Test Ticket', status: 'open' },
    ]

    ;(ticketsService.getTickets as jest.Mock).mockResolvedValue(mockTickets)

    const { result } = renderHook(() => useTicketsAPI(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.tickets).toEqual(mockTickets)
  })

  it('should create ticket successfully', async () => {
    const newTicket = {
      title: 'New Ticket',
      description: 'Test',
      category: 'bug',
      priority: 'high',
      sector: 'TI',
      requester: 'user-1',
    }

    const createdTicket = { id: '1', ...newTicket, status: 'open' }

    ;(ticketsService.createTicket as jest.Mock).mockResolvedValue(createdTicket)

    const { result } = renderHook(() => useTicketsAPI(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    const ticket = await result.current.createTicket(newTicket)

    expect(ticket).toEqual(createdTicket)
    expect(ticketsService.createTicket).toHaveBeenCalledWith(newTicket)
  })
})
```

### Step 6: Add test script to package.json

Modify `package.json`:

```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage"
  }
}
```

### Step 7: Run tests

```bash
npm test
```

Expected: All tests pass

### Step 8: Commit tests

```bash
git add __tests__ jest.config.js jest.setup.js package.json
git commit -m "test: add integration tests for API client and hooks"
```

---

## Task 11: Update Documentation

**Files:**
- Create: `docs/API_INTEGRATION.md`
- Modify: `README.md`

### Step 1: Create API integration documentation

Create `docs/API_INTEGRATION.md`:

```markdown
# API Integration Guide

## Overview

VIBEDISTRO now supports full backend API integration using React Query and axios.

## Environment Setup

Copy `.env.example` to `.env.local` and configure:

\`\`\`env
NEXT_PUBLIC_API_URL=https://your-api.com/api
NEXT_PUBLIC_WS_URL=wss://your-api.com
NEXT_PUBLIC_USE_MOCK_DATA=false
\`\`\`

## Architecture

### API Client Layer

- **Location:** `src/lib/api-client.ts`
- **Features:**
  - Axios-based HTTP client
  - Automatic token injection
  - Request/response interceptors
  - Error handling

### Services Layer

Each module has a dedicated service:

- `src/services/tickets.service.ts`
- `src/services/tasks.service.ts`
- `src/services/chat.service.ts`
- `src/services/drive.service.ts`
- `src/services/courses.service.ts`
- `src/services/calendar.service.ts`

### React Query Hooks

Custom hooks for data fetching and mutations:

- `src/hooks/api/useTicketsAPI.ts`
- `src/hooks/api/useTasksAPI.ts`
- `src/hooks/api/useChatAPI.ts`
- `src/hooks/api/useDriveAPI.ts`
- `src/hooks/api/useCoursesAPI.ts`
- `src/hooks/api/useCalendarAPI.ts`

## API Endpoints

See `src/lib/api-types.ts` for complete endpoint mapping.

### Base Structure

\`\`\`typescript
{
  tickets: {
    list: '/tickets',
    get: (id) => \`/tickets/\${id}\`,
    create: '/tickets',
    update: (id) => \`/tickets/\${id}\`,
    delete: (id) => \`/tickets/\${id}\`,
  }
}
\`\`\`

## Usage Examples

### Fetching Data

\`\`\`typescript
import { useTicketsAPI } from '@/hooks/api/useTicketsAPI'

function TicketsPage() {
  const { tickets, isLoading, error } = useTicketsAPI()

  if (isLoading) return <LoadingList />
  if (error) return <ErrorMessage />

  return <TicketList tickets={tickets} />
}
\`\`\`

### Creating Data

\`\`\`typescript
const { createTicket } = useTicketsAPI()

const handleSubmit = async (data) => {
  try {
    await createTicket(data)
    toast.success('Ticket criado!')
  } catch (error) {
    toast.error('Erro ao criar ticket')
  }
}
\`\`\`

## Real-Time Features (Chat)

WebSocket connection for real-time messaging:

\`\`\`typescript
import { useChatMessages } from '@/hooks/api/useChatAPI'

function ChatRoom({ roomId }) {
  const { messages, isConnected, sendMessage } = useChatMessages(roomId)

  return (
    <div>
      <ConnectionStatus connected={isConnected} />
      <MessageList messages={messages} />
      <MessageInput onSend={sendMessage} />
    </div>
  )
}
\`\`\`

## Error Handling

### APIError

\`\`\`typescript
try {
  await createTicket(data)
} catch (error) {
  if (error instanceof APIError) {
    console.error('API Error:', error.statusCode, error.message)
  }
}
\`\`\`

### React Error Boundaries

Wrap components with ErrorBoundary:

\`\`\`typescript
import { ErrorBoundary } from '@/components/ui/error-boundary'

<ErrorBoundary>
  <TicketsPage />
</ErrorBoundary>
\`\`\`

## Testing

Run integration tests:

\`\`\`bash
npm test
npm run test:coverage
\`\`\`

## Migration from Mock Data

To switch between mock and API:

1. Set `NEXT_PUBLIC_USE_MOCK_DATA=false` in `.env.local`
2. Hooks automatically detect and use API
3. No code changes needed in components

## Backend Requirements

Your API should follow this structure:

\`\`\`json
{
  "data": [...],
  "message": "Success",
  "meta": {
    "page": 1,
    "perPage": 20,
    "total": 100
  }
}
\`\`\`

See `src/lib/api-types.ts` for complete TypeScript interfaces.
\`\`\`

### Step 2: Update main README

Modify `README.md` to add API integration section:

```markdown
# VIBEDISTRO Intranet/CRM

... (existing content) ...

## API Integration

VIBEDISTRO supports full backend API integration. See [API Integration Guide](docs/API_INTEGRATION.md) for details.

### Quick Start with API

1. Copy environment variables:
\`\`\`bash
cp .env.example .env.local
\`\`\`

2. Configure your API URL:
\`\`\`env
NEXT_PUBLIC_API_URL=https://your-api.com/api
NEXT_PUBLIC_USE_MOCK_DATA=false
\`\`\`

3. Start development server:
\`\`\`bash
npm run dev
\`\`\`

### Features

- ✅ React Query for data fetching and caching
- ✅ Axios-based HTTP client with interceptors
- ✅ Automatic token management
- ✅ WebSocket support for real-time chat
- ✅ Error boundaries and loading states
- ✅ Comprehensive error handling
- ✅ Feature flag for mock/API switch

... (rest of existing content) ...
```

### Step 3: Commit documentation

```bash
git add docs/API_INTEGRATION.md README.md
git commit -m "docs: add API integration guide and update README"
```

---

## Final Checklist

Before considering integration complete:

- [ ] All services created (Tickets, Tasks, Chat, Drive, Courses, Calendar)
- [ ] React Query hooks implemented for all modules
- [ ] Authentication updated with real provider
- [ ] WebSocket client configured for chat
- [ ] Error boundaries added to main layouts
- [ ] Loading states implemented in all pages
- [ ] Environment variables documented
- [ ] Integration tests passing
- [ ] API documentation complete
- [ ] Feature flag working (mock ↔ API)

## Post-Implementation Tasks

After backend is integrated:

1. **Performance optimization:**
   - Add pagination to large lists
   - Implement infinite scroll where needed
   - Optimize React Query cache settings

2. **Monitoring:**
   - Add error tracking (Sentry)
   - Add analytics (Google Analytics, Mixpanel)
   - Monitor API response times

3. **Security:**
   - Implement CSRF protection
   - Add rate limiting
   - Secure WebSocket connections
   - Audit dependencies

4. **Production deployment:**
   - Configure CI/CD pipeline
   - Set up staging environment
   - Create deployment checklist

---

**Plan complete!** Ready for execution.
